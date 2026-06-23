import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { itemsApi, settingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  LinkIcon,
  CubeIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClipboardDocumentListIcon,
  FingerPrintIcon,
  ArrowUturnLeftIcon,
  StarIcon as StarIconOutline,
  ArrowDownTrayIcon,
  PrinterIcon,
  ClipboardIcon,
  QrCodeIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Icon } from '@iconify/react';
import SubItemTreeView from '../components/SubItemTreeView';
import ItemsGraphView from '../components/ItemsGraphView';
import ItemInstances from '../components/ItemInstances';
import ItemLinks from '../components/ItemLinks';
import ItemBom from '../components/ItemBom';
const ThreeDViewer = lazy(() => import('../components/ThreeDViewer'));
import SpinViewer from '../components/SpinViewer';
import type { Item, ItemHistory } from '../types';
import { PERMISSIONS } from '../types';
import { IconDisplay } from '../components/IconPicker';
import DeleteItemModal from '../components/DeleteItemModal';

// Helper to format attribute values that may contain unit information
const formatAttributeValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      const unit = parsed.unit ? ` ${parsed.unit}` : '';
      return `${parsed.value}${unit}`;
    }
    return value;
  } catch {
    return value;
  }
};

// History action icons and colors
const getHistoryStyle = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('create')) return { icon: PlusIcon, color: '#22c55e', bg: 'color-mix(in srgb, #22c55e 15%, transparent)' };
  if (lower.includes('update') || lower.includes('adjust')) return { icon: PencilIcon, color: '#3b82f6', bg: 'color-mix(in srgb, #3b82f6 15%, transparent)' };
  if (lower.includes('delete')) return { icon: TrashIcon, color: '#ef4444', bg: 'color-mix(in srgb, #ef4444 15%, transparent)' };
  return { icon: ClockIcon, color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' };
};

// Helper to copy text to clipboard
const copyToClipboard = async (text: string, label: string = 'ID') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch {
    toast.error('Failed to copy');
  }
};

// Helper to format field names for display
const formatFieldName = (field: string): string => {
  const names: Record<string, string> = {
    name: 'Name',
    sku: 'SKU',
    description: 'Description',
    categoryId: 'Category',
    locationId: 'Location',
    templateId: 'Template',
    minQuantity: 'Min Quantity',
    quantity: 'Quantity',
    subItemAdded: 'Sub-Item Added',
    subItemRemoved: 'Sub-Item Removed',
  };
  return names[field] || field.replace(/([A-Z])/g, ' $1').trim();
};

// Helper to format change values for display
const formatChangeValue = (value: any): string => {
  if (value === null || value === undefined) return 'none';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object' && value.childItemName) {
    return `${value.childItemName} (qty: ${value.quantityRequired || 1})`;
  }
  return String(value);
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager, isAdmin, hasPermission } = useAuth();
  const canEditBarcode = hasPermission(PERMISSIONS.ITEMS_BARCODE) || isAdmin || isManager;
  const [item, setItem] = useState<Item | null>(null);
  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [auditSettings, setAuditSettings] = useState<Record<string, string>>({});
  const showCol = (col: string) => auditSettings[`audit.columns.${col}`] !== 'false';
  const [loading, setLoading] = useState(true);
  const [quantityChange, setQuantityChange] = useState(0);
  const [quantityNotes, setQuantityNotes] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Sub-item management state
  const [showAddSubItemModal, setShowAddSubItemModal] = useState(false);
  const [showAddToParentModal, setShowAddToParentModal] = useState(false);
  const [subItemSearch, setSubItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [subItemQuantity, setSubItemQuantity] = useState(1);
  const [subItemPartNumber, setSubItemPartNumber] = useState('');
  const [componentsView, setComponentsView] = useState<'list' | 'graph'>('list');
  const [threeDTab, setThreeDTab] = useState<'model' | 'spin'>('model');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  // Barcode state
  const [barcodeImageSrc, setBarcodeImageSrc] = useState<string | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [isEditingSku, setIsEditingSku] = useState(false);
  const [editSkuValue, setEditSkuValue] = useState('');
  const [savingSku, setSavingSku] = useState(false);

  // Watch state
  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  // Version history state
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    fetchItem();
    fetchHistory();
    settingsApi.getAll().then((res) => {
      const data = res.data.data;
      const settings: Record<string, string> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('audit.')) settings[key] = value;
      });
      setAuditSettings(settings);
    }).catch(() => {});
  }, [id]);

  // Fetch watch status
  useEffect(() => {
    if (id) {
      itemsApi.getWatchStatus(id).then(res => {
        setWatching(res.data.data.watching);
      }).catch(() => {});
    }
  }, [id]);

  const handleToggleWatch = async () => {
    if (!id || watchLoading) return;
    setWatchLoading(true);
    try {
      const res = await itemsApi.toggleWatch(id);
      setWatching(res.data.data.watching);
      toast.success(res.data.data.watching ? 'Now watching this item' : 'Stopped watching this item');
    } catch {
      toast.error('Failed to update watch status');
    } finally {
      setWatchLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!id) return;
    try {
      const res = await itemsApi.getVersions(id);
      setVersions(res.data.data);
    } catch {
      // silently ignore
    }
  };

  const handleRollback = async (version: number) => {
    if (!id || !confirm(`Rollback to version ${version}? This will overwrite current item data.`)) return;
    try {
      await itemsApi.rollbackToVersion(id, version);
      toast.success(`Rolled back to version ${version}`);
      fetchItem();
      fetchHistory();
      fetchVersions();
    } catch {
      toast.error('Failed to rollback');
    }
  };

  // Fetch barcode image when SKU changes
  useEffect(() => {
    if (!item?.sku || !item?.id) {
      setBarcodeImageSrc(null);
      return;
    }

    const fetchBarcode = async () => {
      setBarcodeLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(itemsApi.getSkuBarcodeUrl(item.id), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setBarcodeImageSrc(url);
        }
      } catch (error) {
        console.error('Failed to fetch barcode:', error);
      } finally {
        setBarcodeLoading(false);
      }
    };

    fetchBarcode();

    return () => {
      if (barcodeImageSrc) {
        URL.revokeObjectURL(barcodeImageSrc);
      }
    };
  }, [item?.sku, item?.id]);

  const fetchItem = async () => {
    if (!id) return;
    try {
      const response = await itemsApi.getOne(id);
      setItem(response.data.data);
    } catch (error) {
      toast.error('Item not found');
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!id) return;
    try {
      const response = await itemsApi.getHistory(id, { limit: 20 });
      setHistory(response.data.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleQuantityUpdate = async () => {
    if (!item || quantityChange === 0) return;

    const newQuantity = item.quantity + quantityChange;
    if (newQuantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      await itemsApi.updateQuantity(item.id, newQuantity, quantityNotes);
      toast.success('Quantity updated');
      setShowQuantityModal(false);
      setQuantityChange(0);
      setQuantityNotes('');
      fetchItem();
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleDelete = async (subItemIds: string[]) => {
    if (!item) return;

    setIsDeleting(true);
    try {
      await itemsApi.delete(item.id, subItemIds.length > 0 ? subItemIds : undefined);
      toast.success('Item moved to quarantine');
      navigate('/items');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleGenerateSku = async () => {
    if (!item) return;

    // If item already has a SKU, confirm regeneration
    if (item.sku) {
      if (!confirm(`Generate a new SKU?\n\nThe current SKU "${item.sku}" will be replaced.\nThe old SKU barcode will no longer work.`)) {
        return;
      }
    }

    setGeneratingSku(true);
    try {
      const response = await itemsApi.generateSku(item.id, !!item.sku);
      toast.success(`SKU ${item.sku ? 'regenerated' : 'generated'}: ${response.data.data.sku}`);
      setItem(response.data.data);
      // Reset barcode image to trigger refetch
      setBarcodeImageSrc(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate SKU');
    } finally {
      setGeneratingSku(false);
    }
  };

  const handleSaveSku = async () => {
    if (!item || !editSkuValue.trim()) {
      toast.error('SKU cannot be empty');
      return;
    }

    setSavingSku(true);
    try {
      const response = await itemsApi.updateSku(item.id, editSkuValue.trim());
      toast.success('SKU updated successfully');
      setItem(response.data.data);
      setIsEditingSku(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update SKU');
    } finally {
      setSavingSku(false);
    }
  };

  const handleCancelEditSku = () => {
    setEditSkuValue(item?.sku || '');
    setIsEditingSku(false);
  };

  const handleCopySku = async () => {
    if (!item?.sku) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(item.sku);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = item.sku;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('SKU copied to clipboard');
    } catch {
      toast.error('Failed to copy SKU');
    }
  };

  const handleDownloadBarcode = async (format: 'png' | 'jpeg' = 'png') => {
    if (!barcodeImageSrc || !item?.sku) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = barcodeImageSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // For JPEG, fill with white background first
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpeg' ? 'jpg' : 'png';

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.sku}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Barcode downloaded as ${extension.toUpperCase()}`);
      }, mimeType, 0.95);
    } catch {
      toast.error('Failed to download barcode');
    }
  };

  const handlePrintBarcode = async () => {
    if (!barcodeImageSrc || !item) return;

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Barcode - ${item.name}</title>
              <style>
                @page {
                  size: auto;
                  margin: 5mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .label {
                  display: inline-block;
                  text-align: center;
                  padding: 10px;
                  border: 1px dashed #ccc;
                }
                .item-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 8px;
                }
                .barcode-img {
                  max-width: 250px;
                  height: auto;
                }
                @media print {
                  .label { border: none; padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="item-name">${item.name}</div>
                <img src="${barcodeImageSrc}" alt="Barcode" class="barcode-img" onload="window.print(); window.close();" />
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch {
      toast.error('Failed to print barcode');
    }
  };

  const handleRestore = async (auditLogId: string, fields?: string[]) => {
    if (!item) return;

    const fieldLabel = fields ? (fields.length === 1 ? formatFieldName(fields[0]) : `${fields.length} fields`) : 'all fields';

    try {
      await itemsApi.restoreFromHistory(item.id, auditLogId, fields);
      toast.success(`Restored ${fieldLabel}`);
      fetchItem();
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore');
    }
  };

  // Debounced search effect for sub-items
  useEffect(() => {
    if (!subItemSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await itemsApi.getAll({ search: subItemSearch, limit: 20 });
        const existingSubItemIds = item?.subItems?.map(s => s.childItem.id) || [];
        const filtered = (response.data.data || []).filter((i: Item) =>
          i.id !== item?.id && !existingSubItemIds.includes(i.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [subItemSearch, item?.id, item?.subItems]);

  const handleAddSubItem = async () => {
    if (!item || !selectedItem) return;
    try {
      await itemsApi.addSubItem(item.id, {
        childItemId: selectedItem.id,
        quantityRequired: subItemQuantity,
        partNumber: subItemPartNumber || undefined
      });
      toast.success(`Added ${selectedItem.name} as sub-item`);
      resetSubItemModal();
      fetchItem();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add sub-item');
    }
  };

  const handleAddToParent = async () => {
    if (!item || !selectedItem) return;
    try {
      await itemsApi.addSubItem(selectedItem.id, {
        childItemId: item.id,
        quantityRequired: subItemQuantity,
        partNumber: subItemPartNumber || undefined
      });
      toast.success(`Added as sub-item of ${selectedItem.name}`);
      resetSubItemModal();
      fetchItem();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to parent');
    }
  };

  const handleRemoveSubItem = async (subItemId: string, childName: string) => {
    if (!item) return;
    if (!confirm(`Remove ${childName} from sub-items?`)) return;
    try {
      await itemsApi.removeSubItem(item.id, subItemId);
      toast.success('Sub-item removed');
      fetchItem();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove sub-item');
    }
  };

  const handleRemoveFromParent = async (parentId: string, relationId: string, parentName: string) => {
    if (!item) return;
    if (!confirm(`Remove this item from ${parentName}?`)) return;
    try {
      await itemsApi.removeSubItem(parentId, relationId);
      toast.success('Removed from parent');
      fetchItem();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove from parent');
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!item) return;
    try {
      await itemsApi.setPrimaryImage(item.id, imageId);
      setItem(prev => prev ? {
        ...prev,
        images: prev.images.map(img => ({
          ...img,
          isPrimary: img.id === imageId
        }))
      } : null);
      toast.success('Primary image updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set primary image');
    }
  };

  const resetSubItemModal = () => {
    setShowAddSubItemModal(false);
    setShowAddToParentModal(false);
    setSubItemSearch('');
    setSearchResults([]);
    setSelectedItem(null);
    setSubItemQuantity(1);
    setSubItemPartNumber('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back button + header skeleton */}
        <div className="flex items-center gap-3 mb-2">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="skeleton h-7 w-48 rounded" />
        </div>
        {/* Action buttons skeleton */}
        <div className="flex gap-2 justify-end">
          <div className="skeleton h-9 w-20 rounded-lg" />
          <div className="skeleton h-9 w-20 rounded-lg" />
        </div>
        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - image + details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="skeleton h-64 w-full rounded-lg mb-4" />
              <div className="skeleton h-6 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-full rounded mb-2" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
            <div className="card p-6">
              <div className="skeleton h-6 w-32 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="skeleton h-4 w-24 rounded" />
                    <div className="skeleton h-4 w-32 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right column - sidebar info */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="skeleton h-6 w-28 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-5 w-5 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <div className="skeleton h-6 w-20 rounded mb-4" />
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-7 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isLowStock = item.quantity <= item.minQuantity && item.minQuantity > 0;
  const currentImage = item.images?.find(img => img.filename === selectedImage) || item.images?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            to="/items"
            className="p-2 rounded-lg transition-colors mt-1"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <ArrowLeftIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </Link>
          <div className="flex items-start gap-4">
            {/* Item Icon/Image Thumbnail */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                backgroundColor: currentImage
                  ? (currentImage.backgroundColor || 'transparent')
                  : (item.template?.iconBackgroundColor || item.category?.iconBackgroundColor || 'color-mix(in srgb, var(--accent) 20%, transparent)'),
              }}
            >
              {currentImage ? (
                <img
                  src={`/uploads/${currentImage.filename}`}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : item.template?.icon ? (
                <Icon
                  icon={item.template.icon}
                  className="w-8 h-8"
                  style={{ color: item.template.iconColor || 'var(--accent)' }}
                />
              ) : item.category?.icon ? (
                <Icon
                  icon={item.category.icon}
                  className="w-8 h-8"
                  style={{ color: item.category.iconColor || 'var(--accent)' }}
                />
              ) : (
                <CubeIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                </h1>
                {isLowStock && (
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{ backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)', color: '#ef4444' }}
                  >
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    Low Stock
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {item.sku ? (
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    SKU: {item.sku}
                  </span>
                ) : canEditBarcode ? (
                  <button
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                    className="text-sm px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                      color: 'var(--accent)'
                    }}
                  >
                    {generatingSku ? 'Generating...' : '+ Generate SKU'}
                  </button>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No SKU
                  </span>
                )}
                <button
                  onClick={() => copyToClipboard(item.id, 'Item ID')}
                  className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Click to copy ID"
                >
                  <FingerPrintIcon className="w-3.5 h-3.5" />
                  ID: {item.id}
                </button>
                {item.template && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}
                  >
                    <DocumentDuplicateIcon className="w-3 h-3" />
                    {item.template.name}
                  </span>
                )}
                {item.tags.length > 0 && item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.icon && <IconDisplay icon={tag.icon} size="small" color={tag.color} />}
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Watch button */}
          <button
            onClick={handleToggleWatch}
            disabled={watchLoading}
            className="btn btn-secondary flex items-center gap-1"
            title={watching ? 'Stop watching' : 'Watch for changes'}
          >
            {watching ? (
              <StarIcon className="w-4 h-4" style={{ color: '#eab308' }} />
            ) : (
              <StarIconOutline className="w-4 h-4" />
            )}
            {watching ? 'Watching' : 'Watch'}
          </button>
          {/* Find button - always visible */}
          <button
            onClick={() => {
              if (!item.location?.barcode) {
                toast.error('Please assign a location with a barcode first');
                return;
              }
              navigate(`/scanner?mode=find&itemId=${item.id}`, { state: { item } });
            }}
            className="btn btn-secondary flex items-center gap-1"
            style={{ color: item.location?.barcode ? undefined : 'var(--text-secondary)' }}
          >
            <MapPinIcon className="w-4 h-4" />
            Find
          </button>
          {isManager && (
            <>
              <Link
                to={`/items/${item.id}/edit`}
                className="btn btn-secondary flex items-center gap-1"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn flex items-center gap-1 text-red-500"
                style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {item.images && item.images.length > 0 && (
            <div className="card p-6">
              <div
                className="mb-4 rounded-xl overflow-hidden"
                style={{ backgroundColor: currentImage?.backgroundColor || 'var(--bg-tertiary)' }}
              >
                <img
                  src={`/uploads/${currentImage?.filename}`}
                  alt={item.name}
                  className="w-full h-72 object-contain"
                />
              </div>
              {item.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {item.images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.filename)}
                      className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all"
                      style={{
                        borderColor: currentImage?.filename === img.filename ? 'var(--accent)' : 'var(--bg-tertiary)',
                        backgroundColor: img.backgroundColor || 'var(--bg-tertiary)',
                      }}
                    >
                      <img
                        src={`/uploads/${img.filename}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!img.isPrimary) handleSetPrimaryImage(img.id);
                        }}
                        className={`absolute bottom-1 left-1 p-0.5 rounded transition-all ${
                          img.isPrimary
                            ? 'bg-yellow-500 text-white'
                            : 'bg-black/60 text-white/70 hover:text-yellow-400 cursor-pointer'
                        }`}
                        title={img.isPrimary ? 'Primary image' : 'Set as primary'}
                      >
                        {img.isPrimary ? (
                          <StarIcon className="w-3.5 h-3.5" />
                        ) : (
                          <StarIconOutline className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Description
              </h2>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {item.attributes.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Attributes
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {item.attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {attr.attributeName}
                    </p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatAttributeValue(attr.attributeValue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Items */}
          {item.parentItems && item.parentItems.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}
                >
                  <ArrowUpIcon className="w-5 h-5" style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Part of
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    This item is a component of these items
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {item.parentItems.map((rel) => {
                  const parentImage = rel.parentItem.images?.[0];
                  return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor: parentImage
                            ? 'var(--bg-tertiary)'
                            : (rel.parentItem.template?.iconBackgroundColor
                              || rel.parentItem.category?.iconBackgroundColor
                              || 'var(--bg-tertiary)')
                        }}
                      >
                        {parentImage ? (
                          <img
                            src={`/uploads/${parentImage.filename}`}
                            alt={rel.parentItem.name}
                            className="w-full h-full object-cover"
                          />
                        ) : rel.parentItem.template?.icon ? (
                          <Icon
                            icon={rel.parentItem.template.icon}
                            className="w-5 h-5"
                            style={{ color: rel.parentItem.template.iconColor || 'var(--accent)' }}
                          />
                        ) : rel.parentItem.category?.icon ? (
                          <Icon
                            icon={rel.parentItem.category.icon}
                            className="w-5 h-5"
                            style={{ color: rel.parentItem.category.iconColor || 'var(--accent)' }}
                          />
                        ) : (
                          <CubeIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/items/${rel.parentItem.id}`}
                          className="group"
                        >
                          <p
                            className="font-medium group-hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {rel.parentItem.name}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                          {rel.parentItem.sku && <span>{rel.parentItem.sku}</span>}
                          {rel.parentItem.sku && <span>•</span>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(rel.parentItem.id, 'Item ID');
                            }}
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity font-mono"
                            title="Click to copy ID"
                          >
                            <FingerPrintIcon className="w-3 h-3" />
                            {rel.parentItem.id}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {rel.parentItem.category && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                              <Squares2X2Icon className="w-3 h-3" />
                              {rel.parentItem.category.name}
                            </span>
                          )}
                          {rel.parentItem.tags?.map((t) => (
                            <span
                              key={t.tag.id}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ChevronRightIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                      {isManager && (
                        <button
                          onClick={() => handleRemoveFromParent(rel.parentItem.id, rel.id, rel.parentItem.name)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-500"
                          title="Remove from parent"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3D View */}
          {(item.model3d || item.is360Set || (item.images && item.images.length >= 8)) && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, #06b6d4 20%, transparent)' }}
                  >
                    <Icon icon="tabler:3d-cube-sphere" className="w-5 h-5" style={{ color: '#06b6d4' }} />
                  </div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    3D View
                  </h2>
                </div>

                {/* Tab toggle when both modes available */}
                {item.model3d && (item.is360Set || (item.images && item.images.length >= 8)) && (
                  <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    <button
                      type="button"
                      onClick={() => setThreeDTab('model')}
                      className="px-3 py-1.5 text-sm transition-all"
                      style={{
                        backgroundColor: threeDTab === 'model' ? 'var(--accent)' : 'transparent',
                        color: threeDTab === 'model' ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      3D Model
                    </button>
                    <button
                      type="button"
                      onClick={() => setThreeDTab('spin')}
                      className="px-3 py-1.5 text-sm transition-all"
                      style={{
                        backgroundColor: threeDTab === 'spin' ? 'var(--accent)' : 'transparent',
                        color: threeDTab === 'spin' ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      360° Spin
                    </button>
                  </div>
                )}
              </div>

              {/* 3D Model Viewer */}
              {item.model3d && (threeDTab === 'model' || !(item.is360Set || (item.images && item.images.length >= 8))) && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center" style={{ height: '400px' }}>
                      <div
                        className="animate-spin rounded-full h-10 w-10 border-b-2"
                        style={{ borderColor: 'var(--accent)' }}
                      />
                    </div>
                  }
                >
                  <ThreeDViewer modelUrl={`/uploads/${item.model3d.filename}`} />
                </Suspense>
              )}

              {/* 360 Spin Viewer */}
              {!item.model3d && (item.is360Set || (item.images && item.images.length >= 8)) && (
                <SpinViewer images={item.images.map((img) => `/uploads/${img.filename}`)} />
              )}
              {item.model3d && (item.is360Set || (item.images && item.images.length >= 8)) && threeDTab === 'spin' && (
                <SpinViewer images={item.images.map((img) => `/uploads/${img.filename}`)} />
              )}
            </div>
          )}

          {/* Sub-items / Components */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}
                >
                  <ArrowDownIcon className="w-5 h-5" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Components
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.subItems?.length || 0} sub-items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.subItems && item.subItems.length > 0 && (
                  <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    <button
                      type="button"
                      onClick={() => setComponentsView('list')}
                      className="p-1.5 transition-all"
                      style={{
                        backgroundColor: componentsView === 'list' ? 'var(--accent)' : 'transparent',
                        color: componentsView === 'list' ? 'white' : 'var(--text-secondary)',
                      }}
                      title="List view"
                    >
                      <Icon icon="tabler:list" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setComponentsView('graph')}
                      className="p-1.5 transition-all"
                      style={{
                        backgroundColor: componentsView === 'graph' ? 'var(--accent)' : 'transparent',
                        color: componentsView === 'graph' ? 'white' : 'var(--text-secondary)',
                      }}
                      title="Graph view"
                    >
                      <Icon icon="tabler:topology-star-3" className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isManager && (
                  <button
                    onClick={() => setShowAddSubItemModal(true)}
                    className="btn btn-primary btn-sm flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Component
                  </button>
                )}
              </div>
            </div>

            {!item.subItems || item.subItems.length === 0 ? (
              <div
                className="text-center py-8 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <CubeIcon
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <p style={{ color: 'var(--text-secondary)' }}>No components</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Add sub-items to track components of this item
                </p>
              </div>
            ) : componentsView === 'list' ? (
              <SubItemTreeView
                itemId={item.id}
                subItems={item.subItems}
                isManager={isManager}
                onRemoveSubItem={handleRemoveSubItem}
                onRefresh={fetchItem}
              />
            ) : (
              <ItemsGraphView
                itemId={item.id}
                itemName={item.name}
                itemQuantity={item.quantity}
                itemMinQuantity={item.minQuantity}
                itemImage={item.images?.[0]?.filename}
                itemIcon={(item.template as any)?.icon || (item.category as any)?.icon}
                itemIconColor={(item.template as any)?.iconColor || (item.category as any)?.iconColor}
                subItems={item.subItems}
              />
            )}

            {isManager && (
              <button
                onClick={() => setShowAddToParentModal(true)}
                className="mt-4 text-sm flex items-center gap-1 transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                <LinkIcon className="w-4 h-4" />
                Add this item as a component of another item
              </button>
            )}
          </div>

          {/* BOM */}
          <ItemBom itemId={item.id} hasSubItems={(item.subItems?.length || 0) > 0} />

          {/* Linked Items */}
          <ItemLinks itemId={item.id} isManager={isManager} onRefresh={fetchItem} />

          {/* Serial Number Instances */}
          {item.trackSerialNumbers && (
            <ItemInstances
              itemId={item.id}
              instances={item.instances || []}
              isManager={isManager}
              onRefresh={fetchItem}
            />
          )}

          {/* History */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, #6366f1 20%, transparent)' }}
              >
                <ClockIcon className="w-5 h-5" style={{ color: '#6366f1' }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                History
              </h2>
            </div>

            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No history yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => {
                  const style = getHistoryStyle(entry.action);
                  const IconComponent = style.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: style.bg }}
                      >
                        <IconComponent className="w-4 h-4" style={{ color: style.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {showCol('fullName') && entry.user.fullName && (
                            <span className="font-medium" style={{ color: 'var(--accent)' }}>
                              {entry.user.fullName}
                            </span>
                          )}
                          {showCol('username') && (
                            <span
                              className={entry.user.fullName && showCol('fullName') ? 'text-sm' : 'font-medium'}
                              style={{ color: entry.user.fullName && showCol('fullName') ? 'var(--text-secondary)' : 'var(--accent)' }}
                            >
                              {entry.user.fullName && showCol('fullName') ? `(${entry.user.username})` : entry.user.username}
                            </span>
                          )}
                          {!showCol('fullName') && !showCol('username') && (
                            <span className="font-medium" style={{ color: 'var(--accent)' }}>
                              {entry.user.username}
                            </span>
                          )}
                          {showCol('role') && entry.user.roleName && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              {entry.user.roleName}
                            </span>
                          )}
                          {showCol('authMethod') && entry.user.authMethod && entry.user.authMethod !== 'Local' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-purple-600 dark:text-purple-400" style={{ backgroundColor: 'color-mix(in srgb, #a855f7 15%, transparent)' }}>
                              {entry.user.authMethod}
                            </span>
                          )}
                          <span style={{ color: 'var(--text-primary)' }}>
                            {entry.action.toLowerCase().replace('_', ' ')}
                          </span>
                          {entry.oldQuantity != null && entry.newQuantity != null && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: entry.newQuantity! > entry.oldQuantity!
                                  ? 'color-mix(in srgb, #22c55e 15%, transparent)'
                                  : 'color-mix(in srgb, #ef4444 15%, transparent)',
                                color: entry.newQuantity! > entry.oldQuantity! ? '#22c55e' : '#ef4444',
                              }}
                            >
                              {entry.oldQuantity} → {entry.newQuantity}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {entry.notes}
                          </p>
                        )}
                        {/* Detailed field changes */}
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(entry.changes).map(([field, change]) => (
                              <div
                                key={field}
                                className="flex items-center justify-between text-sm py-1 px-2 rounded"
                                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                              >
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  <span style={{ color: 'var(--text-primary)' }}>{formatFieldName(field)}:</span>{' '}
                                  {formatChangeValue(change.old)} → {formatChangeValue(change.new)}
                                </span>
                                {isManager && entry.auditLogId && (
                                  <button
                                    onClick={() => handleRestore(entry.auditLogId!, [field])}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
                                    style={{ color: 'var(--accent)' }}
                                    title={`Restore ${formatFieldName(field)}`}
                                  >
                                    <ArrowUturnLeftIcon className="w-3 h-3" />
                                    Restore
                                  </button>
                                )}
                              </div>
                            ))}
                            {/* Restore All button when multiple changes */}
                            {isManager && entry.auditLogId && Object.keys(entry.changes).length > 1 && (
                              <button
                                onClick={() => handleRestore(entry.auditLogId!)}
                                className="flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                                style={{ color: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
                              >
                                <ArrowUturnLeftIcon className="w-3 h-3" />
                                Restore All Changes
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Version History */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}
              >
                <DocumentDuplicateIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Versions
              </h2>
              {!showVersions && (
                <button
                  onClick={() => {
                    setShowVersions(true);
                    fetchVersions();
                  }}
                  className="ml-auto text-sm"
                  style={{ color: 'var(--accent)' }}
                >
                  Show versions
                </button>
              )}
            </div>

            {showVersions && (
              <>
                {versions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No versions yet</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((ver: any) => (
                      <div
                        key={ver.id}
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              v{ver.version}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: ver.action === 'CREATED' ? 'color-mix(in srgb, #22c55e 15%, transparent)' : ver.action === 'RESTORED' ? 'color-mix(in srgb, #f59e0b 15%, transparent)' : 'color-mix(in srgb, #3b82f6 15%, transparent)',
                                color: ver.action === 'CREATED' ? '#22c55e' : ver.action === 'RESTORED' ? '#f59e0b' : '#3b82f6',
                              }}
                            >
                              {ver.action}
                            </span>
                          </div>
                          {ver.summary && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{ver.summary}</p>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            by {ver.user?.username} &middot; {new Date(ver.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {isManager && (
                          <button
                            onClick={() => handleRollback(ver.version)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity flex-shrink-0"
                            style={{ color: '#8b5cf6' }}
                            title={`Rollback to version ${ver.version}`}
                          >
                            <ArrowUturnLeftIcon className="w-3 h-3" />
                            Rollback
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quantity Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Stock Level
              </h2>
              <button
                onClick={() => setShowQuantityModal(true)}
                className="btn btn-primary btn-sm"
              >
                Adjust
              </button>
            </div>
            <div className="text-center py-4">
              <p
                className="text-5xl font-bold mb-2"
                style={{ color: isLowStock ? '#ef4444' : 'var(--accent)' }}
              >
                {item.quantity}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                units in stock
              </p>
              {item.minQuantity > 0 && (
                <div
                  className="mt-4 p-3 rounded-lg flex items-center justify-between"
                  style={{
                    backgroundColor: isLowStock
                      ? 'color-mix(in srgb, #ef4444 10%, transparent)'
                      : 'var(--bg-secondary)',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Minimum level
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: isLowStock ? '#ef4444' : 'var(--text-primary)' }}
                  >
                    {item.minQuantity}
                  </span>
                </div>
              )}
              {isLowStock && (
                <div
                  className="mt-3 p-3 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                >
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-500 font-medium">
                    Stock is below minimum level
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SKU Barcode Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                SKU Barcode
              </h2>
            </div>
            {item.sku ? (
              <div className="space-y-4">
                {/* Barcode Image */}
                <div
                  className="flex flex-col items-center p-6 rounded-xl"
                  style={{ backgroundColor: whiteBackground ? '#ffffff' : 'var(--bg-tertiary)' }}
                >
                  {barcodeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                    </div>
                  ) : barcodeImageSrc ? (
                    <img
                      src={barcodeImageSrc}
                      alt={`Barcode: ${item.sku}`}
                      className="max-w-full h-auto"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm" style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}>
                        Failed to load barcode image
                      </p>
                    </div>
                  )}

                  {/* SKU Text with Edit */}
                  <div className="mt-3 flex items-center gap-2">
                    {isEditingSku ? (
                      <>
                        <input
                          type="text"
                          value={editSkuValue}
                          onChange={(e) => setEditSkuValue(e.target.value)}
                          className="px-3 py-1.5 rounded-lg text-sm font-mono border"
                          style={{
                            backgroundColor: whiteBackground ? '#fff' : 'var(--bg-secondary)',
                            color: whiteBackground ? '#000' : 'var(--text-primary)',
                            borderColor: 'var(--accent)'
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSku();
                            if (e.key === 'Escape') handleCancelEditSku();
                          }}
                        />
                        <button
                          onClick={handleSaveSku}
                          disabled={savingSku}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#22c55e' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Save"
                        >
                          {savingSku ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditSku}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#ef4444' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <code
                          className="px-3 py-1.5 rounded-lg text-sm font-mono"
                          style={{
                            backgroundColor: whiteBackground ? '#f0f0f0' : 'var(--bg-secondary)',
                            color: whiteBackground ? '#000' : 'var(--text-primary)'
                          }}
                        >
                          {item.sku}
                        </code>
                        <button
                          onClick={handleCopySku}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = whiteBackground ? '#e0e0e0' : 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Copy SKU"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                        {canEditBarcode && (
                          <button
                            onClick={() => {
                              setEditSkuValue(item.sku || '');
                              setIsEditingSku(true);
                            }}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = whiteBackground ? '#e0e0e0' : 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Edit SKU"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* White background toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whiteBackground}
                    onChange={(e) => setWhiteBackground(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    White background (for scanning)
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadBarcode('png')}
                    disabled={!barcodeImageSrc}
                    className="btn btn-secondary flex items-center gap-2 flex-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    PNG
                  </button>
                  <button
                    onClick={() => handleDownloadBarcode('jpeg')}
                    disabled={!barcodeImageSrc}
                    className="btn btn-secondary flex items-center gap-2 flex-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    JPG
                  </button>
                  <button
                    onClick={handlePrintBarcode}
                    disabled={!barcodeImageSrc}
                    className="btn btn-secondary flex items-center gap-2 flex-1"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Print
                  </button>
                  {canEditBarcode && (
                    <button
                      onClick={handleGenerateSku}
                      disabled={generatingSku}
                      className="btn btn-secondary flex items-center gap-2"
                      title="Regenerate SKU"
                    >
                      <ArrowPathIcon className={`w-4 h-4 ${generatingSku ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-6 rounded-xl"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <QrCodeIcon className="w-12 h-12 mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  No SKU generated
                </p>
                {canEditBarcode && (
                  <button
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${generatingSku ? 'animate-spin' : ''}`} />
                    Generate SKU
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <Squares2X2Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Category</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.category?.name || 'Uncategorized'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <MapPinIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Location</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.location?.name || 'Not assigned'}
                  </p>
                </div>
              </div>

              {item.price != null && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>$</span>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Price</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || 'USD'}
                    </p>
                    {item.quantity > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Total: {(Number(item.price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || 'USD'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {item.trackSerialNumbers && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)' }}
                  >
                    <FingerPrintIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serial Tracking</p>
                    <p className="font-medium" style={{ color: '#8b5cf6' }}>
                      Enabled · {item._count?.instances || 0} instances
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <UserIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Created by</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.createdBy?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <CalendarIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Created</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <ClockIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last updated</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Adjust Stock
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 py-4">
                <button
                  onClick={() => setQuantityChange(q => q - 1)}
                  className="p-4 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <MinusIcon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                </button>
                <div className="text-center">
                  <p
                    className="text-5xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.quantity + quantityChange}
                  </p>
                  <p
                    className="text-sm font-medium mt-1"
                    style={{
                      color: quantityChange > 0 ? '#22c55e' : quantityChange < 0 ? '#ef4444' : 'var(--text-secondary)',
                    }}
                  >
                    {quantityChange > 0 ? `+${quantityChange}` : quantityChange}
                  </p>
                </div>
                <button
                  onClick={() => setQuantityChange(q => q + 1)}
                  className="p-4 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <PlusIcon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                </button>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input
                  type="text"
                  value={quantityNotes}
                  onChange={(e) => setQuantityNotes(e.target.value)}
                  className="input"
                  placeholder="Reason for adjustment..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityChange(0);
                    setQuantityNotes('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuantityUpdate}
                  disabled={quantityChange === 0}
                  className="btn btn-primary flex-1"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Sub-Item Modal */}
      {showAddSubItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add Component
              </h3>
              <button
                onClick={resetSubItemModal}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {!selectedItem ? (
              <>
                <div className="relative mb-4">
                  <MagnifyingGlassIcon
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <input
                    type="text"
                    value={subItemSearch}
                    onChange={(e) => setSubItemSearch(e.target.value)}
                    className="input pl-10"
                    placeholder="Search for items..."
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px]">
                  {searchLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--accent)' }}
                      />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                      {subItemSearch ? 'No items found' : 'Type to search for items'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => setSelectedItem(result)}
                          className="w-full text-left p-3 rounded-lg transition-colors"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {result.name}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {result.sku && `SKU: ${result.sku} • `}
                            {result.quantity} in stock
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="pt-4 mt-4 border-t"
                  style={{ borderColor: 'var(--bg-tertiary)' }}
                >
                  <Link
                    to={`/items/new?parentItemId=${item.id}`}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                    onClick={resetSubItemModal}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create New Item as Component
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedItem.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {selectedItem.sku && `SKU: ${selectedItem.sku} • `}
                        {selectedItem.quantity} in stock
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Quantity Required</label>
                    <input
                      type="number"
                      min="1"
                      value={subItemQuantity}
                      onChange={(e) => setSubItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Part Number (optional)</label>
                    <input
                      type="text"
                      value={subItemPartNumber}
                      onChange={(e) => setSubItemPartNumber(e.target.value)}
                      className="input"
                      placeholder="e.g., PWR-001"
                    />
                  </div>
                </div>

                <div
                  className="flex gap-3 pt-4 mt-4 border-t"
                  style={{ borderColor: 'var(--bg-tertiary)' }}
                >
                  <button onClick={resetSubItemModal} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button onClick={handleAddSubItem} className="btn btn-primary flex-1">
                    Add Component
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add to Parent Modal */}
      {showAddToParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add as Component
              </h3>
              <button
                onClick={resetSubItemModal}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Select a parent item that will contain{' '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.name}
              </span>{' '}
              as a component.
            </p>

            {!selectedItem ? (
              <>
                <div className="relative mb-4">
                  <MagnifyingGlassIcon
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <input
                    type="text"
                    value={subItemSearch}
                    onChange={(e) => setSubItemSearch(e.target.value)}
                    className="input pl-10"
                    placeholder="Search for parent item..."
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px]">
                  {searchLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--accent)' }}
                      />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                      {subItemSearch ? 'No items found' : 'Type to search for items'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => setSelectedItem(result)}
                          className="w-full text-left p-3 rounded-lg transition-colors"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {result.name}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {result.sku && `SKU: ${result.sku} • `}
                            {result.quantity} in stock
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedItem.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {selectedItem.sku && `SKU: ${selectedItem.sku}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Quantity Required</label>
                    <input
                      type="number"
                      min="1"
                      value={subItemQuantity}
                      onChange={(e) => setSubItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Part Number (optional)</label>
                    <input
                      type="text"
                      value={subItemPartNumber}
                      onChange={(e) => setSubItemPartNumber(e.target.value)}
                      className="input"
                      placeholder="e.g., PWR-001"
                    />
                  </div>
                </div>

                <div
                  className="flex gap-3 pt-4 mt-4 border-t"
                  style={{ borderColor: 'var(--bg-tertiary)' }}
                >
                  <button onClick={resetSubItemModal} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button onClick={handleAddToParent} className="btn btn-primary flex-1">
                    Add to Parent
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Item Modal */}
      <DeleteItemModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemId={item.id}
        itemName={item.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}
