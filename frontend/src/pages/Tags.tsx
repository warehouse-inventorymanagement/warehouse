import { useState, useEffect } from 'react';
import { tagsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Tag, IconSize } from '../types';
import IconPicker, { IconDisplay } from '../components/IconPicker';
import ColorPicker from '../components/ColorPicker';

export default function Tags() {
  const { isManager } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('');
  const [iconSize, setIconSize] = useState<IconSize>('medium');
  const [iconColor, setIconColor] = useState('#FFFFFF');
  const [iconBackgroundColor, setIconBackgroundColor] = useState('#3B82F680');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await tagsApi.getAll();
      setTags(response.data.data);
    } catch (error) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setName(tag.name);
      setColor(tag.color);
      setIcon(tag.icon || '');
      setIconSize(tag.iconSize || 'medium');
      setIconColor(tag.iconColor || '#FFFFFF');
      setIconBackgroundColor(tag.iconBackgroundColor || '#3B82F680');
    } else {
      setEditingTag(null);
      setName('');
      setColor('#3B82F6');
      setIcon('');
      setIconSize('medium');
      setIconColor('#FFFFFF');
      setIconBackgroundColor('#3B82F680');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, {
          name,
          color,
          icon: icon || null,
          iconSize,
          iconColor: icon ? iconColor : null,
          iconBackgroundColor: icon ? iconBackgroundColor : null
        });
        toast.success('Tag updated');
      } else {
        await tagsApi.create({
          name,
          color,
          icon: icon || undefined,
          iconSize,
          iconColor: icon ? iconColor : undefined,
          iconBackgroundColor: icon ? iconBackgroundColor : undefined
        });
        toast.success('Tag created');
      }
      setShowModal(false);
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await tagsApi.delete(id);
      toast.success('Tag deleted');
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tags</h1>
        {isManager && (
          <button onClick={() => openModal()} className="btn btn-primary flex items-center">
            <PlusIcon className="w-5 h-5 mr-1" />
            Add Tag
          </button>
        )}
      </div>

      <p style={{ color: 'var(--text-secondary)' }}>
        Use tags to organize and filter your inventory items.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.length === 0 ? (
          <div className="col-span-full card p-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            No tags yet
          </div>
        ) : (
          tags.map(tag => (
            <div key={tag.id} className="card p-4 border-l-4" style={{ borderLeftColor: tag.color }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {tag.icon ? (
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: tag.iconBackgroundColor || tag.color }}
                    >
                      <IconDisplay icon={tag.icon} size="small" color={tag.iconColor || '#FFFFFF'} />
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{tag.name}</span>
                </div>
                {isManager && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(tag)}
                      className="p-1 text-gray-500 hover:text-primary hover:bg-primary/10 rounded"
                      title="Edit tag"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      disabled={(tag._count?.items || 0) > 0}
                      className={`p-1 rounded ${
                        (tag._count?.items || 0) > 0
                          ? 'cursor-not-allowed'
                          : 'hover:text-red-600 hover:bg-red-500/10'
                      }`}
                      style={(tag._count?.items || 0) > 0 ? { color: 'var(--text-secondary)', opacity: 0.5 } : { color: 'var(--text-secondary)' }}
                      title={(tag._count?.items || 0) > 0 ? 'Remove tag from all items before deleting' : 'Delete tag'}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {tag._count?.items || 0} items
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingTag ? 'Edit Tag' : 'New Tag'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <IconPicker
                  value={icon}
                  onChange={setIcon}
                  color={iconColor}
                  onColorChange={setIconColor}
                  backgroundColor={iconBackgroundColor}
                  onBackgroundColorChange={setIconBackgroundColor}
                  size={iconSize}
                  onSizeChange={setIconSize}
                  showSizeSelector
                  showColorPicker
                />
                <div className="flex-1">
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    required
                    placeholder="e.g., Urgent, Sale, New"
                  />
                </div>
              </div>
              <div>
                <ColorPicker
                  value={color}
                  onChange={setColor}
                  shape="circle"
                  size="md"
                  label="Tag Color"
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Preview:</span>
                <span
                  className="px-3 py-1.5 rounded-full text-sm text-white flex items-center gap-1.5 font-medium"
                  style={{ backgroundColor: color }}
                >
                  {icon && (
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center -ml-1"
                      style={{ backgroundColor: iconBackgroundColor }}
                    >
                      <IconDisplay icon={icon} size={12} color={iconColor} />
                    </span>
                  )}
                  {name || 'Tag name'}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingTag ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
