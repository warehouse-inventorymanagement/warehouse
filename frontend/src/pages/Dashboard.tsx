import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  XCircleIcon,
  ArchiveBoxXMarkIcon,
  ClockIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

type WidgetId = 'greeting' | 'stat-cards' | 'activity-feed' | 'category-chart' | 'quarantine-expiring' | 'stock-summary' | 'low-stock-alerts' | 'recently-updated' | 'stock-trend';

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

const ACTION_ICONS: Record<string, any> = {
  CREATE: PlusCircleIcon,
  UPDATE: PencilSquareIcon,
  DELETE: TrashIcon,
  LOGIN_SUCCESS: ArrowRightOnRectangleIcon,
  LOGIN_FAILED: ExclamationTriangleIcon,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-500',
  UPDATE: 'text-blue-500',
  DELETE: 'text-red-500',
  LOGIN_SUCCESS: 'text-teal-500',
  LOGIN_FAILED: 'text-orange-500',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stockTrend, setStockTrend] = useState<{ date: string; created: number; updated: number }[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    dashboardApi.getStats()
      .then(res => setData(res.data.data))
      .catch(err => {
        console.error('Failed to fetch dashboard data:', err);
        toast.error('Failed to load dashboard data');
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    dashboardApi.getStockTrend().then(res => setStockTrend(res.data.data)).catch(() => {});
    dashboardApi.getConfig().then(res => {
      const cfg = res.data.data;
      if (cfg.widgets) setWidgetOrder(cfg.widgets);
      if (cfg.hidden) setHiddenWidgets(new Set(cfg.hidden));
    }).catch(() => {});
  }, []);

  const handleSaveLayout = async () => {
    try {
      await dashboardApi.saveConfig({ widgets: widgetOrder, hidden: Array.from(hiddenWidgets) });
      setEditMode(false);
      toast.success('Dashboard layout saved');
    } catch {
      toast.error('Failed to save layout');
    }
  };

  const moveWidget = (id: WidgetId, direction: 'up' | 'down') => {
    const idx = widgetOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...widgetOrder];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setWidgetOrder(newOrder);
  };

  const toggleWidget = (id: WidgetId) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enabledWidgets: WidgetId[] = data?.enabledWidgets || [];
  const isEnabled = (id: WidgetId) => enabledWidgets.includes(id);
  const counts = data?.counts || {};

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.firstName || user?.username || 'there';

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-64 rounded mb-2" />
            <div className="skeleton h-5 w-48 rounded" />
          </div>
          <div className="skeleton h-10 w-28 rounded-lg" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5" style={{ borderLeft: '3px solid var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="skeleton h-4 w-20 rounded mb-2" />
                  <div className="skeleton h-8 w-12 rounded" />
                </div>
                <div className="skeleton h-11 w-11 rounded-xl" />
              </div>
              <div className="skeleton h-4 w-24 rounded mt-3" />
            </div>
          ))}
        </div>
        {/* Widget cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card">
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="skeleton h-6 w-40 rounded" />
              </div>
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 p-3">
                    <div className="skeleton h-8 w-8 rounded-lg" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-3/4 rounded mb-1" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-orange-500" />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Failed to load dashboard</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Could not fetch dashboard data. Please try again.</p>
          <button className="btn btn-primary" onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {isEnabled('greeting') ? (
            <>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {greeting}, {displayName}
              </h1>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Here's your inventory overview</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Overview of your inventory</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={handleSaveLayout} className="btn btn-primary btn-sm">Save Layout</button>
              <button onClick={() => setEditMode(false)} className="btn btn-secondary btn-sm">Cancel</button>
            </>
          ) : (
            <button onClick={() => {
              if (widgetOrder.length === 0) {
                setWidgetOrder(['greeting', 'stat-cards', 'stock-trend', 'stock-summary', 'activity-feed', 'category-chart', 'quarantine-expiring', 'low-stock-alerts', 'recently-updated']);
              }
              setEditMode(true);
            }} className="btn btn-secondary btn-sm">Customize</button>
          )}
          <Link to="/items/new" className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Item
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      {isEnabled('stat-cards') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Items" value={counts.totalItems} icon={CubeIcon} color="blue" />
          <StatCard
            label="Low Stock"
            value={counts.lowStockCount}
            icon={ExclamationTriangleIcon}
            color={counts.lowStockCount > 0 ? 'orange' : 'gray'}
            subtitle={counts.lowStockCount > 0 ? 'Needs attention' : 'All stocked'}
          />
          <StatCard
            label="Out of Stock"
            value={counts.outOfStockCount}
            icon={XCircleIcon}
            color={counts.outOfStockCount > 0 ? 'red' : 'gray'}
            subtitle={counts.outOfStockCount > 0 ? 'Needs restock' : 'None out'}
          />
          <StatCard label="Quarantine" value={counts.quarantineCount} icon={ArchiveBoxXMarkIcon} color="orange" />
          <StatCard
            label="Added This Week"
            value={counts.itemsAddedThisWeek}
            icon={PlusCircleIcon}
            color="blue"
            trend={{ thisWeek: counts.itemsAddedThisWeek, lastWeek: counts.itemsAddedLastWeek }}
          />
        </div>
      )}

      {/* Stock Summary (full width) */}
      {isEnabled('stock-summary') && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Stock Level Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">
                {counts.totalItems - counts.lowStockCount - counts.outOfStockCount}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Healthy Stock</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">{counts.lowStockCount}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Low Stock
                {counts.totalItems > 0 && (
                  <span className="ml-1">({((counts.lowStockCount / counts.totalItems) * 100).toFixed(1)}%)</span>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{counts.outOfStockCount}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Out of Stock</p>
            </div>
          </div>
          {counts.totalItems > 0 && (
            <>
              <div className="h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="h-full bg-green-500" style={{ width: `${((counts.totalItems - counts.lowStockCount - counts.outOfStockCount) / counts.totalItems) * 100}%` }} />
                <div className="h-full bg-orange-400" style={{ width: `${(counts.lowStockCount / counts.totalItems) * 100}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${(counts.outOfStockCount / counts.totalItems) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Healthy</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Low</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Mode Panel */}
      {editMode && (
        <div className="card p-4">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Widget Visibility & Order</h3>
          <div className="space-y-1">
            {widgetOrder.map((id, idx) => (
              <div key={id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <input
                  type="checkbox"
                  checked={!hiddenWidgets.has(id)}
                  onChange={() => toggleWidget(id)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <button disabled={idx === 0} onClick={() => moveWidget(id, 'up')} className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>&#9650;</button>
                <button disabled={idx === widgetOrder.length - 1} onClick={() => moveWidget(id, 'down')} className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>&#9660;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Trend */}
      {isEnabled('stock-trend' as WidgetId) && !hiddenWidgets.has('stock-trend') && stockTrend.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Stock Activity (Last 7 Days)</h2>
          <div className="flex items-end gap-2" style={{ height: '120px' }}>
            {stockTrend.map((day) => {
              const max = Math.max(...stockTrend.map(d => d.created + d.updated), 1);
              const total = day.created + day.updated;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center" style={{ height: '100px' }}>
                    <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                      {day.created > 0 && (
                        <div className="w-full rounded-t" style={{ height: `${(day.created / max) * 100}%`, backgroundColor: '#22c55e', minHeight: day.created > 0 ? '4px' : 0 }} title={`${day.created} created`} />
                      )}
                      {day.updated > 0 && (
                        <div className="w-full" style={{ height: `${(day.updated / max) * 100}%`, backgroundColor: '#3b82f6', minHeight: day.updated > 0 ? '4px' : 0, borderRadius: day.created === 0 ? '4px 4px 0 0' : 0 }} title={`${day.updated} updated`} />
                      )}
                      {total === 0 && <div className="w-full rounded-t" style={{ height: '4px', backgroundColor: 'var(--bg-tertiary)' }} />}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#22c55e' }} /> Created</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} /> Updated</span>
          </div>
        </div>
      )}

      {/* Two-column widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Activity Feed */}
        {isEnabled('activity-feed') && (
          <div className="card">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Feed</h2>
            </div>
            <div className="p-4">
              {(!data.auditLogs || data.auditLogs.length === 0) ? (
                <div className="text-center py-10">
                  <div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, #14b8a6 10%, transparent)' }}>
                    <ClockIcon className="w-10 h-10 text-teal-500" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No recent activity</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Actions like creating or updating items will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.auditLogs.map((log: any) => {
                    const Icon = ACTION_ICONS[log.action] || ClockIcon;
                    const colorClass = ACTION_COLORS[log.action] || 'text-gray-500';
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover-bg transition-colors">
                        <div className="p-1.5 rounded-lg mt-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            <span className="font-medium">{log.user?.username || 'System'}</span>
                            {' '}{formatAction(log.action)}{' '}
                            <span className="font-medium">{log.entityName || log.entityType}</span>
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items by Category Chart */}
        {isEnabled('category-chart') && (
          <div className="card">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Items by Category</h2>
            </div>
            <div className="p-4">
              {(!data.categoryDistribution || data.categoryDistribution.length === 0) ? (
                <div className="text-center py-10">
                  <div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 10%, transparent)' }}>
                    <ChartBarIcon className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No categories yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Create categories to organize your inventory
                  </p>
                  <Link to="/categories" className="inline-block mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                    Manage categories &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const maxCount = Math.max(...data.categoryDistribution.map((c: any) => c.count), 1);
                    return data.categoryDistribution.map((cat: any, idx: number) => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <div className="w-24 text-sm truncate" style={{ color: 'var(--text-secondary)' }} title={cat.name}>
                          {cat.name}
                        </div>
                        <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max((cat.count / maxCount) * 100, 3)}%`,
                              backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                            }}
                          />
                        </div>
                        <div className="w-8 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                          {cat.count}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quarantine Expiring Soon */}
        {isEnabled('quarantine-expiring') && (
          <div className="card">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Quarantine Expiring Soon</h2>
            </div>
            <div className="p-4">
              {(!data.expiringQuarantineItems || data.expiringQuarantineItems.length === 0) ? (
                <div className="text-center py-10">
                  <div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, #f97316 10%, transparent)' }}>
                    <ShieldExclamationIcon className="w-10 h-10 text-orange-500" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>All clear</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    No quarantined items are expiring in the next 7 days
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.expiringQuarantineItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl hover-bg transition-colors">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Deleted by {item.deletedBy?.username || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${item.daysUntilExpiration <= 2 ? 'text-red-600 dark:text-red-400' : 'text-orange-500'}`}>
                          {item.daysUntilExpiration}d
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>until deletion</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Alerts */}
        {isEnabled('low-stock-alerts') && (
          <div className="card">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Low Stock Alerts</h2>
            </div>
            <div className="p-4">
              {(!data.lowStockItems || data.lowStockItems.length === 0) ? (
                <div className="text-center py-10">
                  <div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}>
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Stock levels healthy</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    All items are above their minimum quantity thresholds
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.lowStockItems.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="flex items-center justify-between p-4 rounded-xl hover-bg transition-colors"
                    >
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.sku || 'No SKU'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{item.quantity}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Min: {item.minQuantity}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recently Updated */}
        {isEnabled('recently-updated') && (
          <div className="card">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recently Updated</h2>
            </div>
            <div className="p-4">
              {(!data.recentItems || data.recentItems.length === 0) ? (
                <div className="text-center py-10">
                  <div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 10%, transparent)' }}>
                    <CubeIcon className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No items yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Your most recently updated items will show up here
                  </p>
                  <Link to="/items/new" className="inline-block mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                    Add your first item &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentItems.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="flex items-center justify-between p-4 rounded-xl hover-bg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.primaryImage ? (
                          <img
                            src={`/uploads/${item.primaryImage}`}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <CubeIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.categoryName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.quantity}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>in stock</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components ---

const COLOR_MAP: Record<string, { bg: string; text: string; hex: string }> = {
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-500',   hex: '#3b82f6' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-500',  hex: '#22c55e' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', hex: '#8b5cf6' },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-500',    hex: '#ef4444' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', hex: '#f97316' },
  teal:   { bg: 'bg-teal-500/10',   text: 'text-teal-500',   hex: '#14b8a6' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', hex: '#6366f1' },
  gray:   { bg: 'bg-gray-500/10',   text: 'text-gray-400',   hex: '#6b7280' },
};

function StatCard({ label, value, icon: Icon, color, subtitle, trend }: {
  label: string;
  value: number;
  icon: any;
  color: string;
  subtitle?: string;
  trend?: { thisWeek: number; lastWeek: number };
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  const diff = trend ? trend.thisWeek - trend.lastWeek : 0;

  return (
    <div
      className="card p-5 card-hover"
      style={{ borderLeft: `3px solid ${c.hex}` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
        <div
          className={`p-2.5 rounded-xl ${c.bg}`}
          style={{ boxShadow: `0 0 12px ${c.hex}20` }}
        >
          <Icon className={`w-6 h-6 ${c.text}`} />
        </div>
      </div>
      {trend ? (
        <div className={`mt-3 flex items-center text-sm ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {diff >= 0 ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
          <span>{diff >= 0 ? '+' : ''}{diff} vs last week</span>
        </div>
      ) : subtitle ? (
        <div className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function formatAction(action: string): string {
  switch (action) {
    case 'CREATE': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    case 'LOGIN_SUCCESS': return 'logged in';
    case 'LOGIN_FAILED': return 'failed to log in';
    default: return action.toLowerCase();
  }
}
