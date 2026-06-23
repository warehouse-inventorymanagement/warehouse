import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { itemsApi, categoriesApi, locationsApi, tagsApi, templatesApi, filtersApi } from '../services/api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  CubeIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
  FolderIcon,
  MapPinIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  MinusCircleIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import type { Item, Category, Location, Tag, ItemTemplate, Pagination, ImportRow, ImportValidationError, ImportResult, ExportOptions } from '../types';
import ImportModal from '../components/ImportModal';
import ExportOptionsModal from '../components/ExportOptionsModal';
import { IconDisplay } from '../components/IconPicker';
import { IconSelect, type IconSelectOption } from '../components/IconSelect';
import { BulkActionModal, type BulkActionType } from '../components/BulkActionModal';
import CategoryPicker from '../components/CategoryPicker';
import LocationPicker from '../components/LocationPicker';
import ItemCard, { type TileSize } from '../components/ItemCard';
import ItemsTreeView from '../components/ItemsTreeView';
import { Icon } from '@iconify/react';

// Available columns configuration
const AVAILABLE_COLUMNS = [
  { id: 'item', label: 'Item', required: true },
  { id: 'sku', label: 'SKU', required: false },
  { id: 'category', label: 'Category', required: false },
  { id: 'location', label: 'Location', required: false },
  { id: 'locationPath', label: 'Full Location Path', required: false },
  { id: 'locationType', label: 'Location Type', required: false },
  { id: 'tags', label: 'Tags', required: false },
  { id: 'quantity', label: 'Quantity', required: true },
  { id: 'minQuantity', label: 'Min Quantity', required: false },
  { id: 'createdAt', label: 'Created Date', required: false },
];

const DEFAULT_COLUMNS = ['item', 'sku', 'category', 'location', 'quantity'];

const SORTABLE_COLUMNS: Record<string, string> = {
  item: 'name',
  sku: 'sku',
  quantity: 'quantity',
  minQuantity: 'minQuantity',
  createdAt: 'createdAt',
};

// Helper to build location path
const buildLocationPath = (location: Location | undefined, allLocations: Location[]): string => {
  if (!location) return '-';

  // Find the location in allLocations to get the full data including parentId
  let current: Location | undefined = allLocations.find(l => l.id === location.id) || location;

  const path: string[] = [];

  while (current) {
    path.unshift(current.name);
    if (current.parentId) {
      current = allLocations.find(l => l.id === current!.parentId);
    } else {
      current = undefined;
    }
  }

  return path.join(' > ');
};

// Get type label
const getTypeLabel = (type?: string): string => {
  if (!type) return 'Location';
  const labels: Record<string, string> = {
    location: 'Location',
    room: 'Room',
    zone: 'Zone',
    aisle: 'Aisle',
    row: 'Row',
    shelf: 'Shelf',
    bin: 'Bin'
  };
  return labels[type] || type;
};

export default function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [hierarchicalLocations, setHierarchicalLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const navigate = useNavigate();

  // Load column preferences from localStorage
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('warehouse_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  // Load view preferences from localStorage
  const [viewMode, setViewMode] = useState<'list' | 'tiles' | 'tree'>(() => {
    return (localStorage.getItem('warehouse_view_mode') as 'list' | 'tiles' | 'tree') || 'list';
  });
  const [tileSize, setTileSize] = useState<TileSize>(() => {
    return (localStorage.getItem('warehouse_tile_size') as TileSize) || 'm';
  });

  // Restore filters from URL params first, then sessionStorage
  const savedFilters = JSON.parse(sessionStorage.getItem('warehouse_item_filters') || '{}');
  const getFilter = (key: string, fallback = '') => searchParams.get(key) || savedFilters[key] || fallback;

  const [search, setSearch] = useState(getFilter('search'));
  const [categoryId, setCategoryId] = useState(getFilter('categoryId'));
  const [locationId, setLocationId] = useState(getFilter('locationId'));
  const [tagId, setTagId] = useState(getFilter('tagId'));
  const [templateId, setTemplateId] = useState(getFilter('templateId'));
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true' || savedFilters.lowStock === 'true');
  const [componentFilter, setComponentFilter] = useState(getFilter('componentFilter'));

  // Saved filters state
  const [savedFiltersList, setSavedFiltersList] = useState<any[]>([]);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveFilterInput, setShowSaveFilterInput] = useState(false);

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<BulkActionType | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Import/Export state
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'preview' | 'result'>('preview');
  const [importValidRows, setImportValidRows] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<ImportValidationError[]>([]);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [importImageCount, setImportImageCount] = useState(0);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [importMissingRefs, setImportMissingRefs] = useState<{ categories: string[]; tags: string[]; locations: string[] } | undefined>();
  const [importMissingRefHandling, setImportMissingRefHandling] = useState<{ categories: 'create' | 'skip-field' | 'skip-row'; tags: 'create' | 'skip-field' | 'skip-row'; locations: 'create' | 'skip-field' | 'skip-row' }>({ categories: 'skip-row', tags: 'skip-row', locations: 'skip-row' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts(searchInputRef);

  useEffect(() => {
    const flattenTree = <T extends { children?: T[] }>(nodes: T[]): T[] =>
      nodes.flatMap(n => [n, ...flattenTree(n.children || [])]);

    const fetchFilters = async () => {
      try {
        const [catHierRes, locHierRes, tagRes, templateRes] = await Promise.all([
          categoriesApi.getAll(false),
          locationsApi.getAll(false),
          tagsApi.getAll(),
          templatesApi.getAll()
        ]);
        const hierCats = catHierRes.data.data;
        const hierLocs = locHierRes.data.data;
        setCategories(flattenTree(hierCats));
        setHierarchicalCategories(hierCats);
        setLocations(flattenTree(hierLocs));
        setHierarchicalLocations(hierLocs);
        setTags(tagRes.data.data);
        setTemplates(templateRes.data.data);
      } catch {
        toast.error('Failed to load filter options');
      }
    };
    fetchFilters();
  }, []);

  // Save filters to sessionStorage and sync to URL
  useEffect(() => {
    const filters: Record<string, string> = {};
    if (search) filters.search = search;
    if (categoryId) filters.categoryId = categoryId;
    if (locationId) filters.locationId = locationId;
    if (tagId) filters.tagId = tagId;
    if (templateId) filters.templateId = templateId;
    if (lowStock) filters.lowStock = 'true';
    if (componentFilter) filters.componentFilter = componentFilter;

    if (Object.keys(filters).length > 0) {
      sessionStorage.setItem('warehouse_item_filters', JSON.stringify(filters));
    } else {
      sessionStorage.removeItem('warehouse_item_filters');
    }
  }, [search, categoryId, locationId, tagId, templateId, lowStock, componentFilter]);

  // On mount, if URL has no filters but session has saved filters, apply them
  useEffect(() => {
    const hasUrlFilters = searchParams.toString().length > 0;
    if (!hasUrlFilters && Object.keys(savedFilters).length > 0) {
      const params = new URLSearchParams();
      Object.entries(savedFilters).forEach(([k, v]) => params.set(k, v as string));
      setSearchParams(params, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems();
  }, [searchParams, viewMode]);

  // Load saved filters
  useEffect(() => {
    filtersApi.getAll().then(res => setSavedFiltersList(res.data.data)).catch(() => {});
  }, []);

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return;
    try {
      await filtersApi.create({
        name: saveFilterName.trim(),
        filters: { search, categoryId, locationId, tagId, templateId, lowStock, componentFilter },
      });
      const res = await filtersApi.getAll();
      setSavedFiltersList(res.data.data);
      setSaveFilterName('');
      setShowSaveFilterInput(false);
      toast.success('Filter saved');
    } catch {
      toast.error('Failed to save filter');
    }
  };

  const handleApplyFilter = (f: any) => {
    const filters = f.filters;
    setSearch(filters.search || '');
    setCategoryId(filters.categoryId || '');
    setLocationId(filters.locationId || '');
    setTagId(filters.tagId || '');
    setTemplateId(filters.templateId || '');
    setLowStock(!!filters.lowStock);
    setComponentFilter(filters.componentFilter || '');
    setShowSavedFilters(false);
    // Update URL params
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.locationId) params.set('locationId', filters.locationId);
    if (filters.tagId) params.set('tagId', filters.tagId);
    if (filters.templateId) params.set('templateId', filters.templateId);
    if (filters.lowStock) params.set('lowStock', 'true');
    if (filters.componentFilter) params.set('componentFilter', filters.componentFilter);
    setSearchParams(params);
  };

  const handleDeleteFilter = async (id: string) => {
    try {
      await filtersApi.delete(id);
      setSavedFiltersList(prev => prev.filter(f => f.id !== id));
      toast.success('Filter deleted');
    } catch {
      toast.error('Failed to delete filter');
    }
  };

  // Debounced search - auto-trigger after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (search !== currentSearch) {
        const params = new URLSearchParams(searchParams);
        if (search) params.set('search', search);
        else params.delete('search');
        params.delete('page');
        setSearchParams(params);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Save column preferences
  useEffect(() => {
    localStorage.setItem('warehouse_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save view preferences
  useEffect(() => {
    localStorage.setItem('warehouse_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('warehouse_tile_size', tileSize);
  }, [tileSize]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const page = parseInt(searchParams.get('page') || '1');
      const response = await itemsApi.getAll({
        page,
        limit: 20,
        search: searchParams.get('search') || undefined,
        categoryId: searchParams.get('categoryId') || undefined,
        locationId: searchParams.get('locationId') || undefined,
        templateId: searchParams.get('templateId') || undefined,
        tags: searchParams.get('tagId') || undefined,
        lowStock: searchParams.get('lowStock') === 'true',
        componentFilter: viewMode === 'tree' ? 'top_level' : (searchParams.get('componentFilter') || undefined),
        sortBy: searchParams.get('sortBy') || undefined,
        sortOrder: searchParams.get('sortOrder') || undefined,
      });
      setItems(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('categoryId', categoryId);
    if (locationId) params.set('locationId', locationId);
    if (tagId) params.set('tagId', tagId);
    if (templateId) params.set('templateId', templateId);
    if (lowStock) params.set('lowStock', 'true');
    if (componentFilter) params.set('componentFilter', componentFilter);
    setSearchParams(params);
  };

  const handleSort = (columnId: string) => {
    const field = SORTABLE_COLUMNS[columnId];
    if (!field) return;
    const currentSortBy = searchParams.get('sortBy');
    const currentOrder = searchParams.get('sortOrder');
    const newOrder = currentSortBy === field && currentOrder === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setLocationId('');
    setTagId('');
    setTemplateId('');
    setLowStock(false);
    setComponentFilter('');
    sessionStorage.removeItem('warehouse_item_filters');
    setSearchParams({});
  };

  const toggleColumn = (columnId: string) => {
    const column = AVAILABLE_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return;

    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(c => c !== columnId);
      } else {
        // Insert at the correct position based on AVAILABLE_COLUMNS order
        const newColumns = [...prev, columnId];
        return AVAILABLE_COLUMNS
          .filter(c => newColumns.includes(c.id))
          .map(c => c.id);
      }
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  // Bulk selection helpers
  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Get tags from selected items for "remove tags" action
  const getSelectedItemsTags = (): Tag[] => {
    const tagMap = new Map<string, Tag>();
    items
      .filter(item => selectedItems.has(item.id))
      .forEach(item => {
        item.tags.forEach(tag => tagMap.set(tag.id, tag));
      });
    return Array.from(tagMap.values());
  };

  // Handle bulk action confirmation
  const handleBulkAction = async (action: BulkActionType, value: string | string[] | null) => {
    if (selectedItems.size === 0) return;

    setBulkActionLoading(true);
    try {
      const itemIds = Array.from(selectedItems);

      await itemsApi.bulkUpdate({
        itemIds,
        ...(action === 'category' && { categoryId: value as string }),
        ...(action === 'clearCategory' && { categoryId: null }),
        ...(action === 'location' && { locationId: value as string }),
        ...(action === 'clearLocation' && { locationId: null }),
        ...(action === 'template' && { templateId: value as string }),
        ...(action === 'clearTemplate' && { templateId: null }),
        ...(action === 'addTags' && { addTags: value as string[] }),
        ...(action === 'removeTags' && { removeTags: value as string[] })
      });

      // Refresh items and clear selection
      fetchItems();
      clearSelection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
      setBulkActionType(null);
    }
  };

  // Handle bulk duplicate
  const handleBulkDuplicate = async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    try {
      const itemIds = Array.from(selectedItems);
      const response = await itemsApi.bulkDuplicate(itemIds);
      toast.success(`Duplicated ${response.data.data.created} item(s)`);
      fetchItems();
      clearSelection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to duplicate items');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export handler
  const handleExport = async (options: ExportOptions) => {
    setExporting(true);
    try {
      const response = await itemsApi.exportItems({
        search: searchParams.get('search') || undefined,
        categoryId: searchParams.get('categoryId') || undefined,
        locationId: searchParams.get('locationId') || undefined,
        templateId: searchParams.get('templateId') || undefined,
        tags: searchParams.get('tagId') || undefined,
        lowStock: searchParams.get('lowStock') === 'true' || undefined,
        itemIds: selectedItems.size > 0 ? Array.from(selectedItems) : undefined,
        options,
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `items-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Import file handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await itemsApi.importPreview(formData, importMissingRefHandling);
      const data = response.data.data;
      setImportValidRows(data.valid);
      setImportErrors(data.errors);
      setImportTotalRows(data.total);
      setImportImageCount(data.imageCount || 0);
      setImportSessionId(data.sessionId || null);
      setImportMissingRefs(data.missingRefs);
      setImportMode('preview');
      setShowImportModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to parse file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Revalidate import with new handling options
  const handleRevalidate = async () => {
    if (!importFile) return;

    setRevalidating(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await itemsApi.importPreview(formData, importMissingRefHandling);
      const data = response.data.data;
      setImportValidRows(data.valid);
      setImportErrors(data.errors);
      setImportTotalRows(data.total);
      setImportImageCount(data.imageCount || 0);
      setImportSessionId(data.sessionId || null);
      setImportMissingRefs(data.missingRefs);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Revalidation failed');
    } finally {
      setRevalidating(false);
    }
  };

  // Confirm import handler
  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const response = await itemsApi.importItems(importValidRows, importSessionId, importMissingRefHandling);
      setImportResult(response.data.data);
      setImportMode('result');
      fetchItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Close import modal handler
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportValidRows([]);
    setImportErrors([]);
    setImportTotalRows(0);
    setImportImageCount(0);
    setImportSessionId(null);
    setImportMissingRefs(undefined);
    setImportMissingRefHandling({ categories: 'skip-row', tags: 'skip-row', locations: 'skip-row' });
    setImportFile(null);
    setImportResult(undefined);
    setImportMode('preview');
  };

  // Transform data for IconSelect components
  const tagOptions: IconSelectOption[] = tags.map(tag => ({
    value: tag.id,
    label: tag.name,
    icon: tag.icon,
    iconColor: tag.iconColor,
    color: tag.color
  }));

  const templateOptions: IconSelectOption[] = templates.map(tmpl => ({
    value: tmpl.id,
    label: tmpl.name,
    icon: tmpl.icon,
    iconColor: tmpl.iconColor,
    iconBackgroundColor: tmpl.iconBackgroundColor
  }));

  const renderCellContent = (item: Item, columnId: string) => {
    switch (columnId) {
      case 'item':
        return (
          <div className="flex items-center gap-2">
            <Link to={`/items/${item.id}`} className="group flex items-center gap-3 flex-1 min-w-0">
              {item.primaryImage ? (
                <div
                  className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-dark-border"
                  style={{ backgroundColor: item.primaryImage.backgroundColor || 'transparent' }}
                >
                  <img
                    src={`/uploads/${item.primaryImage.filename}`}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                  <CubeIcon className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <span className="block font-medium group-hover:text-primary truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                {isColumnVisible('tags') === false && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.icon && <IconDisplay icon={tag.icon} size={tag.iconSize || 'small'} color={tag.color} />}
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </div>
        );
      case 'sku':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.sku || '-'}</span>;
      case 'category':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.category?.name || '-'}</span>;
      case 'location':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.location?.name || '-'}</span>;
      case 'locationPath':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{buildLocationPath(item.location, locations)}</span>;
      case 'locationType':
        return item.location ? (
          <span className={`text-xs px-2 py-1 rounded font-medium ${getTypeColorClass(item.location.type)}`}>
            {getTypeLabel(item.location.type)}
          </span>
        ) : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>-</span>;
      case 'tags':
        return item.tags.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {item.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 text-xs rounded flex items-center gap-1"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                {tag.icon && <IconDisplay icon={tag.icon} size={tag.iconSize || 'small'} color={tag.color} />}
                {tag.name}
              </span>
            ))}
          </div>
        ) : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>-</span>;
      case 'quantity':
        return (
          <div className="text-right">
            <span className="font-semibold" style={{ color: item.quantity <= item.minQuantity && item.minQuantity > 0 ? 'var(--color-red-500)' : 'var(--text-primary)' }}>
              {item.quantity}
            </span>
            {item.minQuantity > 0 && (
              <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>/ {item.minQuantity}</span>
            )}
          </div>
        );
      case 'minQuantity':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.minQuantity}</span>;
      case 'createdAt':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString()}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{pagination.total} items total</p>
        </div>
        <Link to="/items/new" className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Item
        </Link>
      </div>

      {/* Search and filters */}
      <div className="card p-4 overflow-visible">
        <form onSubmit={handleSearch} className="space-y-3 overflow-visible">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, description..."
                className="input pl-9 text-sm"
              />
            </div>
            <div className="flex gap-2 items-center">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="p-2 transition-all"
                  style={{
                    backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                    color: viewMode === 'list' ? 'white' : 'var(--text-secondary)',
                  }}
                  title="List view"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tiles')}
                  className="p-2 transition-all"
                  style={{
                    backgroundColor: viewMode === 'tiles' ? 'var(--accent)' : 'transparent',
                    color: viewMode === 'tiles' ? 'white' : 'var(--text-secondary)',
                  }}
                  title="Tiles view"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className="p-2 transition-all"
                  style={{
                    backgroundColor: viewMode === 'tree' ? 'var(--accent)' : 'transparent',
                    color: viewMode === 'tree' ? 'white' : 'var(--text-secondary)',
                  }}
                  title="Tree view"
                >
                  <Icon icon="tabler:binary-tree-2" className="w-4 h-4" />
                </button>
              </div>

              {/* Tile Size Selector - only visible in tiles mode */}
              {viewMode === 'tiles' && (
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  {(['s', 'm', 'l', 'xl'] as TileSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTileSize(size)}
                      className="px-2 py-1 text-xs font-medium transition-all min-w-[28px]"
                      style={{
                        backgroundColor: tileSize === size ? 'var(--accent)' : 'transparent',
                        color: tileSize === size ? 'white' : 'var(--text-secondary)',
                      }}
                      title={`${size.toUpperCase()} size`}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--bg-tertiary)' }} />

              <button
                type="button"
                onClick={() => { setShowFilters(!showFilters); setShowColumnSettings(false); }}
                className={`px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-2 ${
                  showFilters ? '' : ''
                }`}
                style={{
                  borderColor: showFilters ? 'var(--accent)' : 'var(--bg-tertiary)',
                  backgroundColor: showFilters ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  color: showFilters ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <FunnelIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {(categoryId || locationId || tagId || templateId || lowStock || componentFilter) && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowColumnSettings(!showColumnSettings); setShowFilters(false); }}
                className="px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-2"
                style={{
                  borderColor: showColumnSettings ? 'var(--accent)' : 'var(--bg-tertiary)',
                  backgroundColor: showColumnSettings ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  color: showColumnSettings ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Columns</span>
              </button>

              <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--bg-tertiary)' }} />

              {/* Export button */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-2"
                style={{
                  borderColor: selectedItems.size > 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                  backgroundColor: selectedItems.size > 0 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  color: selectedItems.size > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                title={selectedItems.size > 0 ? `Export ${selectedItems.size} selected items` : 'Export filtered items to ZIP'}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {selectedItems.size > 0 ? `Export (${selectedItems.size})` : 'Export'}
                </span>
              </button>

              {/* Import button with hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.zip"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-2"
                style={{
                  borderColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
                title="Import items from CSV"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>


              <button type="submit" className="btn btn-primary text-sm px-4">
                Search
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="pt-3 border-t overflow-visible" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div className="flex flex-wrap items-end gap-3 overflow-visible">
                <div className="w-[280px]">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Category</label>
                  <CategoryPicker
                    value={categoryId}
                    onChange={setCategoryId}
                    categories={categories}
                    hierarchicalCategories={hierarchicalCategories}
                    placeholder="All Categories"
                  />
                </div>
                <div className="w-[280px]">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Location</label>
                  <LocationPicker
                    value={locationId}
                    onChange={setLocationId}
                    locations={locations}
                    hierarchicalLocations={hierarchicalLocations}
                    placeholder="All Locations"
                  />
                </div>
                <div className="w-[280px]">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tag</label>
                  <IconSelect
                    value={tagId}
                    onChange={setTagId}
                    options={tagOptions}
                    placeholder="All Tags"
                  />
                </div>
                <div className="w-[280px]">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Device Type</label>
                  <IconSelect
                    value={templateId}
                    onChange={setTemplateId}
                    options={templateOptions}
                    placeholder="All Types"
                  />
                </div>
                <div className="w-[280px]">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Components</label>
                  <select
                    value={componentFilter}
                    onChange={(e) => setComponentFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--bg-tertiary)',
                      color: componentFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <option value="">All Items</option>
                    <option value="top_level">Top-level parents only</option>
                    <option value="standalone">Standalone (no relationships)</option>
                    <option value="has_components">Has sub-items</option>
                    <option value="is_component">Is a component of another</option>
                    <option value="no_components">No sub-items</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: lowStock ? 'var(--accent)' : 'var(--bg-tertiary)',
                    backgroundColor: lowStock ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={lowStock}
                    onChange={(e) => setLowStock(e.target.checked)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-sm" style={{ color: lowStock ? 'var(--accent)' : 'var(--text-secondary)' }}>Low stock only</span>
                </label>
                {(categoryId || locationId || tagId || templateId || lowStock || componentFilter) && (
                  <>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSaveFilterInput(true)}
                      className="px-3 py-2 text-sm rounded-lg transition-colors"
                      style={{ color: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
                    >
                      Save filter
                    </button>
                  </>
                )}
                {savedFiltersList.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSavedFilters(!showSavedFilters)}
                      className="px-3 py-2 text-sm rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      Saved ({savedFiltersList.length})
                    </button>
                    {showSavedFilters && (
                      <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg shadow-lg border p-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--bg-tertiary)' }}>
                        {savedFiltersList.map(f => (
                          <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:opacity-80 cursor-pointer" style={{ color: 'var(--text-primary)' }} onClick={() => handleApplyFilter(f)}>
                            <span className="text-sm truncate">{f.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFilter(f.id); }} className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                              <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {showSaveFilterInput && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={saveFilterName}
                    onChange={e => setSaveFilterName(e.target.value)}
                    placeholder="Filter name..."
                    className="input text-sm flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
                    autoFocus
                  />
                  <button onClick={handleSaveFilter} className="btn btn-primary btn-sm">Save</button>
                  <button onClick={() => { setShowSaveFilterInput(false); setSaveFilterName(''); }} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Column Settings Panel */}
          {showColumnSettings && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Visible Columns</span>
                <button
                  type="button"
                  onClick={resetColumns}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_COLUMNS.map((column) => (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => toggleColumn(column.id)}
                    disabled={column.required}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: visibleColumns.includes(column.id) ? 'var(--accent)' : 'var(--bg-tertiary)',
                      backgroundColor: visibleColumns.includes(column.id) ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                      color: visibleColumns.includes(column.id) ? 'var(--accent)' : 'var(--text-secondary)',
                      opacity: column.required ? 0.5 : 1,
                      cursor: column.required ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {visibleColumns.includes(column.id) ? (
                      <EyeIcon className="w-3 h-3" />
                    ) : (
                      <EyeSlashIcon className="w-3 h-3" />
                    )}
                    {column.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedItems.size > 0 && (
        <div
          className="card p-3 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm px-2 py-1 rounded hover-bg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category actions */}
            <button
              type="button"
              onClick={() => setBulkActionType('category')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <FolderIcon className="w-4 h-4" />
              Set Category
            </button>
            <button
              type="button"
              onClick={() => setBulkActionType('clearCategory')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <MinusCircleIcon className="w-4 h-4" />
              Remove Category
            </button>

            {/* Location actions */}
            <button
              type="button"
              onClick={() => setBulkActionType('location')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <MapPinIcon className="w-4 h-4" />
              Set Location
            </button>
            <button
              type="button"
              onClick={() => setBulkActionType('clearLocation')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <MinusCircleIcon className="w-4 h-4" />
              Remove Location
            </button>

            {/* Device type actions */}
            <button
              type="button"
              onClick={() => setBulkActionType('template')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Set Device Type
            </button>
            <button
              type="button"
              onClick={() => setBulkActionType('clearTemplate')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <MinusCircleIcon className="w-4 h-4" />
              Remove Device Type
            </button>

            {/* Tag actions */}
            <button
              type="button"
              onClick={() => setBulkActionType('addTags')}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <TagIcon className="w-4 h-4" />
              Add Tags
            </button>
            <button
              type="button"
              onClick={() => setBulkActionType('removeTags')}
              disabled={bulkActionLoading || getSelectedItemsTags().length === 0}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
              style={{ opacity: getSelectedItemsTags().length === 0 ? 0.5 : 1 }}
            >
              <XMarkIcon className="w-4 h-4" />
              Remove Tags
            </button>

            {/* Duplicate action */}
            <button
              type="button"
              onClick={handleBulkDuplicate}
              disabled={bulkActionLoading}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Duplicate
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="card overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-4"
              style={{ borderBottom: '1px solid var(--bg-tertiary)' }}
            >
              <div className="skeleton w-4 h-4 rounded" />
              <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 rounded" style={{ width: '60%' }} />
                <div className="skeleton h-3 rounded" style={{ width: '40%' }} />
              </div>
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <CubeIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No items found</p>
          <Link to="/items/new" className="btn btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add your first item
          </Link>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            /* List View - Table */
            <div className="card overflow-hidden overflow-x-auto">
              <table className="min-w-full" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <tr style={{ borderBottomWidth: '1px', borderColor: 'var(--bg-tertiary)' }}>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedItems.size === items.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                    </th>
                    {AVAILABLE_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column) => {
                      const sortField = SORTABLE_COLUMNS[column.id];
                      const currentSortBy = searchParams.get('sortBy');
                      const currentOrder = searchParams.get('sortOrder');
                      const isActive = sortField && currentSortBy === sortField;
                      return (
                        <th
                          key={column.id}
                          className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${
                            column.id === 'quantity' || column.id === 'minQuantity' ? 'text-right' : 'text-left'
                          } ${sortField ? 'cursor-pointer select-none hover:opacity-80' : ''}`}
                          style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                          onClick={() => sortField && handleSort(column.id)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {column.label}
                            {sortField && isActive && (
                              <span className="text-[10px]">{currentOrder === 'asc' ? '▲' : '▼'}</span>
                            )}
                            {sortField && !isActive && (
                              <span className="opacity-30 text-[10px]">⇅</span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="group hover-bg transition-colors"
                      style={{
                        borderBottomWidth: '1px',
                        borderColor: 'var(--bg-tertiary)',
                        backgroundColor: selectedItems.has(item.id) ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : undefined
                      }}
                    >
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="h-4 w-4 rounded"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </td>
                      {AVAILABLE_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column) => (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          {renderCellContent(item, column.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'tiles' ? (
            /* Tiles View - Grid */
            <div>
              {/* Select All for tiles view */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItems.size === items.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                </span>
              </div>
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: tileSize === 's'
                    ? 'repeat(auto-fill, minmax(140px, 1fr))'
                    : tileSize === 'm'
                    ? 'repeat(auto-fill, minmax(180px, 1fr))'
                    : tileSize === 'l'
                    ? 'repeat(auto-fill, minmax(240px, 1fr))'
                    : 'repeat(auto-fill, minmax(320px, 1fr))'
                }}
              >
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    size={tileSize}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => toggleSelectItem(item.id)}
                    onNavigate={() => navigate(`/items/${item.id}`)}
                    categories={categories}
                    locations={locations}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Tree View */
            <ItemsTreeView items={items} />
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
              </p>
              <div className="flex gap-2">
                {pagination.page > 1 && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', String(pagination.page - 1));
                      setSearchParams(params);
                    }}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                )}
                {pagination.page < pagination.pages && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', String(pagination.page + 1));
                      setSearchParams(params);
                    }}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={bulkActionType !== null}
        onClose={() => setBulkActionType(null)}
        onConfirm={handleBulkAction}
        actionType={bulkActionType || 'category'}
        selectedCount={selectedItems.size}
        categories={categories}
        hierarchicalCategories={hierarchicalCategories}
        locations={locations}
        hierarchicalLocations={hierarchicalLocations}
        tags={tags}
        templates={templates}
        currentTags={getSelectedItemsTags()}
      />

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        exporting={exporting}
        selectedCount={selectedItems.size}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
        mode={importMode}
        validRows={importValidRows}
        errors={importErrors}
        totalRows={importTotalRows}
        imageCount={importImageCount}
        missingRefs={importMissingRefs}
        missingRefHandling={importMissingRefHandling}
        onMissingRefHandlingChange={setImportMissingRefHandling}
        onRevalidate={handleRevalidate}
        revalidating={revalidating}
        onConfirmImport={handleConfirmImport}
        importing={importing}
        result={importResult}
      />
    </div>
  );
}

// Helper function for location type colors
function getTypeColorClass(type?: string): string {
  const colors: Record<string, string> = {
    location: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    room: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
    zone: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    aisle: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    row: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    shelf: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    bin: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
  };
  return colors[type || 'location'] || colors.location;
}
