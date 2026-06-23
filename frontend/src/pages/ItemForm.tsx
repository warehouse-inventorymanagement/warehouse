import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { itemsApi, categoriesApi, locationsApi, tagsApi, templatesApi } from '../services/api';
import { useBranding } from '../context/BrandingContext';
import toast from 'react-hot-toast';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeftIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  CubeIcon,
  TagIcon,
  MapPinIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CheckIcon,
  SparklesIcon,
  ScissorsIcon,
  StarIcon,
  ArrowUturnLeftIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import ImageCropModal from '../components/ImageCropModal';
import LocationPicker from '../components/LocationPicker';
import CategoryPicker from '../components/CategoryPicker';
import ColorPicker from '../components/ColorPicker';
import { Icon } from '@iconify/react';
import type { Category, Location, Tag, AttributeTemplate, ItemTemplate, ItemTemplateField } from '../types';

// Step indicator component
function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              index < currentStep
                ? 'text-white'
                : index === currentStep
                ? 'text-white'
                : ''
            }`}
            style={{
              backgroundColor: index <= currentStep ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: index <= currentStep ? 'white' : 'var(--text-secondary)',
            }}
          >
            {index < currentStep ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <span
            className="ml-2 text-sm hidden sm:inline"
            style={{ color: index === currentStep ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {step}
          </span>
          {index < steps.length - 1 && (
            <div
              className="w-8 sm:w-12 h-0.5 mx-2"
              style={{
                backgroundColor: index < currentStep ? 'var(--accent)' : 'var(--bg-tertiary)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SortableImageItem({ img, children }: { img: { id: string }; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export default function ItemForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentItemId = searchParams.get('parentItemId');
  const isEdit = Boolean(id);
  const { theme } = useBranding();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [hierarchicalLocations, setHierarchicalLocations] = useState<Location[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ItemTemplate | null>(null);
  const [, setAttributeTemplates] = useState<AttributeTemplate[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [trackSerialNumbers, setTrackSerialNumbers] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<{ name: string; value: string }[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; filename: string; backgroundColor?: string; isPrimary?: boolean }[]>([]);
  const [is360Set, setIs360Set] = useState(false);
  const [existingModel3D, setExistingModel3D] = useState<{ id: string; filename: string; originalName: string; size: number } | null>(null);
  const [deletedImages, setDeletedImages] = useState<{ id: string; filename: string; originalName: string; deletedAt: string; deletedBy?: { username: string } | null }[]>([]);
  const [showDeletedImages, setShowDeletedImages] = useState(false);
  const [parentItemName, setParentItemName] = useState<string>('');

  // Duplicate detection state
  const [duplicateNameMatches, setDuplicateNameMatches] = useState<{ id: string; name: string; sku: string | null }[]>([]);
  const [duplicateSkuMatch, setDuplicateSkuMatch] = useState<{ id: string; name: string; sku: string | null } | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const duplicateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [cropExistingImageId, setCropExistingImageId] = useState<string | null>(null);
  const [cropImageType, setCropImageType] = useState<string>('image/png');

  const steps = ['Template', 'Details', 'Attributes', 'Images'];

  // Drag-and-drop for image reordering
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;
    const oldIndex = existingImages.findIndex(img => img.id === active.id);
    const newIndex = existingImages.findIndex(img => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...existingImages];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setExistingImages(reordered);
    try {
      await itemsApi.reorderImages(id, reordered.map(img => img.id));
    } catch {
      setExistingImages(existingImages); // revert on error
      toast.error('Failed to reorder images');
    }
  }, [existingImages, id]);

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchItem();
      setCurrentStep(1); // Skip template step when editing
    }
    // Fetch parent item name if creating as sub-item
    if (parentItemId) {
      itemsApi.getOne(parentItemId).then(res => {
        setParentItemName(res.data.data.name);
      }).catch(() => {});
    }
  }, [id, parentItemId]);

  useEffect(() => {
    if (categoryId) {
      fetchAttributeTemplates(categoryId);
    } else {
      setAttributeTemplates([]);
    }
  }, [categoryId]);

  // Debounced duplicate detection
  useEffect(() => {
    setDuplicateDismissed(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    if (!name.trim() && !sku.trim()) {
      setDuplicateNameMatches([]);
      setDuplicateSkuMatch(null);
      return;
    }
    duplicateTimerRef.current = setTimeout(async () => {
      try {
        const res = await itemsApi.checkDuplicates({
          name: name.trim() || undefined,
          sku: sku.trim() || undefined,
          excludeId: id || undefined,
        });
        setDuplicateNameMatches(res.data.data.nameMatches);
        setDuplicateSkuMatch(res.data.data.skuMatch);
      } catch {
        // silently ignore
      }
    }, 400);
    return () => { if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current); };
  }, [name, sku, id]);

  const fetchOptions = async () => {
    const [catFlatRes, catHierRes, locFlatRes, locHierRes, tagRes, tplRes] = await Promise.all([
      categoriesApi.getAll(true),  // Flat list
      categoriesApi.getAll(false), // Hierarchical
      locationsApi.getAll(true),   // Flat list
      locationsApi.getAll(false),  // Hierarchical
      tagsApi.getAll(),
      templatesApi.getAll()
    ]);
    setCategories(catFlatRes.data.data);
    setHierarchicalCategories(catHierRes.data.data);
    setLocations(locFlatRes.data.data);
    setHierarchicalLocations(locHierRes.data.data);
    setAllTags(tagRes.data.data);
    setTemplates(tplRes.data.data.filter((t: ItemTemplate) => t.isActive));
  };

  // Load template details when templateId changes
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      setSelectedTemplate(null);
    }
  }, [templateId]);

  const loadTemplate = async (tplId: string) => {
    try {
      const response = await templatesApi.getOne(tplId);
      const tpl = response.data.data;
      setSelectedTemplate(tpl);

      if (tpl.fields) {
        if (!isEdit) {
          // Creating new item: populate all template fields with defaults
          const templateAttrs = tpl.fields.map((field: ItemTemplateField) => ({
            name: field.fieldName,
            value: field.defaultValue || ''
          }));
          setAttributes(templateAttrs);
        } else {
          // Editing existing item: merge template fields with existing attributes
          // This ensures empty template fields appear in the form
          setAttributes(prev => {
            const existingMap = new Map(prev.map(a => [a.name, a.value]));
            const merged: { name: string; value: string }[] = [];

            // First add all template fields (preserving existing values)
            if (tpl.fields) {
              tpl.fields.forEach((field: ItemTemplateField) => {
                merged.push({
                  name: field.fieldName,
                  value: existingMap.get(field.fieldName) ?? field.defaultValue ?? ''
                });
              });
            }

            // Then add any custom attributes that aren't template fields
            const templateFieldNames = new Set((tpl.fields || []).map((f: ItemTemplateField) => f.fieldName));
            prev.forEach(attr => {
              if (!templateFieldNames.has(attr.name)) {
                merged.push(attr);
              }
            });

            return merged;
          });
        }
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const fetchItem = async () => {
    if (!id) return;
    try {
      const response = await itemsApi.getOne(id);
      const item = response.data.data;
      setName(item.name);
      setSku(item.sku || '');
      setDescription(item.description || '');
      setCategoryId(item.categoryId || '');
      setLocationId(item.locationId || '');
      setTemplateId(item.templateId || '');
      setQuantity(item.quantity);
      setMinQuantity(item.minQuantity);
      setPrice(item.price != null ? String(item.price) : '');
      setCurrency(item.currency || '');
      setTrackSerialNumbers(item.trackSerialNumbers || false);
      setSelectedTags(item.tags.map((t: Tag) => t.id));
      setAttributes(item.attributes.map((a: any) => ({ name: a.attributeName, value: a.attributeValue })));
      setExistingImages(item.images.map((img: any) => ({ id: img.id, filename: img.filename, backgroundColor: img.backgroundColor, isPrimary: img.isPrimary })));
      setIs360Set(item.is360Set || false);
      if (item.model3d) {
        setExistingModel3D({ id: item.model3d.id, filename: item.model3d.filename, originalName: item.model3d.originalName, size: item.model3d.size });
      }
      // Fetch deleted images
      try {
        const deletedRes = await itemsApi.getDeletedImages(id);
        setDeletedImages(deletedRes.data.data || []);
      } catch { /* ignore if endpoint not available */ }
    } catch (error) {
      toast.error('Failed to load item');
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributeTemplates = async (catId: string) => {
    try {
      const response = await categoriesApi.getAttributes(catId);
      setAttributeTemplates(response.data.data);

      // Add missing attributes from templates
      const templateNames = response.data.data.map(t => t.attributeName);
      setAttributes(prev => {
        const existingNames = prev.map(a => a.name);
        const newAttrs = templateNames
          .filter(name => !existingNames.includes(name))
          .map(name => ({ name, value: '' }));
        return [...prev, ...newAttrs];
      });
    } catch (error) {
      console.error('Failed to fetch attribute templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name,
        sku: sku || undefined,
        description: description || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        templateId: templateId || undefined,
        quantity: isEdit ? undefined : quantity,
        minQuantity,
        price: price ? parseFloat(price) : undefined,
        currency: currency || undefined,
        trackSerialNumbers,
        tags: selectedTags,
        attributes: attributes.filter(a => a.value)
      };

      let itemId = id;

      if (isEdit) {
        await itemsApi.update(id!, data);
      } else {
        const response = await itemsApi.create(data);
        itemId = response.data.data.id;
      }

      // Upload new images
      if (images.length > 0 && itemId) {
        await itemsApi.uploadImages(itemId, images);
      }

      // If creating as sub-item, link to parent
      if (!isEdit && parentItemId && itemId) {
        try {
          await itemsApi.addSubItem(parentItemId, { childItemId: itemId });
          toast.success('Item created and linked as sub-item');
          navigate(`/items/${parentItemId}`);
          return;
        } catch (error) {
          console.error('Failed to link as sub-item:', error);
          toast.success('Item created (but failed to link as sub-item)');
        }
      } else {
        toast.success(isEdit ? 'Item updated' : 'Item created');
      }
      navigate(`/items/${itemId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string) => {
    if (!id) return;
    try {
      const img = existingImages.find(i => i.id === imageId);
      await itemsApi.deleteImage(id, imageId);
      setExistingImages(prev => prev.filter(i => i.id !== imageId));
      if (img) {
        setDeletedImages(prev => [{ id: img.id, filename: img.filename, originalName: img.filename, deletedAt: new Date().toISOString(), deletedBy: null }, ...prev]);
      }
      toast.success('Image moved to quarantine');
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  const restoreDeletedImage = async (imageId: string) => {
    if (!id) return;
    try {
      await itemsApi.restoreImage(id, imageId);
      const img = deletedImages.find(i => i.id === imageId);
      setDeletedImages(prev => prev.filter(i => i.id !== imageId));
      if (img) {
        setExistingImages(prev => [...prev, { id: img.id, filename: img.filename, isPrimary: false }]);
      }
      toast.success('Image restored');
    } catch (error) {
      toast.error('Failed to restore image');
    }
  };

  const updateImageBackground = async (imageId: string, backgroundColor: string | null) => {
    if (!id) return;
    try {
      await itemsApi.updateImageBackground(id, imageId, backgroundColor);
      setExistingImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, backgroundColor: backgroundColor || undefined } : img
      ));
    } catch (error) {
      toast.error('Failed to update image background');
    }
  };

  const setAsPrimaryImage = async (imageId: string) => {
    if (!id) return;
    try {
      await itemsApi.setPrimaryImage(id, imageId);
      setExistingImages(prev => prev.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      })));
      toast.success('Primary image updated');
    } catch (error) {
      toast.error('Failed to set primary image');
    }
  };

  // Crop handlers
  const openCropModal = (imageSrc: string, imageIndex: number | null, existingImageId: string | null, imageType: string = 'image/png') => {
    setCropImageSrc(imageSrc);
    setCropImageIndex(imageIndex);
    setCropExistingImageId(existingImageId);
    setCropImageType(imageType);
    setCropModalOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Determine file extension based on type
    const ext = cropImageType === 'image/jpeg' ? '.jpg' : '.png';

    if (cropImageIndex !== null) {
      // Cropping a new image (not yet uploaded)
      const originalName = images[cropImageIndex].name;
      const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
      const croppedFile = new File([croppedBlob], baseName + ext, {
        type: cropImageType,
      });
      setImages(prev => prev.map((img, i) => i === cropImageIndex ? croppedFile : img));
      toast.success('Image cropped');
    } else if (cropExistingImageId && id) {
      // Cropping an existing image - need to re-upload
      const formData = new FormData();
      const originalFilename = existingImages.find(img => img.id === cropExistingImageId)?.filename || 'cropped';
      const baseName = originalFilename.replace(/\.[^/.]+$/, '');
      const croppedFile = new File([croppedBlob], baseName + ext, { type: cropImageType });
      formData.append('images', croppedFile);
      formData.append('replaceImageId', cropExistingImageId);

      try {
        const response = await itemsApi.uploadImages(id, [croppedFile]);
        // Remove old image and add new one
        if (response.data.data && response.data.data.length > 0) {
          await itemsApi.deleteImage(id, cropExistingImageId);
          const newImage = response.data.data[0];
          setExistingImages(prev => prev.map(img =>
            img.id === cropExistingImageId ? { ...newImage, backgroundColor: img.backgroundColor } : img
          ));
          toast.success('Image cropped and saved');
        }
      } catch (error) {
        toast.error('Failed to save cropped image');
      }
    }
    setCropModalOpen(false);
    setCropImageSrc('');
    setCropImageIndex(null);
    setCropExistingImageId(null);
  };

  const updateAttribute = (index: number, field: 'name' | 'value', val: string) => {
    setAttributes(prev => prev.map((attr, i) => i === index ? { ...attr, [field]: val } : attr));
  };

  const addAttribute = () => {
    setAttributes(prev => [...prev, { name: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const selectTemplate = (tpl: ItemTemplate | null) => {
    if (tpl) {
      setTemplateId(tpl.id);
    } else {
      setTemplateId('');
      setSelectedTemplate(null);
      setAttributes([]);
    }
    setCurrentStep(1);
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return name.trim().length > 0;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to={isEdit ? `/items/${id}` : (parentItemId ? `/items/${parentItemId}` : '/items')}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <ArrowLeftIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            <CubeIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Item' : 'New Item'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isEdit ? 'Update item details' : 'Add a new item to your inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-item indicator */}
      {parentItemId && parentItemName && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)'
          }}
        >
          <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
            <LinkIcon className="w-5 h-5" />
            <span>
              Creating as sub-item of{' '}
              <Link to={`/items/${parentItemId}`} className="font-medium hover:underline">
                {parentItemName}
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Step Indicator - only show when not editing */}
      {!isEdit && <StepIndicator steps={steps} currentStep={currentStep} />}

      <form onSubmit={handleSubmit}>
        {/* Step 0: Template Selection */}
        {currentStep === 0 && !isEdit && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}
              >
                <DocumentDuplicateIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Choose a Template
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Templates pre-fill fields and organize your items
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {/* No Template Option */}
              <button
                type="button"
                onClick={() => selectTemplate(null)}
                className="p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]"
                style={{
                  borderColor: !templateId ? 'var(--accent)' : 'var(--bg-tertiary)',
                  backgroundColor: !templateId ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-secondary)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <CubeIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  No Template
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Start from scratch
                </p>
              </button>

              {/* Template Options */}
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl)}
                  className="p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]"
                  style={{
                    borderColor: templateId === tpl.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                    backgroundColor: templateId === tpl.id ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-secondary)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: tpl.iconBackgroundColor || 'color-mix(in srgb, var(--accent) 20%, transparent)',
                    }}
                  >
                    {tpl.icon ? (
                      <Icon
                        icon={tpl.icon}
                        className="w-5 h-5"
                        style={{ color: tpl.iconColor || 'var(--accent)' }}
                      />
                    ) : (
                      <DocumentDuplicateIcon className="w-5 h-5" style={{ color: tpl.iconColor || 'var(--accent)' }} />
                    )}
                  </div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {tpl.name}
                  </p>
                  {tpl.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {tpl.description}
                    </p>
                  )}
                  {tpl._count?.fields && tpl._count.fields > 0 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                      {tpl._count.fields} fields
                    </p>
                  )}
                </button>
              ))}
            </div>

            {templates.length === 0 && (
              <div
                className="text-center py-8 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <SparklesIcon className="w-10 h-10 mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>No templates available</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Create templates in Settings to speed up item creation
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Selected Template Badge */}
            {selectedTemplate && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                {selectedTemplate.icon && (
                  <Icon icon={selectedTemplate.icon} className="w-4 h-4" />
                )}
                Using template: {selectedTemplate.name}
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="ml-1 hover:opacity-70"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Basic Info Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 20%, transparent)' }}
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Basic Information
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Enter the essential details for this item
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label" style={{ color: theme.textPrimary }}>Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div>
                  <label className="label" style={{ color: theme.textPrimary }}>SKU / Part Number</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="input"
                    placeholder="e.g., ABC-12345"
                  />
                </div>

                {/* Duplicate detection warning */}
                {!duplicateDismissed && (duplicateNameMatches.length > 0 || duplicateSkuMatch) && (
                  <div className="md:col-span-2 rounded-lg p-3 border" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <DocumentDuplicateIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#eab308' }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#eab308' }}>Potential duplicates found</p>
                          {duplicateSkuMatch && (
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              SKU "{sku}" is already used by{' '}
                              <Link to={`/items/${duplicateSkuMatch.id}`} className="underline" style={{ color: 'var(--accent)' }}>
                                {duplicateSkuMatch.name}
                              </Link>
                            </p>
                          )}
                          {duplicateNameMatches.length > 0 && (
                            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              <span>Similar items: </span>
                              {duplicateNameMatches.map((item, i) => (
                                <span key={item.id}>
                                  {i > 0 && ', '}
                                  <Link to={`/items/${item.id}`} className="underline" style={{ color: 'var(--accent)' }}>
                                    {item.name}
                                  </Link>
                                  {item.sku && <span className="opacity-60"> ({item.sku})</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDuplicateDismissed(true)}
                        className="flex-shrink-0 ml-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label flex items-center gap-2" style={{ color: theme.textPrimary }}>
                    <Squares2X2Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    Category
                  </label>
                  <CategoryPicker
                    value={categoryId}
                    onChange={setCategoryId}
                    categories={categories}
                    hierarchicalCategories={hierarchicalCategories}
                    placeholder="Select category"
                  />
                </div>

                {isEdit && (
                  <div>
                    <label className="label flex items-center gap-2" style={{ color: theme.textPrimary }}>
                      <DocumentDuplicateIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      Template
                    </label>
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="input"
                    >
                      <option value="">No template</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label flex items-center gap-2" style={{ color: theme.textPrimary }}>
                    <MapPinIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    Location
                  </label>
                  <LocationPicker
                    value={locationId}
                    onChange={setLocationId}
                    locations={locations}
                    hierarchicalLocations={hierarchicalLocations}
                    placeholder="Select location"
                  />
                </div>

                {!isEdit && (
                  <div>
                    <label className="label" style={{ color: theme.textPrimary }}>Initial Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="input"
                      min="0"
                    />
                  </div>
                )}

                <div>
                  <label className="label" style={{ color: theme.textPrimary }}>Minimum Quantity (for alerts)</label>
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 0)}
                    className="input"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label" style={{ color: theme.textPrimary }}>Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="label" style={{ color: theme.textPrimary }}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input"
                  >
                    <option value="">Default</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="KRW">KRW - South Korean Won</option>
                    <option value="BRL">BRL - Brazilian Real</option>
                    <option value="MXN">MXN - Mexican Peso</option>
                    <option value="SEK">SEK - Swedish Krona</option>
                    <option value="NOK">NOK - Norwegian Krone</option>
                    <option value="DKK">DKK - Danish Krone</option>
                    <option value="PLN">PLN - Polish Zloty</option>
                    <option value="TRY">TRY - Turkish Lira</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="HKD">HKD - Hong Kong Dollar</option>
                    <option value="NZD">NZD - New Zealand Dollar</option>
                    <option value="THB">THB - Thai Baht</option>
                    <option value="ILS">ILS - Israeli Shekel</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackSerialNumbers}
                      onChange={(e) => setTrackSerialNumbers(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>Track Serial Numbers</span>
                  </label>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Enable to track individual units with unique serial numbers
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="label" style={{ color: theme.textPrimary }}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Add a description..."
                  />
                </div>
              </div>
            </div>

            {/* Tags Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}
                >
                  <TagIcon className="w-5 h-5" style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Tags
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Add tags to help organize and filter items
                  </p>
                </div>
              </div>

              {allTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(t => t !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'var(--bg-tertiary)',
                        color: selectedTags.includes(tag.id) ? 'white' : 'var(--text-primary)',
                        border: `2px solid ${selectedTags.includes(tag.id) ? tag.color : 'transparent'}`,
                      }}
                    >
                      {selectedTags.includes(tag.id) && (
                        <CheckIcon className="w-3 h-3" />
                      )}
                      {tag.icon && (
                        <Icon
                          icon={tag.icon}
                          className="w-4 h-4"
                          style={{ color: tag.iconColor || 'currentColor' }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No tags available. Create tags in the Tags section.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Attributes */}
        {currentStep === 2 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate ? `${selectedTemplate.name} Fields` : 'Custom Attributes'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedTemplate ? 'Fill in the template fields' : 'Add custom attributes to this item'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addAttribute}
                className="btn btn-secondary text-sm"
              >
                Add Attribute
              </button>
            </div>

            {attributes.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <ClipboardDocumentListIcon
                  className="w-10 h-10 mx-auto mb-3 opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <p style={{ color: 'var(--text-secondary)' }}>No attributes yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Click "Add Attribute" to add custom fields
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group template fields by fieldGroup */}
                {(() => {
                  // Separate template fields and custom attributes
                  const templateFields = selectedTemplate?.fields || [];
                  const templateFieldNames = templateFields.map(f => f.fieldName);
                  const customAttrs = attributes.filter(a => !templateFieldNames.includes(a.name));

                  // Group template fields
                  const groups: { [key: string]: typeof templateFields } = {};
                  const ungroupedFields: typeof templateFields = [];

                  templateFields.forEach(field => {
                    if (field.fieldGroup) {
                      if (!groups[field.fieldGroup]) {
                        groups[field.fieldGroup] = [];
                      }
                      groups[field.fieldGroup].push(field);
                    } else {
                      ungroupedFields.push(field);
                    }
                  });

                  const renderField = (attr: { name: string; value: string }, index: number) => {
                    const templateField = templateFields.find(f => f.fieldName === attr.name);
                    const fieldType = templateField?.fieldType || 'text';
                    const isRequired = templateField?.isRequired || false;
                    const placeholder = templateField?.placeholder || '';
                    const helpText = templateField?.helpText;
                    const prefix = templateField?.prefix;
                    const suffix = templateField?.suffix;
                    const minValue = templateField?.minValue;
                    const maxValue = templateField?.maxValue;
                    const pattern = templateField?.pattern;

                    const inputElement = (() => {
                      if (fieldType === 'select' && templateField?.options) {
                        return (
                          <select
                            value={attr.value}
                            onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                            className="input"
                            required={isRequired}
                          >
                            <option value="">{placeholder || 'Select...'}</option>
                            {JSON.parse(templateField.options).map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      }

                      if (fieldType === 'boolean') {
                        return (
                          <div className="flex items-center gap-2 h-10">
                            <input
                              type="checkbox"
                              checked={attr.value === 'true'}
                              onChange={(e) => updateAttribute(index, 'value', e.target.checked ? 'true' : 'false')}
                              className="w-5 h-5 rounded"
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>
                              {attr.value === 'true' ? 'Yes' : 'No'}
                            </span>
                          </div>
                        );
                      }

                      if (fieldType === 'date') {
                        return (
                          <input
                            type="date"
                            value={attr.value}
                            onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                            className="input"
                            required={isRequired}
                          />
                        );
                      }

                      if (fieldType === 'number') {
                        const numberInput = (
                          <input
                            type="number"
                            value={attr.value}
                            onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                            className={`input ${prefix || suffix ? 'flex-1' : ''}`}
                            placeholder={placeholder}
                            required={isRequired}
                            min={minValue}
                            max={maxValue}
                          />
                        );

                        if (prefix || suffix) {
                          return (
                            <div className="flex items-center gap-2">
                              {prefix && (
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                  {prefix}
                                </span>
                              )}
                              {numberInput}
                              {suffix && (
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                  {suffix}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return numberInput;
                      }

                      if (fieldType === 'url') {
                        return (
                          <input
                            type="url"
                            value={attr.value}
                            onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                            className="input"
                            placeholder={placeholder || 'https://...'}
                            required={isRequired}
                          />
                        );
                      }

                      if (fieldType === 'unit' && templateField?.unitOptions) {
                        return (
                          <div className="flex gap-2">
                            {prefix && (
                              <span className="flex items-center text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                {prefix}
                              </span>
                            )}
                            <input
                              type="number"
                              value={(() => {
                                try {
                                  const parsed = JSON.parse(attr.value);
                                  return parsed.value || '';
                                } catch { return attr.value; }
                              })()}
                              onChange={(e) => {
                                try {
                                  const current = JSON.parse(attr.value || '{}');
                                  updateAttribute(index, 'value', JSON.stringify({ ...current, value: e.target.value }));
                                } catch {
                                  updateAttribute(index, 'value', JSON.stringify({ value: e.target.value, unit: '' }));
                                }
                              }}
                              className="input flex-1"
                              placeholder={placeholder}
                              required={isRequired}
                              min={minValue}
                              max={maxValue}
                            />
                            <select
                              value={(() => {
                                try {
                                  const parsed = JSON.parse(attr.value);
                                  return parsed.unit || '';
                                } catch { return ''; }
                              })()}
                              onChange={(e) => {
                                try {
                                  const current = JSON.parse(attr.value || '{}');
                                  updateAttribute(index, 'value', JSON.stringify({ ...current, unit: e.target.value }));
                                } catch {
                                  updateAttribute(index, 'value', JSON.stringify({ value: '', unit: e.target.value }));
                                }
                              }}
                              className="input w-24"
                            >
                              <option value="">Unit</option>
                              {JSON.parse(templateField.unitOptions).map((unit: string) => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // Default: text field
                      const textInput = (
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                          className={`input ${prefix || suffix ? 'flex-1' : ''}`}
                          placeholder={placeholder || 'Enter value'}
                          required={isRequired}
                          pattern={pattern}
                        />
                      );

                      if (prefix || suffix) {
                        return (
                          <div className="flex items-center gap-2">
                            {prefix && (
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                {prefix}
                              </span>
                            )}
                            {textInput}
                            {suffix && (
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                {suffix}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return textInput;
                    })();

                    return (
                      <div
                        key={index}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            {templateField ? (
                              <label className="label flex items-center gap-1" style={{ color: theme.textPrimary }}>
                                {attr.name}
                                {isRequired && <span className="text-red-500">*</span>}
                              </label>
                            ) : (
                              <input
                                type="text"
                                value={attr.name}
                                onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                                placeholder="Attribute name"
                                className="input mb-2"
                              />
                            )}

                            {inputElement}

                            {helpText && (
                              <p className="text-xs mt-1.5" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                                {helpText}
                              </p>
                            )}
                          </div>

                          {!templateField && (
                            <button
                              type="button"
                              onClick={() => removeAttribute(index)}
                              className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-500 mt-6"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Grouped Fields */}
                      {Object.entries(groups).map(([groupName, fields]) => (
                        <div key={groupName}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon icon="mdi:folder-outline" className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                              {groupName}
                            </h3>
                          </div>
                          <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                            <div className="space-y-3 pl-4">
                              {fields.map(field => {
                                const attrIndex = attributes.findIndex(a => a.name === field.fieldName);
                                if (attrIndex === -1) return null;
                                return renderField(attributes[attrIndex], attrIndex);
                              })}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Ungrouped Template Fields */}
                      {ungroupedFields.length > 0 && (
                        <div className="space-y-3">
                          {ungroupedFields.map(field => {
                            const attrIndex = attributes.findIndex(a => a.name === field.fieldName);
                            if (attrIndex === -1) return null;
                            return renderField(attributes[attrIndex], attrIndex);
                          })}
                        </div>
                      )}

                      {/* Custom Attributes */}
                      {customAttrs.length > 0 && (
                        <div>
                          {(Object.keys(groups).length > 0 || ungroupedFields.length > 0) && (
                            <div className="flex items-center gap-2 mb-3">
                              <Icon icon="mdi:tune" className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                                Custom Attributes
                              </h3>
                            </div>
                          )}
                          <div className="space-y-3">
                            {customAttrs.map(attr => {
                              const attrIndex = attributes.findIndex(a => a.name === attr.name && !templateFieldNames.includes(a.name));
                              if (attrIndex === -1) return null;
                              return renderField(attr, attrIndex);
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Suggested Sub-Items */}
            {selectedTemplate?.suggestedItems && selectedTemplate.suggestedItems.length > 0 && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Suggested Sub-Items
                  </h3>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  These items are commonly associated with {selectedTemplate.name}. You can add them after creating this item.
                </p>
                <div className="space-y-2">
                  {selectedTemplate.suggestedItems.map((suggested) => (
                    <div
                      key={suggested.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      {suggested.suggestedTemplate?.icon && (
                        <Icon
                          icon={suggested.suggestedTemplate.icon}
                          className="w-5 h-5"
                          style={{ color: suggested.suggestedTemplate.iconColor || 'var(--text-secondary)' }}
                        />
                      )}
                      <div className="flex-1">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {suggested.suggestedTemplate?.name}
                        </span>
                        {suggested.quantityRequired > 1 && (
                          <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            x{suggested.quantityRequired}
                          </span>
                        )}
                        {suggested.description && (
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {suggested.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Images */}
        {currentStep === 3 && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}
              >
                <PhotoIcon className="w-5 h-5" style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Images
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Upload photos of this item
                </p>
              </div>
            </div>

            {/* Existing images (drag to reorder) */}
            {existingImages.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={existingImages.map(img => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6 pt-2">
                {existingImages.map((img) => (
                  <SortableImageItem key={img.id} img={img}>
                  <div
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing"
                    style={{
                      backgroundColor: img.backgroundColor || 'var(--bg-tertiary)',
                      borderColor: img.isPrimary ? 'var(--accent)' : 'var(--bg-tertiary)',
                    }}
                  >
                    <img
                      src={`/uploads/${img.filename}`}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                    {/* Primary badge */}
                    {img.isPrimary && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white flex items-center gap-1">
                        <StarIconSolid className="w-3 h-3" />
                        Primary
                      </div>
                    )}
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-2">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setAsPrimaryImage(img.id)}
                            className="p-2 rounded-lg bg-white/20 hover:bg-yellow-500 text-white transition-colors"
                            title="Set as primary"
                          >
                            <StarIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openCropModal(`/uploads/${img.filename}`, null, img.id, img.filename.toLowerCase().endsWith('.jpg') || img.filename.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png')}
                          className="p-2 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors"
                          title="Crop"
                        >
                          <ScissorsIcon className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(img.id)}
                          className="p-2 rounded-lg bg-white/20 hover:bg-red-500 text-white transition-colors"
                          title="Delete"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      {/* Background color picker */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateImageBackground(img.id, null);
                          }}
                          className={`w-7 h-7 rounded-lg transition-all ${
                            !img.backgroundColor
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-black/60'
                              : 'hover:ring-2 hover:ring-white/50'
                          }`}
                          style={{
                            background: 'repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 8px 8px'
                          }}
                          title="Transparent"
                        />
                        <div onClick={(e) => e.stopPropagation()}>
                          <ColorPicker
                            value={img.backgroundColor || '#ffffff'}
                            onChange={(color) => updateImageBackground(img.id, color)}
                            size="sm"
                            shape="square"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  </SortableImageItem>
                ))}
              </div>
              </SortableContext>
              </DndContext>
            )}

            {/* New images preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6 pt-2">
                {images.map((file, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--bg-tertiary)',
                    }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* New badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      New
                    </div>
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCropModal(URL.createObjectURL(file), index, null, file.type || 'image/png')}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors"
                        title="Crop"
                      >
                        <ScissorsIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-red-500 text-white transition-colors"
                        title="Remove"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <label
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
              style={{
                borderColor: 'var(--bg-tertiary)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <PhotoIcon className="w-12 h-12 mb-3" style={{ color: 'var(--text-secondary)' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Click to upload images
              </span>
              <span className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                or drag and drop
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif,image/bmp,.jpg,.jpeg,.png,.gif,.webp,.svg,.avif,.bmp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            {/* Deleted Images (quarantine) */}
            {isEdit && deletedImages.length > 0 && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowDeletedImages(!showDeletedImages)}
                  className="flex items-center gap-2 text-sm font-medium py-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${showDeletedImages ? 'rotate-180' : ''}`} />
                  Deleted Images ({deletedImages.length})
                </button>
                {showDeletedImages && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                    {deletedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 opacity-60 hover:opacity-100 transition-all"
                        style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--bg-tertiary)' }}
                      >
                        <img
                          src={`/uploads/${img.filename}`}
                          alt=""
                          className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => restoreDeletedImage(img.id)}
                            className="p-2 rounded-lg bg-white/20 hover:bg-green-500 text-white transition-colors"
                            title="Restore image"
                          >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white">Deleted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 360° Spin Mode Toggle */}
            {isEdit && (existingImages.length >= 8 || is360Set) && (
              <div
                className="mt-6 p-4 rounded-xl flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>360° Spin Mode</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Use images as frames for a 360° spin viewer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await itemsApi.toggle360(id!, !is360Set);
                      setIs360Set(!is360Set);
                      toast.success(`360° mode ${!is360Set ? 'enabled' : 'disabled'}`);
                    } catch {
                      toast.error('Failed to toggle 360° mode');
                    }
                  }}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ backgroundColor: is360Set ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                    style={{ transform: is360Set ? 'translateX(22px)' : 'translateX(4px)' }}
                  />
                </button>
              </div>
            )}

            {/* 3D Model Upload (edit mode only) */}
            {isEdit && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, #06b6d4 20%, transparent)' }}
                  >
                    <Icon icon="tabler:3d-cube-sphere" className="w-5 h-5" style={{ color: '#06b6d4' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>3D Model</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Upload a .glb or .gltf file
                    </p>
                  </div>
                </div>

                {existingModel3D ? (
                  <div
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="tabler:3d-cube-sphere" className="w-8 h-8" style={{ color: '#06b6d4' }} />
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{existingModel3D.originalName}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {(existingModel3D.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await itemsApi.deleteModel3D(id!);
                          setExistingModel3D(null);
                          toast.success('3D model deleted');
                        } catch {
                          toast.error('Failed to delete 3D model');
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--bg-tertiary)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <Icon icon="tabler:3d-cube-sphere" className="w-10 h-10 mb-2" style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Upload 3D Model
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      .glb or .gltf (max 50MB)
                    </span>
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append('model', file);
                          const res = await itemsApi.uploadModel3D(id!, formData);
                          setExistingModel3D(res.data.data);
                          toast.success('3D model uploaded');
                        } catch {
                          toast.error('Failed to upload 3D model');
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-6">
          {currentStep > (isEdit ? 1 : 0) && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="btn btn-secondary"
            >
              Back
            </button>
          )}

          <div className="flex-1" />

          {currentStep === 0 && !isEdit && (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-secondary"
            >
              Skip Template
            </button>
          )}

          {currentStep < 3 && currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              className="btn btn-primary"
            >
              Next
            </button>
          )}

          {(currentStep === 3 || isEdit) && (
            <>
              <Link
                to={isEdit ? `/items/${id}` : (parentItemId ? `/items/${parentItemId}` : '/items')}
                className="btn btn-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageSrc('');
          setCropImageIndex(null);
          setCropExistingImageId(null);
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        imageType={cropImageType}
      />
    </div>
  );
}
