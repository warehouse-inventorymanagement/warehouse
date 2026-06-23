import { useState, useEffect } from 'react';
import { webhooksApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  LinkIcon,
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function WebhooksSettings() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookModal, setWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState<{ name: string; url: string; events: string[]; secret: string }>({ name: '', url: '', events: [], secret: '' });
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await webhooksApi.getAll();
        setWebhooks(res.data.data || res.data || []);
      } catch {
        toast.error('Failed to load webhooks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <ArrowPathIcon className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f43f5e 20%, transparent)' }}>
            <LinkIcon className="w-6 h-6" style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Webhooks</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage webhook endpoints for event notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/docs/webhooks"
            className="btn btn-secondary flex items-center gap-2"
          >
            <DocumentTextIcon className="w-4 h-4" />
            API Docs
          </a>
          <button
            onClick={() => {
              setEditingWebhook(null);
              setWebhookForm({ name: '', url: '', events: [], secret: '' });
              setWebhookModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {webhooks.length === 0 ? (
        <div className="p-8 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No webhooks configured</p>
          <p className="text-sm">Create a webhook to receive event notifications at your endpoint.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook: any) => (
            <div key={webhook._id || webhook.id} className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{webhook.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                    backgroundColor: webhook.active !== false ? 'color-mix(in srgb, #22c55e 20%, transparent)' : 'color-mix(in srgb, #ef4444 20%, transparent)',
                    color: webhook.active !== false ? '#22c55e' : '#ef4444'
                  }}>
                    {webhook.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingWebhook(webhook);
                      setWebhookForm({ name: webhook.name, url: webhook.url, events: webhook.events || [], secret: '' });
                      setWebhookModal(true);
                    }}
                    className="btn btn-secondary py-1 px-3 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await webhooksApi.test(webhook._id || webhook.id);
                        toast.success('Test webhook sent');
                      } catch {
                        toast.error('Test webhook failed');
                      }
                    }}
                    className="btn btn-secondary py-1 px-3 text-sm"
                  >
                    Test
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this webhook?')) return;
                      try {
                        await webhooksApi.delete(webhook._id || webhook.id);
                        setWebhooks(prev => prev.filter(w => (w._id || w.id) !== (webhook._id || webhook.id)));
                        toast.success('Webhook deleted');
                      } catch {
                        toast.error('Failed to delete webhook');
                      }
                    }}
                    className="btn btn-secondary py-1 px-3 text-sm"
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm mb-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{webhook.url}</p>
              <div className="flex flex-wrap gap-1.5">
                {(webhook.events || []).map((event: string) => (
                  <span key={event} className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'color-mix(in srgb, #f43f5e 15%, transparent)', color: '#f43f5e' }}>
                    {event}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Webhook Modal */}
      {webhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingWebhook ? 'Edit Webhook' : 'Add Webhook'}</h3>
              <button onClick={() => setWebhookModal(false)}>
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name</label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={e => setWebhookForm(f => ({ ...f, name: e.target.value }))}
                  className="input w-full"
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>URL</label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))}
                  className="input w-full"
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Secret (optional)</label>
                <input
                  type="text"
                  value={webhookForm.secret}
                  onChange={e => setWebhookForm(f => ({ ...f, secret: e.target.value }))}
                  className="input w-full"
                  placeholder="Signing secret"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {['item.created', 'item.updated', 'item.deleted', 'category.created', 'category.updated', 'category.deleted'].map(event => (
                    <label key={event} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(event)}
                        onChange={e => {
                          setWebhookForm(f => ({
                            ...f,
                            events: e.target.checked ? [...f.events, event] : f.events.filter(ev => ev !== event)
                          }));
                        }}
                        className="rounded"
                      />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setWebhookModal(false)} className="btn btn-secondary py-2 px-4">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      const payload: any = { name: webhookForm.name, url: webhookForm.url, events: webhookForm.events };
                      if (webhookForm.secret) payload.secret = webhookForm.secret;
                      if (editingWebhook) {
                        await webhooksApi.update(editingWebhook._id || editingWebhook.id, payload);
                        toast.success('Webhook updated');
                      } else {
                        await webhooksApi.create(payload);
                        toast.success('Webhook created');
                      }
                      setWebhookModal(false);
                      const res = await webhooksApi.getAll();
                      setWebhooks(res.data.data || res.data || []);
                    } catch {
                      toast.error(editingWebhook ? 'Failed to update webhook' : 'Failed to create webhook');
                    }
                  }}
                  disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0}
                  className="btn btn-primary py-2 px-4"
                >
                  {editingWebhook ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
