import { useState } from 'react';
import {
  KeyIcon,
  ClipboardDocumentIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
  POST: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  PATCH: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
};

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/webhooks',
    summary: 'List all webhooks',
    description: 'Retrieve all configured webhooks for your account.',
    perm: 'webhooks:read',
    body: null,
    response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Webhook",
      "url": "https://example.com/hook",
      "events": ["item.created", "item.updated"],
      "isActive": true,
      "createdAt": "2026-03-25T12:00:00.000Z",
      "updatedAt": "2026-03-25T12:00:00.000Z"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/webhooks',
    summary: 'Create a webhook',
    description: 'Create a new webhook endpoint to receive event notifications.',
    perm: 'webhooks:write',
    body: `{
  "name": "My Webhook",
  "url": "https://example.com/hook",
  "events": ["item.created", "item.updated"],
  "secret": "optional-secret-for-hmac"
}`,
    response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Webhook",
    "url": "https://example.com/hook",
    "events": ["item.created", "item.updated"],
    "isActive": true,
    "secret": "***"
  }
}`,
  },
  {
    method: 'PATCH',
    path: '/api/v1/webhooks/:id',
    summary: 'Update a webhook',
    description: 'Update an existing webhook. All fields are optional.',
    perm: 'webhooks:write',
    body: `{
  "name": "Updated Name",
  "url": "https://example.com/new-hook",
  "events": ["item.created"],
  "isActive": false,
  "secret": "new-secret"
}`,
    response: `{
  "success": true,
  "data": { "id": "uuid", "name": "Updated Name", ... }
}`,
  },
  {
    method: 'DELETE',
    path: '/api/v1/webhooks/:id',
    summary: 'Delete a webhook',
    description: 'Permanently delete a webhook endpoint.',
    perm: 'webhooks:delete',
    body: null,
    response: `{
  "success": true,
  "message": "Webhook deleted"
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/webhooks/:id/test',
    summary: 'Test a webhook',
    description: 'Send a test payload to verify your webhook endpoint is working correctly.',
    perm: 'webhooks:write',
    body: null,
    response: `{
  "success": true,
  "data": { "status": 200, "ok": true }
}`,
  },
];

const EVENTS = [
  { name: 'item.created', description: 'When a new item is created' },
  { name: 'item.updated', description: 'When an item is modified' },
  { name: 'item.deleted', description: 'When an item is deleted' },
  { name: 'category.created', description: 'When a new category is created' },
  { name: 'category.updated', description: 'When a category is modified' },
  { name: 'category.deleted', description: 'When a category is deleted' },
];

export default function WebhookDocs() {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getCurl = (ep: typeof ENDPOINTS[0]) => {
    const url = `${window.location.origin}${ep.path.replace(':id', 'WEBHOOK_ID')}`;
    let curl = `curl -X ${ep.method} "${url}" \\\n  -H "X-API-Key: ${apiKey || 'wh_your_api_key'}"`;
    if (ep.body) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.body.replace(/\n/g, '')}'`;
    }
    return curl;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, #f43f5e 20%, transparent)' }}>
              <LinkIcon className="w-8 h-8" style={{ color: '#f43f5e' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Webhook API</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Manage webhooks and receive real-time event notifications
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: apiKey ? 'color-mix(in srgb, #22c55e 20%, transparent)' : 'var(--bg-tertiary)',
              color: apiKey ? '#22c55e' : 'var(--text-primary)'
            }}
          >
            {apiKey ? '✓ Authorized' : 'Authorize'}
          </button>
        </div>

        {/* Base URL */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>BASE URL</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                  {window.location.origin}/api/v1
                </code>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/api/v1`)}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <ClipboardDocumentIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Auth Info */}
        <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <div className="flex items-center gap-2 mb-2">
            <KeyIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Authentication</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Requires an API key with webhook permissions. Include via header:
          </p>
          <div className="mt-2 space-y-1">
            <code className="block text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              X-API-Key: wh_your_api_key
            </code>
            <code className="block text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              Authorization: Bearer wh_your_api_key
            </code>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'color-mix(in srgb, #6366f1 15%, transparent)', color: '#6366f1' }}>webhooks:read</span>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e' }}>webhooks:write</span>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)', color: '#ef4444' }}>webhooks:delete</span>
          </div>
        </div>
      </div>

      {/* Payload Format */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Webhook Payload Format</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          When an event fires, a <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>POST</code> request is sent to your configured URL with the following JSON body:
        </p>
        <pre className="p-4 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{`{
  "event": "item.created",
  "timestamp": "2026-03-25T12:00:00.000Z",
  "data": {
    "id": "uuid",
    "name": "Item Name",
    ...
  }
}`}</pre>

        <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 5%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <h4 className="text-sm font-medium mb-1" style={{ color: '#f59e0b' }}>Signature Verification</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            If a secret is configured, the header <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>X-Webhook-Signature</code> contains <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>sha256=HMAC_HEX</code>. Compute HMAC-SHA256 of the raw request body with your secret and compare.
          </p>
          <pre className="mt-2 p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{`const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', YOUR_SECRET)
  .update(rawBody)
  .digest('hex');
const isValid = req.headers['x-webhook-signature'] === 'sha256=' + signature;`}</pre>
        </div>
      </div>

      {/* Endpoints */}
      <div className="card overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Endpoints</h2>
            <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {ENDPOINTS.length}
            </span>
          </div>
        </button>
        <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
          {ENDPOINTS.map((ep) => {
            const key = `${ep.method}-${ep.path}`;
            const isExpanded = expandedEndpoints.has(key);
            const c = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;
            return (
              <div key={key}>
                <button
                  onClick={() => toggleEndpoint(key)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: isExpanded ? c.bg : 'transparent' }}
                >
                  <span
                    className="px-2.5 py-1 text-xs font-bold rounded uppercase flex-shrink-0"
                    style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.text}` }}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{ep.path}</code>
                  <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{ep.summary}</span>
                  <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{ep.perm}</span>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4" style={{ borderTop: `1px solid ${c.text}` }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ep.description}</p>

                    {ep.body && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Request Body</h4>
                          <button onClick={() => copyToClipboard(ep.body!)} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            <ClipboardDocumentIcon className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{ep.body}</pre>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Response</h4>
                      <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{ep.response}</pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>cURL Example</h4>
                        <button onClick={() => copyToClipboard(getCurl(ep))} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          <ClipboardDocumentIcon className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{getCurl(ep)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Events */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Available Events</h2>
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Event</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((event, i) => (
                <tr key={event.name} style={{ borderTop: i > 0 ? '1px solid var(--bg-tertiary)' : undefined }}>
                  <td className="px-4 py-2">
                    <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>{event.name}</code>
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                <KeyIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Authorize</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Enter your API key to include it in cURL examples.
            </p>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="wh_..."
              className="input w-full mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAuthModal(false)} className="btn btn-primary flex-1">
                {apiKey ? 'Save' : 'Close'}
              </button>
              {apiKey && (
                <button onClick={() => { setApiKey(''); setShowAuthModal(false); }} className="btn btn-secondary">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
