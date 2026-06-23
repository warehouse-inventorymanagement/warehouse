import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IconSelect, type IconSelectOption } from './IconSelect';
import { IconDisplay } from './IconPicker';
import CategoryPicker from './CategoryPicker';
import LocationPicker from './LocationPicker';
import type { Category, Location, Tag, ItemTemplate } from '../types';

export type BulkActionType =
  | 'category' | 'clearCategory'
  | 'location' | 'clearLocation'
  | 'addTags' | 'removeTags'
  | 'template' | 'clearTemplate';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: BulkActionType, value: string | string[] | null) => void;
  actionType: BulkActionType;
  selectedCount: number;
  categories: Category[];
  hierarchicalCategories: Category[];
  locations: Location[];
  hierarchicalLocations: Location[];
  tags: Tag[];
  templates: ItemTemplate[];
  currentTags?: Tag[]; // For removeTags, show only tags that are on selected items
}

export function BulkActionModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  selectedCount,
  categories,
  hierarchicalCategories,
  locations,
  hierarchicalLocations,
  tags,
  templates,
  currentTags = []
}: BulkActionModalProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!isOpen) return null;

  const isClearAction = actionType.startsWith('clear');

  const getTitle = () => {
    switch (actionType) {
      case 'category':
        return 'Set Category';
      case 'clearCategory':
        return 'Remove Category';
      case 'location':
        return 'Set Location';
      case 'clearLocation':
        return 'Remove Location';
      case 'addTags':
        return 'Add Tags';
      case 'removeTags':
        return 'Remove Tags';
      case 'template':
        return 'Set Device Type';
      case 'clearTemplate':
        return 'Remove Device Type';
    }
  };

  const getDescription = () => {
    const itemText = selectedCount === 1 ? 'item' : 'items';
    switch (actionType) {
      case 'category':
        return `Select a category to apply to ${selectedCount} ${itemText}`;
      case 'clearCategory':
        return `This will remove the category from ${selectedCount} ${itemText}`;
      case 'location':
        return `Select a location to apply to ${selectedCount} ${itemText}`;
      case 'clearLocation':
        return `This will remove the location from ${selectedCount} ${itemText}`;
      case 'addTags':
        return `Select tags to add to ${selectedCount} ${itemText}`;
      case 'removeTags':
        return `Select tags to remove from ${selectedCount} ${itemText}`;
      case 'template':
        return `Select a device type to apply to ${selectedCount} ${itemText}`;
      case 'clearTemplate':
        return `This will remove the device type from ${selectedCount} ${itemText}`;
    }
  };

  const templateOptions: IconSelectOption[] = templates.map(tpl => ({
    value: tpl.id,
    label: tpl.name,
    icon: tpl.icon,
    iconColor: tpl.iconColor,
    iconBackgroundColor: tpl.iconBackgroundColor
  }));

  const tagOptions = actionType === 'removeTags' ? currentTags : tags;

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleConfirm = () => {
    if (isClearAction) {
      onConfirm(actionType, null);
    } else if (actionType === 'addTags' || actionType === 'removeTags') {
      if (selectedTags.length > 0) {
        onConfirm(actionType, selectedTags);
        setSelectedTags([]);
      }
    } else {
      if (selectedValue) {
        onConfirm(actionType, selectedValue);
        setSelectedValue('');
      }
    }
    onClose();
  };

  const isConfirmDisabled = () => {
    if (isClearAction) {
      return false; // Clear actions are always enabled
    }
    if (actionType === 'addTags' || actionType === 'removeTags') {
      return selectedTags.length === 0;
    }
    return !selectedValue;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-md rounded-xl shadow-xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--bg-tertiary)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {getTitle()}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover-bg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {getDescription()}
            </p>

            {actionType === 'category' && (
              <CategoryPicker
                value={selectedValue}
                onChange={setSelectedValue}
                categories={categories}
                hierarchicalCategories={hierarchicalCategories}
                placeholder="Select category..."
              />
            )}

            {actionType === 'location' && (
              <LocationPicker
                value={selectedValue}
                onChange={setSelectedValue}
                locations={locations}
                hierarchicalLocations={hierarchicalLocations}
                placeholder="Select location..."
              />
            )}

            {actionType === 'template' && (
              <IconSelect
                value={selectedValue}
                onChange={setSelectedValue}
                options={templateOptions}
                placeholder="Select device type..."
                showClear={false}
              />
            )}

            {(actionType === 'addTags' || actionType === 'removeTags') && (
              <div className="space-y-2">
                {tagOptions.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {actionType === 'removeTags' ? 'No tags to remove' : 'No tags available'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                    {tagOptions.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
                        style={{
                          backgroundColor: selectedTags.includes(tag.id)
                            ? tag.color + '30'
                            : 'var(--bg-tertiary)',
                          color: selectedTags.includes(tag.id) ? tag.color : 'var(--text-primary)',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: selectedTags.includes(tag.id) ? tag.color : 'transparent'
                        }}
                      >
                        {tag.icon && (
                          <IconDisplay
                            icon={tag.icon}
                            size="small"
                            color={tag.iconColor || tag.color}
                          />
                        )}
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear actions don't need a selector */}
            {isClearAction && (
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Are you sure you want to proceed?
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'var(--bg-tertiary)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirmDisabled()}
              className="btn btn-primary"
              style={{ opacity: isConfirmDisabled() ? 0.5 : 1 }}
            >
              {isClearAction ? 'Confirm' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkActionModal;
