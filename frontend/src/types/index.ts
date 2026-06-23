export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount?: number;
  groupCount?: number;
  groupUserCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  roleId: string;
  role?: Role;
  userCount?: number;
  memberPreview?: { id: string; username: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  phone?: string;
  address?: string;
  gender?: string;  // 'male', 'female', or LDAP-provided value
  roleId?: string;
  role?: Role;
  avatarPath?: string | null;
  isLdap?: boolean;
  isActive?: boolean;
  canAccessQuarantine?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'email' | null;
  createdAt?: string;
}

export type IconSize = 'small' | 'medium' | 'large';

// Two-Factor Authentication
export interface TwoFactorSetupResponse {
  method: 'totp' | 'email';
  secret?: string;
  qrCodeDataUrl?: string;
  backupCodes: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  method: string | null;
  methods: ('totp' | 'email')[];
  totpConfigured: boolean;
  emailConfigured: boolean;
  backupCodesRemaining: number;
}

export interface LoginResponse {
  requires2FA?: boolean;
  pendingToken?: string;
  methods?: ('totp' | 'email')[];
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconSize?: IconSize;
  iconColor?: string;
  iconBackgroundColor?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  _count?: { items: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  iconSize?: IconSize;
  iconColor?: string;
  iconBackgroundColor?: string;
  _count?: { items: number };
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  type: 'location' | 'room' | 'zone' | 'aisle' | 'row' | 'bay' | 'shelf' | 'bin' | 'box';
  address?: string;
  barcode?: string;
  parentId?: string;
  parent?: Location;
  children?: Location[];
  items?: {
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    minQuantity?: number;
    images?: { filename: string }[];
  }[];
  capacity?: number;
  _count?: { items: number; children: number };
}

export interface ItemImage {
  id: string;
  filename: string;
  originalName: string;
  isPrimary: boolean;
  backgroundColor?: string; // Hex color or null/undefined for transparent
}

export interface ItemAttribute {
  id: string;
  attributeName: string;
  attributeValue: string;
}

export interface ItemLink {
  id: string;
  itemAId: string;
  itemBId: string;
  linkType: 'related' | 'accessory' | 'alternative';
  notes?: string;
  createdAt: string;
  linkedItem: {
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    images?: { filename: string }[];
    template?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
    category?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
  };
}

export interface ItemInstance {
  id: string;
  itemId: string;
  serialNumber: string;
  status: string;
  condition: string;
  notes?: string;
  acquiredDate?: string;
  warrantyExpiry?: string;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubItem {
  id: string;
  childItemId: string;
  quantityRequired: number;
  partNumber?: string;
  notes?: string;
  sortOrder?: number;
  childItem: {
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    images?: { filename: string }[];
    template?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
    category?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
    tags?: { tag: Tag }[];
    _count?: { subItems: number };
  };
}

export interface SubItemTreeNode {
  id: string;
  childItemId: string;
  quantityRequired: number;
  partNumber?: string;
  childItem: {
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    images?: { filename: string }[];
    template?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
    category?: {
      id: string;
      name: string;
      icon?: string;
      iconColor?: string;
      iconBackgroundColor?: string;
    };
    tags?: { tag: Tag }[];
    _count?: { subItems: number };
  };
  hasChildren: boolean;
  childrenCount: number;
  children?: SubItemTreeNode[];
}

export interface ItemModel3D {
  id: string;
  itemId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Item {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  templateId?: string;
  quantity: number;
  minQuantity: number;
  price?: number;
  currency?: string;
  trackSerialNumbers?: boolean;
  is360Set?: boolean;
  category?: Category;
  location?: Location;
  template?: ItemTemplate;
  tags: Tag[];
  images: ItemImage[];
  primaryImage?: ItemImage;
  attributes: ItemAttribute[];
  model3d?: ItemModel3D;
  subItems: SubItem[];
  instances?: ItemInstance[];
  links?: ItemLink[];
  parentItems?: {
    id: string;
    parentItem: {
      id: string;
      name: string;
      sku?: string;
      images?: { filename: string }[];
      template?: {
        id: string;
        name: string;
        icon?: string;
        iconColor?: string;
        iconBackgroundColor?: string;
      };
      category?: {
        id: string;
        name: string;
        icon?: string;
        iconColor?: string;
        iconBackgroundColor?: string;
      };
      tags?: { tag: Tag }[];
    };
  }[];
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
  _count?: { subItems: number; parentItems: number; instances?: number };
}

export interface ItemHistory {
  id: string;
  itemId: string;
  userId: string;
  action: string;
  oldQuantity?: number;
  newQuantity?: number;
  notes?: string;
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    roleName?: string | null;
    authMethod?: string;
  };
  createdAt: string;
  // Fields for restore feature
  changes?: Record<string, { old: any; new: any }>;
  auditLogId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface AttributeTemplate {
  id: string;
  categoryId: string;
  attributeName: string;
  attributeType: 'text' | 'number' | 'select' | 'boolean' | 'date';
  options?: string;
  isRequired: boolean;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED';
  entityType: string;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName?: string | null;
    roleName?: string | null;
    authMethod?: string;
  } | null;
  createdAt: string;
}

// Item Templates
export type TemplateFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'url' | 'unit';

export interface ItemTemplateField {
  id: string;
  templateId: string;
  fieldName: string;
  fieldType: TemplateFieldType;
  isRequired: boolean;
  defaultValue?: string;
  options?: string; // JSON array for select options
  unitType?: string; // voltage, amperage, length, weight, etc.
  unitOptions?: string; // JSON array of valid units: ["V", "mV"]
  sortOrder: number;
  // Enhanced field properties
  fieldGroup?: string; // Group name for organizing fields (e.g., "Electrical", "Physical", "Network")
  placeholder?: string; // Placeholder text for input fields
  helpText?: string; // Help text/description shown below the field
  prefix?: string; // Text prefix (e.g., "$", "#")
  suffix?: string; // Text suffix (e.g., "units", "pcs")
  minValue?: number; // Minimum value for number fields
  maxValue?: number; // Maximum value for number fields
  pattern?: string; // Regex pattern for text validation
}

export interface ItemTemplateSuggestedSubItem {
  id: string;
  templateId: string;
  suggestedTemplateId: string;
  description?: string;
  quantityRequired: number;
  sortOrder: number;
  suggestedTemplate?: {
    id: string;
    name: string;
    icon?: string;
    iconColor?: string;
  };
}

export interface ItemTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  fieldGroups?: string;
  isActive: boolean;
  isStarter: boolean;
  fields?: ItemTemplateField[];
  suggestedItems?: ItemTemplateSuggestedSubItem[];
  _count?: { items: number; fields: number };
  createdAt: string;
  updatedAt: string;
}

// All available permissions
export const PERMISSIONS = {
  ITEMS_CREATE: 'items:create',
  ITEMS_READ: 'items:read',
  ITEMS_UPDATE: 'items:update',
  ITEMS_DELETE: 'items:delete',
  ITEMS_BARCODE: 'items:barcode',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',
  LOCATIONS_CREATE: 'locations:create',
  LOCATIONS_READ: 'locations:read',
  LOCATIONS_UPDATE: 'locations:update',
  LOCATIONS_DELETE: 'locations:delete',
  LOCATIONS_BARCODE: 'locations:barcode',
  TAGS_CREATE: 'tags:create',
  TAGS_READ: 'tags:read',
  TAGS_UPDATE: 'tags:update',
  TAGS_DELETE: 'tags:delete',
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  GROUPS_CREATE: 'groups:create',
  GROUPS_READ: 'groups:read',
  GROUPS_UPDATE: 'groups:update',
  GROUPS_DELETE: 'groups:delete',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  AUDIT_READ: 'audit:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  QUARANTINE_MANAGE: 'quarantine:manage',
} as const;

// SMTP Configuration
export interface SmtpConfig {
  provider: string;
  host: string;
  port: string;
  username: string;
  password: string;
  sslMode: 'none' | 'starttls' | 'ssl';
  fromEmail: string;
  fromName: string;
}

export interface SmtpProvider {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
}

// Notification Configuration
export type NotificationType = 'low_stock' | 'item_quarantined' | 'quarantine_expiring' | 'failed_login' | 'item_created' | 'permission_change';

export type NotificationFrequency = 'immediate' | 'daily' | 'every_2_days' | 'every_3_days' | 'every_4_days' | 'weekly';

export const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 Days' },
  { value: 'every_3_days', label: 'Every 3 Days' },
  { value: 'every_4_days', label: 'Every 4 Days' },
  { value: 'weekly', label: 'Weekly' }
];

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  enabled: boolean;
  frequency: NotificationFrequency;
  recipientRoleIds: string[];
  recipientGroupIds: string[];
  recipientUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecipients {
  roles: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  users: { id: string; username: string; email: string; displayName: string }[];
}

// Email Templates
export interface EmailTemplateData {
  subject: string;
  html: string;
  isCustom: boolean;
  variables: { name: string; description: string }[];
  sampleData: Record<string, string>;
}

export interface NotificationTemplates {
  immediate?: EmailTemplateData;
  digest?: EmailTemplateData;
}

// Quarantine
export interface QuarantinedItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
  } | null;
  expiresAt: string;
  daysUntilExpiration: number;
}

export interface QuarantinedImage {
  id: string;
  itemId: string;
  filename: string;
  originalName: string;
  itemName: string;
  deletedAt: string;
  deletedBy: { id: string; username: string } | null;
  expiresAt: string;
  daysUntilExpiration: number;
}

export interface ApiPermission {
  key: string;
  label: string;
  description: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email?: string;
  };
  key?: string; // Only returned on creation
  // IP Restrictions
  ipRestrictionMode?: 'none' | 'whitelist' | 'blacklist';
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  // Rate Limits
  rateLimitPerMinute?: number | null;
  rateLimitPerHour?: number | null;
  rateLimitPerDay?: number | null;
  // Rate limit status (returned from API)
  rateLimitStatus?: {
    minute: { used: number; limit: number; remaining: number; resetAt: number | null };
    hour: { used: number; limit: number; remaining: number; resetAt: number | null };
    day: { used: number; limit: number; remaining: number; resetAt: number | null };
  };
  defaultLimits?: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  deviceUuid?: string | null;
  imei?: string | null;
  serialNumber?: string | null;
  androidVersion?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  isBlocked: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

// Import/Export types
export interface ImportRow {
  name: string;
  sku?: string | null;
  description?: string | null;
  categoryId?: string | null;
  locationId?: string | null;
  templateId?: string | null;
  quantity: number;
  minQuantity: number;
  tagIds?: string[];
  attributes?: { name: string; value: string }[];
  existingSku?: boolean;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreviewResult {
  valid: ImportRow[];
  errors: ImportValidationError[];
  total: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  imagesImported: number;
  categoriesCreated?: number;
  tagsCreated?: number;
  locationsCreated?: number;
  errors: string[];
}

export interface ExportOptions {
  includeImages: boolean;
  includeTags: boolean;
  includeCategory: boolean;
  includeLocation: boolean;
}

export type MissingRefAction = 'create' | 'skip-field' | 'skip-row';

export interface MissingRefHandling {
  categories: MissingRefAction;
  tags: MissingRefAction;
  locations: MissingRefAction;
}

export interface MissingRefs {
  categories: string[];
  tags: string[];
  locations: string[];
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  linkedItemId?: string | null;
  linkedItem?: {
    id: string;
    name: string;
    sku?: string | null;
    quantity?: number;
    minQuantity?: number;
    images?: { id: string; filename: string }[];
    category?: { id: string; name: string; icon?: string | null; iconColor?: string | null; iconBackgroundColor?: string | null } | null;
    location?: { id: string; name: string; type?: string } | null;
    tags?: { tag: { id: string; name: string; color: string; icon?: string | null; iconColor?: string | null; iconBackgroundColor?: string | null } }[];
    template?: { id: string; name: string; icon?: string | null; iconColor?: string | null; iconBackgroundColor?: string | null } | null;
  } | null;
  actionUrl?: string | null;
  targetRoleIds?: string[];
  targetGroupIds?: string[];
  targetUserIds?: string[];
  isPinned?: boolean;
  priority?: number;
  dismissType?: 'none' | 'permanent' | 'until_update';
  useLinkedItemImage?: boolean;
  createdById: string;
  createdBy?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: { reads: number };
}

export interface AnnouncementTemplate {
  id: string;
  name: string;
  titlePrefix?: string | null;
  messageTemplate?: string | null;
  icon?: string | null;
  color?: string | null;
  isBuiltIn: boolean;
  createdAt: string;
}
