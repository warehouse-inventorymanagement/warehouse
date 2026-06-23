import { useState, useEffect, useMemo } from 'react';
import { categoriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Category, IconSize } from '../types';
import IconPicker, { IconDisplay } from '../components/IconPicker';
import CategoryPicker from '../components/CategoryPicker';

export default function Categories() {
  const { isManager } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [iconSize, setIconSize] = useState<IconSize>('medium');
  const [iconColor, setIconColor] = useState('#FFFFFF');
  const [iconBackgroundColor, setIconBackgroundColor] = useState('#3B82F6');
  const [parentId, setParentId] = useState('');
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter out the current category being edited from parent selection options
  const filteredFlatCategories = useMemo(() => {
    if (!editingCategory) return flatCategories;
    return flatCategories.filter(c => c.id !== editingCategory.id);
  }, [flatCategories, editingCategory]);

  const filteredHierarchicalCategories = useMemo(() => {
    if (!editingCategory) return categories;
    const filterTree = (cats: Category[]): Category[] => {
      return cats
        .filter(c => c.id !== editingCategory.id)
        .map(c => ({
          ...c,
          children: c.children ? filterTree(c.children) : undefined
        }));
    };
    return filterTree(categories);
  }, [categories, editingCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [hierarchyRes, flatRes] = await Promise.all([
        categoriesApi.getAll(false),
        categoriesApi.getAll(true)
      ]);
      setCategories(hierarchyRes.data.data);
      setFlatCategories(flatRes.data.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || '');
      setIcon(category.icon || '');
      setIconSize(category.iconSize || 'medium');
      setIconColor(category.iconColor || '#FFFFFF');
      setIconBackgroundColor(category.iconBackgroundColor || '#3B82F6');
      setParentId(category.parentId || '');
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
      setIcon('');
      setIconSize('medium');
      setIconColor('#FFFFFF');
      setIconBackgroundColor('#3B82F6');
      setParentId('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name,
          description,
          icon: icon || null,
          iconSize,
          iconColor: icon ? iconColor : null,
          iconBackgroundColor: icon ? iconBackgroundColor : null,
          parentId: parentId || null
        });
        toast.success('Category updated');
      } else {
        const createData: any = { name };
        if (description) createData.description = description;
        if (icon) {
          createData.icon = icon;
          createData.iconSize = iconSize;
          if (iconColor) createData.iconColor = iconColor;
          if (iconBackgroundColor) createData.iconBackgroundColor = iconBackgroundColor;
        }
        if (parentId) createData.parentId = parentId;
        console.log('Creating category with data:', createData, 'iconBackgroundColor value:', iconBackgroundColor);
        await categoriesApi.create(createData);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error.response?.data || error.message || error);
      const errData = error.response?.data;
      if (errData?.errors?.length) {
        toast.error(`Validation failed: ${errData.errors.map((e: any) => `${e.path || e.param}: ${e.msg || e.message}`).join(', ')}`);
      } else {
        toast.error(errData?.message || 'Failed to save category');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoriesApi.delete(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
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

  const renderCategory = (category: Category, depth = 0, isFirst = false) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div
          className="flex items-center justify-between p-3 transition-colors"
          style={{
            paddingLeft: `${depth * 24 + 12}px`,
            borderLeft: depth > 0 ? '2px solid var(--bg-tertiary)' : undefined,
            borderTop: isFirst ? undefined : '1px solid color-mix(in srgb, var(--bg-tertiary) 60%, transparent)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(category.id)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ChevronRightIcon
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            {category.icon && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: category.iconBackgroundColor || 'var(--bg-tertiary)' }}
              >
                <IconDisplay icon={category.icon} size={category.iconSize || 'medium'} color={category.iconColor} />
              </div>
            )}
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{category.name}</p>
              {category.description && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{category.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{category._count?.items || 0} items</span>
            {isManager && (
              <>
                <button
                  onClick={() => openModal(category)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 10%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #ef4444 10%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, depth + 1))}
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Categories</h1>
        {isManager && (
          <button onClick={() => openModal()} className="btn btn-primary flex items-center">
            <PlusIcon className="w-5 h-5 mr-1" />
            Add Category
          </button>
        )}
      </div>

      <div className="card" style={{ borderColor: 'var(--bg-tertiary)' }}>
        {categories.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            No categories yet
          </div>
        ) : (
          <div style={{ borderColor: 'var(--bg-tertiary)' }}>
            {categories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingCategory ? 'Edit Category' : 'New Category'}
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
                  />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Parent Category</label>
                <CategoryPicker
                  value={parentId}
                  onChange={setParentId}
                  categories={filteredFlatCategories}
                  hierarchicalCategories={filteredHierarchicalCategories}
                  placeholder="None (root level)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
