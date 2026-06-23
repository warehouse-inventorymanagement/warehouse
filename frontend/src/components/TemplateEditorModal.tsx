import { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { settingsApi } from '../services/api';
import type { NotificationType, EmailTemplateData } from '../types';
import toast from 'react-hot-toast';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationType: NotificationType;
  notificationTitle: string;
}

function renderPreview(html: string, sampleData: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in sampleData ? sampleData[key] : match;
  });
}

export default function TemplateEditorModal({
  isOpen,
  onClose,
  notificationType,
  notificationTitle,
}: TemplateEditorModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [activeVariant, setActiveVariant] = useState<'immediate' | 'digest'>('immediate');
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  // Template data from API
  const [immediateData, setImmediateData] = useState<EmailTemplateData | null>(null);
  const [digestData, setDigestData] = useState<EmailTemplateData | null>(null);

  // Edited values
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');

  // Original values (for dirty detection)
  const [originalSubject, setOriginalSubject] = useState('');
  const [originalHtml, setOriginalHtml] = useState('');

  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  const currentData = activeVariant === 'immediate' ? immediateData : digestData;
  const hasDigest = digestData !== null;
  const isDirty = editedSubject !== originalSubject || editedHtml !== originalHtml;
  const isCustom = currentData?.isCustom ?? false;

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, notificationType]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const response = await settingsApi.getNotificationTemplates(notificationType);
      const data = response.data.data;

      if (data.immediate) {
        setImmediateData(data.immediate);
      }
      if (data.digest) {
        setDigestData(data.digest);
      }

      // Initialize editor with the active variant
      const active = data.immediate || data.digest;
      const variant = data.immediate ? 'immediate' : 'digest';
      setActiveVariant(variant as 'immediate' | 'digest');
      if (active) {
        setEditedSubject(active.subject);
        setEditedHtml(active.html);
        setOriginalSubject(active.subject);
        setOriginalHtml(active.html);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function switchVariant(variant: 'immediate' | 'digest') {
    if (variant === activeVariant) return;
    const data = variant === 'immediate' ? immediateData : digestData;
    if (!data) return;
    setActiveVariant(variant);
    setEditedSubject(data.subject);
    setEditedHtml(data.html);
    setOriginalSubject(data.subject);
    setOriginalHtml(data.html);
    setShowRevertConfirm(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsApi.updateNotificationTemplate(notificationType, {
        variant: activeVariant,
        subject: editedSubject,
        html: editedHtml,
      });
      toast.success('Template saved');
      // Re-fetch to update isCustom status
      await fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    try {
      await settingsApi.revertNotificationTemplate(notificationType, activeVariant);
      toast.success('Template reverted to default');
      setShowRevertConfirm(false);
      await fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revert template');
    } finally {
      setReverting(false);
    }
  }

  function insertVariable(variableName: string) {
    const textarea = htmlTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = `{{${variableName}}}`;
    const newHtml = editedHtml.substring(0, start) + text + editedHtml.substring(end);
    setEditedHtml(newHtml);
    // Restore cursor position after the inserted text
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
    });
  }

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
                className="w-full max-w-4xl transform rounded-2xl shadow-xl transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <div>
                    <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Edit Email Template
                    </Dialog.Title>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {notificationTitle}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover-bg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                  </div>
                ) : (
                  <>
                    {/* Variant Tabs */}
                    {hasDigest && (
                      <div className="flex gap-1 px-6 pt-4">
                        {(['immediate', 'digest'] as const).map((variant) => {
                          const data = variant === 'immediate' ? immediateData : digestData;
                          if (!data) return null;
                          return (
                            <button
                              key={variant}
                              onClick={() => switchVariant(variant)}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: activeVariant === variant
                                  ? 'color-mix(in srgb, var(--accent) 20%, transparent)'
                                  : 'transparent',
                                color: activeVariant === variant
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                              }}
                            >
                              {variant === 'immediate' ? 'Immediate' : 'Digest'}
                              {data.isCustom && (
                                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{
                                  backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                  color: 'var(--accent)',
                                }}>
                                  Custom
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      {/* Variable Reference */}
                      {currentData && (
                        <div className="rounded-lg border" style={{ borderColor: 'var(--bg-tertiary)' }}>
                          <button
                            type="button"
                            onClick={() => setShowVariables(!showVariables)}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {showVariables
                              ? <ChevronDownIcon className="w-4 h-4" />
                              : <ChevronRightIcon className="w-4 h-4" />}
                            Available Variables ({currentData.variables.length})
                          </button>
                          {showVariables && (
                            <div className="px-4 pb-3 flex flex-wrap gap-2">
                              {currentData.variables.map((v) => (
                                <button
                                  key={v.name}
                                  type="button"
                                  onClick={() => insertVariable(v.name)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
                                  style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                  }}
                                  title={`${v.description} — Click to insert`}
                                >
                                  <code style={{ color: 'var(--accent)' }}>{`{{${v.name}}}`}</code>
                                  <span style={{ color: 'var(--text-secondary)' }}>{v.description}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Subject Editor */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontFamily: "'Courier New', monospace",
                          }}
                          placeholder="Email subject with {{variables}}..."
                        />
                      </div>

                      {/* HTML Editor */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            HTML Body
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: showPreview
                                ? 'color-mix(in srgb, var(--accent) 20%, transparent)'
                                : 'var(--bg-tertiary)',
                              color: showPreview ? 'var(--accent)' : 'var(--text-secondary)',
                            }}
                          >
                            {showPreview
                              ? <><EyeSlashIcon className="w-3.5 h-3.5" /> Hide Preview</>
                              : <><EyeIcon className="w-3.5 h-3.5" /> Show Preview</>}
                          </button>
                        </div>
                        <textarea
                          ref={htmlTextareaRef}
                          value={editedHtml}
                          onChange={(e) => setEditedHtml(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontFamily: "'Courier New', monospace",
                            minHeight: '300px',
                            maxHeight: '500px',
                            lineHeight: '1.5',
                            tabSize: 2,
                          }}
                          spellCheck={false}
                          placeholder="<div>HTML email template with {{variables}}...</div>"
                        />
                      </div>

                      {/* Live Preview */}
                      {showPreview && currentData && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                            Preview (with sample data)
                          </label>
                          <div
                            className="rounded-lg border overflow-hidden"
                            style={{ borderColor: 'var(--bg-tertiary)' }}
                          >
                            <div className="px-3 py-1.5 text-xs" style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                            }}>
                              Subject: {renderPreview(editedSubject, currentData.sampleData)}
                            </div>
                            <iframe
                              srcDoc={renderPreview(editedHtml, currentData.sampleData)}
                              sandbox=""
                              style={{
                                width: '100%',
                                height: '400px',
                                border: 'none',
                                backgroundColor: '#ffffff',
                              }}
                              title="Email Preview"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      <div>
                        {isCustom && !showRevertConfirm && (
                          <button
                            type="button"
                            onClick={() => setShowRevertConfirm(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)',
                              color: '#ef4444',
                            }}
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                            Revert to Default
                          </button>
                        )}
                        {showRevertConfirm && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: '#ef4444' }}>
                              Reset to default template?
                            </span>
                            <button
                              type="button"
                              onClick={handleRevert}
                              disabled={reverting}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                              style={{ backgroundColor: '#ef4444', color: 'white' }}
                            >
                              {reverting ? 'Reverting...' : 'Yes, Revert'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowRevertConfirm(false)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={onClose}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={!isDirty || saving}
                          className="btn btn-primary flex items-center gap-2"
                          style={{
                            opacity: (!isDirty || saving) ? 0.5 : 1,
                          }}
                        >
                          {saving && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          )}
                          {saving ? 'Saving...' : 'Save Template'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
