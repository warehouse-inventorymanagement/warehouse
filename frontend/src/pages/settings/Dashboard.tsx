import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Squares2X2Icon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const DEFAULT_WIDGETS = [
  'greeting', 'stat-cards', 'activity-feed', 'category-chart',
  'quarantine-expiring', 'stock-summary', 'low-stock-alerts', 'recently-updated'
];

export default function DashboardSettings() {
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(DEFAULT_WIDGETS);
  const [savingWidgets, setSavingWidgets] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await settingsApi.getAll();
        const data = res.data.data || res.data;
        try {
          const widgets = JSON.parse(data['dashboard.widgets'] || '[]');
          if (Array.isArray(widgets) && widgets.length > 0) {
            setDashboardWidgets(widgets);
          }
        } catch (e) {
          // keep defaults
        }
        if (data['pricing.defaultCurrency']) {
          setDefaultCurrency(data['pricing.defaultCurrency']);
        }
      } catch {
        toast.error('Failed to load dashboard settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#10b981' }} />
      </div>
    );
  }

  return (
    <>
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}>
          <Squares2X2Icon className="w-6 h-6" style={{ color: '#10b981' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard Widgets</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choose which widgets are visible on the dashboard for all users</p>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { id: 'greeting', name: 'Greeting', description: 'Time-of-day greeting with user name' },
          { id: 'stat-cards', name: 'Stat Cards', description: 'Item, category, location, and other counts with trends' },
          { id: 'activity-feed', name: 'Activity Feed', description: 'Recent audit log entries with action icons' },
          { id: 'category-chart', name: 'Items by Category', description: 'Horizontal bar chart of top 10 categories' },
          { id: 'quarantine-expiring', name: 'Quarantine Expiring', description: 'Items expiring within 7 days' },
          { id: 'stock-summary', name: 'Stock Level Summary', description: 'Out-of-stock and low stock overview with health bar' },
          { id: 'low-stock-alerts', name: 'Low Stock Alerts', description: 'Items below minimum quantity threshold' },
          { id: 'recently-updated', name: 'Recently Updated', description: 'Last 5 recently modified items' },
        ].map((widget) => (
          <label
            key={widget.id}
            className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors"
            style={{ backgroundColor: dashboardWidgets.includes(widget.id) ? 'color-mix(in srgb, #10b981 8%, transparent)' : 'var(--bg-secondary)' }}
          >
            <input
              type="checkbox"
              checked={dashboardWidgets.includes(widget.id)}
              onChange={async (e) => {
                const updated = e.target.checked
                  ? [...dashboardWidgets, widget.id]
                  : dashboardWidgets.filter(w => w !== widget.id);
                setDashboardWidgets(updated);
                setSavingWidgets(true);
                try {
                  await settingsApi.update({ 'dashboard.widgets': JSON.stringify(updated) });
                  toast.success(`${widget.name} ${e.target.checked ? 'enabled' : 'disabled'}`);
                } catch {
                  toast.error('Failed to save widget settings');
                  setDashboardWidgets(dashboardWidgets);
                } finally {
                  setSavingWidgets(false);
                }
              }}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#10b981' }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{widget.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{widget.description}</p>
            </div>
            {savingWidgets && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#10b981' }} />
            )}
          </label>
        ))}
      </div>
    </div>

    {/* Default Currency */}
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <CurrencyDollarIcon className="w-6 h-6" style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Default Currency</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Set the default currency for item pricing</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={defaultCurrency}
          onChange={async (e) => {
            const val = e.target.value;
            setDefaultCurrency(val);
            setSavingCurrency(true);
            try {
              await settingsApi.update({ 'pricing.defaultCurrency': val });
              toast.success(`Default currency set to ${val}`);
            } catch {
              toast.error('Failed to save currency setting');
            } finally {
              setSavingCurrency(false);
            }
          }}
          className="input w-64"
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="JPY">JPY - Japanese Yen</option>
          <option value="CAD">CAD - Canadian Dollar</option>
          <option value="AUD">AUD - Australian Dollar</option>
          <option value="CHF">CHF - Swiss Franc</option>
          <option value="CNY">CNY - Chinese Yuan</option>
          <option value="INR">INR - Indian Rupee</option>
          <option value="KRW">KRW - South Korean Won</option>
          <option value="BRL">BRL - Brazilian Real</option>
          <option value="MXN">MXN - Mexican Peso</option>
          <option value="SEK">SEK - Swedish Krona</option>
          <option value="NOK">NOK - Norwegian Krone</option>
          <option value="DKK">DKK - Danish Krone</option>
          <option value="PLN">PLN - Polish Zloty</option>
          <option value="TRY">TRY - Turkish Lira</option>
          <option value="ZAR">ZAR - South African Rand</option>
          <option value="SGD">SGD - Singapore Dollar</option>
          <option value="HKD">HKD - Hong Kong Dollar</option>
          <option value="NZD">NZD - New Zealand Dollar</option>
          <option value="THB">THB - Thai Baht</option>
          <option value="ILS">ILS - Israeli Shekel</option>
          <option value="AED">AED - UAE Dirham</option>
          <option value="SAR">SAR - Saudi Riyal</option>
        </select>
        {savingCurrency && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#f59e0b' }} />
        )}
      </div>
    </div>
    </>
  );
}
