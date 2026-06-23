import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  LockClosedIcon,
  KeyIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, EndpointSpec>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

interface EndpointSpec {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterSpec[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema: any }>;
  };
  responses?: Record<string, { description: string; content?: any }>;
}

interface ParameterSpec {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type: string; default?: any };
}

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  get: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1', border: '#6366f1' },
  post: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e' },
  put: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: '#f97316' },
  patch: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308' },
  delete: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' },
};

export default function ApiDocs() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['Items', 'Inventory', 'Webhooks']));
  const [apiKey, setApiKey] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetch('/api/docs.json')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load API spec:', err);
        setLoading(false);
      });
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const toggleEndpoint = (key: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEndpoints(newExpanded);
  };

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  // Group endpoints by tag
  const getEndpointsByTag = () => {
    if (!spec) return {};
    const grouped: Record<string, Array<{ path: string; method: string; spec: EndpointSpec }>> = {};

    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpointSpec]) => {
        const tags = endpointSpec.tags || ['Other'];
        tags.forEach(tag => {
          if (!grouped[tag]) grouped[tag] = [];
          grouped[tag].push({ path, method, spec: endpointSpec });
        });
      });
    });

    return grouped;
  };

  const generateCurlExample = (path: string, method: string, endpoint: EndpointSpec) => {
    const baseUrl = window.location.origin;
    let curl = `curl -X ${method.toUpperCase()} "${baseUrl}/api/v1${path}"`;
    curl += ` \\\n  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}"`;

    if (['post', 'put', 'patch'].includes(method)) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      if (endpoint.requestBody?.content?.['application/json']?.schema) {
        curl += ` \\\n  -d '{...}'`;
      }
    }

    return curl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Failed to load API documentation</p>
      </div>
    );
  }

  const endpointsByTag = getEndpointsByTag();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
              <DocumentTextIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {spec.info.title}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                  v{spec.info.version}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  OpenAPI {spec.openapi}
                </span>
              </div>
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
            {apiKey ? <CheckCircleIcon className="w-5 h-5" /> : <LockClosedIcon className="w-5 h-5" />}
            {apiKey ? 'Authorized' : 'Authorize'}
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

        {/* Authentication Info */}
        <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <div className="flex items-center gap-2 mb-2">
            <KeyIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Authentication</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Include your API key in requests using either:
          </p>
          <div className="mt-2 space-y-1">
            <code className="block text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              X-API-Key: wh_your_api_key
            </code>
            <code className="block text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              Authorization: Bearer wh_your_api_key
            </code>
          </div>
        </div>
      </div>

      {/* Endpoints by Tag */}
      {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
        <div key={tag} className="card overflow-hidden">
          {/* Tag Header */}
          <button
            onClick={() => toggleTag(tag)}
            className="w-full flex items-center justify-between p-4 transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              {expandedTags.has(tag) ? (
                <ChevronDownIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <ChevronRightIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              )}
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{tag}</h2>
              <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {endpoints.length}
              </span>
            </div>
          </button>

          {/* Endpoints */}
          {expandedTags.has(tag) && (
            <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {endpoints.map(({ path, method, spec: endpoint }) => {
                const key = `${method}-${path}`;
                const isExpanded = expandedEndpoints.has(key);
                const colors = METHOD_COLORS[method] || METHOD_COLORS.get;

                return (
                  <div key={key}>
                    {/* Endpoint Summary */}
                    <button
                      onClick={() => toggleEndpoint(key)}
                      className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:opacity-90"
                      style={{ backgroundColor: isExpanded ? colors.bg : 'transparent' }}
                    >
                      <span
                        className="px-2.5 py-1 text-xs font-bold rounded uppercase"
                        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        {method}
                      </span>
                      <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{path}</code>
                      <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
                        {endpoint.summary}
                      </span>
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      )}
                    </button>

                    {/* Endpoint Details */}
                    {isExpanded && (
                      <div className="p-4 space-y-4" style={{ backgroundColor: 'var(--bg-primary)', borderTop: `1px solid ${colors.border}` }}>
                        {/* Description */}
                        {endpoint.description && (
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {endpoint.description}
                          </p>
                        )}

                        {/* Parameters */}
                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Parameters</h4>
                            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</th>
                                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Type</th>
                                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>In</th>
                                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.parameters.map((param, i) => (
                                    <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--bg-tertiary)' : undefined }}>
                                      <td className="px-3 py-2">
                                        <code style={{ color: 'var(--text-primary)' }}>{param.name}</code>
                                        {param.required && <span className="text-red-500 ml-1">*</span>}
                                      </td>
                                      <td className="px-3 py-2" style={{ color: 'var(--accent)' }}>{param.schema?.type || 'string'}</td>
                                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{param.in}</td>
                                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {endpoint.requestBody && (
                          <div>
                            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                              Request Body
                              {endpoint.requestBody.required && <span className="text-red-500 ml-1">*</span>}
                            </h4>
                            <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                              {JSON.stringify(endpoint.requestBody.content?.['application/json']?.schema || {}, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Responses */}
                        {endpoint.responses && (
                          <div>
                            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Responses</h4>
                            <div className="space-y-2">
                              {Object.entries(endpoint.responses).map(([code, response]) => (
                                <div key={code} className="flex items-start gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                  <span
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{
                                      backgroundColor: code.startsWith('2') ? 'rgba(34, 197, 94, 0.2)' : code.startsWith('4') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                      color: code.startsWith('2') ? '#22c55e' : code.startsWith('4') ? '#ef4444' : '#eab308'
                                    }}
                                  >
                                    {code}
                                  </span>
                                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{response.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* cURL Example */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Example Request</h4>
                            <button
                              onClick={() => copyToClipboard(generateCurlExample(path, method, endpoint))}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                              <ClipboardDocumentIcon className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                            {generateCurlExample(path, method, endpoint)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

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
              Enter your API key to include it in example requests.
            </p>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="wh_..."
              className="input w-full mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAuthModal(false)}
                className="btn btn-primary flex-1"
              >
                {apiKey ? 'Save' : 'Close'}
              </button>
              {apiKey && (
                <button
                  onClick={() => { setApiKey(''); setShowAuthModal(false); }}
                  className="btn btn-secondary"
                >
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
