import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  TagIcon,
  FolderIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

export interface ExportOptions {
  includeImages: boolean;
  includeTags: boolean;
  includeCategory: boolean;
  includeLocation: boolean;
}

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  exporting: boolean;
  selectedCount: number;
}

export default function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  exporting,
  selectedCount,
}: ExportOptionsModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeImages: true,
    includeTags: true,
    includeCategory: true,
    includeLocation: true,
  });

  const handleToggle = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    onExport(options);
  };

  const optionItems = [
    { key: 'includeImages' as const, label: 'Images', icon: PhotoIcon, description: 'Include item images in ZIP' },
    { key: 'includeTags' as const, label: 'Tags', icon: TagIcon, description: 'Include tag assignments' },
    { key: 'includeCategory' as const, label: 'Category', icon: FolderIcon, description: 'Include category assignments' },
    { key: 'includeLocation' as const, label: 'Location', icon: MapPinIcon, description: 'Include location assignments' },
  ];

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
                className="w-full max-w-md transform rounded-2xl shadow-xl transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Export Options
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover-bg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedCount > 0
                      ? `Exporting ${selectedCount} selected item${selectedCount > 1 ? 's' : ''}`
                      : 'Exporting all filtered items'}
                  </p>

                  <div className="space-y-3">
                    {optionItems.map(({ key, label, icon: Icon, description }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                        style={{ backgroundColor: options[key] ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-tertiary)' }}
                      >
                        <input
                          type="checkbox"
                          checked={options[key]}
                          onChange={() => handleToggle(key)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Icon className="w-5 h-5" style={{ color: options[key] ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <div className="flex-1">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <button onClick={onClose} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
