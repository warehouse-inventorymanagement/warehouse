import { useState, useEffect } from 'react';
import { devicesApi, DeviceBlocklistEntry } from '../services/api';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  ShieldExclamationIcon,
  TrashIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  FunnelIcon,
  XMarkIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import type { Device, Pagination } from '../types';

type TabType = 'devices' | 'blocklist';

export default function Devices() {
  const [activeTab, setActiveTab] = useState<TabType>('devices');

  // Devices state
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesPagination, setDevicesPagination] = useState<Pagination | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesSearch, setDevicesSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [devicesPage, setDevicesPage] = useState(1);

  // Blocklist state
  const [blocklist, setBlocklist] = useState<DeviceBlocklistEntry[]>([]);
  const [blocklistPagination, setBlocklistPagination] = useState<Pagination | null>(null);
  const [blocklistLoading, setBlocklistLoading] = useState(true);
  const [blocklistSearch, setBlocklistSearch] = useState('');
  const [blocklistPage, setBlocklistPage] = useState(1);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch devices
  useEffect(() => {
    if (activeTab === 'devices') {
      fetchDevices();
    }
  }, [devicesPage, statusFilter, activeTab]);

  useEffect(() => {
    if (activeTab === 'devices') {
      const timer = setTimeout(() => {
        if (devicesPage === 1) {
          fetchDevices();
        } else {
          setDevicesPage(1);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [devicesSearch]);

  // Fetch blocklist
  useEffect(() => {
    if (activeTab === 'blocklist') {
      fetchBlocklist();
    }
  }, [blocklistPage, activeTab]);

  useEffect(() => {
    if (activeTab === 'blocklist') {
      const timer = setTimeout(() => {
        if (blocklistPage === 1) {
          fetchBlocklist();
        } else {
          setBlocklistPage(1);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [blocklistSearch]);

  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const response = await devicesApi.getAll({
        page: devicesPage,
        limit: 20,
        search: devicesSearch || undefined,
        isBlocked: statusFilter === 'all' ? undefined : statusFilter === 'blocked'
      });
      setDevices(response.data.data || []);
      setDevicesPagination(response.data.pagination || null);
    } catch (error) {
      toast.error('Failed to load devices');
    } finally {
      setDevicesLoading(false);
    }
  };

  const fetchBlocklist = async () => {
    setBlocklistLoading(true);
    try {
      const response = await devicesApi.getBlocklist({
        page: blocklistPage,
        limit: 20,
        search: blocklistSearch || undefined
      });
      setBlocklist(response.data.data || []);
      setBlocklistPagination(response.data.pagination || null);
    } catch (error) {
      toast.error('Failed to load blocklist');
    } finally {
      setBlocklistLoading(false);
    }
  };

  const handleBlockDevice = async (device: Device) => {
    const action = device.isBlocked ? 'unblock' : 'block';
    if (!device.isBlocked && !confirm(`Are you sure you want to block "${device.name}"? This will revoke all active sessions from this device.`)) {
      return;
    }

    setActionLoading(device.id);
    try {
      if (device.isBlocked) {
        await devicesApi.unblock(device.id);
        toast.success('Device unblocked');
      } else {
        await devicesApi.block(device.id, 'Blocked by administrator');
        toast.success('Device blocked. All sessions have been revoked.');
      }
      fetchDevices();
      // Refresh blocklist if it's been loaded
      if (blocklist.length > 0) {
        fetchBlocklist();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} device`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`Are you sure you want to delete "${device.name}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(device.id);
    try {
      await devicesApi.delete(device.id);
      toast.success('Device deleted');
      fetchDevices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete device');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromBlocklist = async (entry: DeviceBlocklistEntry) => {
    if (!confirm(`Are you sure you want to remove "${entry.deviceName || 'this device'}" from the blocklist? This device will be able to register again.`)) {
      return;
    }

    setActionLoading(entry.deviceHash);
    try {
      await devicesApi.removeFromBlocklist(entry.deviceHash);
      toast.success('Device removed from blocklist');
      fetchBlocklist();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove from blocklist');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Device Management
        </h1>
        <p style={{ color: 'var(--text-secondary)' }} className="mt-1">
          Manage all registered mobile devices across users
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('devices')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'devices' ? undefined : 'var(--text-secondary)' }}
          >
            <DevicePhoneMobileIcon className="w-4 h-4 inline-block mr-2" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab('blocklist')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'blocklist'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'blocklist' ? undefined : 'var(--text-secondary)' }}
          >
            <LockClosedIcon className="w-4 h-4 inline-block mr-2" />
            Blocklist
          </button>
        </nav>
      </div>

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by device name, model, or user..."
                  value={devicesSearch}
                  onChange={(e) => setDevicesSearch(e.target.value)}
                  className="input pl-10 w-full"
                />
                {devicesSearch && (
                  <button
                    onClick={() => setDevicesSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
                  className="input"
                >
                  <option value="all">All Devices</option>
                  <option value="active">Active Only</option>
                  <option value="blocked">Blocked Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Devices Table */}
          <div className="card overflow-hidden">
            {devicesLoading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                <DevicePhoneMobileIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No devices found</p>
                <p className="text-sm mt-1">
                  {devicesSearch || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Devices will appear here when users log in from the mobile app'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Device
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          User
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Model
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Last Active
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      {devices.map((device) => (
                        <tr key={device.id} className="hover-bg transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                device.isBlocked
                                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                  : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              }`}>
                                <DevicePhoneMobileIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {device.name}
                                </p>
                                {device.androidVersion && (
                                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Android {device.androidVersion}
                                  </p>
                                )}
                                <p className="text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                  ID: {device.id}
                                </p>
                                <p className="text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                  Device UUID: {device.deviceUuid || 'Not provided'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p style={{ color: 'var(--text-primary)' }}>
                                {device.user?.username || 'Unknown'}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {device.user?.email || ''}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                            {[device.manufacturer, device.model].filter(Boolean).join(' ') || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {formatDate(device.lastActiveAt)}
                          </td>
                          <td className="px-4 py-3">
                            {device.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                                <ShieldExclamationIcon className="w-3 h-3" />
                                Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400">
                                <CheckCircleIcon className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleBlockDevice(device)}
                                disabled={actionLoading === device.id}
                                className={`p-2 rounded-lg transition-colors ${
                                  device.isBlocked
                                    ? 'hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400'
                                    : 'hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                }`}
                                title={device.isBlocked ? 'Unblock device' : 'Block device'}
                              >
                                {actionLoading === device.id ? (
                                  <span className="w-4 h-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : device.isBlocked ? (
                                  <CheckCircleIcon className="w-4 h-4" />
                                ) : (
                                  <NoSymbolIcon className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteDevice(device)}
                                disabled={actionLoading === device.id}
                                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                                title="Delete device"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {devicesPagination && devicesPagination.pages > 1 && (
                  <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Showing {((devicesPagination.page - 1) * devicesPagination.limit) + 1} to {Math.min(devicesPagination.page * devicesPagination.limit, devicesPagination.total)} of {devicesPagination.total} devices
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDevicesPage(devicesPage - 1)}
                        disabled={devicesPage === 1}
                        className="btn btn-secondary py-1 px-3 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Page {devicesPagination.page} of {devicesPagination.pages}
                      </span>
                      <button
                        onClick={() => setDevicesPage(devicesPage + 1)}
                        disabled={devicesPage === devicesPagination.pages}
                        className="btn btn-secondary py-1 px-3 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Blocklist Tab */}
      {activeTab === 'blocklist' && (
        <>
          {/* Info Banner */}
          <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              <strong>About the Blocklist:</strong> When a device is blocked, its unique identifier (hash) is added to this permanent blocklist.
              Even if the device record is deleted, blocked devices cannot re-register. Remove an entry to allow the device to register again.
            </p>
          </div>

          {/* Search */}
          <div className="card p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by device name, model, or UUID..."
                value={blocklistSearch}
                onChange={(e) => setBlocklistSearch(e.target.value)}
                className="input pl-10 w-full"
              />
              {blocklistSearch && (
                <button
                  onClick={() => setBlocklistSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Blocklist Table */}
          <div className="card overflow-hidden">
            {blocklistLoading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Loading blocklist...
              </div>
            ) : blocklist.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                <LockClosedIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No blocklisted devices</p>
                <p className="text-sm mt-1">
                  {blocklistSearch
                    ? 'No blocklist entries match your search'
                    : 'Blocked devices will appear here'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Device
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Reason
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Blocked By
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Blocked At
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      {blocklist.map((entry) => (
                        <tr key={entry.id} className="hover-bg transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                                <LockClosedIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {entry.deviceName || 'Unknown Device'}
                                </p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {[entry.manufacturer, entry.model].filter(Boolean).join(' ') || '-'}
                                </p>
                                {entry.deviceUuid && (
                                  <p className="text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                    UUID: {entry.deviceUuid}
                                  </p>
                                )}
                                <p className="text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                  Hash: {entry.deviceHash.substring(0, 16)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                            {entry.reason || '-'}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                            {entry.blockedBy?.username || 'System'}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {formatDate(entry.blockedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => handleRemoveFromBlocklist(entry)}
                                disabled={actionLoading === entry.deviceHash}
                                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
                                title="Remove from blocklist"
                              >
                                {actionLoading === entry.deviceHash ? (
                                  <span className="w-4 h-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircleIcon className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {blocklistPagination && blocklistPagination.pages > 1 && (
                  <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Showing {((blocklistPagination.page - 1) * blocklistPagination.limit) + 1} to {Math.min(blocklistPagination.page * blocklistPagination.limit, blocklistPagination.total)} of {blocklistPagination.total} entries
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBlocklistPage(blocklistPage - 1)}
                        disabled={blocklistPage === 1}
                        className="btn btn-secondary py-1 px-3 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Page {blocklistPagination.page} of {blocklistPagination.pages}
                      </span>
                      <button
                        onClick={() => setBlocklistPage(blocklistPage + 1)}
                        disabled={blocklistPage === blocklistPagination.pages}
                        className="btn btn-secondary py-1 px-3 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
