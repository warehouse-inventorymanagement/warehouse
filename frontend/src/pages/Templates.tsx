import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { templatesApi, announcementsApi } from '../services/api';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  LinkIcon,
  SparklesIcon,
  InformationCircleIcon,
  FolderIcon,
  ArrowPathIcon,
  Square2StackIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { ItemTemplate, ItemTemplateField, TemplateFieldType, AnnouncementTemplate } from '../types';
import { useAuth } from '../context/AuthContext';
import IconPicker from '../components/IconPicker';
import { Icon } from '@iconify/react';

import { BUILT_IN_ANNOUNCEMENT_PRESETS } from '../constants/announcementPresets';

type TemplateTab = 'item' | 'announcement';

// Simple markdown to preview HTML (bold, italic, links, lists, headings)
function renderMarkdownPreview(text: string): string {
  if (!text) return '';
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:0.875rem;font-weight:600;margin:0.25rem 0">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;margin:0.25rem 0">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:1.125rem;font-weight:600;margin:0.25rem 0">$1</h2>')
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:1rem">&#8226; $1</div>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'a', 'h2', 'h3', 'h4', 'div', 'br', 'span'], ALLOWED_ATTR: ['style', 'href', 'target', 'rel'] });
}

const FIELD_TYPES: { value: TemplateFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input with optional min/max' },
  { value: 'select', label: 'Dropdown', description: 'Select from predefined options' },
  { value: 'boolean', label: 'Checkbox', description: 'Yes/No toggle' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'url', label: 'URL', description: 'Web address link' },
  { value: 'unit', label: 'Unit (Value + Unit)', description: 'Number with unit selector' }
];

const UNIT_TYPES: { value: string; label: string; units: string[]; category: string }[] = [
  // Electrical
  { value: 'voltage', label: 'Voltage', units: ['V', 'mV', 'kV', 'VAC', 'VDC'], category: 'Electrical' },
  { value: 'amperage', label: 'Amperage / Current', units: ['A', 'mA', 'uA', 'µA'], category: 'Electrical' },
  { value: 'power', label: 'Power', units: ['W', 'mW', 'kW', 'MW', 'VA', 'kVA'], category: 'Electrical' },
  { value: 'resistance', label: 'Resistance', units: ['Ω', 'mΩ', 'kΩ', 'MΩ'], category: 'Electrical' },
  { value: 'capacitance', label: 'Capacitance', units: ['F', 'mF', 'µF', 'nF', 'pF'], category: 'Electrical' },
  { value: 'inductance', label: 'Inductance', units: ['H', 'mH', 'µH', 'nH'], category: 'Electrical' },
  { value: 'frequency', label: 'Frequency', units: ['Hz', 'kHz', 'MHz', 'GHz'], category: 'Electrical' },

  // Physical
  { value: 'length', label: 'Length / Distance', units: ['m', 'cm', 'mm', 'km', 'in', 'ft', 'yd', 'mi'], category: 'Physical' },
  { value: 'weight', label: 'Weight / Mass', units: ['kg', 'g', 'mg', 'lb', 'oz', 'ton'], category: 'Physical' },
  { value: 'area', label: 'Area', units: ['m²', 'cm²', 'mm²', 'ft²', 'in²'], category: 'Physical' },
  { value: 'volume', label: 'Volume', units: ['L', 'mL', 'gal', 'qt', 'fl oz', 'm³', 'cm³'], category: 'Physical' },
  { value: 'temperature', label: 'Temperature', units: ['°C', '°F', 'K'], category: 'Physical' },
  { value: 'pressure', label: 'Pressure', units: ['Pa', 'kPa', 'MPa', 'bar', 'psi', 'atm'], category: 'Physical' },
  { value: 'speed', label: 'Speed', units: ['m/s', 'km/h', 'mph', 'ft/s', 'knots'], category: 'Physical' },
  { value: 'rpm', label: 'RPM / Rotation', units: ['RPM', 'RPS', 'rad/s'], category: 'Physical' },

  // Data / Computing
  { value: 'data', label: 'Data Size', units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB'], category: 'Data' },
  { value: 'datarate', label: 'Data Rate', units: ['bps', 'Kbps', 'Mbps', 'Gbps', 'B/s', 'KB/s', 'MB/s', 'GB/s'], category: 'Data' },

  // Time
  { value: 'time', label: 'Time Duration', units: ['s', 'ms', 'µs', 'ns', 'min', 'hr', 'days'], category: 'Time' },

  // Light / Display
  { value: 'luminosity', label: 'Luminosity', units: ['lm', 'lx', 'cd', 'nit'], category: 'Light' },

  // Audio
  { value: 'decibel', label: 'Sound Level', units: ['dB', 'dBA', 'dBm'], category: 'Audio' },

  // Angle
  { value: 'angle', label: 'Angle', units: ['°', 'rad', 'mrad'], category: 'Angle' },

  // Percentage
  { value: 'percentage', label: 'Percentage', units: ['%'], category: 'Other' }
];

// Group unit types by category
const UNIT_CATEGORIES = Array.from(new Set(UNIT_TYPES.map(u => u.category)));

const FIELD_GROUPS = [
  { value: '', label: 'No Group' },
  // Common
  { value: 'General', label: 'General' },
  { value: 'Specifications', label: 'Specifications' },
  { value: 'Physical', label: 'Physical' },
  { value: 'Identification', label: 'Identification' },
  // Electrical
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Input', label: 'Input' },
  { value: 'Output', label: 'Output' },
  { value: 'Power', label: 'Power' },
  { value: 'Battery', label: 'Battery' },
  // Connectivity
  { value: 'Connector', label: 'Connector' },
  { value: 'Connectors', label: 'Connectors' },
  { value: 'Connectivity', label: 'Connectivity' },
  { value: 'Ports', label: 'Ports' },
  { value: 'Network', label: 'Network' },
  { value: 'Wireless', label: 'Wireless' },
  // Computing
  { value: 'CPU', label: 'CPU' },
  { value: 'Memory', label: 'Memory' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Graphics', label: 'Graphics' },
  { value: 'Display', label: 'Display' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  // Features
  { value: 'Features', label: 'Features' },
  { value: 'Performance', label: 'Performance' },
  { value: 'Management', label: 'Management' },
  { value: 'Security', label: 'Security' },
  // Media/Display
  { value: 'Image Quality', label: 'Image Quality' },
  { value: 'Built-in Features', label: 'Built-in Features' },
  { value: 'Camera', label: 'Camera' },
  // Cables
  { value: 'Type', label: 'Type' },
  { value: 'Ethernet', label: 'Ethernet' },
  { value: 'Fiber', label: 'Fiber' },
  { value: 'USB/Video', label: 'USB/Video' },
  // Server/Enterprise
  { value: 'PoE', label: 'PoE' },
  { value: 'Topology', label: 'Topology' },
  { value: 'Outlets', label: 'Outlets' },
  { value: 'Metering', label: 'Metering' },
  { value: 'Enterprise', label: 'Enterprise' },
  // Storage Specific
  { value: 'HDD', label: 'HDD' },
  { value: 'Endurance', label: 'Endurance' },
  { value: 'Health', label: 'Health' },
  // RAM Specific
  { value: 'Timings', label: 'Timings' },
  { value: 'Profiles', label: 'Profiles' },
  { value: 'Kit', label: 'Kit' },
  // Motherboard/GPU
  { value: 'Platform', label: 'Platform' },
  { value: 'Form Factor', label: 'Form Factor' },
  { value: 'Expansion', label: 'Expansion' },
  { value: 'USB', label: 'USB' },
  { value: 'Audio', label: 'Audio' },
  { value: 'Video', label: 'Video' },
  { value: 'GPU Specs', label: 'GPU Specs' },
  { value: 'Clocks', label: 'Clocks' },
  { value: 'Cooling', label: 'Cooling' },
  // CPU Cooler
  { value: 'Fan', label: 'Fan' },
  { value: 'Pump', label: 'Pump' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Accessories', label: 'Accessories' },
  // Gaming Console
  { value: 'Video Output', label: 'Video Output' },
  { value: 'Media', label: 'Media' },
  { value: 'Controllers', label: 'Controllers' },
  { value: 'Modifications', label: 'Modifications' },
  { value: 'Condition', label: 'Condition' },
  { value: 'Included', label: 'Included' },
  // TV/Audio
  { value: 'Picture Quality', label: 'Picture Quality' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Smart TV', label: 'Smart TV' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Surround', label: 'Surround' },
  { value: 'Rear Speakers', label: 'Rear Speakers' },
  { value: 'Sound Modes', label: 'Sound Modes' },
  { value: 'Driver', label: 'Driver' },
  { value: 'Amplifier', label: 'Amplifier' },
  { value: 'Enclosure', label: 'Enclosure' },
  // Printer
  { value: 'Print', label: 'Print' },
  { value: 'Scan', label: 'Scan' },
  { value: 'Paper', label: 'Paper' },
  { value: 'Consumables', label: 'Consumables' },
  { value: 'Mobile', label: 'Mobile' },
  { value: 'Firmware', label: 'Firmware' },
  { value: 'Usage', label: 'Usage' },
  // Other
  { value: 'Certifications', label: 'Certifications' },
  { value: 'Compatibility', label: 'Compatibility' },
  { value: 'Environmental', label: 'Environmental' },
  { value: 'Warranty', label: 'Warranty' },
  { value: 'Status', label: 'Status' },
  { value: 'Other', label: 'Other' }
];

export default function Templates() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('templates:create');
  const canUpdate = hasPermission('templates:update');
  const canDelete = hasPermission('templates:delete');

  const [activeTab, setActiveTab] = useState<TemplateTab>('item');

  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ItemTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIcon, setTemplateIcon] = useState('');
  const [templateIconColor, setTemplateIconColor] = useState('#FFFFFF');
  const [templateIconBackgroundColor, setTemplateIconBackgroundColor] = useState('#6B7280');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [fieldTemplateId, setFieldTemplateId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<ItemTemplateField | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<TemplateFieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [fieldUnitType, setFieldUnitType] = useState('');
  const [fieldUnitOptions, setFieldUnitOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  // Enhanced field properties
  const [fieldGroup, setFieldGroup] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [fieldPrefix, setFieldPrefix] = useState('');
  const [fieldSuffix, setFieldSuffix] = useState('');
  const [fieldMinValue, setFieldMinValue] = useState<string>('');
  const [fieldMaxValue, setFieldMaxValue] = useState<string>('');
  const [fieldPattern, setFieldPattern] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Add group modal state
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [addGroupTemplateId, setAddGroupTemplateId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Field group dropdown state
  const [showFieldGroupDropdown, setShowFieldGroupDropdown] = useState(false);
  const [fieldGroupSearch, setFieldGroupSearch] = useState('');
  const fieldGroupDropdownRef = useRef<HTMLDivElement>(null);

  // Suggested sub-item modal state
  const [showSuggestedModal, setShowSuggestedModal] = useState(false);
  const [suggestedTemplateId, setSuggestedTemplateId] = useState<string | null>(null);
  const [selectedSuggestedId, setSelectedSuggestedId] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [suggestedQuantity, setSuggestedQuantity] = useState(1);

  // Announcement template state
  const [announcementTemplates, setAnnouncementTemplates] = useState<AnnouncementTemplate[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnTemplate, setEditingAnnTemplate] = useState<AnnouncementTemplate | null>(null);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [annTemplateName, setAnnTemplateName] = useState('');
  const [annTitlePrefix, setAnnTitlePrefix] = useState('');
  const [annMessageTemplate, setAnnMessageTemplate] = useState('');
  const [annIcon, setAnnIcon] = useState('');
  const [annColor, setAnnColor] = useState('#3b82f6');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'announcement' && announcementTemplates.length === 0 && !announcementLoading) {
      fetchAnnouncementTemplates();
    }
  }, [activeTab]);

  // Close field group dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldGroupDropdownRef.current && !fieldGroupDropdownRef.current.contains(e.target as Node)) {
        setShowFieldGroupDropdown(false);
      }
    };
    if (showFieldGroupDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFieldGroupDropdown]);

  const fetchTemplates = async () => {
    try {
      const response = await templatesApi.getAll();
      setTemplates(response.data.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncementTemplates = async () => {
    setAnnouncementLoading(true);
    try {
      const response = await announcementsApi.getTemplates();
      setAnnouncementTemplates(response.data.data);
    } catch (error) {
      toast.error('Failed to load announcement templates');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const openAnnouncementTemplateModal = (template?: AnnouncementTemplate | Omit<AnnouncementTemplate, 'id' | 'createdAt'>, isDuplicate?: boolean) => {
    if (template && 'id' in template && !isDuplicate) {
      // Editing existing
      setEditingAnnTemplate(template);
      setAnnTemplateName(template.name);
    } else if (template) {
      // Duplicating (built-in or custom)
      setEditingAnnTemplate(null);
      setAnnTemplateName(isDuplicate ? `${template.name} (Copy)` : '');
    } else {
      // New
      setEditingAnnTemplate(null);
      setAnnTemplateName('');
    }
    setAnnTitlePrefix(template?.titlePrefix || '');
    setAnnMessageTemplate(template?.messageTemplate || '');
    setAnnIcon(template?.icon || '');
    setAnnColor(template?.color || '#3b82f6');
    setShowMarkdownPreview(false);
    setShowAnnouncementModal(true);
  };

  const handleAnnouncementTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementSaving(true);
    try {
      const data = {
        name: annTemplateName,
        titlePrefix: annTitlePrefix || undefined,
        messageTemplate: annMessageTemplate || undefined,
        icon: annIcon || undefined,
        color: annColor || undefined,
      };

      if (editingAnnTemplate) {
        await announcementsApi.updateTemplate(editingAnnTemplate.id, data);
        toast.success('Template updated');
      } else {
        await announcementsApi.createTemplate(data);
        toast.success('Template created');
      }
      setShowAnnouncementModal(false);
      setEditingAnnTemplate(null);
      fetchAnnouncementTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleDeleteAnnouncementTemplate = async (template: AnnouncementTemplate) => {
    if (template.isBuiltIn) {
      toast.error('Built-in templates cannot be deleted');
      return;
    }
    if (!confirm(`Delete announcement template "${template.name}"?`)) return;
    try {
      await announcementsApi.deleteTemplate(template.id);
      toast.success('Template deleted');
      fetchAnnouncementTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      try {
        const response = await templatesApi.getOne(id);
        setTemplates(prev => prev.map(t => t.id === id ? response.data.data : t));
      } catch (error) {
        toast.error('Failed to load template details');
      }
    }
  };

  // Template CRUD
  const openTemplateModal = (template?: ItemTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setTemplateIcon(template.icon || '');
      setTemplateIconColor(template.iconColor || '#FFFFFF');
      setTemplateIconBackgroundColor(template.iconBackgroundColor || '#6B7280');
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateIcon('');
      setTemplateIconColor('#FFFFFF');
      setTemplateIconBackgroundColor('#6B7280');
    }
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingTemplate) {
        await templatesApi.update(editingTemplate.id, {
          name: templateName,
          description: templateDescription,
          icon: templateIcon,
          iconColor: templateIconColor,
          iconBackgroundColor: templateIconBackgroundColor
        });
        toast.success('Template updated');
      } else {
        await templatesApi.create({
          name: templateName,
          description: templateDescription,
          icon: templateIcon,
          iconColor: templateIconColor,
          iconBackgroundColor: templateIconBackgroundColor
        });
        toast.success('Template created');
      }
      closeTemplateModal();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: ItemTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    try {
      await templatesApi.delete(template.id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  // Field CRUD
  const openFieldModal = (templateId: string, field?: ItemTemplateField) => {
    setFieldTemplateId(templateId);
    if (field) {
      setEditingField(field);
      setFieldName(field.fieldName);
      setFieldType(field.fieldType);
      setFieldRequired(field.isRequired);
      setFieldDefaultValue(field.defaultValue || '');
      setFieldOptions(field.options ? JSON.parse(field.options) : []);
      setFieldUnitType(field.unitType || '');
      setFieldUnitOptions(field.unitOptions ? JSON.parse(field.unitOptions) : []);
      // Enhanced properties
      setFieldGroup(field.fieldGroup || '');
      setFieldPlaceholder(field.placeholder || '');
      setFieldHelpText(field.helpText || '');
      setFieldPrefix(field.prefix || '');
      setFieldSuffix(field.suffix || '');
      setFieldMinValue(field.minValue !== undefined && field.minValue !== null ? String(field.minValue) : '');
      setFieldMaxValue(field.maxValue !== undefined && field.maxValue !== null ? String(field.maxValue) : '');
      setFieldPattern(field.pattern || '');
      setShowAdvanced(Boolean(field.fieldGroup || field.placeholder || field.helpText || field.prefix || field.suffix || field.minValue || field.maxValue || field.pattern));
    } else {
      setEditingField(null);
      setFieldName('');
      setFieldType('text');
      setFieldRequired(false);
      setFieldDefaultValue('');
      setFieldOptions([]);
      setFieldUnitType('');
      setFieldUnitOptions([]);
      // Enhanced properties
      setFieldGroup('');
      setFieldPlaceholder('');
      setFieldHelpText('');
      setFieldPrefix('');
      setFieldSuffix('');
      setFieldMinValue('');
      setFieldMaxValue('');
      setFieldPattern('');
      setShowAdvanced(false);
    }
    setNewOption('');
    setShowFieldModal(true);
  };

  const closeFieldModal = () => {
    setShowFieldModal(false);
    setFieldTemplateId(null);
    setEditingField(null);
    setShowFieldGroupDropdown(false);
  };

  const handleFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldTemplateId) return;
    setSaving(true);

    try {
      const data = {
        fieldName,
        fieldType,
        isRequired: fieldRequired,
        defaultValue: fieldDefaultValue || undefined,
        options: fieldType === 'select' ? fieldOptions : undefined,
        unitType: fieldType === 'unit' ? fieldUnitType : undefined,
        unitOptions: fieldType === 'unit' ? fieldUnitOptions : undefined,
        // Enhanced properties
        fieldGroup: fieldGroup || undefined,
        placeholder: fieldPlaceholder || undefined,
        helpText: fieldHelpText || undefined,
        prefix: fieldPrefix || undefined,
        suffix: fieldSuffix || undefined,
        minValue: fieldMinValue ? parseFloat(fieldMinValue) : undefined,
        maxValue: fieldMaxValue ? parseFloat(fieldMaxValue) : undefined,
        pattern: fieldPattern || undefined
      };

      if (editingField) {
        await templatesApi.updateField(fieldTemplateId, editingField.id, data);
        toast.success('Field updated');
      } else {
        await templatesApi.addField(fieldTemplateId, data);
        toast.success('Field added');
      }
      closeFieldModal();
      const response = await templatesApi.getOne(fieldTemplateId);
      setTemplates(prev => prev.map(t => t.id === fieldTemplateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (templateId: string, fieldId: string) => {
    if (!confirm('Delete this field?')) return;

    try {
      await templatesApi.deleteField(templateId, fieldId);
      toast.success('Field deleted');
      const response = await templatesApi.getOne(templateId);
      setTemplates(prev => prev.map(t => t.id === templateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete field');
    }
  };

  const addOption = () => {
    if (newOption.trim() && !fieldOptions.includes(newOption.trim())) {
      setFieldOptions([...fieldOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (opt: string) => {
    setFieldOptions(fieldOptions.filter(o => o !== opt));
  };

  // Get existing groups from a template (both from fields and saved fieldGroups)
  const getTemplateGroups = (templateId: string): string[] => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return [];
    const groups = new Set<string>();
    // From saved fieldGroups
    if (template.fieldGroups) {
      try {
        const saved: string[] = JSON.parse(template.fieldGroups);
        saved.forEach(g => groups.add(g));
      } catch {}
    }
    // From field assignments
    template.fields?.forEach(f => {
      if (f.fieldGroup) groups.add(f.fieldGroup);
    });
    return Array.from(groups).sort();
  };

  // Get combined group options (existing template groups + predefined)
  const getFieldGroupOptions = (templateId: string | null): string[] => {
    const predefined = FIELD_GROUPS.filter(g => g.value).map(g => g.value);
    if (!templateId) return predefined;
    const existing = getTemplateGroups(templateId);
    const combined = new Set([...existing, ...predefined]);
    return Array.from(combined).sort();
  };

  // Add group: opens a modal to add a new field group with an initial field
  const openAddGroupModal = (templateId: string) => {
    setAddGroupTemplateId(templateId);
    setNewGroupName('');
    setGroupSearchQuery('');
    setShowAddGroupModal(true);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGroupTemplateId || !newGroupName.trim()) return;
    setSaving(true);

    try {
      const template = templates.find(t => t.id === addGroupTemplateId);
      const existingGroups: string[] = template?.fieldGroups ? JSON.parse(template.fieldGroups) : [];
      if (existingGroups.includes(newGroupName.trim())) {
        toast.error('Group already exists');
        setSaving(false);
        return;
      }
      const updatedGroups = [...existingGroups, newGroupName.trim()];
      await templatesApi.updateFieldGroups(addGroupTemplateId, updatedGroups);
      toast.success('Field group added');
      setShowAddGroupModal(false);
      // Refresh template
      const response = await templatesApi.getOne(addGroupTemplateId);
      setTemplates(prev => prev.map(t => t.id === addGroupTemplateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add group');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (templateId: string, groupName: string) => {
    const template = templates.find(t => t.id === templateId);
    const fieldsInGroup = template?.fields?.filter(f => f.fieldGroup === groupName) || [];
    if (fieldsInGroup.length > 0) {
      toast.error('Cannot delete a group that has fields. Remove the fields first.');
      return;
    }
    try {
      const existingGroups: string[] = template?.fieldGroups ? JSON.parse(template.fieldGroups) : [];
      const updatedGroups = existingGroups.filter(g => g !== groupName);
      await templatesApi.updateFieldGroups(templateId, updatedGroups);
      toast.success('Group removed');
      const response = await templatesApi.getOne(templateId);
      setTemplates(prev => prev.map(t => t.id === templateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove group');
    }
  };

  // Suggested sub-item CRUD
  const openSuggestedModal = (templateId: string) => {
    setSuggestedTemplateId(templateId);
    setSelectedSuggestedId('');
    setSuggestedDescription('');
    setSuggestedQuantity(1);
    setShowSuggestedModal(true);
  };

  const closeSuggestedModal = () => {
    setShowSuggestedModal(false);
    setSuggestedTemplateId(null);
  };

  const handleSuggestedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestedTemplateId || !selectedSuggestedId) return;
    setSaving(true);

    try {
      await templatesApi.addSuggested(suggestedTemplateId, {
        suggestedTemplateId: selectedSuggestedId,
        description: suggestedDescription || undefined,
        quantityRequired: suggestedQuantity
      });
      toast.success('Suggested sub-item added');
      closeSuggestedModal();
      const response = await templatesApi.getOne(suggestedTemplateId);
      setTemplates(prev => prev.map(t => t.id === suggestedTemplateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add suggestion');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSuggested = async (templateId: string, suggestedId: string) => {
    if (!confirm('Remove this suggested sub-item?')) return;

    try {
      await templatesApi.removeSuggested(templateId, suggestedId);
      toast.success('Suggestion removed');
      const response = await templatesApi.getOne(templateId);
      setTemplates(prev => prev.map(t => t.id === templateId ? response.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove suggestion');
    }
  };

  const handleSeedTemplates = async () => {
    if (!confirm('This will create starter templates for common device types (Power Adapter, Router, Switch, etc.). Continue?')) return;

    try {
      const response = await templatesApi.seed();
      toast.success(`Created ${response.data.data.created} starter templates`);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to seed templates');
    }
  };

  const handleDuplicateTemplate = async (template: ItemTemplate) => {
    const customName = prompt(`Enter name for the duplicate (or leave blank for "${template.name} (Copy)"):`, '');
    if (customName === null) return; // User cancelled

    try {
      const response = await templatesApi.duplicate(template.id, customName || undefined);
      toast.success(response.data.message || 'Template duplicated');
      fetchTemplates();
      // Expand the new template
      setExpandedId(response.data.data.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to duplicate template');
    }
  };

  const handleRestoreTemplate = async (template: ItemTemplate) => {
    if (!template.isStarter) {
      toast.error('Only starter templates can be restored to defaults');
      return;
    }

    if (!confirm(`Restore "${template.name}" to its default configuration? This will reset all fields and remove any customizations.`)) return;

    try {
      const response = await templatesApi.restore(template.id);
      toast.success(response.data.message || 'Template restored to defaults');
      // Refresh the specific template
      const updatedTemplate = await templatesApi.getOne(template.id);
      setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate.data.data : t));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore template');
    }
  };

  // Group fields by fieldGroup, including empty saved groups
  const groupFields = (fields: ItemTemplateField[] | undefined, template?: ItemTemplate) => {
    const groups: Record<string, ItemTemplateField[]> = {};

    // Add saved empty groups first
    if (template?.fieldGroups) {
      try {
        const savedGroups: string[] = JSON.parse(template.fieldGroups);
        savedGroups.forEach(g => {
          if (!groups[g]) groups[g] = [];
        });
      } catch {}
    }

    // Add fields into groups
    if (fields) {
      fields.forEach(field => {
        const group = field.fieldGroup || 'ungrouped';
        if (!groups[group]) groups[group] = [];
        groups[group].push(field);
      });
    }

    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${activeTab === 'item' ? '#8b5cf6' : '#f59e0b'} 20%, transparent)` }}
          >
            {activeTab === 'item' ? (
              <DocumentDuplicateIcon className="w-7 h-7" style={{ color: '#8b5cf6' }} />
            ) : (
              <MegaphoneIcon className="w-7 h-7" style={{ color: '#f59e0b' }} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Templates</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'item'
                ? 'Define reusable templates with custom fields for different device types'
                : 'Manage announcement presets for quick announcement creation'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'item' && canCreate && (
            <button
              onClick={handleSeedTemplates}
              className="btn flex items-center gap-2"
              style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)', color: '#8b5cf6' }}
            >
              <SparklesIcon className="h-5 w-5" />
              {templates.length === 0 ? 'Seed Starter Templates' : 'Add Starter Templates'}
            </button>
          )}
          {activeTab === 'item' && canCreate && (
            <button
              onClick={() => openTemplateModal()}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Template
            </button>
          )}
          {activeTab === 'announcement' && canCreate && (
            <button
              onClick={() => openAnnouncementTemplateModal()}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Template
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <button
          onClick={() => setActiveTab('item')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'item' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'item' ? '#8b5cf6' : 'var(--text-secondary)',
            boxShadow: activeTab === 'item' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
          Item Templates
        </button>
        <button
          onClick={() => setActiveTab('announcement')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'announcement' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'announcement' ? '#f59e0b' : 'var(--text-secondary)',
            boxShadow: activeTab === 'announcement' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <MegaphoneIcon className="h-4 w-4" />
          Announcement Templates
        </button>
      </div>

      {/* Item Templates Tab */}
      {activeTab === 'item' && <>

      {/* Search Bar */}
      {templates.length > 0 && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="input pl-10 w-full max-w-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-tertiary)]"
            >
              <XMarkIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <DocumentDuplicateIcon className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No templates yet</h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create templates to define reusable field sets for different item types like Power Adapters, Routers, Cables, etc.
          </p>
          {canCreate && (
            <button
              onClick={handleSeedTemplates}
              className="btn inline-flex items-center gap-2"
              style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)', color: '#8b5cf6' }}
            >
              <SparklesIcon className="h-5 w-5" />
              Seed Starter Templates
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {templates
            .filter(template => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                template.name.toLowerCase().includes(query) ||
                template.description?.toLowerCase().includes(query) ||
                template.fields?.some(f => f.fieldName.toLowerCase().includes(query))
              );
            })
            .map(template => {
            const groupedFields = groupFields(template.fields, template);
            const groupNames = Object.keys(groupedFields);

            return (
              <div key={template.id} className="card overflow-hidden">
                {/* Template Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer transition-opacity hover:opacity-90"
                  onClick={() => toggleExpand(template.id)}
                >
                  <div className="flex items-center gap-3">
                    {template.icon ? (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: template.iconBackgroundColor || 'var(--bg-tertiary)' }}
                      >
                        <Icon
                          icon={template.icon}
                          className="h-6 w-6"
                          style={{ color: template.iconColor || '#FFFFFF' }}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        <DocumentDuplicateIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {template.name}
                        {template.isStarter && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}
                          >
                            Starter
                          </span>
                        )}
                        {!template.isActive && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {template.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {template._count?.fields || template.fields?.length || 0} fields
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {template._count?.items || 0} items using
                      </p>
                    </div>
                    {expandedId === template.id ? (
                      <ChevronUpIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === template.id && (
                  <div className="border-t p-6 space-y-6" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {canUpdate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openTemplateModal(template); }}
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                      {canCreate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(template); }}
                          className="btn btn-sm flex items-center gap-1"
                          style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 15%, transparent)', color: '#3b82f6' }}
                          title="Create a copy of this template"
                        >
                          <Square2StackIcon className="h-4 w-4" />
                          Duplicate
                        </button>
                      )}
                      {canUpdate && template.isStarter && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestoreTemplate(template); }}
                          className="btn btn-sm flex items-center gap-1"
                          style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}
                          title="Reset this starter template to its default configuration"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          Restore Default
                        </button>
                      )}
                      {canDelete && !template.isStarter && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template); }}
                          className="btn btn-sm flex items-center gap-1 text-red-500"
                          style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Fields Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Cog6ToothIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fields</h4>
                        </div>
                        {canUpdate && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openAddGroupModal(template.id)}
                              className="btn btn-sm flex items-center gap-1"
                              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
                            >
                              <FolderIcon className="h-4 w-4" />
                              Add Group
                            </button>
                            <button
                              onClick={() => openFieldModal(template.id)}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Add Field
                            </button>
                          </div>
                        )}
                      </div>

                      {groupNames.length > 0 ? (
                        <div className="space-y-4">
                          {groupNames.map(groupName => (
                            <div key={groupName}>
                              {groupName !== 'ungrouped' && (
                                <div className="flex items-center gap-2 mb-2">
                                  <FolderIcon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
                                    {groupName}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    ({groupedFields[groupName].length} field{groupedFields[groupName].length !== 1 ? 's' : ''})
                                  </span>
                                  {canUpdate && groupedFields[groupName].length === 0 && (
                                    <button
                                      onClick={() => handleDeleteGroup(template.id, groupName)}
                                      className="p-0.5 rounded transition-colors text-red-500 hover:bg-red-500/10 ml-1"
                                      title="Remove empty group"
                                    >
                                      <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                              {groupedFields[groupName].length > 0 ? (
                                <div className="grid gap-2">
                                  {groupedFields[groupName].map(field => (
                                    <div
                                      key={field.id}
                                      className="flex items-center justify-between p-3 rounded-lg"
                                      style={{ backgroundColor: 'var(--bg-primary)' }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {field.fieldName}
                                          </span>
                                          {field.isRequired && (
                                            <span className="text-xs text-red-500">*Required</span>
                                          )}
                                          <span
                                            className="px-1.5 py-0.5 text-xs rounded"
                                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                          >
                                            {FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}
                                          </span>
                                          {field.unitType && (
                                            <span
                                              className="px-1.5 py-0.5 text-xs rounded"
                                              style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 15%, transparent)', color: '#3b82f6' }}
                                            >
                                              {UNIT_TYPES.find(u => u.value === field.unitType)?.label || field.unitType}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                          {field.defaultValue && <span>Default: {field.defaultValue}</span>}
                                          {field.placeholder && <span>Placeholder: {field.placeholder}</span>}
                                          {field.prefix && <span>Prefix: {field.prefix}</span>}
                                          {field.suffix && <span>Suffix: {field.suffix}</span>}
                                          {(field.minValue !== undefined && field.minValue !== null) && <span>Min: {field.minValue}</span>}
                                          {(field.maxValue !== undefined && field.maxValue !== null) && <span>Max: {field.maxValue}</span>}
                                        </div>
                                        {field.helpText && (
                                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                            <InformationCircleIcon className="h-3 w-3" />
                                            {field.helpText}
                                          </p>
                                        )}
                                      </div>
                                      {canUpdate && (
                                        <div className="flex gap-1 ml-2">
                                          <button
                                            onClick={() => openFieldModal(template.id, field)}
                                            className="p-1.5 rounded transition-colors"
                                            style={{ color: 'var(--text-secondary)' }}
                                          >
                                            <PencilIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteField(template.id, field.id)}
                                            className="p-1.5 rounded transition-colors text-red-500 hover:bg-red-500/10"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : groupName !== 'ungrouped' ? (
                                <div
                                  className="text-center py-4 rounded-lg border border-dashed"
                                  style={{ borderColor: 'var(--bg-tertiary)' }}
                                >
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    No fields in this group yet
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="text-center py-8 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <Cog6ToothIcon className="h-8 w-8 mx-auto mb-2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No fields defined</p>
                        </div>
                      )}
                    </div>

                    {/* Suggested Sub-Items Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-5 w-5" style={{ color: '#10b981' }} />
                          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Suggested Sub-Items</h4>
                        </div>
                        {canUpdate && (
                          <button
                            onClick={() => openSuggestedModal(template.id)}
                            className="btn btn-sm flex items-center gap-1"
                            style={{ backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)', color: '#10b981' }}
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add Suggestion
                          </button>
                        )}
                      </div>
                      {template.suggestedItems && template.suggestedItems.length > 0 ? (
                        <div className="grid gap-2">
                          {template.suggestedItems.map(suggested => (
                            <div
                              key={suggested.id}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ backgroundColor: 'var(--bg-primary)' }}
                            >
                              <div className="flex items-center gap-3">
                                {suggested.suggestedTemplate?.icon && (
                                  <Icon
                                    icon={suggested.suggestedTemplate.icon}
                                    className="h-5 w-5"
                                    style={{ color: suggested.suggestedTemplate.iconColor || 'var(--text-secondary)' }}
                                  />
                                )}
                                <div>
                                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {suggested.suggestedTemplate?.name}
                                  </span>
                                  {suggested.quantityRequired > 1 && (
                                    <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                      x{suggested.quantityRequired}
                                    </span>
                                  )}
                                  {suggested.description && (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{suggested.description}</p>
                                  )}
                                </div>
                              </div>
                              {canUpdate && (
                                <button
                                  onClick={() => handleRemoveSuggested(template.id, suggested.id)}
                                  className="p-1.5 rounded transition-colors text-red-500 hover:bg-red-500/10"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="text-center py-8 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No suggested sub-items</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* No search results */}
          {searchQuery.trim() && templates.filter(t => {
            const query = searchQuery.toLowerCase();
            return (
              t.name.toLowerCase().includes(query) ||
              t.description?.toLowerCase().includes(query) ||
              t.fields?.some(f => f.fieldName.toLowerCase().includes(query))
            );
          }).length === 0 && (
            <div className="card p-8 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No templates found</p>
              <p style={{ color: 'var(--text-secondary)' }}>
                No templates match "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn btn-secondary mt-4"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={closeTemplateModal} style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input"
                  placeholder="e.g., Power Adapter, Network Switch"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Describe when to use this template..."
                />
              </div>

              <div>
                <IconPicker
                  value={templateIcon}
                  onChange={setTemplateIcon}
                  color={templateIconColor}
                  onColorChange={setTemplateIconColor}
                  backgroundColor={templateIconBackgroundColor}
                  onBackgroundColorChange={setTemplateIconBackgroundColor}
                  showColorPicker
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeTemplateModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingField ? 'Edit Field' : 'Add Field'}
              </h2>
              <button onClick={closeFieldModal} style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFieldSubmit} className="space-y-4">
              {/* Basic Field Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Field Name *</label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="e.g., Serial Number, Voltage, Model"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Field Type</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as TemplateFieldType)}
                    className="input"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="relative" ref={fieldGroupDropdownRef}>
                  <label className="label">Field Group / Section</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fieldGroup}
                      onChange={(e) => {
                        setFieldGroup(e.target.value);
                        setFieldGroupSearch(e.target.value);
                        setShowFieldGroupDropdown(true);
                      }}
                      onFocus={() => {
                        setFieldGroupSearch(fieldGroup);
                        setShowFieldGroupDropdown(true);
                      }}
                      className="input pr-8"
                      placeholder="Select or type custom group..."
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFieldGroupDropdown(!showFieldGroupDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {showFieldGroupDropdown && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}
                    >
                      {/* Show existing template groups first */}
                      {(() => {
                        const existingGroups = fieldTemplateId ? getTemplateGroups(fieldTemplateId) : [];
                        const allOptions = getFieldGroupOptions(fieldTemplateId);
                        const searchLower = fieldGroupSearch.toLowerCase();
                        const filteredExisting = existingGroups.filter(g => g.toLowerCase().includes(searchLower));
                        const filteredPredefined = allOptions
                          .filter(g => !existingGroups.includes(g))
                          .filter(g => g.toLowerCase().includes(searchLower));
                        const hasCustom = fieldGroupSearch.trim() && !allOptions.some(g => g.toLowerCase() === searchLower);

                        return (
                          <>
                            {/* No group option */}
                            {!fieldGroupSearch && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                                style={{ color: 'var(--text-secondary)' }}
                                onClick={() => {
                                  setFieldGroup('');
                                  setShowFieldGroupDropdown(false);
                                }}
                              >
                                No Group
                              </button>
                            )}
                            {/* Existing template groups */}
                            {filteredExisting.length > 0 && (
                              <>
                                <div className="px-3 py-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  Current Template Groups
                                </div>
                                {filteredExisting.map(g => (
                                  <button
                                    key={g}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                                    style={{ color: fieldGroup === g ? 'var(--accent)' : 'var(--text-primary)' }}
                                    onClick={() => {
                                      setFieldGroup(g);
                                      setShowFieldGroupDropdown(false);
                                    }}
                                  >
                                    <FolderIcon className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                                    {g}
                                  </button>
                                ))}
                              </>
                            )}
                            {/* Predefined groups */}
                            {filteredPredefined.length > 0 && (
                              <>
                                <div className="px-3 py-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  Suggestions
                                </div>
                                {filteredPredefined.slice(0, 15).map(g => (
                                  <button
                                    key={g}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                                    style={{ color: 'var(--text-primary)' }}
                                    onClick={() => {
                                      setFieldGroup(g);
                                      setShowFieldGroupDropdown(false);
                                    }}
                                  >
                                    {g}
                                  </button>
                                ))}
                                {filteredPredefined.length > 15 && (
                                  <div className="px-3 py-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Type to filter more...
                                  </div>
                                )}
                              </>
                            )}
                            {/* Custom option */}
                            {hasCustom && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                                style={{ color: 'var(--accent)' }}
                                onClick={() => {
                                  setFieldGroup(fieldGroupSearch.trim());
                                  setShowFieldGroupDropdown(false);
                                }}
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Create "{fieldGroupSearch.trim()}"
                              </button>
                            )}
                            {filteredExisting.length === 0 && filteredPredefined.length === 0 && !hasCustom && (
                              <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                No groups found
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Field Type Specific Options */}
              {fieldType === 'select' && (
                <div>
                  <label className="label">Options</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add option..."
                      className="input flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                    />
                    <button type="button" onClick={addOption} className="btn btn-secondary">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fieldOptions.map(opt => (
                      <span
                        key={opt}
                        className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {opt}
                        <button type="button" onClick={() => removeOption(opt)} className="text-red-500 hover:text-red-600">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {fieldType === 'unit' && (
                <>
                  <div>
                    <label className="label">Unit Type</label>
                    <select
                      value={fieldUnitType}
                      onChange={(e) => {
                        setFieldUnitType(e.target.value);
                        const unitType = UNIT_TYPES.find(u => u.value === e.target.value);
                        setFieldUnitOptions(unitType?.units || []);
                      }}
                      className="input"
                    >
                      <option value="">Select unit type...</option>
                      {UNIT_CATEGORIES.map(category => (
                        <optgroup key={category} label={category}>
                          {UNIT_TYPES.filter(u => u.category === category).map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {fieldUnitType && (
                    <div>
                      <label className="label">Available Units</label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        {UNIT_TYPES.find(u => u.value === fieldUnitType)?.units.map(unit => (
                          <label
                            key={unit}
                            className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer"
                            style={{
                              backgroundColor: fieldUnitOptions.includes(unit) ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--bg-tertiary)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={fieldUnitOptions.includes(unit)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFieldUnitOptions([...fieldUnitOptions, unit]);
                                } else {
                                  setFieldUnitOptions(fieldUnitOptions.filter(u => u !== unit));
                                }
                              }}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{unit}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Default Value */}
              <div>
                <label className="label">Default Value</label>
                <input
                  type={fieldType === 'number' ? 'number' : 'text'}
                  value={fieldDefaultValue}
                  onChange={(e) => setFieldDefaultValue(e.target.value)}
                  className="input"
                  placeholder="Optional default value"
                />
              </div>

              {/* Required Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fieldRequired"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <label htmlFor="fieldRequired" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Required field
                </label>
              </div>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--accent)' }}
              >
                {showAdvanced ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                Advanced Options
              </button>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div>
                    <label className="label">Placeholder Text</label>
                    <input
                      type="text"
                      value={fieldPlaceholder}
                      onChange={(e) => setFieldPlaceholder(e.target.value)}
                      className="input"
                      placeholder="e.g., Enter serial number..."
                    />
                  </div>

                  <div>
                    <label className="label">Help Text</label>
                    <input
                      type="text"
                      value={fieldHelpText}
                      onChange={(e) => setFieldHelpText(e.target.value)}
                      className="input"
                      placeholder="e.g., Found on the back of the device"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Prefix</label>
                      <input
                        type="text"
                        value={fieldPrefix}
                        onChange={(e) => setFieldPrefix(e.target.value)}
                        className="input"
                        placeholder="e.g., $, #"
                      />
                    </div>
                    <div>
                      <label className="label">Suffix</label>
                      <input
                        type="text"
                        value={fieldSuffix}
                        onChange={(e) => setFieldSuffix(e.target.value)}
                        className="input"
                        placeholder="e.g., units, pcs"
                      />
                    </div>
                  </div>

                  {(fieldType === 'number' || fieldType === 'unit') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Min Value</label>
                        <input
                          type="number"
                          value={fieldMinValue}
                          onChange={(e) => setFieldMinValue(e.target.value)}
                          className="input"
                          placeholder="Minimum"
                        />
                      </div>
                      <div>
                        <label className="label">Max Value</label>
                        <input
                          type="number"
                          value={fieldMaxValue}
                          onChange={(e) => setFieldMaxValue(e.target.value)}
                          className="input"
                          placeholder="Maximum"
                        />
                      </div>
                    </div>
                  )}

                  {fieldType === 'text' && (
                    <div>
                      <label className="label">Validation Pattern (Regex)</label>
                      <input
                        type="text"
                        value={fieldPattern}
                        onChange={(e) => setFieldPattern(e.target.value)}
                        className="input font-mono text-sm"
                        placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Regular expression pattern for validation
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeFieldModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingField ? 'Update' : 'Add Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-6"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add Field Group
              </h2>
              <button onClick={() => setShowAddGroupModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label className="label">Group Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      setGroupSearchQuery(e.target.value);
                    }}
                    placeholder="Type a name or select from suggestions..."
                    className="input"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Group suggestions */}
              {(() => {
                const searchLower = groupSearchQuery.toLowerCase();
                const existingGroups = addGroupTemplateId ? getTemplateGroups(addGroupTemplateId) : [];
                const suggestions = FIELD_GROUPS
                  .filter(g => g.value)
                  .filter(g => !existingGroups.includes(g.value))
                  .filter(g => !searchLower || g.value.toLowerCase().includes(searchLower))
                  .slice(0, 10);

                return suggestions.length > 0 ? (
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Suggestions
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map(g => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => {
                            setNewGroupName(g.value);
                            setGroupSearchQuery(g.value);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                          style={{
                            backgroundColor: newGroupName === g.value
                              ? 'color-mix(in srgb, var(--accent) 20%, transparent)'
                              : 'var(--bg-secondary)',
                            color: newGroupName === g.value ? 'var(--accent)' : 'var(--text-secondary)',
                            border: `1px solid ${newGroupName === g.value ? 'var(--accent)' : 'var(--bg-tertiary)'}`,
                          }}
                        >
                          {g.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {addGroupTemplateId && getTemplateGroups(addGroupTemplateId).length > 0 && (
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Existing Groups
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {getTemplateGroups(addGroupTemplateId).map(g => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--bg-tertiary)' }}
                      >
                        <FolderIcon className="h-3 w-3" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddGroupModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !newGroupName.trim()} className="btn btn-primary">
                  {saving ? 'Adding...' : 'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggested Sub-Item Modal */}
      {showSuggestedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-6"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add Suggested Sub-Item
              </h2>
              <button onClick={closeSuggestedModal} style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSuggestedSubmit} className="space-y-4">
              <div>
                <label className="label">Template to Suggest</label>
                <select
                  value={selectedSuggestedId}
                  onChange={(e) => setSelectedSuggestedId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a template...</option>
                  {templates
                    .filter(t => t.id !== suggestedTemplateId)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  value={suggestedDescription}
                  onChange={(e) => setSuggestedDescription(e.target.value)}
                  placeholder="e.g., Power supply for this device"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Quantity Required</label>
                <input
                  type="number"
                  value={suggestedQuantity}
                  onChange={(e) => setSuggestedQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeSuggestedModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !selectedSuggestedId} className="btn btn-primary">
                  {saving ? 'Adding...' : 'Add Suggestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </>}

      {/* Announcement Templates Tab */}
      {activeTab === 'announcement' && (
        <>
          {announcementLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }}></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Built-in Presets */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <SparklesIcon className="h-4 w-4" />
                  Built-in Presets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BUILT_IN_ANNOUNCEMENT_PRESETS.map((preset) => (
                    <div
                      key={preset.name}
                      className="card p-4 flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${preset.color || '#3b82f6'} 20%, transparent)` }}
                      >
                        {preset.icon && (
                          <Icon icon={preset.icon} className="h-5 w-5" style={{ color: preset.color || '#3b82f6' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{preset.name}</p>
                        {preset.titlePrefix && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            Prefix: {preset.titlePrefix}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canCreate && (
                          <button
                            onClick={() => openAnnouncementTemplateModal(preset, true)}
                            className="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                            title="Duplicate as custom template"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Square2StackIcon className="h-4 w-4" />
                          </button>
                        )}
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}
                        >
                          Built-in
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Templates */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  Custom Templates
                </h3>
                {announcementTemplates.length === 0 ? (
                  <div className="card p-8 text-center">
                    <MegaphoneIcon className="h-12 w-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No custom templates</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Create custom templates to quickly fill announcement forms with pre-configured settings.
                    </p>
                    {canCreate && (
                      <button
                        onClick={() => openAnnouncementTemplateModal()}
                        className="btn btn-primary inline-flex items-center gap-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Create Template
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {announcementTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="card p-4 flex items-start gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `color-mix(in srgb, ${template.color || '#3b82f6'} 20%, transparent)` }}
                        >
                          {template.icon ? (
                            <Icon icon={template.icon} className="h-5 w-5" style={{ color: template.color || '#3b82f6' }} />
                          ) : (
                            <MegaphoneIcon className="h-5 w-5" style={{ color: template.color || '#3b82f6' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{template.name}</p>
                          {template.titlePrefix && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                              Prefix: {template.titlePrefix}
                            </p>
                          )}
                          {template.messageTemplate && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {template.messageTemplate}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {canUpdate && (
                            <button
                              onClick={() => openAnnouncementTemplateModal(template)}
                              className="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                              title="Edit template"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canCreate && (
                            <button
                              onClick={() => openAnnouncementTemplateModal(template, true)}
                              className="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                              title="Duplicate template"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Square2StackIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteAnnouncementTemplate(template)}
                              className="p-1.5 rounded transition-colors text-red-500 hover:bg-red-500/10"
                              title="Delete template"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create/Edit Announcement Template Modal */}
          {showAnnouncementModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div
                className="rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {editingAnnTemplate ? 'Edit Announcement Template' : 'New Announcement Template'}
                  </h2>
                  <button onClick={() => { setShowAnnouncementModal(false); setEditingAnnTemplate(null); }} style={{ color: 'var(--text-secondary)' }}>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form */}
                  <form onSubmit={handleAnnouncementTemplateSubmit} className="space-y-4">
                    <div>
                      <label className="label">Name *</label>
                      <input
                        type="text"
                        value={annTemplateName}
                        onChange={(e) => setAnnTemplateName(e.target.value)}
                        className="input"
                        placeholder="e.g., Shipping Delay Notice"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Title Prefix</label>
                      <input
                        type="text"
                        value={annTitlePrefix}
                        onChange={(e) => setAnnTitlePrefix(e.target.value)}
                        className="input"
                        placeholder="e.g., [Shipping] "
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Automatically prepended to the announcement title
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Message Template</label>
                        <button
                          type="button"
                          onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                          className="text-xs px-2 py-0.5 rounded transition-colors"
                          style={{
                            backgroundColor: showMarkdownPreview ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-tertiary)',
                            color: showMarkdownPreview ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {showMarkdownPreview ? 'Edit' : 'Preview'}
                        </button>
                      </div>
                      {showMarkdownPreview ? (
                        <div
                          className="rounded-lg p-3 min-h-[4.5rem] text-sm"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)' }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(annMessageTemplate) || '<span style="color:var(--text-secondary)">Nothing to preview</span>' }}
                        />
                      ) : (
                        <textarea
                          value={annMessageTemplate}
                          onChange={(e) => setAnnMessageTemplate(e.target.value)}
                          rows={3}
                          className="input"
                          placeholder="Pre-filled message content (supports **bold**, *italic*, [links](url), lists)"
                        />
                      )}
                    </div>

                    <div>
                      <IconPicker
                        value={annIcon}
                        onChange={setAnnIcon}
                        color={annColor}
                        onColorChange={setAnnColor}
                        showColorPicker
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={() => { setShowAnnouncementModal(false); setEditingAnnTemplate(null); }} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" disabled={announcementSaving} className="btn btn-primary">
                        {announcementSaving ? 'Saving...' : editingAnnTemplate ? 'Update Template' : 'Create Template'}
                      </button>
                    </div>
                  </form>

                  {/* Live Preview */}
                  <div>
                    <label className="label">Preview</label>
                    <div className="space-y-3">
                      {/* Ticker pill preview */}
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Header ticker pill</p>
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${annColor || '#3b82f6'} 15%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${annColor || '#3b82f6'} 30%, transparent)`,
                          }}
                        >
                          {annIcon && (
                            <Icon icon={annIcon} className="h-4 w-4" style={{ color: annColor || '#3b82f6' }} />
                          )}
                          <span style={{ color: 'var(--text-primary)' }}>
                            <strong>{annTitlePrefix || ''}{annTemplateName || 'Announcement Title'}</strong>
                            {annMessageTemplate && (
                              <span style={{ color: 'var(--text-secondary)' }}> — {annMessageTemplate.slice(0, 50)}{annMessageTemplate.length > 50 ? '...' : ''}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Card preview */}
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Template card</p>
                        <div
                          className="rounded-xl p-4"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `color-mix(in srgb, ${annColor || '#3b82f6'} 20%, transparent)` }}
                            >
                              {annIcon ? (
                                <Icon icon={annIcon} className="h-4 w-4" style={{ color: annColor || '#3b82f6' }} />
                              ) : (
                                <MegaphoneIcon className="h-4 w-4" style={{ color: annColor || '#3b82f6' }} />
                              )}
                            </div>
                            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                              {annTitlePrefix || ''}{annTemplateName || 'Template Name'}
                            </span>
                          </div>
                          {annMessageTemplate && (
                            <div
                              className="text-xs pl-11"
                              style={{ color: 'var(--text-secondary)' }}
                              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(annMessageTemplate) }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
