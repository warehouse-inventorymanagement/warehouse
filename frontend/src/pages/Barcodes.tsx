import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { itemsApi, locationsApi, categoriesApi } from '../services/api';
import type { Item, Location, Category } from '../types';
import BarcodeCard from '../components/BarcodeCard';
import BarcodeBulkActions from '../components/BarcodeBulkActions';

type TabType = 'items' | 'locations';

interface ItemWithBarcode extends Item {
  barcodeUrl: string;
}

interface LocationWithBarcode extends Location {
  barcodeUrl: string;
  path?: string;
}

interface SelectedBarcode {
  id: string;
  code: string;
  label: string;
  url: string;
}

export default function Barcodes() {
  const { hasPermission, isAdmin, isManager } = useAuth();
  const canExport = hasPermission('items:barcode') || isAdmin || isManager;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Data
  const [items, setItems] = useState<ItemWithBarcode[]>([]);
  const [locations, setLocations] = useState<LocationWithBarcode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Loading
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Search and filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());

  // Pagination
  const [itemsPage, setItemsPage] = useState(1);
  const [locationsPage, setLocationsPage] = useState(1);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [locationsTotal, setLocationsTotal] = useState(0);
  const pageSize = 24;

  // Fetch categories for filter
  useEffect(() => {
    categoriesApi
      .getAll()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch items with SKUs
  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const response = await itemsApi.getAll({
        page: itemsPage,
        limit: pageSize,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
      });

      const allItems = response.data.data || [];
      // Filter to only items with SKUs
      const itemsWithSku = allItems
        .filter((item) => item.sku)
        .map((item) => ({
          ...item,
          barcodeUrl: itemsApi.getSkuBarcodeUrl(item.id),
        }));

      setItems(itemsWithSku);
      setItemsTotal(response.data.pagination?.total || itemsWithSku.length);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  }, [itemsPage, search, categoryFilter]);

  // Fetch locations with barcodes
  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const response = await locationsApi.getAll(true); // flat list
      let allLocations = response.data.data || [];

      // Filter to only locations with barcodes
      let locationsWithBarcode = allLocations.filter((loc) => loc.barcode);

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        locationsWithBarcode = locationsWithBarcode.filter(
          (loc) =>
            loc.name.toLowerCase().includes(searchLower) ||
            loc.barcode?.toLowerCase().includes(searchLower)
        );
      }

      // Apply type filter
      if (locationTypeFilter) {
        locationsWithBarcode = locationsWithBarcode.filter(
          (loc) => loc.type === locationTypeFilter
        );
      }

      // Map with barcode URLs
      const mapped: LocationWithBarcode[] = locationsWithBarcode.map((loc) => ({
        ...loc,
        barcodeUrl: locationsApi.getBarcodeUrl(loc.id),
      }));

      // Paginate client-side
      const start = (locationsPage - 1) * pageSize;
      const paginated = mapped.slice(start, start + pageSize);

      setLocations(paginated);
      setLocationsTotal(mapped.length);
    } catch {
      toast.error('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  }, [locationsPage, search, locationTypeFilter]);

  // Fetch data on tab/filter change
  useEffect(() => {
    if (activeTab === 'items') {
      fetchItems();
    }
  }, [activeTab, fetchItems]);

  useEffect(() => {
    if (activeTab === 'locations') {
      fetchLocations();
    }
  }, [activeTab, fetchLocations]);

  // Reset page when search/filter changes
  useEffect(() => {
    setItemsPage(1);
    setLocationsPage(1);
  }, [search, categoryFilter, locationTypeFilter]);

  // Selection handlers
  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleLocationSelection = (id: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const selectAllLocations = () => {
    if (selectedLocationIds.size === locations.length) {
      setSelectedLocationIds(new Set());
    } else {
      setSelectedLocationIds(new Set(locations.map((l) => l.id)));
    }
  };

  const clearSelection = () => {
    if (activeTab === 'items') {
      setSelectedItemIds(new Set());
    } else {
      setSelectedLocationIds(new Set());
    }
  };

  // Get selected barcodes for bulk actions
  const getSelectedBarcodes = (): SelectedBarcode[] => {
    if (activeTab === 'items') {
      return items
        .filter((item) => selectedItemIds.has(item.id))
        .map((item) => ({
          id: item.id,
          code: item.sku!,
          label: item.name,
          url: item.barcodeUrl,
        }));
    } else {
      return locations
        .filter((loc) => selectedLocationIds.has(loc.id))
        .map((loc) => ({
          id: loc.id,
          code: loc.barcode!,
          label: loc.name,
          url: loc.barcodeUrl,
        }));
    }
  };

  const selectedCount = activeTab === 'items' ? selectedItemIds.size : selectedLocationIds.size;
  const currentTotal = activeTab === 'items' ? itemsTotal : locationsTotal;
  const currentPage = activeTab === 'items' ? itemsPage : locationsPage;
  const setCurrentPage = activeTab === 'items' ? setItemsPage : setLocationsPage;
  const totalPages = Math.ceil(currentTotal / pageSize);
  const isLoading = activeTab === 'items' ? loadingItems : loadingLocations;

  const locationTypes = ['location', 'room', 'zone', 'aisle', 'row', 'bay', 'shelf', 'bin', 'box'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          QR Codes
        </h1>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Search QR codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'items' ? 'shadow' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'items' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'items' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Items ({itemsTotal})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'locations' ? 'shadow' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'locations' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'locations' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Locations ({locationsTotal})
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {activeTab === 'items' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'locations' && (
            <select
              value={locationTypeFilter}
              onChange={(e) => setLocationTypeFilter(e.target.value)}
              className="input"
            >
              <option value="">All Types</option>
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          )}

          {(categoryFilter || locationTypeFilter || search) && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setLocationTypeFilter('');
              }}
              className="text-sm flex items-center gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <XMarkIcon className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCount > 0 && canExport && (
        <BarcodeBulkActions
          selectedBarcodes={getSelectedBarcodes()}
          onClearSelection={clearSelection}
        />
      )}

      {/* Select all */}
      {(activeTab === 'items' ? items.length : locations.length) > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                activeTab === 'items'
                  ? selectedItemIds.size === items.length && items.length > 0
                  : selectedLocationIds.size === locations.length && locations.length > 0
              }
              onChange={activeTab === 'items' ? selectAllItems : selectAllLocations}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Select all on this page
            </span>
          </label>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      ) : (activeTab === 'items' ? items.length : locations.length) === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {search || categoryFilter || locationTypeFilter
              ? 'No QR codes match your filters'
              : activeTab === 'items'
              ? 'No items with SKU QR codes'
              : 'No locations with QR codes'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {activeTab === 'items'
            ? items.map((item) => (
                <BarcodeCard
                  key={item.id}
                  id={item.id}
                  type="item"
                  code={item.sku!}
                  label={item.name}
                  sublabel={item.category?.name}
                  barcodeUrl={item.barcodeUrl}
                  isSelected={selectedItemIds.has(item.id)}
                  onSelect={() => toggleItemSelection(item.id)}
                  canExport={canExport}
                />
              ))
            : locations.map((loc) => (
                <BarcodeCard
                  key={loc.id}
                  id={loc.id}
                  type="location"
                  code={loc.barcode!}
                  label={loc.name}
                  sublabel={loc.type.charAt(0).toUpperCase() + loc.type.slice(1)}
                  barcodeUrl={loc.barcodeUrl}
                  isSelected={selectedLocationIds.has(loc.id)}
                  onSelect={() => toggleLocationSelection(loc.id)}
                  canExport={canExport}
                />
              ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, currentTotal)} of {currentTotal}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="text-sm px-3" style={{ color: 'var(--text-primary)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
