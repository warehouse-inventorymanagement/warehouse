import { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';

interface SubItemForDelete {
  id: string;
  name: string;
  sku: string | null;
}

interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subItemIds: string[]) => void;
  itemId: string;
  itemName: string;
  isDeleting: boolean;
}

export default function DeleteItemModal({
  isOpen,
  onClose,
  onConfirm,
  itemId,
  itemName,
  isDeleting
}: DeleteItemModalProps) {
  const [subItems, setSubItems] = useState<SubItemForDelete[]>([]);
  const [selectedSubItems, setSelectedSubItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      loadSubItems();
    }
  }, [isOpen, itemId]);

  const loadSubItems = async () => {
    setLoading(true);
    try {
      const response = await itemsApi.getSubItemsForDelete(itemId);
      setSubItems(response.data.data);
      setSelectedSubItems(new Set()); // Reset selection
    } catch (error) {
      console.error('Failed to load sub-items:', error);
      setSubItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubItem = (id: string) => {
    const newSelected = new Set(selectedSubItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSubItems.size === subItems.length) {
      setSelectedSubItems(new Set());
    } else {
      setSelectedSubItems(new Set(subItems.map(item => item.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedSubItems));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Item</h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>"{itemName}"</span>?
          </p>

          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            This item will be moved to quarantine and can be restored within the retention period.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
            </div>
          ) : subItems.length > 0 ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Sub-items ({subItems.length})
                </h3>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  {selectedSubItems.size === subItems.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Select sub-items to delete along with the main item:
              </p>
              <div className="rounded-md max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {subItems.map(subItem => (
                  <label
                    key={subItem.id}
                    className="flex items-center gap-3 p-3 cursor-pointer border-b last:border-0"
                    style={{ borderColor: 'var(--bg-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubItems.has(subItem.id)}
                      onChange={() => handleToggleSubItem(subItem.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{subItem.name}</p>
                      {subItem.sku && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>SKU: {subItem.sku}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {selectedSubItems.size > 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  {selectedSubItems.size} sub-item(s) will also be moved to quarantine
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3 justify-end" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn btn-secondary py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="btn btn-danger py-2 px-4 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
