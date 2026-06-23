import { useState, useEffect } from 'react';
import { NotificationType, NotificationConfig, NotificationRecipients, NotificationFrequency, Role } from '../../types';
import { settingsApi, rolesApi } from '../../services/api';
import NotificationCard from '../../components/NotificationCard';
import TemplateEditorModal from '../../components/TemplateEditorModal';
import { ExclamationTriangleIcon, TrashIcon, PlusIcon, ShieldCheckIcon, UserGroupIcon, ClockIcon, BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Notification type configuration for data-driven UI
const NOTIFICATION_TYPE_CONFIG: Array<{
  type: NotificationType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  defaultFrequency: NotificationFrequency;
}> = [
  {
    type: 'low_stock',
    title: 'Low Stock Alert',
    description: 'Notify when items fall below minimum quantity',
    icon: ExclamationTriangleIcon,
    iconColor: '#f59e0b',
    defaultFrequency: 'daily'
  },
  {
    type: 'item_quarantined',
    title: 'Item Quarantined',
    description: 'Notify when items are deleted and moved to quarantine',
    icon: TrashIcon,
    iconColor: '#ef4444',
    defaultFrequency: 'immediate'
  },
  {
    type: 'quarantine_expiring',
    title: 'Quarantine Expiring',
    description: 'Notify when quarantined items are about to be permanently deleted',
    icon: ClockIcon,
    iconColor: '#f97316',
    defaultFrequency: 'daily'
  },
  {
    type: 'failed_login',
    title: 'Failed Login Alert',
    description: 'Notify when 3+ failed login attempts occur for a username',
    icon: ShieldCheckIcon,
    iconColor: '#ef4444',
    defaultFrequency: 'immediate'
  },
  {
    type: 'item_created',
    title: 'New Item Created',
    description: 'Notify when new items are added to the inventory',
    icon: PlusIcon,
    iconColor: '#22c55e',
    defaultFrequency: 'immediate'
  },
  {
    type: 'permission_change',
    title: 'Permission Changes',
    description: 'Notify when roles are modified, users are deactivated, or permissions change',
    icon: UserGroupIcon,
    iconColor: '#8b5cf6',
    defaultFrequency: 'immediate'
  }
];

export default function NotificationsSettings() {
  const [loading, setLoading] = useState(true);

  // Notification settings
  const [notificationConfigs, setNotificationConfigs] = useState<Record<NotificationType, NotificationConfig | null>>({
    low_stock: null,
    item_quarantined: null,
    quarantine_expiring: null,
    failed_login: null,
    item_created: null,
    permission_change: null
  });
  const [, setRoles] = useState<Role[]>([]);
  const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipients>({
    roles: [],
    groups: [],
    users: []
  });
  const [savingNotification, setSavingNotification] = useState<NotificationType | null>(null);
  const [templateEditorType, setTemplateEditorType] = useState<NotificationType | null>(null);

  // Pending notification configs (for staged changes before save)
  const [pendingNotificationConfigs, setPendingNotificationConfigs] = useState<Record<NotificationType, NotificationConfig | null>>({
    low_stock: null,
    item_quarantined: null,
    quarantine_expiring: null,
    failed_login: null,
    item_created: null,
    permission_change: null
  });

  // Notification schedule settings
  const [notificationSendTime, setNotificationSendTime] = useState('02:00');
  const [systemTimezone, setSystemTimezone] = useState('UTC');

  const fetchNotificationData = async () => {
    try {
      const [notifResponse, recipientsResponse, rolesResponse] = await Promise.all([
        settingsApi.getNotifications(),
        settingsApi.getNotificationRecipients(),
        rolesApi.getAll()
      ]);
      const configs = notifResponse.data.data;
      setNotificationConfigs(configs);
      // Initialize pending configs with a deep copy
      setPendingNotificationConfigs({
        low_stock: configs.low_stock ? { ...configs.low_stock } : null,
        item_quarantined: configs.item_quarantined ? { ...configs.item_quarantined } : null,
        quarantine_expiring: configs.quarantine_expiring ? { ...configs.quarantine_expiring } : null,
        failed_login: configs.failed_login ? { ...configs.failed_login } : null,
        item_created: configs.item_created ? { ...configs.item_created } : null,
        permission_change: configs.permission_change ? { ...configs.permission_change } : null
      });
      setNotificationRecipients(recipientsResponse.data.data);
      setRoles(rolesResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const settings = await settingsApi.getAll();
        if (settings['notification.dailySendTime']) {
          setNotificationSendTime(settings['notification.dailySendTime']);
        }
        if (settings['system.timezone']) {
          setSystemTimezone(settings['system.timezone']);
        }
        await fetchNotificationData();
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Notification handlers
  const handlePendingNotificationChange = (type: NotificationType, updates: Partial<NotificationConfig>) => {
    setPendingNotificationConfigs(prev => {
      const current = prev[type] || { enabled: false, recipientRoleIds: [], recipientGroupIds: [], recipientUserIds: [] };
      return {
        ...prev,
        [type]: { ...current, ...updates }
      };
    });
  };

  const hasUnsavedNotificationChanges = (type: NotificationType): boolean => {
    const saved = notificationConfigs[type];
    const pending = pendingNotificationConfigs[type];
    if (!saved && !pending) return false;
    if (!saved || !pending) return true;
    return (
      saved.enabled !== pending.enabled ||
      JSON.stringify(saved.recipientRoleIds) !== JSON.stringify(pending.recipientRoleIds) ||
      JSON.stringify(saved.recipientGroupIds) !== JSON.stringify(pending.recipientGroupIds) ||
      JSON.stringify(saved.recipientUserIds) !== JSON.stringify(pending.recipientUserIds)
    );
  };

  const handleSaveNotification = async (type: NotificationType) => {
    setSavingNotification(type);
    try {
      const pending = pendingNotificationConfigs[type];
      await settingsApi.updateNotification(type, {
        enabled: pending?.enabled ?? false,
        frequency: pending?.frequency,
        recipientRoleIds: pending?.recipientRoleIds ?? [],
        recipientGroupIds: pending?.recipientGroupIds ?? [],
        recipientUserIds: pending?.recipientUserIds ?? []
      });
      await fetchNotificationData();
      toast.success('Notification settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save notification');
    } finally {
      setSavingNotification(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #ec4899 20%, transparent)' }}>
          <BellIcon className="w-6 h-6" style={{ color: '#ec4899' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Notification Settings</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure email notifications for various events</p>
        </div>
      </div>

      {/* Daily Send Time Setting */}
      <div className="p-4 mb-6 rounded-lg border" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Digest Send Time</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Digest notifications are sent at this time. Immediate notifications are sent right away regardless of this setting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={notificationSendTime}
              onChange={async (e) => {
                setNotificationSendTime(e.target.value);
                try {
                  await settingsApi.update({ 'notification.dailySendTime': e.target.value });
                  toast.success('Send time saved');
                } catch (error) {
                  console.error('Failed to save notification time:', error);
                  toast.error('Failed to save send time');
                }
              }}
              className="input w-32"
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <ClockIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{systemTimezone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Cards - Data-driven */}
      <div className="space-y-4">
        {NOTIFICATION_TYPE_CONFIG.map((notifConfig) => (
          <NotificationCard
            key={notifConfig.type}
            type={notifConfig.type}
            title={notifConfig.title}
            description={notifConfig.description}
            icon={notifConfig.icon}
            iconColor={notifConfig.iconColor}
            config={pendingNotificationConfigs[notifConfig.type]}
            recipients={notificationRecipients}
            onChange={handlePendingNotificationChange}
            onSave={() => handleSaveNotification(notifConfig.type)}
            onEditTemplate={(type) => setTemplateEditorType(type)}
            hasChanges={hasUnsavedNotificationChanges(notifConfig.type)}
            isSaving={savingNotification === notifConfig.type}
            defaultFrequency={notifConfig.defaultFrequency}
          />
        ))}

        {/* Info Box */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #ec4899 10%, transparent)', borderColor: 'color-mix(in srgb, #ec4899 20%, transparent)' }}>
          <div className="flex items-start gap-3">
            <BellIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#ec4899' }} />
            <div className="text-sm" style={{ color: '#ec4899' }}>
              <p className="mb-2">Notifications require SMTP to be configured in the Email tab.</p>
              <p><strong>Important:</strong> Configure your server hostname and port in the <strong>Network</strong> tab so email links work correctly for external users.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Template Editor Modal */}
      {templateEditorType && (
        <TemplateEditorModal
          isOpen={!!templateEditorType}
          onClose={() => setTemplateEditorType(null)}
          notificationType={templateEditorType}
          notificationTitle={NOTIFICATION_TYPE_CONFIG.find(c => c.type === templateEditorType)?.title || ''}
        />
      )}
    </div>
  );
}
