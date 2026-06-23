import { useState } from 'react';
import { itemsApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline';
import type { ItemInstance } from '../types';

interface Props {
  itemId: string;
  instances: ItemInstance[];
  isManager: boolean;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', color: '#22c55e' },
  { value: 'in_use', label: 'In Use', color: '#3b82f6' },
  { value: 'maintenance', label: 'Maintenance', color: '#f59e0b' },
  { value: 'retired', label: 'Retired', color: '#6b7280' },
  { value: 'defective', label: 'Defective', color: '#ef4444' },
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export default function ItemInstances({ itemId, instances, isManager, onRefresh }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ItemInstance | null>(null);
  const [form, setForm] = useState({
    serialNumber: '',
    status: 'in_stock',
    condition: 'new',
    notes: '',
    acquiredDate: '',
    warrantyExpiry: '',
    purchasePrice: '',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({ serialNumber: '', status: 'in_stock', condition: 'new', notes: '', acquiredDate: '', warrantyExpiry: '', purchasePrice: '' });
    setEditingInstance(null);
    setShowAddModal(false);
  };

  const handleSave = async () => {
    if (!form.serialNumber.trim()) {
      toast.error('Serial number is required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        serialNumber: form.serialNumber.trim(),
        status: form.status,
        condition: form.condition,
        notes: form.notes || undefined,
        acquiredDate: form.acquiredDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      };
      if (editingInstance) {
        await itemsApi.updateInstance(itemId, editingInstance.id, data);
        toast.success('Instance updated');
      } else {
        await itemsApi.createInstance(itemId, data);
        toast.success('Instance added');
      }
      resetForm();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save instance');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (instanceId: string) => {
    if (!confirm('Delete this instance?')) return;
    try {
      await itemsApi.deleteInstance(itemId, instanceId);
      toast.success('Instance deleted');
      onRefresh();
    } catch {
      toast.error('Failed to delete instance');
    }
  };

  const openEdit = (inst: ItemInstance) => {
    setEditingInstance(inst);
    setForm({
      serialNumber: inst.serialNumber,
      status: inst.status,
      condition: inst.condition,
      notes: inst.notes || '',
      acquiredDate: inst.acquiredDate ? inst.acquiredDate.split('T')[0] : '',
      warrantyExpiry: inst.warrantyExpiry ? inst.warrantyExpiry.split('T')[0] : '',
      purchasePrice: inst.purchasePrice != null ? String(inst.purchasePrice) : '',
    });
    setShowAddModal(true);
  };

  const getStatusStyle = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt || { color: '#6b7280', label: status };
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}>
            <FingerPrintIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Serial Numbers</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{instances.length} instances tracked</p>
          </div>
        </div>
        {isManager && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm flex items-center gap-1">
            <PlusIcon className="w-4 h-4" />
            Add Instance
          </button>
        )}
      </div>

      {instances.length === 0 ? (
        <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <FingerPrintIcon className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No serial numbers tracked</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Add instances with unique serial numbers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => {
            const statusStyle = getStatusStyle(inst.status);
            return (
              <div key={inst.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <code className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{inst.serialNumber}</code>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `color-mix(in srgb, ${statusStyle.color} 15%, transparent)`, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inst.condition}</span>
                  {inst.notes && <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>· {inst.notes}</span>}
                  {inst.purchasePrice != null && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>· ${Number(inst.purchasePrice).toFixed(2)}</span>
                  )}
                </div>
                {isManager && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(inst)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                      <PencilIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => handleDelete(inst.id)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                      <TrashIcon className="w-4 h-4" style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingInstance ? 'Edit Instance' : 'Add Instance'}
              </h3>
              <button onClick={resetForm} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label" style={{ color: 'var(--text-primary)' }}>Serial Number *</label>
                <input type="text" value={form.serialNumber} onChange={(e) => setForm(f => ({ ...f, serialNumber: e.target.value }))} className="input" placeholder="Enter serial number" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Condition</label>
                  <select value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))} className="input">
                    {CONDITION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" style={{ color: 'var(--text-primary)' }}>Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Optional notes" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Acquired Date</label>
                  <input type="date" value={form.acquiredDate} onChange={(e) => setForm(f => ({ ...f, acquiredDate: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label" style={{ color: 'var(--text-primary)' }}>Warranty Expiry</label>
                  <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm(f => ({ ...f, warrantyExpiry: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label" style={{ color: 'var(--text-primary)' }}>Purchase Price</label>
                <input type="number" value={form.purchasePrice} onChange={(e) => setForm(f => ({ ...f, purchasePrice: e.target.value }))} className="input" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={resetForm} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Saving...' : editingInstance ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
