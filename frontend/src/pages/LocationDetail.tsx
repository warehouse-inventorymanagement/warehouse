import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { locationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BarcodeDisplay from '../components/BarcodeDisplay';
import type { Location } from '../types';
import { PERMISSIONS } from '../types';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ChevronRightIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  HomeModernIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  QueueListIcon,
  ViewColumnsIcon,
  ArchiveBoxIcon,
  InboxIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Location types configuration
const LOCATION_TYPES: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  location: { label: 'Location', icon: BuildingStorefrontIcon, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  room: { label: 'Room', icon: HomeModernIcon, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  zone: { label: 'Zone', icon: Squares2X2Icon, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  aisle: { label: 'Aisle', icon: ArrowsPointingInIcon, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  row: { label: 'Row', icon: QueueListIcon, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)' },
  bay: { label: 'Bay', icon: ViewColumnsIcon, color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.15)' },
  shelf: { label: 'Shelf', icon: ArchiveBoxIcon, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  bin: { label: 'Bin', icon: CubeIcon, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  box: { label: 'Box', icon: InboxIcon, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' }
};

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager, isAdmin, hasPermission } = useAuth();
  // Allow barcode editing if user has specific permission OR is admin/manager
  const canEditBarcode = hasPermission(PERMISSIONS.LOCATIONS_BARCODE) || isAdmin || isManager;

  const [location, setLocation] = useState<Location | null>(null);
  const [path, setPath] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLocation();
      fetchPath();
    }
  }, [id]);

  const fetchLocation = async () => {
    try {
      const response = await locationsApi.getOne(id!);
      setLocation(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load location');
      navigate('/locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchPath = async () => {
    try {
      const response = await locationsApi.getPath(id!);
      setPath(response.data.data);
    } catch {
      // Ignore path errors
    }
  };

  const handleDelete = async () => {
    if (!location) return;
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) return;

    try {
      await locationsApi.delete(location.id);
      toast.success('Location deleted');
      navigate('/locations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete location');
    }
  };

  const handleBarcodeRegenerated = (newBarcode: string) => {
    if (location) {
      setLocation({ ...location, barcode: newBarcode });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-secondary)' }}>Location not found</p>
        <Link to="/locations" className="btn btn-primary mt-4">Back to Locations</Link>
      </div>
    );
  }

  const typeConfig = LOCATION_TYPES[location.type] || LOCATION_TYPES.location;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/locations')}
            className="p-2 rounded-lg transition-colors mt-1"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            {/* Breadcrumb */}
            {path.length > 1 && (
              <nav className="flex items-center gap-1 text-sm mb-2 flex-wrap">
                {path.slice(0, -1).map((p) => (
                  <span key={p.id} className="flex items-center gap-1">
                    <Link
                      to={`/locations/${p.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {p.name}
                    </Link>
                    <ChevronRightIcon className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                  </span>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: typeConfig.bgColor }}
              >
                <TypeIcon className="w-6 h-6" style={{ color: typeConfig.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {location.name}
                  </h1>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                  >
                    {typeConfig.label}
                  </span>
                </div>
                {location.description && (
                  <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {location.description}
                  </p>
                )}
                {location.address && (
                  <p className="flex items-center gap-1 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <MapPinIcon className="w-4 h-4" />
                    {location.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <Link
              to={`/locations?edit=${location.id}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="btn flex items-center gap-2"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items in this location */}
          <div className="card">
            <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CubeIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                Items in this Location
                <span
                  className="ml-2 px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {location._count?.items || 0}
                </span>
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {!location.items || location.items.length === 0 ? (
                <div className="p-8 text-center">
                  <CubeIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No items in this location</p>
                </div>
              ) : (
                location.items.map((item) => (
                  <Link
                    key={item.id}
                    to={`/items/${item.id}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    {/* Item image or placeholder */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={`/uploads/${item.images[0].filename}`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CubeIcon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      {item.sku && (
                        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                          SKU: {item.sku}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.minQuantity && item.quantity <= item.minQuantity && (
                        <ExclamationTriangleIcon
                          className="w-5 h-5"
                          style={{ color: '#f59e0b' }}
                          title="Low stock"
                        />
                      )}
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {item.quantity}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Child Locations */}
          {location.children && location.children.length > 0 && (
            <div className="card">
              <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Squares2X2Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  Sub-Locations
                  <span
                    className="ml-2 px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {location.children.length}
                  </span>
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
                {location.children.map((child) => {
                  const childTypeConfig = LOCATION_TYPES[child.type] || LOCATION_TYPES.location;
                  const ChildIcon = childTypeConfig.icon;

                  return (
                    <Link
                      key={child.id}
                      to={`/locations/${child.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-tertiary)]"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: childTypeConfig.bgColor }}
                      >
                        <ChildIcon className="w-5 h-5" style={{ color: childTypeConfig.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{ backgroundColor: childTypeConfig.bgColor, color: childTypeConfig.color }}
                          >
                            {childTypeConfig.label}
                          </span>
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {child.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <CubeIcon className="w-4 h-4" />
                          {child._count?.items || 0}
                        </span>
                        {(child._count?.children || 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Squares2X2Icon className="w-4 h-4" />
                            {child._count?.children}
                          </span>
                        )}
                        <ChevronRightIcon className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Barcode */}
        <div className="space-y-6">
          <div className="card p-4 overflow-visible relative z-10">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Location Barcode
            </h2>
            <BarcodeDisplay
              locationId={location.id}
              barcode={location.barcode}
              locationName={location.name}
              onBarcodeRegenerated={handleBarcodeRegenerated}
              canEdit={isManager}
              canEditBarcode={canEditBarcode}
            />
          </div>

          {/* Location Info */}
          <div className="card p-4 relative z-0">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Information
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Type</dt>
                <dd className="font-medium" style={{ color: typeConfig.color }}>{typeConfig.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Items</dt>
                <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{location._count?.items || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Sub-locations</dt>
                <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{location._count?.children || 0}</dd>
              </div>
              {location.parent && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--text-secondary)' }}>Parent</dt>
                  <dd>
                    <Link
                      to={`/locations/${location.parent.id}`}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      {location.parent.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
