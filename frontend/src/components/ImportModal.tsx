import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  ArrowPathIcon,
  FolderIcon,
  TagIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import type { ImportRow, ImportValidationError, ImportResult, MissingRefHandling, MissingRefs, MissingRefAction } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'preview' | 'result';
  // Preview mode
  validRows?: ImportRow[];
  errors?: ImportValidationError[];
  totalRows?: number;
  imageCount?: number;
  missingRefs?: MissingRefs;
  missingRefHandling?: MissingRefHandling;
  onMissingRefHandlingChange?: (handling: MissingRefHandling) => void;
  onRevalidate?: () => void;
  revalidating?: boolean;
  onConfirmImport?: () => void;
  importing?: boolean;
  // Result mode
  result?: ImportResult;
}

export default function ImportModal({
  isOpen,
  onClose,
  mode,
  validRows = [],
  errors = [],
  totalRows: _totalRows = 0,
  imageCount = 0,
  missingRefs,
  missingRefHandling = { categories: 'skip-row', tags: 'skip-row', locations: 'skip-row' },
  onMissingRefHandlingChange,
  onRevalidate,
  revalidating = false,
  onConfirmImport,
  importing = false,
  result,
}: ImportModalProps) {
  const newItemsCount = validRows.filter(r => !r.existingSku).length;
  const updateItemsCount = validRows.filter(r => r.existingSku).length;

  const hasMissingRefs = missingRefs && (
    missingRefs.categories.length > 0 ||
    missingRefs.tags.length > 0 ||
    missingRefs.locations.length > 0
  );

  const handleActionChange = (type: keyof MissingRefHandling, action: MissingRefAction) => {
    if (onMissingRefHandlingChange) {
      onMissingRefHandlingChange({
        ...missingRefHandling,
        [type]: action,
      });
    }
  };

  const renderMissingRefSection = (
    type: keyof MissingRefHandling,
    label: string,
    icon: any,
    items: string[]
  ) => {
    if (items.length === 0) return null;
    const Icon = icon;

    return (
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {items.length} missing {label}{items.length > 1 ? 's' : ''}
            </span>
          </div>
          <select
            value={missingRefHandling[type]}
            onChange={(e) => handleActionChange(type, e.target.value as MissingRefAction)}
            className="text-xs px-2 py-1 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="skip-row">Skip rows</option>
            <option value="skip-field">Leave empty</option>
            <option value="create">Auto-create</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 10).map((item, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              {item}
            </span>
          ))}
          {items.length > 10 && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              +{items.length - 10} more
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Transition appear show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="w-full max-w-2xl transform rounded-2xl shadow-xl transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {mode === 'preview' ? 'Import Preview' : 'Import Complete'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover-bg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {mode === 'preview' ? (
                    <>
                      {/* Summary */}
                      <div className="flex gap-4">
                        <div
                          className="flex-1 p-4 rounded-lg"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-green-500) 10%, transparent)' }}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {validRows.length} valid rows
                            </span>
                          </div>
                          {validRows.length > 0 && (
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {newItemsCount} new, {updateItemsCount} updates
                            </p>
                          )}
                        </div>
                        {imageCount > 0 && (
                          <div
                            className="flex-1 p-4 rounded-lg"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--color-blue-500) 10%, transparent)' }}
                          >
                            <div className="flex items-center gap-2">
                              <PhotoIcon className="w-5 h-5 text-blue-500" />
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {imageCount} images
                              </span>
                            </div>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              Will be imported
                            </p>
                          </div>
                        )}
                        {errors.length > 0 && (
                          <div
                            className="flex-1 p-4 rounded-lg"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--color-red-500) 10%, transparent)' }}
                          >
                            <div className="flex items-center gap-2">
                              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {errors.length} errors
                              </span>
                            </div>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              Will be skipped
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Missing References Section */}
                      {hasMissingRefs && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              Missing References
                            </h4>
                            {onRevalidate && (
                              <button
                                onClick={onRevalidate}
                                disabled={revalidating}
                                className="text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors"
                                style={{
                                  backgroundColor: 'var(--accent)',
                                  color: 'white',
                                  opacity: revalidating ? 0.7 : 1,
                                }}
                              >
                                <ArrowPathIcon className={`w-3 h-3 ${revalidating ? 'animate-spin' : ''}`} />
                                {revalidating ? 'Revalidating...' : 'Re-validate'}
                              </button>
                            )}
                          </div>
                          {renderMissingRefSection('categories', 'category', FolderIcon, missingRefs?.categories || [])}
                          {renderMissingRefSection('tags', 'tag', TagIcon, missingRefs?.tags || [])}
                          {renderMissingRefSection('locations', 'location', MapPinIcon, missingRefs?.locations || [])}
                        </div>
                      )}

                      {/* Errors list */}
                      {errors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            Validation Errors
                          </h4>
                          <div
                            className="max-h-32 overflow-y-auto rounded-lg border"
                            style={{ borderColor: 'var(--bg-tertiary)' }}
                          >
                            <table className="w-full text-sm">
                              <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Row</th>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {errors.slice(0, 20).map((error, i) => (
                                  <tr key={i} style={{ borderTopWidth: '1px', borderColor: 'var(--bg-tertiary)' }}>
                                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{error.row}</td>
                                    <td className="px-3 py-2 text-red-500">{error.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {errors.length > 20 && (
                              <p className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                                And {errors.length - 20} more errors...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Valid rows preview */}
                      {validRows.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            Items to Import
                          </h4>
                          <div
                            className="max-h-32 overflow-y-auto rounded-lg border"
                            style={{ borderColor: 'var(--bg-tertiary)' }}
                          >
                            <table className="w-full text-sm">
                              <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Name</th>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>SKU</th>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Qty</th>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {validRows.slice(0, 20).map((row, i) => (
                                  <tr key={i} style={{ borderTopWidth: '1px', borderColor: 'var(--bg-tertiary)' }}>
                                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.sku || '-'}</td>
                                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.quantity}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          row.existingSku
                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                        }`}
                                      >
                                        {row.existingSku ? 'Update' : 'Create'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {validRows.length > 20 && (
                              <p className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                                And {validRows.length - 20} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Result mode */
                    <>
                      <div
                        className="p-6 rounded-lg text-center"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-green-500) 10%, transparent)' }}
                      >
                        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          Import Complete
                        </h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          {result?.created} items created, {result?.updated} items updated
                          {result?.imagesImported ? `, ${result.imagesImported} images` : ''}
                        </p>
                        {(result?.categoriesCreated || result?.tagsCreated || result?.locationsCreated) && (
                          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                            Also created:{' '}
                            {[
                              result.categoriesCreated ? `${result.categoriesCreated} categories` : '',
                              result.tagsCreated ? `${result.tagsCreated} tags` : '',
                              result.locationsCreated ? `${result.locationsCreated} locations` : '',
                            ].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>

                      {result?.errors && result.errors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-500">
                            {result.errors.length} errors during import
                          </h4>
                          <div
                            className="max-h-32 overflow-y-auto rounded-lg p-3"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            {result.errors.map((err, i) => (
                              <p key={i} className="text-sm text-red-500">{err}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  {mode === 'preview' ? (
                    <>
                      <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button
                        onClick={onConfirmImport}
                        disabled={validRows.length === 0 || importing}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        {importing ? 'Importing...' : `Import ${validRows.length} Items`}
                      </button>
                    </>
                  ) : (
                    <button onClick={onClose} className="btn btn-primary">
                      Done
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
