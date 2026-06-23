import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRightIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { itemsApi } from '../services/api';
import toast from 'react-hot-toast';
import type { Item, SubItemTreeNode, Tag } from '../types';

interface ItemsTreeViewProps {
  items: Item[];
}

function ChildTreeNode({
  node,
  depth,
}: {
  node: SubItemTreeNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<SubItemTreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  const childImage = node.childItem.images?.[0];
  const hasEnoughStock = node.childItem.quantity >= node.quantityRequired;

  const handleExpand = async () => {
    if (!node.hasChildren) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (children.length === 0) {
      setLoading(true);
      try {
        const response = await itemsApi.getSubItemTree(node.childItemId);
        setChildren(response.data.data);
      } catch {
        toast.error('Failed to load sub-items');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <div>
      <div className="flex items-stretch">
        {/* Tree lines */}
        <div className="flex items-stretch flex-shrink-0" style={{ width: `${depth * 32}px` }}>
          {Array.from({ length: depth }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{
                width: '32px',
                borderLeft: i === depth - 1 ? '2px solid var(--bg-tertiary)' : 'none',
                marginLeft: i === depth - 1 ? '15px' : '0',
              }}
            />
          ))}
        </div>

        {/* Connector line */}
        <div className="flex items-center flex-shrink-0" style={{ width: '16px', marginLeft: '-16px' }}>
          <div
            style={{
              width: '16px',
              height: '2px',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          />
        </div>

        {/* Node content */}
        <div
          className="flex-1 flex items-center gap-3 p-3 rounded-xl transition-colors my-0.5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Expand/collapse */}
          <button
            onClick={handleExpand}
            className="p-1 rounded-md transition-colors flex-shrink-0"
            style={{
              backgroundColor: node.hasChildren
                ? expanded
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : 'var(--bg-tertiary)'
                : 'transparent',
              color: node.hasChildren ? 'var(--text-primary)' : 'var(--bg-tertiary)',
              cursor: node.hasChildren ? 'pointer' : 'default',
            }}
          >
            {loading ? (
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--bg-tertiary)', borderTopColor: 'var(--accent)' }}
              />
            ) : node.hasChildren ? (
              <ChevronRightIcon
                className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              />
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                />
              </div>
            )}
          </button>

          {/* Item image/icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              backgroundColor: childImage
                ? 'var(--bg-tertiary)'
                : ((node.childItem as any).template?.iconBackgroundColor ||
                  (node.childItem as any).category?.iconBackgroundColor ||
                  'var(--bg-tertiary)'),
            }}
          >
            {childImage ? (
              <img
                src={`/uploads/${childImage.filename}`}
                alt={node.childItem.name}
                className="w-full h-full object-cover"
              />
            ) : node.childItem.template?.icon ? (
              <Icon
                icon={node.childItem.template.icon}
                className="w-5 h-5"
                style={{ color: (node.childItem.template as any).iconColor || 'var(--accent)' }}
              />
            ) : node.childItem.category?.icon ? (
              <Icon
                icon={node.childItem.category.icon}
                className="w-5 h-5"
                style={{ color: (node.childItem.category as any).iconColor || 'var(--accent)' }}
              />
            ) : (
              <CubeIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>

          {/* Item info */}
          <div className="flex-1 min-w-0">
            <Link to={`/items/${node.childItem.id}`} className="group">
              <div className="flex items-center gap-2">
                <p
                  className="font-medium truncate group-hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {node.childItem.name}
                </p>
                {node.partNumber && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    #{node.partNumber}
                  </span>
                )}
                {node.hasChildren && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                      color: 'var(--accent)',
                    }}
                  >
                    {node.childrenCount} sub-item{node.childrenCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Link>
            <div
              className="flex items-center gap-2 text-sm flex-wrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {node.childItem.sku && <span>{node.childItem.sku}</span>}
              {node.childItem.sku && <span>&middot;</span>}
              <span>Required: {node.quantityRequired}</span>
              {node.childItem.category && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    {node.childItem.category.icon ? (
                      <Icon
                        icon={node.childItem.category.icon}
                        className="w-3 h-3"
                        style={{ color: (node.childItem.category as any).iconColor || 'var(--text-secondary)' }}
                      />
                    ) : null}
                    {node.childItem.category.name}
                  </span>
                </>
              )}
            </div>
            {node.childItem.tags && node.childItem.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {node.childItem.tags.map((t: { tag: Tag }) => (
                  <span
                    key={t.tag.id}
                    className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                  >
                    {t.tag.icon && (
                      <Icon
                        icon={t.tag.icon}
                        className="w-3 h-3"
                        style={{ color: t.tag.iconColor || t.tag.color }}
                      />
                    )}
                    {t.tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stock badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: hasEnoughStock
                  ? 'color-mix(in srgb, #22c55e 15%, transparent)'
                  : 'color-mix(in srgb, #ef4444 15%, transparent)',
                color: hasEnoughStock ? '#22c55e' : '#ef4444',
              }}
            >
              {node.childItem.quantity} in stock
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <ChildTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RootItemNode({ item }: { item: Item }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<SubItemTreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  const hasChildren = (item._count?.subItems ?? 0) > 0;
  const subItemsCount = item._count?.subItems ?? 0;
  const primaryImage = item.images?.[0];
  const isLowStock = item.quantity <= item.minQuantity && item.minQuantity > 0;

  const handleExpand = async () => {
    if (!hasChildren) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (children.length === 0) {
      setLoading(true);
      try {
        const response = await itemsApi.getSubItemTree(item.id);
        setChildren(response.data.data);
      } catch {
        toast.error('Failed to load sub-items');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <div>
      <div
        className="flex items-center gap-3 p-3 rounded-xl transition-colors my-0.5"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Expand/collapse */}
        <button
          onClick={handleExpand}
          className="p-1 rounded-md transition-colors flex-shrink-0"
          style={{
            backgroundColor: hasChildren
              ? expanded
                ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                : 'var(--bg-tertiary)'
              : 'transparent',
            color: hasChildren ? 'var(--text-primary)' : 'var(--bg-tertiary)',
            cursor: hasChildren ? 'pointer' : 'default',
          }}
        >
          {loading ? (
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--bg-tertiary)', borderTopColor: 'var(--accent)' }}
            />
          ) : hasChildren ? (
            <ChevronRightIcon
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              />
            </div>
          )}
        </button>

        {/* Item image/icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            backgroundColor: primaryImage
              ? 'var(--bg-tertiary)'
              : ((item.template as any)?.iconBackgroundColor ||
                (item.category as any)?.iconBackgroundColor ||
                'var(--bg-tertiary)'),
          }}
        >
          {primaryImage ? (
            <img
              src={`/uploads/${primaryImage.filename}`}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (item.template as any)?.icon ? (
            <Icon
              icon={(item.template as any).icon}
              className="w-5 h-5"
              style={{ color: (item.template as any).iconColor || 'var(--accent)' }}
            />
          ) : (item.category as any)?.icon ? (
            <Icon
              icon={(item.category as any).icon}
              className="w-5 h-5"
              style={{ color: (item.category as any).iconColor || 'var(--accent)' }}
            />
          ) : (
            <CubeIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          )}
        </div>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <Link to={`/items/${item.id}`} className="group">
            <div className="flex items-center gap-2">
              <p
                className="font-medium truncate group-hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.name}
              </p>
              {hasChildren && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {subItemsCount} sub-item{subItemsCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Link>
          <div
            className="flex items-center gap-2 text-sm flex-wrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {item.sku && <span>{item.sku}</span>}
            {item.category && (
              <>
                {item.sku && <span>&middot;</span>}
                <span className="flex items-center gap-1">
                  {(item.category as any)?.icon ? (
                    <Icon
                      icon={(item.category as any).icon}
                      className="w-3 h-3"
                      style={{ color: (item.category as any).iconColor || 'var(--text-secondary)' }}
                    />
                  ) : null}
                  {item.category.name}
                </span>
              </>
            )}
            {item.location && (
              <>
                <span>&middot;</span>
                <span>{item.location.name}</span>
              </>
            )}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {item.tags.map((t: any) => {
                const tag = t.tag || t;
                return (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.icon && (
                      <Icon
                        icon={tag.icon}
                        className="w-3 h-3"
                        style={{ color: tag.iconColor || tag.color }}
                      />
                    )}
                    {tag.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Quantity badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="px-2 py-1 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: isLowStock
                ? 'color-mix(in srgb, #ef4444 15%, transparent)'
                : 'color-mix(in srgb, #22c55e 15%, transparent)',
              color: isLowStock ? '#ef4444' : '#22c55e',
            }}
          >
            {item.quantity} in stock
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <ChildTreeNode
              key={child.id}
              node={child}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemsTreeView({ items }: ItemsTreeViewProps) {
  return (
    <div className="card p-4">
      {items.map((item) => (
        <RootItemNode key={item.id} item={item} />
      ))}
    </div>
  );
}
