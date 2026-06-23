import { useState, useEffect } from 'react';
import { versionApi, UpdateInfo } from '../../services/api';
import {
  InformationCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function AboutSettings() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [dependencies, setDependencies] = useState<{
    backend: { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    frontend: { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  } | null>(null);

  useEffect(() => {
    handleCheckUpdates();
    versionApi.getDependencies()
      .then(res => setDependencies(res.data.data))
      .catch(() => {});
  }, []);

  const handleCheckUpdates = async (force: boolean = false) => {
    setCheckingUpdates(true);
    try {
      const response = await versionApi.checkForUpdates(force);
      setUpdateInfo(response.data.data);
      if (force) {
        // toast not imported, but the original used it
      }
    } catch (error) {
      console.error('Failed to check for updates');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>About Warehouse</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Version information and updates</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Version Info */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Version Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Current Version</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {updateInfo ? `v${updateInfo.currentVersion}` : 'Loading...'}
              </p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Latest Version</p>
              <p className="text-xl font-semibold" style={{ color: updateInfo?.updateAvailable ? '#22c55e' : 'var(--text-primary)' }}>
                {updateInfo ? `v${updateInfo.latestVersion}` : 'Loading...'}
                {updateInfo?.updateAvailable && (
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 20%, transparent)', color: '#22c55e' }}>
                    Update Available
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Check for Updates */}
        <div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleCheckUpdates(true)}
              disabled={checkingUpdates}
              className="btn btn-secondary py-2 px-4 flex items-center gap-2"
            >
              {checkingUpdates ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-4 h-4" />
              )}
              {checkingUpdates ? 'Checking...' : 'Check for Updates'}
            </button>
            {updateInfo?.checkedAt && (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Last checked: {new Date(updateInfo.checkedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Release Notes */}
        {updateInfo?.updateAvailable && updateInfo.releaseNotes && (
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              What's New in {updateInfo.releaseName || `v${updateInfo.latestVersion}`}
            </h3>
            <div
              className="p-4 rounded-lg text-sm max-h-64 overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <pre className="whitespace-pre-wrap font-sans">{updateInfo.releaseNotes}</pre>
            </div>
          </div>
        )}

        {/* Links */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Links</h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/manjotsc/warehouse"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://github.com/manjotsc/warehouse/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary py-2 px-4 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download Latest
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/manjotsc/warehouse/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <ExclamationTriangleIcon className="w-5 h-5" />
              Report Issue
            </a>
          </div>
        </div>

        {/* Update Guide Link */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              For update instructions, see the <a href="https://github.com/manjotsc/warehouse/blob/main/UPDATING.md" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: 'var(--accent)' }}>Update Guide</a>.
            </p>
          </div>
        </div>

        {/* Installed Dependencies */}
        {dependencies && (
          <div>
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Installed Dependencies</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Frontend Dependencies */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                  Frontend ({Object.keys(dependencies.frontend.dependencies).length})
                </h4>
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Package</th>
                        <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(dependencies.frontend.dependencies)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([pkg, ver]) => (
                          <tr key={pkg} className="border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{pkg}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{ver}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {Object.keys(dependencies.frontend.devDependencies).length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Frontend Dev ({Object.keys(dependencies.frontend.devDependencies).length})
                    </h4>
                    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Package</th>
                            <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Version</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dependencies.frontend.devDependencies)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([pkg, ver]) => (
                              <tr key={pkg} className="border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                                <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{pkg}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{ver}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Backend Dependencies */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                  Backend ({Object.keys(dependencies.backend.dependencies).length})
                </h4>
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Package</th>
                        <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(dependencies.backend.dependencies)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([pkg, ver]) => (
                          <tr key={pkg} className="border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{pkg}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{ver}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {Object.keys(dependencies.backend.devDependencies).length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Backend Dev ({Object.keys(dependencies.backend.devDependencies).length})
                    </h4>
                    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Package</th>
                            <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Version</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dependencies.backend.devDependencies)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([pkg, ver]) => (
                              <tr key={pkg} className="border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                                <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{pkg}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{ver}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
