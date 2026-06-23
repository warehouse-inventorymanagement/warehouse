import React, { useState, useEffect, useCallback } from 'react';
import { announcementsApi, settingsApi, itemsApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  MapPinIcon,
  LinkIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  BookmarkIcon,
  Square2StackIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { Announcement, AnnouncementTemplate, NotificationRecipients } from '../types';
import IconPicker, { IconDisplay } from '../components/IconPicker';
import ChipMultiSelect from '../components/ChipMultiSelect';
import { BUILT_IN_ANNOUNCEMENT_PRESETS as BUILT_IN_PRESETS } from '../constants/announcementPresets';

function isEffectivelyActive(a: Announcement): boolean {
  if (!a.isActive) return false;
  const now = new Date();
  if (a.startDate && new Date(a.startDate) > now) return false;
  if (a.endDate && new Date(a.endDate) < now) return false;
  return true;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ANNOUNCEMENT_TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, color: string, label: string }> = {
  info: { icon: InformationCircleIcon, color: '#3b82f6', label: 'Info' },
  warning: { icon: ExclamationTriangleIcon, color: '#f97316', label: 'Warning' },
  success: { icon: CheckCircleIcon, color: '#22c55e', label: 'Success' },
  error: { icon: XCircleIcon, color: '#ef4444', label: 'Error' },
};

const ITEMS_PER_PAGE = 20;

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  // Search, filter, pagination, bulk
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [linkedItemId, setLinkedItemId] = useState<string | null>(null);
  const [linkedItemName, setLinkedItemName] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState(0);
  const [dismissType, setDismissType] = useState<'none' | 'permanent' | 'until_update'>('none');
  const [useLinkedItemImage, setUseLinkedItemImage] = useState(false);
  const [targetRoleIds, setTargetRoleIds] = useState<string[]>([]);
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);

  // Item search
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<{ id: string; name: string; sku?: string }[]>([]);
  const [itemSearching, setItemSearching] = useState(false);

  // Targeting
  const [recipients, setRecipients] = useState<NotificationRecipients | null>(null);
  const [showTargeting, setShowTargeting] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Ticker settings
  const [showSettings, setShowSettings] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState('8');
  const [textSize, setTextSize] = useState('small');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Read tracking modal
  const [showReadsModal, setShowReadsModal] = useState<string | null>(null);
  const [readsData, setReadsData] = useState<{ userId: string; readAt: string; user: { id: string; username: string; firstName?: string; lastName?: string; email: string } }[]>([]);
  const [readsLoading, setReadsLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementsApi.getAll();
      setAnnouncements(res.data.data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    if (recipients) return;
    try {
      const res = await announcementsApi.getRecipients();
      setRecipients(res.data.data);
    } catch {
      toast.error('Failed to load recipients');
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await announcementsApi.getTemplates();
      setTemplates(res.data.data);
    } catch {}
  };

  // Item search with debounce
  useEffect(() => {
    if (!itemSearch.trim() || itemSearch.length < 2) {
      setItemResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setItemSearching(true);
      try {
        const res = await itemsApi.getAll({ search: itemSearch, limit: 8 });
        setItemResults(res.data.data.map((i: any) => ({ id: i.id, name: i.name, sku: i.sku })));
      } catch {}
      setItemSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  const openModal = useCallback((announcement?: Announcement) => {
    if (announcement) {
      setEditing(announcement);
      setTitle(announcement.title);
      setMessage(announcement.message);
      setType((announcement as any).type || 'info');
      setIcon(announcement.icon || '');
      setColor(announcement.color || '#3b82f6');
      setIsActive(announcement.isActive);
      setStartDate(announcement.startDate ? formatDatetimeLocal(announcement.startDate) : '');
      setEndDate(announcement.endDate ? formatDatetimeLocal(announcement.endDate) : '');
      setLinkedItemId(announcement.linkedItemId || null);
      setLinkedItemName(announcement.linkedItem?.name || '');
      setActionUrl(announcement.actionUrl || '');
      setIsPinned(announcement.isPinned || false);
      setPriority(announcement.priority || 0);
      setDismissType(announcement.dismissType || 'none');
      setUseLinkedItemImage(announcement.useLinkedItemImage || false);
      setTargetRoleIds(announcement.targetRoleIds || []);
      setTargetGroupIds(announcement.targetGroupIds || []);
      setTargetUserIds(announcement.targetUserIds || []);
      const hasTargets = (announcement.targetRoleIds?.length || 0) > 0 || (announcement.targetGroupIds?.length || 0) > 0 || (announcement.targetUserIds?.length || 0) > 0;
      setShowTargeting(hasTargets);
    } else {
      setEditing(null);
      setTitle('');
      setMessage('');
      setType('info');
      setIcon('');
      setColor('#3b82f6');
      setIsActive(true);
      setStartDate('');
      setEndDate('');
      setLinkedItemId(null);
      setLinkedItemName('');
      setActionUrl('');
      setIsPinned(false);
      setPriority(0);
      setDismissType('none');
      setUseLinkedItemImage(false);
      setTargetRoleIds([]);
      setTargetGroupIds([]);
      setTargetUserIds([]);
      setShowTargeting(false);
    }
    setItemSearch('');
    setItemResults([]);
    setShowSaveTemplate(false);
    setTemplateName('');
    fetchTemplates();
    setShowModal(true);
  }, []);

  const applyTemplate = (t: Omit<AnnouncementTemplate, 'id' | 'createdAt'> | AnnouncementTemplate) => {
    if (t.titlePrefix) setTitle(t.titlePrefix);
    if (t.messageTemplate) setMessage(t.messageTemplate);
    if (t.icon) setIcon(t.icon);
    if (t.color) setColor(t.color);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error('Template name is required'); return; }
    try {
      await announcementsApi.createTemplate({
        name: templateName.trim(),
        titlePrefix: title || undefined,
        messageTemplate: message || undefined,
        icon: icon || undefined,
        color: color || undefined,
      });
      toast.success('Template saved');
      setShowSaveTemplate(false);
      setTemplateName('');
      fetchTemplates();
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await announcementsApi.deleteTemplate(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!message.trim()) { toast.error('Message is required'); return; }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        message: message.trim(),
        type,
        icon: icon || null,
        color,
        isActive,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        linkedItemId: linkedItemId || null,
        actionUrl: actionUrl || null,
        isPinned,
        priority,
        dismissType,
        useLinkedItemImage,
        targetRoleIds,
        targetGroupIds,
        targetUserIds,
      };

      if (editing) {
        await announcementsApi.update(editing.id, data);
        toast.success('Announcement updated');
      } else {
        await announcementsApi.create(data);
        toast.success('Announcement created');
      }
      setShowModal(false);
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error(`Failed to ${editing ? 'update' : 'create'} announcement`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsApi.delete(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await announcementsApi.duplicate(id);
      toast.success('Announcement duplicated');
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to duplicate announcement');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await announcementsApi.update(announcement.id, { isActive: !announcement.isActive });
      toast.success(`Announcement ${announcement.isActive ? 'disabled' : 'enabled'}`);
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to update announcement');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} announcement(s)?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => announcementsApi.delete(id)));
      toast.success(`Deleted ${selectedIds.size} announcement(s)`);
      setSelectedIds(new Set());
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to delete some announcements');
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all([...selectedIds].map(id => announcementsApi.update(id, { isActive: enable })));
      toast.success(`${enable ? 'Enabled' : 'Disabled'} ${selectedIds.size} announcement(s)`);
      setSelectedIds(new Set());
      fetchAnnouncements();
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to update some announcements');
    }
  };

  // Filtering & pagination
  const filteredAnnouncements = announcements.filter(a => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'active') return isEffectivelyActive(a);
    if (statusFilter === 'inactive') return !a.isActive;
    if (statusFilter === 'scheduled') return a.isActive && !isEffectivelyActive(a);
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE));
  const paginatedAnnouncements = filteredAnnouncements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const allVisibleSelected = paginatedAnnouncements.length > 0 && paginatedAnnouncements.every(a => selectedIds.has(a.id));

  const handleViewReads = async (id: string) => {
    setShowReadsModal(id);
    setReadsLoading(true);
    try {
      const res = await announcementsApi.getReads(id);
      setReadsData(res.data.data);
    } catch {
      toast.error('Failed to load read data');
    } finally {
      setReadsLoading(false);
    }
  };

  const fetchTickerSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await settingsApi.getAll();
      const settings = res.data.data;
      setScrollSpeed(settings['announcements.scrollSpeed'] || '8');
      setTextSize(settings['announcements.textSize'] || 'small');
    } catch {
      toast.error('Failed to load ticker settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveTickerSettings = async () => {
    setSettingsSaving(true);
    try {
      await settingsApi.update({
        'announcements.scrollSpeed': scrollSpeed,
        'announcements.textSize': textSize,
      });
      toast.success('Ticker settings saved');
      window.dispatchEvent(new Event('announcements-updated'));
    } catch {
      toast.error('Failed to save ticker settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  const roleOptions = recipients?.roles.map(r => ({ id: r.id, label: r.name })) || [];
  const groupOptions = recipients?.groups.map(g => ({ id: g.id, label: g.name })) || [];
  const userOptions = recipients?.users.map(u => ({ id: u.id, label: u.displayName, sublabel: u.email })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
            <MegaphoneIcon className="w-6 h-6" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage announcements displayed in the header bar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) fetchTickerSettings();
            }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: showSettings ? 'var(--accent)' : 'var(--text-secondary)', backgroundColor: showSettings ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent' }}
            onMouseEnter={(e) => { if (!showSettings) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
            onMouseLeave={(e) => { if (!showSettings) e.currentTarget.style.backgroundColor = 'transparent'; }}
            title="Ticker Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            New Announcement
          </button>
        </div>
      </div>

      {/* Ticker Settings Panel */}
      {showSettings && (
        <div className="card p-4 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ticker Display Settings
          </h3>
          {settingsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Scroll Speed (seconds per announcement)</label>
                  <input type="number" min="2" max="30" value={scrollSpeed} onChange={(e) => setScrollSpeed(e.target.value)} className="input w-full" />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Lower values = faster scrolling. Default: 8</p>
                </div>
                <div>
                  <label className="label">Text Size</label>
                  <select value={textSize} onChange={(e) => setTextSize(e.target.value)} className="input w-full">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Controls the size of announcement pills in the header</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveTickerSettings} disabled={settingsSaving} className="btn btn-primary">
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="input w-full pl-9"
            placeholder="Search announcements..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
          className="input"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => handleBulkToggle(true)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)', color: '#10b981' }}>Enable</button>
            <button onClick={() => handleBulkToggle(false)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: 'color-mix(in srgb, #6b7280 15%, transparent)', color: '#6b7280' }}>Disable</button>
            <button onClick={handleBulkDelete} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)', color: '#ef4444' }}>Delete</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            <MegaphoneIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No announcements</p>
            <p className="text-sm mt-1">Create one to display it in the header bar for all users.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }} className="border-b">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        paginatedAnnouncements.forEach(a => e.target.checked ? next.add(a.id) : next.delete(a.id));
                        setSelectedIds(next);
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Announcement</th>
                  <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Reads</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Schedule</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Created By</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAnnouncements.map((a) => {
                  const active = isEffectivelyActive(a);
                  const announcementColor = a.color || '#3b82f6';
                  const hasTargets = (a.targetRoleIds?.length || 0) > 0 || (a.targetGroupIds?.length || 0) > 0 || (a.targetUserIds?.length || 0) > 0;
                  const typeMeta = ANNOUNCEMENT_TYPE_META[(a as any).type || 'info'];
                  return (
                    <tr key={a.id} className="border-b transition-colors" style={{ borderColor: 'var(--bg-tertiary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            e.target.checked ? next.add(a.id) : next.delete(a.id);
                            setSelectedIds(next);
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggleActive(a)}
                            className="flex items-center gap-2"
                            title={a.isActive ? 'Click to disable' : 'Click to enable'}
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? '#10b981' : '#6b7280' }} />
                            <span className="text-xs" style={{ color: active ? '#10b981' : 'var(--text-secondary)' }}>
                              {active ? 'Active' : a.isActive ? 'Scheduled' : 'Inactive'}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 flex-wrap">
                            {a.isPinned && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>Pinned</span>
                            )}
                            {hasTargets && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}>Targeted</span>
                            )}
                            {a.dismissType !== 'none' && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, #6366f1 15%, transparent)', color: '#6366f1' }}>
                                {a.dismissType === 'permanent' ? 'Dismiss' : 'Dismiss·Edit'}
                              </span>
                            )}
                            {typeMeta && (a as any).type && (a as any).type !== 'info' && (
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `color-mix(in srgb, ${typeMeta.color} 15%, transparent)`, color: typeMeta.color }}>
                                <typeMeta.icon className="w-3 h-3" />
                                {typeMeta.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {a.useLinkedItemImage && a.linkedItem?.images?.[0]?.filename ? (
                            <img
                              src={`/uploads/${a.linkedItem.images[0].filename}`}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `color-mix(in srgb, ${announcementColor} 20%, transparent)` }}
                            >
                              {a.icon ? (
                                <IconDisplay icon={a.icon} size="small" color={announcementColor} />
                              ) : (
                                <MegaphoneIcon className="w-4 h-4" style={{ color: announcementColor }} />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                              {a.linkedItem && <LinkIcon className="w-3 h-3 shrink-0" style={{ color: 'var(--text-secondary)' }} title={`Linked: ${a.linkedItem.name}`} />}
                              {a.actionUrl && <LinkIcon className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} title="Has action URL" />}
                            </div>
                            <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-center">
                        <button
                          onClick={() => handleViewReads(a.id)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="View who read this"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          {a._count?.reads || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {!a.startDate && !a.endDate ? (
                            <span>Always</span>
                          ) : (
                            <>
                              {a.startDate && <div>From: {formatDate(a.startDate)}</div>}
                              {a.endDate && <div>Until: {formatDate(a.endDate)}</div>}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {a.createdBy?.firstName || a.createdBy?.username || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(a)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(a.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Duplicate"
                          >
                            <Square2StackIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #ef4444 10%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAnnouncements.length)} of {filteredAnnouncements.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: page === currentPage ? 'var(--accent)' : 'transparent',
                  color: page === currentPage ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Edit Announcement' : 'New Announcement'}
            </h2>

            {/* Template Selector */}
            {!editing && (
              <div className="mb-4">
                <label className="label">Use Template</label>
                <div className="flex flex-wrap gap-2">
                  {BUILT_IN_PRESETS.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => applyTemplate(t)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = t.color || 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-tertiary)'}
                    >
                      {t.icon && <IconDisplay icon={t.icon} size={12} color={t.color || '#3b82f6'} />}
                      {t.name}
                    </button>
                  ))}
                  {templates.filter(t => !t.isBuiltIn).map((t) => (
                    <div key={t.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => applyTemplate(t)}
                        className="text-xs px-3 py-1.5 rounded-l-lg transition-colors flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {t.icon && <IconDisplay icon={t.icon} size={12} color={t.color || '#3b82f6'} />}
                        {t.name}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="text-xs px-1.5 py-1.5 rounded-r-lg transition-colors"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        title="Delete template"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {!showSaveTemplate ? (
                  <button onClick={() => setShowSaveTemplate(true)} className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
                    <BookmarkIcon className="w-3 h-3 inline mr-1" />Save current as template
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input text-xs flex-1" placeholder="Template name" maxLength={100} />
                    <button onClick={handleSaveTemplate} className="btn btn-primary text-xs px-3 py-1">Save</button>
                    <button onClick={() => setShowSaveTemplate(false)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Header Preview</p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                {isPinned && <MapPinIcon className="w-3 h-3 shrink-0" style={{ color }} />}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {icon ? <IconDisplay icon={icon} size={14} color={color} /> : <MegaphoneIcon className="w-3.5 h-3.5" style={{ color }} />}
                </div>
                <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium" style={{ color }}>{title || 'Title'}</span>
                  {' — '}{message || 'Message text...'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Title & Message */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Title</label>
                  <span className="text-xs" style={{ color: title.length > 180 ? '#ef4444' : 'var(--text-secondary)' }}>{title.length}/200</span>
                </div>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" placeholder="Announcement title" maxLength={200} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Message <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(supports markdown)</span></label>
                  <span className="text-xs" style={{ color: message.length > 1800 ? '#ef4444' : 'var(--text-secondary)' }}>{message.length}/2000</span>
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input w-full" rows={3} placeholder="Announcement message — supports **bold**, *italic*, [links](url)" maxLength={2000} />
              </div>

              {/* Type, Icon & Color */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Type</label>
                  <div className="flex gap-1.5">
                    {Object.entries(ANNOUNCEMENT_TYPE_META).map(([key, meta]) => {
                      const TypeIcon = meta.icon;
                      const isSelected = type === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key as any)}
                          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium uppercase transition-colors"
                          style={{
                            backgroundColor: isSelected ? `color-mix(in srgb, ${meta.color} 15%, transparent)` : 'var(--bg-secondary)',
                            border: `1px solid ${isSelected ? meta.color : 'var(--bg-tertiary)'}`,
                            color: isSelected ? meta.color : 'var(--text-secondary)',
                          }}
                        >
                          <TypeIcon className="w-4 h-4" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="label">Icon</label>
                  <IconPicker value={icon} onChange={setIcon} showColorPicker={false} showSizeSelector={false} />
                </div>
                <div>
                  <label className="label">Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ backgroundColor: 'transparent' }} />
                    <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="input flex-1" placeholder="#3b82f6" maxLength={7} />
                  </div>
                </div>
              </div>

              {/* Item Link & Action URL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Link to Item</label>
                  {linkedItemId ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}>
                      <LinkIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{linkedItemName}</span>
                      <button onClick={() => { setLinkedItemId(null); setLinkedItemName(''); }} style={{ color: 'var(--text-secondary)' }}>
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="input w-full"
                        placeholder={actionUrl ? 'Disabled (URL set)' : 'Search items...'}
                        disabled={!!actionUrl}
                      />
                      {itemResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
                          {itemResults.map((item) => (
                            <button
                              key={item.id}
                              className="w-full text-left px-3 py-2 text-sm transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                setLinkedItemId(item.id);
                                setLinkedItemName(item.name);
                                setItemSearch('');
                                setItemResults([]);
                                setActionUrl('');
                              }}
                            >
                              {item.name} {item.sku && <span style={{ color: 'var(--text-secondary)' }}>({item.sku})</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {itemSearching && <div className="absolute right-3 top-2.5"><div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--accent)' }} /></div>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Action URL</label>
                  <input
                    type="url"
                    value={actionUrl}
                    onChange={(e) => { setActionUrl(e.target.value); if (e.target.value) { setLinkedItemId(null); setLinkedItemName(''); } }}
                    className="input w-full"
                    placeholder={linkedItemId ? 'Disabled (item linked)' : 'https://...'}
                    disabled={!!linkedItemId}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Opens in new tab from detail view</p>
                </div>
              </div>

              {/* Use linked item image toggle */}
              {linkedItemId && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}>
                  <PhotoIcon className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Show item image in card</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Display the linked item's image instead of the announcement icon in ticker cards</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseLinkedItemImage(!useLinkedItemImage)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: useLinkedItemImage ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                      style={{ transform: useLinkedItemImage ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                    />
                  </button>
                </div>
              )}

              {/* Pin, Priority, Status, Dismiss */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label">Status</label>
                  <button type="button" onClick={() => setIsActive(!isActive)}
                    className="w-full h-10 rounded-lg px-3 text-sm text-left flex items-center gap-2"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isActive ? '#10b981' : '#6b7280' }} />
                    {isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div>
                  <label className="label">Pinned</label>
                  <button type="button" onClick={() => setIsPinned(!isPinned)}
                    className="w-full h-10 rounded-lg px-3 text-sm text-left flex items-center gap-2"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    <MapPinIcon className="w-4 h-4" style={{ color: isPinned ? '#f59e0b' : 'var(--text-secondary)' }} />
                    {isPinned ? 'Pinned' : 'Not pinned'}
                  </button>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <input type="number" min="0" max="100" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} className="input w-full" />
                </div>
                <div>
                  <label className="label">Dismissible</label>
                  <select value={dismissType} onChange={(e) => setDismissType(e.target.value as any)} className="input w-full">
                    <option value="none">No dismissal</option>
                    <option value="permanent">Dismiss permanently</option>
                    <option value="until_update">Dismiss until updated</option>
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {dismissType === 'none' && 'Users cannot hide this announcement'}
                    {dismissType === 'permanent' && 'Once dismissed, never shown again'}
                    {dismissType === 'until_update' && 'Reappears when announcement is edited'}
                  </p>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date (optional)</label>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-full" />
                  {startDate && <button onClick={() => setStartDate('')} className="text-xs mt-1" style={{ color: 'var(--accent)' }}>Clear</button>}
                </div>
                <div>
                  <label className="label">End Date (optional)</label>
                  <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-full" />
                  {endDate && <button onClick={() => setEndDate('')} className="text-xs mt-1" style={{ color: 'var(--accent)' }}>Clear</button>}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <button
                  onClick={() => { setShowTargeting(!showTargeting); if (!showTargeting) fetchRecipients(); }}
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {showTargeting ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                  Target Audience
                  {(targetRoleIds.length > 0 || targetGroupIds.length > 0 || targetUserIds.length > 0) && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}>
                      {targetRoleIds.length + targetGroupIds.length + targetUserIds.length} selected
                    </span>
                  )}
                </button>
                {showTargeting && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Leave empty to show to everyone</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <ChipMultiSelect label="Target Roles" options={roleOptions} selectedIds={targetRoleIds} onChange={setTargetRoleIds} placeholder="Select roles..." />
                      <ChipMultiSelect label="Target Groups" options={groupOptions} selectedIds={targetGroupIds} onChange={setTargetGroupIds} placeholder="Select groups..." />
                      <ChipMultiSelect label="Target Users" options={userOptions} selectedIds={targetUserIds} onChange={setTargetUserIds} placeholder="Select users..." />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reads Modal */}
      {showReadsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowReadsModal(null)}>
          <div className="w-full max-w-sm rounded-xl shadow-xl p-6" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <EyeIcon className="w-4 h-4 inline mr-1.5" />Read by ({readsData.length})
              </h3>
              <button onClick={() => setShowReadsModal(null)} style={{ color: 'var(--text-secondary)' }}><XMarkIcon className="w-5 h-5" /></button>
            </div>
            {readsLoading ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--accent)' }} /></div>
            ) : readsData.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No one has read this yet</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {readsData.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.user.firstName ? `${r.user.firstName} ${r.user.lastName || ''}`.trim() : r.user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.user.email}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{formatDate(r.readAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
