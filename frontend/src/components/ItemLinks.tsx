import { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';

interface LinkedItem {
  id: string;
  linkType: string;
  notes?: string;
  linkedItem: {
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    images?: { filename: string }[];
    template?: { id: string; name: string; icon?: string; iconColor?: string; iconBackgroundColor?: string };
    category?: { id: string; name: string; icon?: string; iconColor?: string; iconBackgroundColor?: string };
  };
}

interface Props {
  itemId: string;
  isManager: boolean;
  onRefresh: () => void;
}

const LINK_TYPES = [
  { value: 'related', label: 'Related', color: '#3b82f6' },
  { value: 'accessory', label: 'Accessory', color: '#10b981' },
  { value: 'alternative', label: 'Alternative', color: '#f59e0b' },
];

export default function ItemLinks({ itemId, isManager, onRefresh }: Props) {
  const [links, setLinks] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [linkType, setLinkType] = useState('related');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLinks = async () => {
    try {
      const res = await itemsApi.getLinks(itemId);
      setLinks(res.data.data || []);
    } catch {
      console.error('Failed to fetch links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, [itemId]);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await itemsApi.getAll({ search, limit: 10 });
        const existingIds = links.map(l => l.linkedItem.id);
        setSearchResults((res.data.data || []).filter((i: any) => i.id !== itemId && !existingIds.includes(i.id)));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, itemId, links]);

  const handleAdd = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await itemsApi.addLink(itemId, { targetItemId: selectedItem.id, linkType, notes: notes || undefined });
      toast.success('Link added');
      setShowAddModal(false);
      setSelectedItem(null);
      setSearch('');
      setNotes('');
      setLinkType('related');
      fetchLinks();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add link');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await itemsApi.removeLink(itemId, linkId);
      toast.success('Link removed');
      fetchLinks();
    } catch {
      toast.error('Failed to remove link');
    }
  };

  const getLinkTypeStyle = (type: string) => LINK_TYPES.find(t => t.value === type) || { color: '#6b7280', label: type };

  if (loading) return null;
  if (links.length === 0 && !isManager) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 20%, transparent)' }}>
            <LinkIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Linked Items</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{links.length} linked</p>
          </div>
        </div>
        {isManager && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm flex items-center gap-1">
            <PlusIcon className="w-4 h-4" />
            Link Item
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="text-center py-6 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <LinkIcon className="w-10 h-10 mx-auto mb-2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No linked items</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const img = link.linkedItem.images?.[0];
            const typeStyle = getLinkTypeStyle(link.linkType);
            return (
              <div key={link.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: img ? 'var(--bg-tertiary)' : (link.linkedItem.template?.iconBackgroundColor || link.linkedItem.category?.iconBackgroundColor || 'var(--bg-tertiary)') }}>
                    {img ? (
                      <img src={`/uploads/${img.filename}`} alt="" className="w-full h-full object-cover" />
                    ) : link.linkedItem.template?.icon ? (
                      <Icon icon={link.linkedItem.template.icon} className="w-5 h-5" style={{ color: link.linkedItem.template.iconColor || 'var(--accent)' }} />
                    ) : link.linkedItem.category?.icon ? (
                      <Icon icon={link.linkedItem.category.icon} className="w-5 h-5" style={{ color: link.linkedItem.category.iconColor || 'var(--accent)' }} />
                    ) : (
                      <CubeIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/items/${link.linkedItem.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {link.linkedItem.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {link.linkedItem.sku && <span>{link.linkedItem.sku}</span>}
                      {link.notes && <span>· {link.notes}</span>}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${typeStyle.color} 15%, transparent)`, color: typeStyle.color }}>
                    {typeStyle.label}
                  </span>
                </div>
                {isManager && (
                  <button onClick={() => handleRemove(link.id)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10 ml-2">
                    <TrashIcon className="w-4 h-4" style={{ color: '#ef4444' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Link Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Link Item</h3>
              <button onClick={() => { setShowAddModal(false); setSelectedItem(null); setSearch(''); }} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {!selectedItem ? (
              <>
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Search items..." autoFocus />
                </div>
                <div className="overflow-y-auto flex-1 space-y-1" style={{ maxHeight: '300px' }}>
                  {searchResults.map((item) => (
                    <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        {item.images?.[0] ? (
                          <img src={`/uploads/${item.images[0].filename}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <CubeIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        {item.sku && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.sku}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedItem.name}</p>
                  {selectedItem.sku && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedItem.sku}</p>}
                </div>
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Link Type</label>
                  <div className="flex gap-2">
                    {LINK_TYPES.map(t => (
                      <button key={t.value} onClick={() => setLinkType(t.value)} className="px-3 py-1.5 text-sm rounded-lg transition-all" style={{
                        backgroundColor: linkType === t.value ? `color-mix(in srgb, ${t.color} 20%, transparent)` : 'var(--bg-secondary)',
                        color: linkType === t.value ? t.color : 'var(--text-secondary)',
                        border: linkType === t.value ? `1px solid ${t.color}` : '1px solid transparent',
                      }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Notes (optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Add a note..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelectedItem(null)} className="btn btn-secondary flex-1">Back</button>
                  <button onClick={handleAdd} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Linking...' : 'Link'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
