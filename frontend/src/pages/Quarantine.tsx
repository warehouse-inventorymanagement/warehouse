import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { settingsApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArchiveBoxIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import type { QuarantinedItem, QuarantinedImage } from '../types';

export default function Quarantine() {
  const [loading, setLoading] = useState(true);

  // Permissions from API response
  const [canManage, setCanManage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Quarantine settings
  const [quarantineRetentionDays, setQuarantineRetentionDays] = useState('30');
  const [quarantinedItems, setQuarantinedItems] = useState<QuarantinedItem[]>([]);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [quarantinePage, setQuarantinePage] = useState(1);
  const [quarantineTotal, setQuarantineTotal] = useState(0);
  const [quarantineSearch, setQuarantineSearch] = useState('');
  const [selectedQuarantineItems, setSelectedQuarantineItems] = useState<Set<string>>(new Set());
  const [processingQuarantine, setProcessingQuarantine] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'images'>('items');

  // Quarantined images state
  const [quarantinedImages, setQuarantinedImages] = useState<QuarantinedImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePage, setImagePage] = useState(1);
  const [imageTotal, setImageTotal] = useState(0);
  const [imageSearch, setImageSearch] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [processingImages, setProcessingImages] = useState(false);

  useEffect(() => {
    fetchQuarantinedItems();
  }, [quarantinePage]);

  const fetchQuarantinedItems = async () => {
    setQuarantineLoading(true);
    try {
      const response = await settingsApi.getQuarantinedItems({
        page: quarantinePage,
        limit: 20,
        search: quarantineSearch || undefined
      });
      setQuarantinedItems(response.data.data);
      setQuarantineTotal(response.data.pagination?.total || 0);
      setQuarantineRetentionDays(String(response.data.retentionDays || 30));
      // Set permissions from API response
      setCanManage(response.data.canManage || false);
      setIsAdmin(response.data.isAdmin || false);
    } catch (error) {
      console.error('Failed to fetch quarantined items:', error);
      toast.error('Failed to load quarantined items');
    } finally {
      setQuarantineLoading(false);
      setLoading(false);
    }
  };

  const handleSaveQuarantineRetention = async () => {
    setSavingRetention(true);
    try {
      await settingsApi.update({
        'quarantine.retentionDays': quarantineRetentionDays
      });
      toast.success('Retention period updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update retention period');
    } finally {
      setSavingRetention(false);
    }
  };

  const handleRestoreItem = async (id: string) => {
    setProcessingQuarantine(true);
    try {
      await settingsApi.restoreItem(id);
      toast.success('Item restored');
      await fetchQuarantinedItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore item');
    } finally {
      setProcessingQuarantine(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedQuarantineItems.size === 0) return;
    setProcessingQuarantine(true);
    try {
      await settingsApi.bulkRestoreItems(Array.from(selectedQuarantineItems));
      toast.success(`${selectedQuarantineItems.size} item(s) restored`);
      setSelectedQuarantineItems(new Set());
      await fetchQuarantinedItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore items');
    } finally {
      setProcessingQuarantine(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('This will permanently delete this item. This action cannot be undone.')) return;
    setProcessingQuarantine(true);
    try {
      await settingsApi.permanentDeleteItem(id);
      toast.success('Item permanently deleted');
      await fetchQuarantinedItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setProcessingQuarantine(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedQuarantineItems.size === 0) return;
    if (!confirm(`This will permanently delete ${selectedQuarantineItems.size} item(s). This action cannot be undone.`)) return;
    setProcessingQuarantine(true);
    try {
      await settingsApi.bulkPermanentDeleteItems(Array.from(selectedQuarantineItems));
      toast.success(`${selectedQuarantineItems.size} item(s) permanently deleted`);
      setSelectedQuarantineItems(new Set());
      await fetchQuarantinedItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete items');
    } finally {
      setProcessingQuarantine(false);
    }
  };

  const toggleQuarantineItemSelection = (id: string) => {
    const newSelected = new Set(selectedQuarantineItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuarantineItems(newSelected);
  };

  const toggleAllQuarantineItems = () => {
    if (selectedQuarantineItems.size === quarantinedItems.length) {
      setSelectedQuarantineItems(new Set());
    } else {
      setSelectedQuarantineItems(new Set(quarantinedItems.map(item => item.id)));
    }
  };

  const handleSearch = () => {
    setQuarantinePage(1);
    fetchQuarantinedItems();
  };

  // ===== Image quarantine functions =====
  const fetchQuarantinedImages = async () => {
    setImageLoading(true);
    try {
      const response = await settingsApi.getQuarantinedImages({
        page: imagePage,
        limit: 20,
        search: imageSearch || undefined
      });
      setQuarantinedImages(response.data.data);
      setImageTotal(response.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load quarantined images');
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'images') fetchQuarantinedImages();
  }, [imagePage, activeTab]);

  const handleRestoreImage = async (id: string) => {
    setProcessingImages(true);
    try {
      await settingsApi.restoreQuarantineImage(id);
      toast.success('Image restored');
      await fetchQuarantinedImages();
    } catch {
      toast.error('Failed to restore image');
    } finally {
      setProcessingImages(false);
    }
  };

  const handleBulkRestoreImages = async () => {
    if (selectedImages.size === 0) return;
    setProcessingImages(true);
    try {
      await settingsApi.bulkRestoreImages(Array.from(selectedImages));
      toast.success(`${selectedImages.size} image(s) restored`);
      setSelectedImages(new Set());
      await fetchQuarantinedImages();
    } catch {
      toast.error('Failed to restore images');
    } finally {
      setProcessingImages(false);
    }
  };

  const handlePermanentDeleteImage = async (id: string) => {
    if (!confirm('This will permanently delete this image. This action cannot be undone.')) return;
    setProcessingImages(true);
    try {
      await settingsApi.permanentDeleteImage(id);
      toast.success('Image permanently deleted');
      await fetchQuarantinedImages();
    } catch {
      toast.error('Failed to delete image');
    } finally {
      setProcessingImages(false);
    }
  };

  const handleBulkPermanentDeleteImages = async () => {
    if (selectedImages.size === 0) return;
    if (!confirm(`This will permanently delete ${selectedImages.size} image(s). This action cannot be undone.`)) return;
    setProcessingImages(true);
    try {
      await settingsApi.bulkPermanentDeleteImages(Array.from(selectedImages));
      toast.success(`${selectedImages.size} image(s) permanently deleted`);
      setSelectedImages(new Set());
      await fetchQuarantinedImages();
    } catch {
      toast.error('Failed to delete images');
    } finally {
      setProcessingImages(false);
    }
  };

  const handleImageSearch = () => {
    setImagePage(1);
    fetchQuarantinedImages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Quarantine</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="mt-1">
          {canManage ? 'Manage deleted items before permanent removal' : 'View deleted items awaiting permanent removal'}
        </p>
      </div>

      {/* Retention Settings - Admin Only */}
      {isAdmin && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)' }}>
              <ArchiveBoxIcon className="w-6 h-6" style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Retention Settings</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure how long items stay in quarantine</p>
            </div>
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="label">Retention Period (days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={quarantineRetentionDays}
                onChange={(e) => setQuarantineRetentionDays(e.target.value)}
                className="input w-32"
              />
            </div>
            <button
              onClick={handleSaveQuarantineRetention}
              disabled={savingRetention}
              className="btn btn-primary"
            >
              {savingRetention ? 'Saving...' : 'Save'}
            </button>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Items in quarantine will be permanently deleted after this period
            </p>
          </div>
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <button
          onClick={() => setActiveTab('items')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'items' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'items' ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'items' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <CubeIcon className="w-4 h-4" />
          Items ({quarantineTotal})
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'images' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'images' ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'images' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <PhotoIcon className="w-4 h-4" />
          Images ({imageTotal})
        </button>
      </div>

      {/* Quarantined Items */}
      {activeTab === 'items' && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Quarantined Items ({quarantineTotal})
          </h3>
          {canManage && selectedQuarantineItems.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkRestore}
                disabled={processingQuarantine}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Restore ({selectedQuarantineItems.size})
              </button>
              <button
                onClick={handleBulkPermanentDelete}
                disabled={processingQuarantine}
                className="btn btn-danger btn-sm flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                Delete ({selectedQuarantineItems.size})
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={quarantineSearch}
              onChange={(e) => setQuarantineSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input pl-10 w-full"
              placeholder="Search quarantined items..."
            />
          </div>
          <button onClick={handleSearch} className="btn btn-secondary">
            Search
          </button>
        </div>

        {quarantineLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
          </div>
        ) : quarantinedItems.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items in quarantine</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    {canManage && (
                      <th className="text-left py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedQuarantineItems.size === quarantinedItems.length && quarantinedItems.length > 0}
                          onChange={toggleAllQuarantineItems}
                          className="rounded border-bg-tertiary text-accent focus:ring-accent"
                        />
                      </th>
                    )}
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Name</th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>SKU</th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Qty</th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Deleted By</th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Deleted At</th>
                    <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expires In</th>
                    {canManage && (
                      <th className="text-right py-3 px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quarantinedItems.map(item => (
                    <tr key={item.id} className="border-b hover-bg/50" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      {canManage && (
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={selectedQuarantineItems.has(item.id)}
                            onChange={() => toggleQuarantineItemSelection(item.id)}
                            className="rounded border-bg-tertiary text-accent focus:ring-accent"
                          />
                        </td>
                      )}
                      <td className="py-3 px-2" style={{ color: 'var(--text-primary)' }}>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{item.sku || '-'}</td>
                      <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                      <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{item.deletedBy?.username || '-'}</td>
                      <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(item.deletedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="inline-flex items-center gap-1 text-sm font-medium"
                          style={{ color: item.daysUntilExpiration <= 4 ? '#ef4444' : 'var(--text-secondary)' }}
                        >
                          {item.daysUntilExpiration <= 4 && <ExclamationTriangleIcon className="w-4 h-4" />}
                          {item.daysUntilExpiration} day{item.daysUntilExpiration !== 1 ? 's' : ''}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleRestoreItem(item.id)}
                              disabled={processingQuarantine}
                              className="p-2 rounded-lg hover-bg transition-colors"
                              style={{ color: '#22c55e' }}
                              title="Restore item"
                            >
                              <ArrowUturnLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(item.id)}
                              disabled={processingQuarantine}
                              className="p-2 rounded-lg hover-bg transition-colors"
                              style={{ color: '#ef4444' }}
                              title="Permanently delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {quarantineTotal > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setQuarantinePage(p => Math.max(1, p - 1))}
                  disabled={quarantinePage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                  Page {quarantinePage} of {Math.ceil(quarantineTotal / 20)}
                </span>
                <button
                  onClick={() => setQuarantinePage(p => p + 1)}
                  disabled={quarantinePage >= Math.ceil(quarantineTotal / 20)}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Quarantined Images */}
      {activeTab === 'images' && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Quarantined Images ({imageTotal})
          </h3>
          {canManage && selectedImages.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkRestoreImages}
                disabled={processingImages}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Restore ({selectedImages.size})
              </button>
              <button
                onClick={handleBulkPermanentDeleteImages}
                disabled={processingImages}
                className="btn btn-danger btn-sm flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                Delete ({selectedImages.size})
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
              className="input pl-10 w-full"
              placeholder="Search by filename or item name..."
            />
          </div>
          <button onClick={handleImageSearch} className="btn btn-secondary">
            Search
          </button>
        </div>

        {imageLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
          </div>
        ) : quarantinedImages.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            <PhotoIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No images in quarantine</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {quarantinedImages.map(img => (
                <div key={img.id} className="group relative">
                  {canManage && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedImages.has(img.id)}
                        onChange={() => {
                          const newSet = new Set(selectedImages);
                          newSet.has(img.id) ? newSet.delete(img.id) : newSet.add(img.id);
                          setSelectedImages(newSet);
                        }}
                        className="rounded border-bg-tertiary text-accent focus:ring-accent"
                      />
                    </div>
                  )}
                  <div
                    className="aspect-square rounded-xl overflow-hidden border-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--bg-tertiary)' }}
                  >
                    <img
                      src={`/uploads/${img.filename}`}
                      alt={img.originalName}
                      className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                    {canManage && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleRestoreImage(img.id)}
                          disabled={processingImages}
                          className="p-2 rounded-lg bg-white/20 hover:bg-green-500 text-white transition-colors"
                          title="Restore"
                        >
                          <ArrowUturnLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteImage(img.id)}
                          disabled={processingImages}
                          className="p-2 rounded-lg bg-white/20 hover:bg-red-500 text-white transition-colors"
                          title="Permanently delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 px-1">
                    <Link to={`/items/${img.itemId}`} className="text-xs font-medium truncate block hover:underline" style={{ color: 'var(--accent)' }}>
                      {img.itemName}
                    </Link>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }} title={img.originalName}>
                      {img.originalName}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {img.deletedBy?.username || '-'}
                      </p>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: img.daysUntilExpiration <= 4 ? '#ef4444' : 'var(--text-secondary)' }}
                      >
                        {img.daysUntilExpiration}d
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {imageTotal > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setImagePage(p => Math.max(1, p - 1))}
                  disabled={imagePage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                  Page {imagePage} of {Math.ceil(imageTotal / 20)}
                </span>
                <button
                  onClick={() => setImagePage(p => p + 1)}
                  disabled={imagePage >= Math.ceil(imageTotal / 20)}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="text-sm" style={{ color: '#f59e0b' }}>
            <p className="font-medium">About Quarantine</p>
            <p className="mt-1 opacity-90">
              Deleted items are moved to quarantine instead of being immediately removed.
              {canManage
                ? ' They can be restored within the retention period. After expiration, items are automatically and permanently deleted by the system.'
                : ` Items are automatically and permanently deleted after ${quarantineRetentionDays} days.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
