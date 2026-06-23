import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function TimezoneSettings() {
  const [loading, setLoading] = useState(true);
  const [systemTimezone, setSystemTimezone] = useState('UTC');
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [headerShowDateTime, setHeaderShowDateTime] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = (await settingsApi.getAll()).data.data;
        setSystemTimezone(data['system.timezone'] || data['notification.timezone'] || 'UTC');
        setHeaderShowDateTime(data['header.showDateTime'] !== 'false');
      } catch {
        toast.error('Failed to load timezone settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

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
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #06b6d4 20%, transparent)' }}>
          <ClockIcon className="w-6 h-6" style={{ color: '#06b6d4' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Timezone Settings</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure the system timezone for notifications and scheduled tasks</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* System Timezone */}
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[300px]">
              <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>System Timezone</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                This timezone is used for scheduling notifications and other time-based operations.
                All scheduled tasks will run according to this timezone.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <select
                value={systemTimezone}
                onChange={async (e) => {
                  const newTimezone = e.target.value;
                  setSystemTimezone(newTimezone);
                  setSavingTimezone(true);
                  try {
                    await settingsApi.update({ 'system.timezone': newTimezone });
                    toast.success('Timezone saved successfully');
                  } catch (error) {
                    console.error('Failed to save timezone:', error);
                    toast.error('Failed to save timezone');
                  } finally {
                    setSavingTimezone(false);
                  }
                }}
                className="input w-64"
                disabled={savingTimezone}
              >
                <optgroup label="UTC">
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="America/New_York">Eastern Time (ET) - New York</option>
                  <option value="America/Chicago">Central Time (CT) - Chicago</option>
                  <option value="America/Denver">Mountain Time (MT) - Denver</option>
                  <option value="America/Los_Angeles">Pacific Time (PT) - Los Angeles</option>
                  <option value="America/Anchorage">Alaska Time (AKT) - Anchorage</option>
                  <option value="America/Toronto">Eastern Time (ET) - Toronto</option>
                  <option value="America/Vancouver">Pacific Time (PT) - Vancouver</option>
                  <option value="America/Mexico_City">Central Time (CT) - Mexico City</option>
                  <option value="America/Sao_Paulo">Brasilia Time (BRT) - São Paulo</option>
                  <option value="America/Argentina/Buenos_Aires">Argentina Time (ART) - Buenos Aires</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London">Greenwich Mean Time (GMT) - London</option>
                  <option value="Europe/Paris">Central European Time (CET) - Paris</option>
                  <option value="Europe/Berlin">Central European Time (CET) - Berlin</option>
                  <option value="Europe/Amsterdam">Central European Time (CET) - Amsterdam</option>
                  <option value="Europe/Madrid">Central European Time (CET) - Madrid</option>
                  <option value="Europe/Rome">Central European Time (CET) - Rome</option>
                  <option value="Europe/Stockholm">Central European Time (CET) - Stockholm</option>
                  <option value="Europe/Moscow">Moscow Time (MSK) - Moscow</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="Asia/Dubai">Gulf Standard Time (GST) - Dubai</option>
                  <option value="Asia/Kolkata">India Standard Time (IST) - Mumbai</option>
                  <option value="Asia/Bangkok">Indochina Time (ICT) - Bangkok</option>
                  <option value="Asia/Singapore">Singapore Time (SGT) - Singapore</option>
                  <option value="Asia/Hong_Kong">Hong Kong Time (HKT) - Hong Kong</option>
                  <option value="Asia/Shanghai">China Standard Time (CST) - Shanghai</option>
                  <option value="Asia/Tokyo">Japan Standard Time (JST) - Tokyo</option>
                  <option value="Asia/Seoul">Korea Standard Time (KST) - Seoul</option>
                </optgroup>
                <optgroup label="Australia & Pacific">
                  <option value="Australia/Perth">Australian Western Time (AWST) - Perth</option>
                  <option value="Australia/Adelaide">Australian Central Time (ACST) - Adelaide</option>
                  <option value="Australia/Sydney">Australian Eastern Time (AEST) - Sydney</option>
                  <option value="Australia/Melbourne">Australian Eastern Time (AEST) - Melbourne</option>
                  <option value="Australia/Brisbane">Australian Eastern Time (AEST) - Brisbane</option>
                  <option value="Pacific/Auckland">New Zealand Time (NZST) - Auckland</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST) - Honolulu</option>
                </optgroup>
                <optgroup label="Africa & Middle East">
                  <option value="Africa/Cairo">Eastern European Time (EET) - Cairo</option>
                  <option value="Africa/Johannesburg">South Africa Time (SAST) - Johannesburg</option>
                  <option value="Africa/Lagos">West Africa Time (WAT) - Lagos</option>
                  <option value="Asia/Jerusalem">Israel Time (IST) - Jerusalem</option>
                </optgroup>
              </select>
              {savingTimezone && (
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
              )}
            </div>
          </div>
        </div>

        {/* Current Time Display */}
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Current Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Server Time (UTC)</p>
              <p className="font-mono text-lg" style={{ color: 'var(--text-primary)' }}>
                {new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium' })}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Configured Timezone ({systemTimezone})</p>
              <p className="font-mono text-lg" style={{ color: 'var(--text-primary)' }}>
                {new Date().toLocaleString('en-US', { timeZone: systemTimezone, dateStyle: 'medium', timeStyle: 'medium' })}
              </p>
            </div>
          </div>
        </div>

        {/* Header Date & Time Toggle */}
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Show Date & Time in Header</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Display the current date and time in the top header bar using the configured timezone
              </p>
            </div>
            <button
              onClick={async () => {
                const newValue = !headerShowDateTime;
                setHeaderShowDateTime(newValue);
                try {
                  await settingsApi.update({ 'header.showDateTime': String(newValue) });
                  toast.success(`Header date & time ${newValue ? 'enabled' : 'disabled'}`);
                } catch {
                  setHeaderShowDateTime(!newValue);
                  toast.error('Failed to save setting');
                }
              }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              style={{ backgroundColor: headerShowDateTime ? 'var(--accent)' : 'var(--bg-tertiary)' }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: headerShowDateTime ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
              />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>How timezone affects notifications</h4>
              <ul className="text-sm mt-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Email notifications are sent once daily at the configured time in this timezone</li>
                <li>• Low stock alerts, quarantine expiration warnings, and other scheduled notifications follow this timezone</li>
                <li>• The notification schedule time can be configured in the Notifications tab</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
