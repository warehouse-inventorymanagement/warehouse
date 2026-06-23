import { CubeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Icon } from '@iconify/react';
import type { Item, Category, Location } from '../types';

// Location type icons
const locationIcons: Record<string, string> = {
  location: 'mdi:map-marker',
  room: 'mdi:door',
  zone: 'mdi:texture-box',
  aisle: 'mdi:road',
  row: 'mdi:table-row',
  bay: 'mdi:garage',
  shelf: 'mdi:bookshelf',
  bin: 'mdi:package-variant',
  box: 'mdi:cube-outline',
};

export type TileSize = 's' | 'm' | 'l' | 'xl';

interface ItemCardProps {
  item: Item;
  size: TileSize;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onNavigate: () => void;
  onFind?: () => void;
  categories: Category[];
  locations: Location[];
}

// Build category path - returns last 2 levels (e.g., "Electronics > Cables")
const buildCategoryPath = (category: Category, allCategories: Category[]): string => {
  const path: string[] = [];
  let current: Category | undefined = allCategories.find(c => c.id === category.id) || category;
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? allCategories.find(c => c.id === current!.parentId) : undefined;
  }
  return path.slice(-2).join(' > ');
};

// Build location path - returns full hierarchy (e.g., "Room > Shelf A > Box 1")
const buildLocationPath = (location: Location, allLocations: Location[]): string => {
  const path: string[] = [];
  let current: Location | undefined = allLocations.find(l => l.id === location.id) || location;
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? allLocations.find(l => l.id === current!.parentId) : undefined;
  }
  return path.join(' > ');
};

// Size configurations - progressive info display
const sizeConfig = {
  s: {
    imageHeight: 'h-24',
    padding: 'p-2',
    gap: 'gap-1',
    textSize: 'text-xs',
    showCategory: false,
    showLocation: false,
    showTags: false,
  },
  m: {
    imageHeight: 'h-32',
    padding: 'p-3',
    gap: 'gap-1.5',
    textSize: 'text-sm',
    showCategory: true,
    showLocation: true,
    showTags: true,
  },
  l: {
    imageHeight: 'h-40',
    padding: 'p-3',
    gap: 'gap-2',
    textSize: 'text-sm',
    showCategory: true,
    showLocation: true,
    showTags: true,
  },
  xl: {
    imageHeight: 'h-48',
    padding: 'p-4',
    gap: 'gap-2',
    textSize: 'text-sm',
    showCategory: true,
    showLocation: true,
    showTags: true,
  },
};

export function ItemCard({ item, size, isSelected, onSelect, onNavigate, onFind, categories, locations }: ItemCardProps) {
  const config = sizeConfig[size];
  const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity;

  return (
    <div
      className={`card relative flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
        isSelected ? 'ring-2 ring-[var(--accent)]' : ''
      }`}
      onClick={onNavigate}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-4 h-4 rounded border-2 cursor-pointer"
          style={{
            accentColor: 'var(--accent)',
            backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        />
      </div>

      {/* Find button - always visible */}
      {onFind && (
        <button
          className="absolute top-2 left-8 z-10 p-1 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          onClick={(e) => {
            e.stopPropagation();
            onFind();
          }}
          title="Find this item"
        >
          <MapPinIcon className="w-4 h-4" style={{ color: item.location?.barcode ? 'var(--accent)' : 'var(--text-secondary)' }} />
        </button>
      )}

      {/* Quantity badge */}
      <div
        className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
          isLowStock ? 'bg-red-500/20 text-red-500' : ''
        }`}
        style={!isLowStock ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' } : {}}
      >
        {isLowStock && <ExclamationTriangleIcon className="w-3 h-3" />}
        {item.quantity}
      </div>

      {/* Image */}
      <div
        className={`${config.imageHeight} w-full flex items-center justify-center overflow-hidden`}
        style={{ backgroundColor: item.primaryImage ? (item.primaryImage.backgroundColor || 'transparent') : 'var(--bg-tertiary)' }}
      >
        {item.primaryImage ? (
          <img
            src={`/uploads/${item.primaryImage.filename}`}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <CubeIcon className="w-12 h-12" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${config.gap} ${config.padding}`}>
        {/* Name */}
        <h3
          className={`font-medium ${config.textSize} line-clamp-2 leading-tight`}
          style={{ color: 'var(--text-primary)' }}
        >
          {item.name}
        </h3>

        {/* Category & Location badges */}
        {(config.showCategory || config.showLocation) && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {config.showCategory && item.category && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: item.category.iconBackgroundColor
                    ? `${item.category.iconBackgroundColor}20`
                    : 'var(--bg-tertiary)',
                  color: item.category.iconColor || 'var(--text-secondary)',
                }}
              >
                {item.category.icon && (
                  <Icon
                    icon={item.category.icon}
                    className="w-3 h-3"
                    style={{ color: item.category.iconColor || 'var(--text-secondary)' }}
                  />
                )}
                <span className="truncate max-w-[120px]">{buildCategoryPath(item.category, categories)}</span>
              </span>
            )}
            {config.showLocation && item.location && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <Icon
                  icon={locationIcons[item.location.type] || 'mdi:map-marker'}
                  className="w-3 h-3"
                />
                <span className="truncate max-w-[120px]">{buildLocationPath(item.location, locations)}</span>
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {config.showTags && item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : 'var(--bg-tertiary)',
                  color: tag.color || 'var(--text-secondary)',
                }}
              >
                {tag.icon && (
                  <Icon
                    icon={tag.icon}
                    className="w-3 h-3"
                    style={{ color: tag.iconColor || tag.color || 'var(--text-secondary)' }}
                  />
                )}
                <span className="truncate max-w-[100px]">{tag.name}</span>
              </span>
            ))}
            {item.tags.length > 3 && (
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemCard;
