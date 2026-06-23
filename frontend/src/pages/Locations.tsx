import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  HomeModernIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  QueueListIcon,
  ViewColumnsIcon,
  ArchiveBoxIcon,
  CubeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Bars3BottomLeftIcon
} from '@heroicons/react/24/outline';
import type { Location } from '../types';
import LocationPicker from '../components/LocationPicker';

// Location types and their icons with hex colors
const LOCATION_TYPES = [
  { value: 'location', label: 'Location', icon: BuildingStorefrontIcon, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  { value: 'room', label: 'Room', icon: HomeModernIcon, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  { value: 'zone', label: 'Zone', icon: Squares2X2Icon, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  { value: 'aisle', label: 'Aisle', icon: ArrowsPointingInIcon, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  { value: 'row', label: 'Row', icon: QueueListIcon, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)' },
  { value: 'bay', label: 'Bay', icon: ViewColumnsIcon, color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.15)' },
  { value: 'shelf', label: 'Shelf', icon: ArchiveBoxIcon, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  { value: 'bin', label: 'Bin', icon: CubeIcon, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  { value: 'box', label: 'Box', icon: InboxIcon, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' }
];

const getTypeConfig = (type: string) => {
  return LOCATION_TYPES.find(t => t.value === type) || LOCATION_TYPES[0];
};

export default function Locations() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('location');
  const [address, setAddress] = useState('');
  const [parentId, setParentId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [flatLocations, setFlatLocations] = useState<Location[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out the current location being edited from parent selection options
  const filteredFlatLocations = useMemo(() => {
    if (!editingLocation) return flatLocations;
    return flatLocations.filter(l => l.id !== editingLocation.id);
  }, [flatLocations, editingLocation]);

  const filteredHierarchicalLocations = useMemo(() => {
    if (!editingLocation) return locations;
    const filterTree = (locs: Location[]): Location[] => {
      return locs
        .filter(l => l.id !== editingLocation.id)
        .map(l => ({
          ...l,
          children: l.children ? filterTree(l.children) : undefined
        }));
    };
    return filterTree(locations);
  }, [locations, editingLocation]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const [hierarchyRes, flatRes] = await Promise.all([
        locationsApi.getAll(false),
        locationsApi.getAll(true)
      ]);
      setLocations(hierarchyRes.data.data);
      setFlatLocations(flatRes.data.data);

      // Auto-expand root locations
      const rootIds = new Set(hierarchyRes.data.data.map((l: Location) => l.id));
      setExpandedIds(rootIds);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for each type
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    LOCATION_TYPES.forEach(t => stats[t.value] = 0);
    flatLocations.forEach(loc => {
      const locType = loc.type || 'location';
      if (stats[locType] !== undefined) {
        stats[locType]++;
      }
    });
    return stats;
  }, [flatLocations]);

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;

    const query = searchQuery.toLowerCase();

    const filterTree = (locs: Location[]): Location[] => {
      return locs.reduce((acc: Location[], loc) => {
        const matches = loc.name.toLowerCase().includes(query) ||
                       loc.description?.toLowerCase().includes(query) ||
                       loc.type?.toLowerCase().includes(query);

        const filteredChildren = loc.children ? filterTree(loc.children) : [];

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...loc,
            children: filteredChildren.length > 0 ? filteredChildren : loc.children
          });
        }

        return acc;
      }, []);
    };

    return filterTree(locations);
  }, [locations, searchQuery]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set<string>();
      const collectIds = (locs: Location[]) => {
        locs.forEach(loc => {
          allIds.add(loc.id);
          if (loc.children) collectIds(loc.children);
        });
      };
      collectIds(filteredLocations);
      setExpandedIds(allIds);
    }
  }, [searchQuery, filteredLocations]);

  const openModal = (location?: Location, defaultParentId?: string) => {
    if (location) {
      setEditingLocation(location);
      setName(location.name);
      setDescription(location.description || '');
      setType(location.type || 'location');
      setAddress(location.address || '');
      setParentId(location.parentId || '');
      setCapacity(location.capacity != null ? String(location.capacity) : '');
    } else {
      setEditingLocation(null);
      setName('');
      setDescription('');
      setType(defaultParentId ? 'zone' : 'location');
      setAddress('');
      setParentId(defaultParentId || '');
      setCapacity('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name,
        description,
        type,
        address: type === 'location' ? address : undefined,
        parentId: parentId || undefined,
        capacity: capacity ? Number(capacity) : undefined
      };

      if (editingLocation) {
        await locationsApi.update(editingLocation.id, {
          ...data,
          parentId: parentId || null
        });
        toast.success('Location updated');
      } else {
        await locationsApi.create(data);
        toast.success('Location created');
      }
      setShowModal(false);
      fetchLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await locationsApi.delete(id);
      toast.success('Location deleted');
      fetchLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete location');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (locs: Location[]) => {
      locs.forEach(loc => {
        if (loc.children && loc.children.length > 0) {
          allIds.add(loc.id);
          collectIds(loc.children);
        }
      });
    };
    collectIds(locations);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const renderLocation = (location: Location, depth = 0, isLast = false, parentLines: boolean[] = []) => {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expandedIds.has(location.id);
    const typeConfig = getTypeConfig(location.type || 'location');
    const TypeIcon = typeConfig.icon;

    return (
      <div key={location.id}>
        <div
          className="group flex items-center gap-3 py-3 px-4 transition-all duration-150 hover:bg-[var(--bg-tertiary)] relative"
          style={{ marginLeft: depth > 0 ? `${depth * 28}px` : '0' }}
        >
          {/* Tree line connector */}
          {depth > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 w-px"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                left: '-14px',
                height: isLast ? '50%' : '100%'
              }}
            />
          )}
          {depth > 0 && (
            <div
              className="absolute w-3 h-px"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                left: '-14px',
                top: '50%'
              }}
            />
          )}

          {/* Expand/Collapse button or icon */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(location.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: isExpanded ? typeConfig.bgColor : 'var(--bg-tertiary)' }}
            >
              <ChevronRightIcon
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                style={{ color: isExpanded ? typeConfig.color : 'var(--text-secondary)' }}
              />
            </button>
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: typeConfig.bgColor }}
            >
              <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
            </div>
          )}

          {/* Location info */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/locations/${location.id}`)}
          >
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
              >
                {typeConfig.label}
              </span>
              <h3 className="font-semibold truncate hover:underline" style={{ color: 'var(--text-primary)' }}>
                {location.name}
              </h3>
              {location.barcode && (
                <Bars3BottomLeftIcon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                  title={`Barcode: ${location.barcode}`}
                />
              )}
            </div>
            {(location.description || location.address) && (
              <div className="flex items-center gap-3 mt-1">
                {location.description && (
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {location.description}
                  </p>
                )}
                {location.address && (
                  <p className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <MapPinIcon className="w-3 h-3" />
                    {location.address}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1">
                <CubeIcon className="w-4 h-4" />
                {location._count?.items || 0}
              </span>
              {location.capacity && (
                <span className="flex items-center gap-1.5">
                  <span>{location._count?.items || 0} / {location.capacity}</span>
                  <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((location._count?.items || 0) / location.capacity) * 100)}%`,
                        backgroundColor: ((location._count?.items || 0) / location.capacity) > 0.9
                          ? '#ef4444'
                          : ((location._count?.items || 0) / location.capacity) >= 0.75
                            ? '#eab308'
                            : '#22c55e'
                      }}
                    />
                  </div>
                </span>
              )}
              {(location._count?.children || 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Squares2X2Icon className="w-4 h-4" />
                  {location._count?.children}
                </span>
              )}
            </div>

            {/* Actions */}
            {isManager && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openModal(undefined, location.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#22c55e' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Add sub-location"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal(location)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--accent)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 15%, transparent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Edit location"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(location.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Delete location"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {location.children!.map((child, idx) =>
              renderLocation(
                child,
                depth + 1,
                idx === location.children!.length - 1,
                [...parentLines, !isLast]
              )
            )}
          </div>
        )}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Locations</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Organize inventory by physical locations in a hierarchy
          </p>
        </div>
        {isManager && (
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Location
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOCATION_TYPES.map(t => {
          const Icon = t.icon;
          const count = typeStats[t.value] || 0;
          return (
            <div
              key={t.value}
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: t.bgColor }}
              >
                <Icon className="w-4 h-4" style={{ color: t.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{t.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-tertiary)]"
            >
              <XMarkIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>

        {locations.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ChevronDownIcon className="w-4 h-4" />
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ChevronUpIcon className="w-4 h-4" />
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* Locations Tree */}
      <div className="card overflow-hidden">
        {filteredLocations.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <BuildingStorefrontIcon className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {searchQuery ? 'No locations found' : 'No locations yet'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {searchQuery ? 'Try a different search term' : 'Create locations to organize your inventory'}
            </p>
            {!searchQuery && isManager && (
              <button
                onClick={() => openModal()}
                className="btn btn-primary mt-4"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Location
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
            {filteredLocations.map((location, idx) =>
              renderLocation(location, 0, idx === filteredLocations.length - 1)
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--bg-tertiary)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingLocation ? 'Edit Location' : 'New Location'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_TYPES.map(t => {
                    const Icon = t.icon;
                    const isSelected = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className="p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1"
                        style={{
                          borderColor: isSelected ? t.color : 'var(--bg-tertiary)',
                          backgroundColor: isSelected ? t.bgColor : 'transparent'
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: isSelected ? t.color : 'var(--text-secondary)' }} />
                        <span
                          className="text-xs font-medium"
                          style={{ color: isSelected ? t.color : 'var(--text-secondary)' }}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                  placeholder={`e.g., ${type === 'location' ? 'Main Warehouse' : type === 'room' ? 'Storage Room' : type === 'zone' ? 'Zone A' : type === 'aisle' ? 'Aisle 1' : type === 'row' ? 'Row 1' : type === 'bay' ? 'Bay 1' : type === 'shelf' ? 'Shelf A' : type === 'bin' ? 'Bin 01' : 'Box A1'}`}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Optional notes about this location"
                />
              </div>

              <div>
                <label className="label">Capacity</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="input"
                  min="0"
                  placeholder="Max items (optional)"
                />
              </div>

              {type === 'location' && (
                <div>
                  <label className="label">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input"
                    placeholder="Physical address (optional)"
                  />
                </div>
              )}

              <div>
                <label className="label">Parent Location</label>
                <LocationPicker
                  value={parentId}
                  onChange={setParentId}
                  locations={filteredFlatLocations}
                  hierarchicalLocations={filteredHierarchicalLocations}
                  placeholder="None (root level)"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div
              className="flex gap-3 p-4 border-t"
              style={{ borderColor: 'var(--bg-tertiary)' }}
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn btn-primary flex-1"
              >
                {editingLocation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
