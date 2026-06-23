import { useState, useEffect } from 'react';
import { sessionsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { DevicePhoneMobileIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function SessionsSettings() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await sessionsApi.getAll();
        setSessions((res as any).data.data || []);
      } catch {
        toast.error('Failed to load sessions');
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await sessionsApi.revoke(id);
      setSessions((prev) => prev.filter((x: any) => x.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #0ea5e9 20%, transparent)' }}>
              <DevicePhoneMobileIcon className="w-6 h-6" style={{ color: '#0ea5e9' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Active Sessions</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your active sessions across devices</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await sessionsApi.revokeAll();
                toast.success('All other sessions revoked');
                const res = await sessionsApi.getAll();
                setSessions((res as any).data.data || []);
              } catch { toast.error('Failed to revoke sessions'); }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)', color: '#ef4444' }}
          >
            Revoke All Other Sessions
          </button>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-12">
            <ArrowPathIcon className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>No active sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Device / Browser', 'IP Address', 'Created', 'Last Active', ''].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any) => {
                  const ua = s.userAgent || '';
                  let browser = 'Unknown Browser';
                  let os = 'Unknown OS';
                  if (ua.includes('Firefox')) browser = 'Firefox';
                  else if (ua.includes('Edg/')) browser = 'Edge';
                  else if (ua.includes('Chrome')) browser = 'Chrome';
                  else if (ua.includes('Safari')) browser = 'Safari';
                  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
                  if (ua.includes('Windows')) os = 'Windows';
                  else if (ua.includes('Mac OS')) os = 'macOS';
                  else if (ua.includes('Linux')) os = 'Linux';
                  else if (ua.includes('Android')) os = 'Android';
                  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                  const friendly = `${browser} on ${os}`;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{friendly}</span>
                          {s.current && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 20%, transparent)', color: '#22c55e' }}>
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.ipAddress || '\u2014'}</td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '\u2014'}</td>
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.lastActive ? new Date(s.lastActive).toLocaleDateString() : '\u2014'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={s.current}
                          onClick={() => handleRevoke(s.id)}
                          className="text-sm px-3 py-1 rounded-lg transition-colors disabled:opacity-30"
                          style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)', color: '#ef4444' }}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
