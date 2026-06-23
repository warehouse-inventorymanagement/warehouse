import cron from 'node-cron';
import { getExpiringItems, getExpiredItems, permanentDeleteItems, getExpiredImages, permanentDeleteImages } from './quarantine.service.js';
import {
  sendLowStockNotification,
  sendQuarantineExpiringNotification,
  sendItemCreatedDigestNotification,
  sendItemQuarantinedDigestNotification,
  sendFailedLoginDigestNotification,
  sendPermissionChangeDigestNotification,
  type NotificationFrequency,
  DEFAULT_FREQUENCIES
} from './notification.service.js';
import { isSmtpConfigured } from './email.service.js';
import prisma from '../lib/prisma.js';

// Default settings
const DEFAULT_SEND_TIME = '02:00';
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get number of days for a frequency setting
 */
function getFrequencyDays(frequency: NotificationFrequency): number {
  const map: Record<NotificationFrequency, number> = {
    immediate: 0,
    daily: 1,
    every_2_days: 2,
    every_3_days: 3,
    every_4_days: 4,
    weekly: 7
  };
  return map[frequency] || 1;
}

/**
 * Check if it's time to send a digest based on lastSentAt and frequency
 */
function shouldSendDigest(lastSentAt: Date | null, frequency: NotificationFrequency, timezone: string): boolean {
  if (frequency === 'immediate') return false;
  if (!lastSentAt) return true;

  const days = getFrequencyDays(frequency);
  const now = new Date();

  // Get dates in the configured timezone
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const lastSentStr = lastSentAt.toLocaleDateString('en-CA', { timeZone: timezone });

  const today = new Date(todayStr);
  const lastSentDay = new Date(lastSentStr);
  const daysDiff = Math.floor((today.getTime() - lastSentDay.getTime()) / (1000 * 60 * 60 * 24));

  return daysDiff >= days;
}

/**
 * Get notification settings from database
 */
async function getNotificationSettings(): Promise<{ sendTime: string; timezone: string }> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['notification.dailySendTime', 'notification.timezone', 'system.timezone']
      }
    }
  });

  const settingsMap: Record<string, string> = {};
  settings.forEach(s => {
    settingsMap[s.key] = s.value;
  });

  return {
    sendTime: settingsMap['notification.dailySendTime'] || DEFAULT_SEND_TIME,
    // Use system.timezone as primary, fallback to notification.timezone for backwards compatibility
    timezone: settingsMap['system.timezone'] || settingsMap['notification.timezone'] || DEFAULT_TIMEZONE
  };
}

/**
 * Check if a notification was already sent today
 */
async function wasNotificationSentToday(type: string, timezone: string): Promise<boolean> {
  const config = await prisma.notificationConfig.findUnique({
    where: { type },
    select: { lastSentAt: true }
  });

  if (!config?.lastSentAt) {
    return false;
  }

  // Get today's date in the configured timezone
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format
  const lastSentStr = config.lastSentAt.toLocaleDateString('en-CA', { timeZone: timezone });

  return todayStr === lastSentStr;
}

/**
 * Update the lastSentAt timestamp for a notification type
 */
async function markNotificationSent(type: string): Promise<void> {
  await prisma.notificationConfig.upsert({
    where: { type },
    update: { lastSentAt: new Date() },
    create: {
      type,
      enabled: true,
      recipientRoleIds: [],
      recipientGroupIds: [],
      recipientUserIds: [],
      lastSentAt: new Date()
    }
  });
}

/**
 * Check if current time is at or after the configured send time
 */
function isAtOrAfterSendTime(sendTime: string, timezone: string): boolean {
  const now = new Date();
  const [sendHour, sendMinute] = sendTime.split(':').map(Number);

  // Get current time in the configured timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  // Compare times
  if (currentHour > sendHour) return true;
  if (currentHour === sendHour && currentMinute >= sendMinute) return true;
  return false;
}

/**
 * Daily job to check for expiring quarantine items and send notifications
 */
async function checkExpiringQuarantine(timezone: string): Promise<void> {
  console.log('[Scheduler] Checking for expiring quarantine items...');

  try {
    // Check if already sent today
    if (await wasNotificationSentToday('quarantine_expiring', timezone)) {
      console.log('[Scheduler] Quarantine expiring notification already sent today');
      return;
    }

    // Get items expiring in 4 days
    const expiringItems = await getExpiringItems(4);

    if (expiringItems.length > 0) {
      console.log(`[Scheduler] Found ${expiringItems.length} item(s) expiring soon`);
      const sent = await sendQuarantineExpiringNotification(expiringItems);
      if (sent) {
        await markNotificationSent('quarantine_expiring');
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error checking expiring quarantine:', error);
  }
}

/**
 * Daily job to permanently delete items past retention period
 */
async function cleanupExpiredQuarantine(): Promise<void> {
  console.log('[Scheduler] Cleaning up expired quarantine items...');

  try {
    const expiredItemIds = await getExpiredItems();

    if (expiredItemIds.length > 0) {
      console.log(`[Scheduler] Permanently deleting ${expiredItemIds.length} expired item(s)`);
      await permanentDeleteItems(expiredItemIds);
      console.log(`[Scheduler] Deleted ${expiredItemIds.length} item(s)`);
    }
  } catch (error) {
    console.error('[Scheduler] Error cleaning up expired quarantine:', error);
  }
}

/**
 * Daily job to permanently delete images past retention period
 */
async function cleanupExpiredImages(): Promise<void> {
  console.log('[Scheduler] Cleaning up expired quarantine images...');

  try {
    const expiredImageIds = await getExpiredImages();

    if (expiredImageIds.length > 0) {
      console.log(`[Scheduler] Permanently deleting ${expiredImageIds.length} expired image(s)`);
      await permanentDeleteImages(expiredImageIds);
      console.log(`[Scheduler] Deleted ${expiredImageIds.length} image(s)`);
    }
  } catch (error) {
    console.error('[Scheduler] Error cleaning up expired quarantine images:', error);
  }
}

/**
 * Daily job to delete audit logs older than the configured retention period
 */
async function cleanupOldAuditLogs(): Promise<void> {
  console.log('[Scheduler] Cleaning up old audit logs...');

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'audit.retentionDays' }
    });
    const retentionDays = parseInt(setting?.value || '365', 10);

    if (isNaN(retentionDays) || retentionDays <= 0) {
      console.log('[Scheduler] Audit log retention disabled (0), skipping');
      return;
    }

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    if (result.count > 0) {
      console.log(`[Scheduler] Deleted ${result.count} audit log(s) older than ${retentionDays} days`);
    } else {
      console.log('[Scheduler] No old audit logs to delete');
    }
  } catch (error) {
    console.error('[Scheduler] Error cleaning up old audit logs:', error);
  }
}

/**
 * Daily job to trim item history entries to the configured maximum per item
 */
async function cleanupExcessItemHistory(): Promise<void> {
  console.log('[Scheduler] Cleaning up excess item history...');

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'item.historyRetentionCount' }
    });
    const maxEntries = parseInt(setting?.value || '50', 10);

    if (isNaN(maxEntries) || maxEntries <= 0) {
      console.log('[Scheduler] Item history retention disabled (0), skipping');
      return;
    }

    const deletedCount = await prisma.$executeRaw`
      DELETE FROM item_history
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY created_at DESC) as rn
          FROM item_history
        ) ranked
        WHERE rn > ${maxEntries}
      )
    `;

    if (deletedCount > 0) {
      console.log(`[Scheduler] Deleted ${deletedCount} excess item history entries (max ${maxEntries} per item)`);
    } else {
      console.log('[Scheduler] No excess item history to delete');
    }
  } catch (error) {
    console.error('[Scheduler] Error cleaning up excess item history:', error);
  }
}

/**
 * Daily job to check for low stock items and send notification
 */
async function checkLowStock(timezone: string): Promise<void> {
  console.log('[Scheduler] Checking for low stock items...');

  try {
    // Check if already sent today
    if (await wasNotificationSentToday('low_stock', timezone)) {
      console.log('[Scheduler] Low stock notification already sent today');
      return;
    }

    // Get low stock items (non-deleted only)
    const lowStockItems = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      sku: string | null;
      quantity: number;
      min_quantity: number;
    }>>`
      SELECT id, name, sku, quantity, min_quantity
      FROM items
      WHERE quantity <= min_quantity AND min_quantity > 0 AND deleted_at IS NULL
      ORDER BY (min_quantity - quantity) DESC
      LIMIT 50
    `;

    if (lowStockItems.length > 0) {
      console.log(`[Scheduler] Found ${lowStockItems.length} low stock item(s)`);

      const sent = await sendLowStockNotification(
        lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          minQuantity: item.min_quantity
        }))
      );

      if (sent) {
        await markNotificationSent('low_stock');
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error checking low stock:', error);
  }
}

/**
 * Run all daily tasks
 */
async function runDailyTasks(forceRun: boolean = false): Promise<void> {
  const settings = await getNotificationSettings();
  console.log(`[Scheduler] Running daily tasks at ${new Date().toISOString()} (configured time: ${settings.sendTime} ${settings.timezone})`);

  // Check if we should run based on time (unless forced)
  if (!forceRun && !isAtOrAfterSendTime(settings.sendTime, settings.timezone)) {
    console.log('[Scheduler] Not yet time to send notifications, skipping');
    return;
  }

  const smtpConfigured = await isSmtpConfigured();
  if (!smtpConfigured) {
    console.log('[Scheduler] SMTP not configured, skipping notification tasks');
  }

  // Always run cleanup tasks
  await cleanupExpiredQuarantine();
  await cleanupExpiredImages();
  await cleanupOldAuditLogs();
  await cleanupExcessItemHistory();

  // Get all notification configs to check their frequencies
  const configs = await prisma.notificationConfig.findMany({
    where: { enabled: true }
  });

  // Create a map for quick lookup
  const configMap: Record<string, typeof configs[0]> = {};
  for (const config of configs) {
    configMap[config.type] = config;
  }

  // Check each notification type based on its frequency
  const notificationTypes = ['low_stock', 'quarantine_expiring', 'item_created', 'item_quarantined', 'failed_login', 'permission_change'] as const;

  for (const type of notificationTypes) {
    const config = configMap[type];
    const frequency = (config?.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES[type];

    // Skip immediate notifications (they're sent in real-time)
    if (frequency === 'immediate') {
      continue;
    }

    // Check if it's time to send based on frequency
    if (!shouldSendDigest(config?.lastSentAt || null, frequency, settings.timezone)) {
      console.log(`[Scheduler] ${type}: Not yet time to send (frequency: ${frequency})`);
      continue;
    }

    console.log(`[Scheduler] Processing ${type} notifications (frequency: ${frequency})`);

    try {
      let sent = false;

      switch (type) {
        case 'low_stock':
          await checkLowStock(settings.timezone);
          break;
        case 'quarantine_expiring':
          await checkExpiringQuarantine(settings.timezone);
          break;
        case 'item_created':
          sent = await sendItemCreatedDigestNotification();
          if (sent) await markNotificationSent(type);
          break;
        case 'item_quarantined':
          sent = await sendItemQuarantinedDigestNotification();
          if (sent) await markNotificationSent(type);
          break;
        case 'failed_login':
          sent = await sendFailedLoginDigestNotification();
          if (sent) await markNotificationSent(type);
          break;
        case 'permission_change':
          sent = await sendPermissionChangeDigestNotification();
          if (sent) await markNotificationSent(type);
          break;
      }
    } catch (error) {
      console.error(`[Scheduler] Error processing ${type}:`, error);
    }
  }

  console.log('[Scheduler] Daily tasks completed');
}

/**
 * Initialize the scheduler with cron jobs
 */
export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing background job scheduler...');

  // Run every hour to check if it's time to send notifications
  // This allows for dynamic send time changes without server restart
  cron.schedule('0 * * * *', () => {
    runDailyTasks().catch(err => console.error('[Scheduler] Hourly check failed:', err));
  }, {
    timezone: 'UTC'
  });

  console.log('[Scheduler] Scheduled hourly notification checks');

  // Run startup check after a delay
  setTimeout(async () => {
    console.log('[Scheduler] Running startup check...');
    try {
      const settings = await getNotificationSettings();
      console.log(`[Scheduler] Notification send time configured: ${settings.sendTime} ${settings.timezone}`);

      // On startup, check if we should send (but only if it's at/after send time AND not sent today)
      await runDailyTasks();
    } catch (err) {
      console.error('[Scheduler] Startup tasks failed:', err);
    }
  }, 10000); // 10 second delay
}

/**
 * Manually trigger the daily tasks (for testing or manual runs)
 */
export async function triggerDailyTasks(): Promise<void> {
  await runDailyTasks(true); // Force run regardless of time
}

/**
 * Manually trigger only the data retention cleanup tasks
 */
export async function triggerRetentionCleanup(): Promise<{ auditDeleted: number; historyDeleted: number }> {
  console.log('[Scheduler] Manual retention cleanup triggered');

  let auditDeleted = 0;
  let historyDeleted = 0;

  // Audit log cleanup
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'audit.retentionDays' } });
    const retentionDays = parseInt(setting?.value || '365', 10);

    if (!isNaN(retentionDays) && retentionDays > 0) {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoffDate } } });
      auditDeleted = result.count;
    }
  } catch (error) {
    console.error('[Scheduler] Error in manual audit log cleanup:', error);
  }

  // Item history cleanup
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'item.historyRetentionCount' } });
    const maxEntries = parseInt(setting?.value || '50', 10);

    if (!isNaN(maxEntries) && maxEntries > 0) {
      historyDeleted = await prisma.$executeRaw`
        DELETE FROM item_history
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY created_at DESC) as rn
            FROM item_history
          ) ranked
          WHERE rn > ${maxEntries}
        )
      `;
    }
  } catch (error) {
    console.error('[Scheduler] Error in manual item history cleanup:', error);
  }

  console.log(`[Scheduler] Manual cleanup done: ${auditDeleted} audit logs, ${historyDeleted} item history entries deleted`);
  return { auditDeleted, historyDeleted };
}
