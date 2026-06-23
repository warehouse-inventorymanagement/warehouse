import Toggle from './Toggle';
import ChipMultiSelect from './ChipMultiSelect';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import type { NotificationType, NotificationConfig, NotificationRecipients, NotificationFrequency } from '../types';
import { FREQUENCY_OPTIONS } from '../types';

interface NotificationCardProps {
  type: NotificationType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  config: NotificationConfig | null;
  recipients: NotificationRecipients;
  onChange: (type: NotificationType, updates: Partial<NotificationConfig>) => void;
  onSave: () => void;
  onEditTemplate: (type: NotificationType) => void;
  hasChanges: boolean;
  isSaving: boolean;
  defaultFrequency: NotificationFrequency;
}

export default function NotificationCard({
  type,
  title,
  description,
  icon: Icon,
  iconColor,
  config,
  recipients,
  onChange,
  onSave,
  onEditTemplate,
  hasChanges,
  isSaving,
  defaultFrequency
}: NotificationCardProps) {
  const isEnabled = config?.enabled ?? false;
  const currentFrequency = config?.frequency || defaultFrequency;

  // Transform recipients to ChipMultiSelect format
  const roleOptions = recipients.roles.map(r => ({ id: r.id, label: r.name }));
  const groupOptions = recipients.groups.map(g => ({ id: g.id, label: g.name }));
  const userOptions = recipients.users.map(u => ({
    id: u.id,
    label: u.displayName,
    sublabel: u.email
  }));

  return (
    <div
      className="rounded-lg border transition-all overflow-hidden"
      style={{
        borderColor: hasChanges ? 'var(--accent)' : 'var(--bg-tertiary)',
        boxShadow: hasChanges ? '0 0 0 1px var(--accent)' : 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 20%, transparent)` }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                color: 'var(--accent)'
              }}
            >
              Modified
            </span>
          )}
          {isEnabled && (
            <button
              type="button"
              onClick={() => onEditTemplate(type)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Edit email template"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <CodeBracketIcon className="w-4 h-4" />
            </button>
          )}
          <Toggle
            checked={isEnabled}
            onChange={(checked) => onChange(type, { enabled: checked })}
          />
        </div>
      </div>

      {/* Expandable recipient section with animation */}
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isEnabled ? '500px' : '0',
          opacity: isEnabled ? 1 : 0,
          overflow: isEnabled ? 'visible' : 'hidden'
        }}
      >
        <div
          className="px-4 pb-4 pt-2 border-t"
          style={{ borderColor: 'var(--bg-tertiary)' }}
        >
          {/* Frequency Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Delivery Frequency
            </label>
            <select
              value={currentFrequency}
              onChange={(e) => onChange(type, { frequency: e.target.value as NotificationFrequency })}
              className="px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
                color: 'var(--text-primary)',
                minWidth: '180px'
              }}
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {currentFrequency === 'immediate'
                ? 'Notifications are sent instantly when events occur.'
                : 'Events are collected and sent as a digest at the configured daily send time.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ChipMultiSelect
              label="Notify Roles"
              options={roleOptions}
              selectedIds={config?.recipientRoleIds || []}
              onChange={(ids) => onChange(type, { recipientRoleIds: ids })}
              placeholder="Select roles..."
            />
            <ChipMultiSelect
              label="Notify Groups"
              options={groupOptions}
              selectedIds={config?.recipientGroupIds || []}
              onChange={(ids) => onChange(type, { recipientGroupIds: ids })}
              placeholder="Select groups..."
            />
            <ChipMultiSelect
              label="Notify Users"
              options={userOptions}
              selectedIds={config?.recipientUserIds || []}
              onChange={(ids) => onChange(type, { recipientUserIds: ids })}
              placeholder="Select users..."
            />
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                backgroundColor: hasChanges ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: hasChanges ? 'white' : 'var(--text-secondary)'
              }}
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
