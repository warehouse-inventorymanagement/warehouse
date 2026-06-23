import { sendEmail, isSmtpConfigured } from './email.service.js';
import { getFrontendUrl } from './settings.service.js';
import { getEffectiveTemplate, renderTemplate } from './templateRenderer.service.js';
import prisma from '../lib/prisma.js';

export type NotificationType = 'low_stock' | 'item_quarantined' | 'quarantine_expiring' | 'failed_login' | 'item_created' | 'permission_change' | 'new_device' | 'blocked_device_attempt';

export type NotificationFrequency = 'immediate' | 'daily' | 'every_2_days' | 'every_3_days' | 'every_4_days' | 'weekly';

export const DEFAULT_FREQUENCIES: Record<NotificationType, NotificationFrequency> = {
  low_stock: 'daily',
  quarantine_expiring: 'daily',
  item_quarantined: 'immediate',
  item_created: 'immediate',
  failed_login: 'immediate',
  permission_change: 'immediate',
  new_device: 'immediate',
  blocked_device_attempt: 'immediate'
};

interface NotificationRecipient {
  email: string;
  username: string;
}

/**
 * Get notification configuration for a specific type
 */
export async function getNotificationConfig(type: NotificationType) {
  return prisma.notificationConfig.findUnique({
    where: { type }
  });
}

/**
 * Get all notification configurations
 */
export async function getAllNotificationConfigs() {
  const configs = await prisma.notificationConfig.findMany();

  // Ensure all notification types have a config entry
  const types: NotificationType[] = ['low_stock', 'item_quarantined', 'quarantine_expiring', 'failed_login', 'item_created', 'permission_change', 'new_device', 'blocked_device_attempt'];
  const configMap: Record<string, typeof configs[0] | null> = {};

  for (const type of types) {
    configMap[type] = configs.find(c => c.type === type) || null;
  }

  return configMap;
}

/**
 * Update notification configuration
 */
export async function updateNotificationConfig(
  type: NotificationType,
  data: {
    enabled?: boolean;
    frequency?: NotificationFrequency;
    recipientRoleIds?: string[];
    recipientGroupIds?: string[];
    recipientUserIds?: string[];
  }
) {
  return prisma.notificationConfig.upsert({
    where: { type },
    update: data,
    create: {
      type,
      enabled: data.enabled ?? true,
      frequency: data.frequency ?? DEFAULT_FREQUENCIES[type],
      recipientRoleIds: data.recipientRoleIds ?? [],
      recipientGroupIds: data.recipientGroupIds ?? [],
      recipientUserIds: data.recipientUserIds ?? []
    }
  });
}

/**
 * Get recipients for a notification type based on configuration
 */
export async function getNotificationRecipients(type: NotificationType): Promise<NotificationRecipient[]> {
  const config = await getNotificationConfig(type);

  if (!config || !config.enabled) {
    return [];
  }

  const recipients: NotificationRecipient[] = [];
  const emailsAdded = new Set<string>();

  // Get users from specified role IDs (direct role assignment)
  if (config.recipientRoleIds.length > 0) {
    const usersFromRoles = await prisma.user.findMany({
      where: {
        isActive: true,
        roleId: { in: config.recipientRoleIds }
      },
      select: { email: true, username: true }
    });

    for (const user of usersFromRoles) {
      if (!emailsAdded.has(user.email)) {
        recipients.push(user);
        emailsAdded.add(user.email);
      }
    }
  }

  // Get users from specified group IDs
  if (config.recipientGroupIds && config.recipientGroupIds.length > 0) {
    const usersFromGroups = await prisma.user.findMany({
      where: {
        isActive: true,
        groups: {
          some: {
            groupId: { in: config.recipientGroupIds }
          }
        }
      },
      select: { email: true, username: true }
    });

    for (const user of usersFromGroups) {
      if (!emailsAdded.has(user.email)) {
        recipients.push(user);
        emailsAdded.add(user.email);
      }
    }
  }

  // Get specific users
  if (config.recipientUserIds.length > 0) {
    const specificUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { in: config.recipientUserIds }
      },
      select: { email: true, username: true }
    });

    for (const user of specificUsers) {
      if (!emailsAdded.has(user.email)) {
        recipients.push(user);
        emailsAdded.add(user.email);
      }
    }
  }

  return recipients;
}

/**
 * Send low stock notification
 */
export async function sendLowStockNotification(
  items: { id: string; name: string; sku: string | null; quantity: number; minQuantity: number }[]
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping low stock notification');
    return false;
  }

  const recipients = await getNotificationRecipients('low_stock');
  if (recipients.length === 0) {
    console.log('No recipients configured for low stock notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const itemsTableRows = items
    .map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.sku || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.minQuantity}</td>
      </tr>
    `)
    .join('');

  const data: Record<string, string> = {
    itemCount: String(items.length),
    itemsTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('low_stock', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send low stock notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Send item quarantined notification
 */
export async function sendItemQuarantinedNotification(
  item: { id: string; name: string; sku: string | null },
  deletedBy: { username: string }
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping quarantine notification');
    return false;
  }

  const recipients = await getNotificationRecipients('item_quarantined');
  if (recipients.length === 0) {
    console.log('No recipients configured for quarantine notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const data: Record<string, string> = {
    itemName: item.name,
    sku: item.sku || '-',
    deletedBy: deletedBy.username,
    deletedAt: new Date().toLocaleString(),
    frontendUrl,
  };

  const template = await getEffectiveTemplate('item_quarantined', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send quarantine notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Send quarantine expiring notification
 */
export async function sendQuarantineExpiringNotification(
  items: { id: string; name: string; sku: string | null; daysUntilExpiration: number }[]
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping expiration notification');
    return false;
  }

  const recipients = await getNotificationRecipients('quarantine_expiring');
  if (recipients.length === 0) {
    console.log('No recipients configured for expiration notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const itemsTableRows = items
    .map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.sku || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #f59e0b; font-weight: bold;">${item.daysUntilExpiration} days</td>
      </tr>
    `)
    .join('');

  const data: Record<string, string> = {
    itemCount: String(items.length),
    itemsTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('quarantine_expiring', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send expiration notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Send failed login notification (3+ failed attempts)
 */
export async function sendFailedLoginNotification(
  username: string,
  failedAttempts: number,
  req?: { ip?: string; get?: (name: string) => string | undefined }
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping failed login notification');
    return false;
  }

  const recipients = await getNotificationRecipients('failed_login');
  if (recipients.length === 0) {
    console.log('No recipients configured for failed login notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();
  const ipAddress = req?.ip || req?.get?.('x-forwarded-for')?.split(',')[0] || req?.get?.('x-real-ip') || 'Unknown';
  const userAgent = req?.get?.('user-agent') || 'Unknown';

  const data: Record<string, string> = {
    username,
    failedAttempts: String(failedAttempts),
    ipAddress,
    userAgent,
    time: new Date().toLocaleString(),
    frontendUrl,
  };

  const template = await getEffectiveTemplate('failed_login', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send failed login notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Send new item created notification
 */
export async function sendItemCreatedNotification(
  item: { id: string; name: string; sku: string | null; categoryName?: string; locationName?: string },
  createdBy: { username: string }
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping item created notification');
    return false;
  }

  const recipients = await getNotificationRecipients('item_created');
  if (recipients.length === 0) {
    console.log('No recipients configured for item created notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const data: Record<string, string> = {
    itemName: item.name,
    sku: item.sku || '-',
    categoryName: item.categoryName || '-',
    locationName: item.locationName || '-',
    createdBy: createdBy.username,
    createdAt: new Date().toLocaleString(),
    itemId: item.id,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('item_created', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send item created notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Send permission/role change notification
 */
export async function sendPermissionChangeNotification(
  change: {
    type: 'role_updated' | 'role_deleted' | 'user_role_changed' | 'user_deactivated';
    entityName: string;
    details: string;
  },
  changedBy: { username: string }
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping permission change notification');
    return false;
  }

  const recipients = await getNotificationRecipients('permission_change');
  if (recipients.length === 0) {
    console.log('No recipients configured for permission change notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const typeLabels: Record<string, string> = {
    'role_updated': 'Role Updated',
    'role_deleted': 'Role Deleted',
    'user_role_changed': 'User Role Changed',
    'user_deactivated': 'User Deactivated',
  };

  const data: Record<string, string> = {
    changeType: typeLabels[change.type] || change.type,
    entityName: change.entityName,
    details: change.details,
    changedBy: changedBy.username,
    time: new Date().toLocaleString(),
    frontendUrl,
  };

  const template = await getEffectiveTemplate('permission_change', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send permission change notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Queue a notification event for later digest sending
 */
export async function queueNotificationEvent(
  type: NotificationType,
  eventData: Record<string, unknown>
): Promise<void> {
  let config = await prisma.notificationConfig.findUnique({
    where: { type }
  });

  if (!config) {
    // Create default config if doesn't exist
    config = await prisma.notificationConfig.create({
      data: {
        type,
        enabled: true,
        frequency: DEFAULT_FREQUENCIES[type],
        recipientRoleIds: [],
        recipientGroupIds: [],
        recipientUserIds: []
      }
    });
  }

  await prisma.pendingNotificationEvent.create({
    data: {
      notificationConfigId: config.id,
      eventType: type,
      eventData: JSON.stringify(eventData)
    }
  });
}

/**
 * Get pending events for a notification type
 */
export async function getPendingEvents(type: NotificationType) {
  const config = await prisma.notificationConfig.findUnique({
    where: { type },
    include: { pendingEvents: { orderBy: { createdAt: 'asc' } } }
  });

  if (!config) return [];
  return config.pendingEvents.map(e => ({
    ...JSON.parse(e.eventData),
    _eventId: e.id,
    _createdAt: e.createdAt
  }));
}

/**
 * Clear pending events for a notification type
 */
export async function clearPendingEvents(type: NotificationType): Promise<void> {
  const config = await prisma.notificationConfig.findUnique({
    where: { type }
  });

  if (config) {
    await prisma.pendingNotificationEvent.deleteMany({
      where: { notificationConfigId: config.id }
    });
  }
}

/**
 * Trigger item created notification - checks frequency setting
 */
export async function triggerItemCreatedNotification(
  item: { id: string; name: string; sku: string | null; categoryName?: string; locationName?: string },
  createdBy: { username: string }
): Promise<boolean> {
  const config = await getNotificationConfig('item_created');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.item_created;

  if (frequency === 'immediate') {
    return sendItemCreatedNotification(item, createdBy);
  } else {
    await queueNotificationEvent('item_created', {
      item,
      createdBy,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Trigger item quarantined notification - checks frequency setting
 */
export async function triggerItemQuarantinedNotification(
  item: { id: string; name: string; sku: string | null },
  deletedBy: { username: string }
): Promise<boolean> {
  const config = await getNotificationConfig('item_quarantined');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.item_quarantined;

  if (frequency === 'immediate') {
    return sendItemQuarantinedNotification(item, deletedBy);
  } else {
    await queueNotificationEvent('item_quarantined', {
      item,
      deletedBy,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Trigger failed login notification - checks frequency setting
 */
export async function triggerFailedLoginNotification(
  username: string,
  failedAttempts: number,
  req?: { ip?: string; get?: (name: string) => string | undefined }
): Promise<boolean> {
  const config = await getNotificationConfig('failed_login');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.failed_login;

  if (frequency === 'immediate') {
    return sendFailedLoginNotification(username, failedAttempts, req);
  } else {
    const ipAddress = req?.ip || req?.get?.('x-forwarded-for')?.split(',')[0] || req?.get?.('x-real-ip') || 'Unknown';
    const userAgent = req?.get?.('user-agent') || 'Unknown';
    await queueNotificationEvent('failed_login', {
      username,
      failedAttempts,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Trigger permission change notification - checks frequency setting
 */
export async function triggerPermissionChangeNotification(
  change: {
    type: 'role_updated' | 'role_deleted' | 'user_role_changed' | 'user_deactivated';
    entityName: string;
    details: string;
  },
  changedBy: { username: string }
): Promise<boolean> {
  const config = await getNotificationConfig('permission_change');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.permission_change;

  if (frequency === 'immediate') {
    return sendPermissionChangeNotification(change, changedBy);
  } else {
    await queueNotificationEvent('permission_change', {
      change,
      changedBy,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Send new device registration notification to the user
 */
export async function sendNewDeviceNotification(
  user: { id: string; username: string; email: string },
  device: { id: string; name: string; model?: string | null; manufacturer?: string | null; androidVersion?: string | null }
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping new device notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const data: Record<string, string> = {
    username: user.username,
    deviceName: device.name,
    manufacturer: device.manufacturer || '-',
    model: device.model || '-',
    androidVersion: device.androidVersion || '-',
    registeredAt: new Date().toLocaleString(),
    frontendUrl,
  };

  const template = await getEffectiveTemplate('new_device', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  try {
    await sendEmail(user.email, subject, html);
    return true;
  } catch (error) {
    console.error(`Failed to send new device notification to ${user.email}:`, error);
    return false;
  }
}

/**
 * Trigger new device notification - checks frequency setting
 */
export async function triggerNewDeviceNotification(
  user: { id: string; username: string; email: string },
  device: { id: string; name: string; model?: string | null; manufacturer?: string | null; androidVersion?: string | null }
): Promise<boolean> {
  const config = await getNotificationConfig('new_device');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.new_device;

  if (frequency === 'immediate') {
    return sendNewDeviceNotification(user, device);
  } else {
    await queueNotificationEvent('new_device', {
      user,
      device,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Send blocked device access attempt notification to admins
 */
export async function sendBlockedDeviceAttemptNotification(
  user: { id: string; username: string; email: string },
  device: { id: string; name: string; model?: string | null; manufacturer?: string | null },
  ipAddress?: string
): Promise<boolean> {
  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping blocked device attempt notification');
    return false;
  }

  const recipients = await getNotificationRecipients('blocked_device_attempt');
  if (recipients.length === 0) {
    console.log('No recipients configured for blocked device attempt notification');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const data: Record<string, string> = {
    username: user.username,
    userEmail: user.email,
    deviceName: device.name,
    manufacturer: device.manufacturer || '-',
    model: device.model || '-',
    ipAddress: ipAddress || 'Unknown',
    time: new Date().toLocaleString(),
    frontendUrl,
  };

  const template = await getEffectiveTemplate('blocked_device_attempt', 'immediate');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send blocked device notification to ${recipient.email}:`, error);
    }
  }

  return sent;
}

/**
 * Trigger blocked device attempt notification - checks frequency setting
 */
export async function triggerBlockedDeviceAttemptNotification(
  user: { id: string; username: string; email: string },
  device: { id: string; name: string; model?: string | null; manufacturer?: string | null },
  ipAddress?: string
): Promise<boolean> {
  const config = await getNotificationConfig('blocked_device_attempt');
  if (!config?.enabled) return false;

  const frequency = (config.frequency as NotificationFrequency) || DEFAULT_FREQUENCIES.blocked_device_attempt;

  if (frequency === 'immediate') {
    return sendBlockedDeviceAttemptNotification(user, device, ipAddress);
  } else {
    await queueNotificationEvent('blocked_device_attempt', {
      user,
      device,
      ipAddress,
      timestamp: new Date().toISOString()
    });
    return true;
  }
}

/**
 * Send digest notification for item_created events
 */
export async function sendItemCreatedDigestNotification(): Promise<boolean> {
  const events = await getPendingEvents('item_created');
  if (events.length === 0) return false;

  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping item created digest');
    return false;
  }

  const recipients = await getNotificationRecipients('item_created');
  if (recipients.length === 0) {
    console.log('No recipients for item created digest');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const itemsTableRows = events
    .map((e: { item: { name: string; sku: string | null; categoryName?: string }; createdBy: { username: string }; timestamp: string }) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.item.sku || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.item.categoryName || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.createdBy.username}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(e.timestamp).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const data: Record<string, string> = {
    itemCount: String(events.length),
    itemsTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('item_created', 'digest');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send item created digest to ${recipient.email}:`, error);
    }
  }

  if (sent) {
    await clearPendingEvents('item_created');
  }

  return sent;
}

/**
 * Send digest notification for item_quarantined events
 */
export async function sendItemQuarantinedDigestNotification(): Promise<boolean> {
  const events = await getPendingEvents('item_quarantined');
  if (events.length === 0) return false;

  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping quarantined digest');
    return false;
  }

  const recipients = await getNotificationRecipients('item_quarantined');
  if (recipients.length === 0) {
    console.log('No recipients for quarantined digest');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const itemsTableRows = events
    .map((e: { item: { name: string; sku: string | null }; deletedBy: { username: string }; timestamp: string }) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.item.sku || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.deletedBy.username}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(e.timestamp).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const data: Record<string, string> = {
    itemCount: String(events.length),
    itemsTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('item_quarantined', 'digest');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send quarantined digest to ${recipient.email}:`, error);
    }
  }

  if (sent) {
    await clearPendingEvents('item_quarantined');
  }

  return sent;
}

/**
 * Send digest notification for failed_login events
 */
export async function sendFailedLoginDigestNotification(): Promise<boolean> {
  const events = await getPendingEvents('failed_login');
  if (events.length === 0) return false;

  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping failed login digest');
    return false;
  }

  const recipients = await getNotificationRecipients('failed_login');
  if (recipients.length === 0) {
    console.log('No recipients for failed login digest');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  // Group by username
  const byUsername: Record<string, { totalAttempts: number; events: typeof events }> = {};
  for (const e of events) {
    const event = e as { username: string; failedAttempts: number; ipAddress: string; timestamp: string };
    if (!byUsername[event.username]) {
      byUsername[event.username] = { totalAttempts: 0, events: [] };
    }
    byUsername[event.username].totalAttempts += event.failedAttempts;
    byUsername[event.username].events.push(e);
  }

  const summaryTableRows = Object.entries(byUsername)
    .map(([username, data]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${username}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${data.totalAttempts}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.events.length}</td>
      </tr>
    `)
    .join('');

  const templateData: Record<string, string> = {
    incidentCount: String(events.length),
    summaryTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('failed_login', 'digest');
  const html = renderTemplate(template.html, templateData);
  const subject = renderTemplate(template.subject, templateData);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send failed login digest to ${recipient.email}:`, error);
    }
  }

  if (sent) {
    await clearPendingEvents('failed_login');
  }

  return sent;
}

/**
 * Send digest notification for permission_change events
 */
export async function sendPermissionChangeDigestNotification(): Promise<boolean> {
  const events = await getPendingEvents('permission_change');
  if (events.length === 0) return false;

  if (!await isSmtpConfigured()) {
    console.log('SMTP not configured, skipping permission change digest');
    return false;
  }

  const recipients = await getNotificationRecipients('permission_change');
  if (recipients.length === 0) {
    console.log('No recipients for permission change digest');
    return false;
  }

  const frontendUrl = await getFrontendUrl();

  const typeLabels: Record<string, string> = {
    'role_updated': 'Role Updated',
    'role_deleted': 'Role Deleted',
    'user_role_changed': 'User Role Changed',
    'user_deactivated': 'User Deactivated',
  };

  const changesTableRows = events
    .map((e: { change: { type: string; entityName: string; details: string }; changedBy: { username: string }; timestamp: string }) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${typeLabels[e.change.type] || e.change.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.change.entityName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.change.details}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${e.changedBy.username}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(e.timestamp).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const data: Record<string, string> = {
    changeCount: String(events.length),
    changesTableRows,
    frontendUrl,
  };

  const template = await getEffectiveTemplate('permission_change', 'digest');
  const html = renderTemplate(template.html, data);
  const subject = renderTemplate(template.subject, data);

  let sent = false;
  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html);
      sent = true;
    } catch (error) {
      console.error(`Failed to send permission change digest to ${recipient.email}:`, error);
    }
  }

  if (sent) {
    await clearPendingEvents('permission_change');
  }

  return sent;
}
