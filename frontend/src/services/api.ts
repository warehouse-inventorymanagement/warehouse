import axios from 'axios';
import type { ApiResponse, User, Category, Tag, Location, Item, ItemHistory, AttributeTemplate, Role, AuditLog, Group, ItemTemplate, ItemTemplateField, ItemTemplateSuggestedSubItem, SmtpProvider, NotificationConfig, NotificationType, NotificationFrequency, NotificationRecipients, NotificationTemplates, QuarantinedItem, Pagination, ApiKey, ApiPermission, Device, SubItemTreeNode, Announcement, AnnouncementTemplate } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh and log API errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log API errors to console (will be captured by frontend logger)
    if (error.response) {
      const { status, data } = error.response;
      const url = originalRequest?.url || 'unknown';
      const method = originalRequest?.method?.toUpperCase() || 'UNKNOWN';
      const message = data?.message || data?.error || 'Unknown error';
      console.error(`[API Error] ${method} ${url} - ${status}: ${message}`);
    } else if (error.request) {
      console.error(`[API Error] Network error - no response received`);
    } else {
      console.error(`[API Error] Request failed: ${error.message}`);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>('/auth/login', { username, password }),

  ldapLogin: (username: string, password: string) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>('/auth/ldap-login', { username, password }),

  register: (username: string, email: string, password: string) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>('/auth/register', { username, email, password }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  getLdapStatus: () =>
    api.get<ApiResponse<{ enabled: boolean }>>('/auth/ldap-status'),

  // Two-Factor Authentication
  verify2FA: (pendingToken: string, code: string, method?: string) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>('/auth/verify-2fa', { pendingToken, code, method }),

  resend2FA: (pendingToken: string) =>
    api.post('/auth/2fa/resend', { pendingToken }),

  setup2FA: (method: 'totp' | 'email') =>
    api.post<ApiResponse<{ method: string; secret?: string; qrCodeDataUrl?: string; backupCodes: string[] }>>('/auth/2fa/setup', { method }),

  confirm2FA: (code: string, method: string) =>
    api.post('/auth/2fa/confirm', { code, method }),

  disable2FA: (data: { password?: string; code?: string; method?: string }) =>
    api.post('/auth/2fa/disable', data),

  sendEmailCode: (pendingToken: string) =>
    api.post('/auth/2fa/resend', { pendingToken }),

  regenerateBackupCodes: (data: { password?: string; code?: string }) =>
    api.post<ApiResponse<{ backupCodes: string[] }>>('/auth/2fa/backup-codes/regenerate', data),

  get2FAStatus: () =>
    api.get<ApiResponse<{ enabled: boolean; method: string | null; methods: ('totp' | 'email')[]; totpConfigured: boolean; emailConfigured: boolean; backupCodesRemaining: number }>>('/auth/2fa/status'),
};

// Users
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<User[]>>('/users', { params }),

  getOne: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  create: (data: { username: string; email: string; password?: string; roleId?: string }) =>
    api.post<ApiResponse<User>>('/users', data),

  update: (id: string, data: Partial<{ username: string; email: string; roleId: string; isActive: boolean }>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<ApiResponse<{ avatarPath: string }>>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Roles
export const rolesApi = {
  getAll: () =>
    api.get<ApiResponse<Role[]>>('/roles'),

  getOne: (id: string) =>
    api.get<ApiResponse<Role>>(`/roles/${id}`),

  getPermissions: () =>
    api.get<ApiResponse<{ all: string[]; grouped: Record<string, string[]>; defaults: Record<string, string[]> }>>('/roles/permissions'),

  create: (data: { name: string; description?: string; permissions: string[] }) =>
    api.post<ApiResponse<Role>>('/roles', data),

  update: (id: string, data: Partial<{ name: string; description: string; permissions: string[] }>) =>
    api.put<ApiResponse<Role>>(`/roles/${id}`, data),

  delete: (id: string) =>
    api.delete(`/roles/${id}`),

  seed: () =>
    api.post('/roles/seed'),

  syncPermissions: () =>
    api.post<{ success: boolean; message: string; data: { updated: { name: string; oldCount: number; newCount: number }[] } }>('/roles/sync-permissions')
};

// Groups
export const groupsApi = {
  getAll: () =>
    api.get<ApiResponse<Group[]>>('/groups'),

  getOne: (id: string) =>
    api.get<ApiResponse<Group & { members: { id: string; username: string; email: string; ldapDn?: string }[] }>>(`/groups/${id}`),

  create: (data: { name: string; description?: string; roleId: string }) =>
    api.post<ApiResponse<Group>>('/groups', data),

  update: (id: string, data: Partial<{ name: string; description: string; roleId: string }>) =>
    api.put<ApiResponse<Group>>(`/groups/${id}`, data),

  delete: (id: string) =>
    api.delete(`/groups/${id}`),

  addMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }),

  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),

  getAvailableUsers: (groupId: string) =>
    api.get<ApiResponse<{ id: string; username: string; email: string; ldapDn?: string }[]>>(`/groups/${groupId}/available-users`)
};

// Audit Logs
export const auditApi = {
  getAll: (params?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<ApiResponse<AuditLog[]>>('/audit', { params }),

  getEntityHistory: (entityType: string, entityId: string) =>
    api.get<ApiResponse<AuditLog[]>>(`/audit/${entityType}/${entityId}`),

  exportCsv: (params?: {
    entityType?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get('/audit/export', { params, responseType: 'blob' }),

  getStats: (days?: number) =>
    api.get('/audit/stats/summary', { params: { days } }),
};

// Settings
export const settingsApi = {
  getAll: () =>
    api.get<ApiResponse<Record<string, string>>>('/settings'),

  update: (settings: Record<string, string>) =>
    api.put<ApiResponse<Record<string, string>>>('/settings', { settings }),

  getNetworkInterfaces: () =>
    api.get<ApiResponse<{ name: string; address: string; family: string }[]>>('/settings/network/interfaces'),

  testLdap: (params: { url: string; bindDn: string; bindPassword: string; searchBase: string; verifySsl: boolean }) =>
    api.post<{ success: boolean; message: string }>('/settings/ldap/test', params),

  testLdapUser: (params: {
    username: string;
    password: string;
    url: string;
    bindDn: string;
    bindPassword: string;
    searchBase: string;
    searchFilter: string;
    verifySsl: boolean;
    requiredGroup?: string;
    adminGroup?: string;
    viewerGroup?: string;
    userGroup?: string;
    technicianGroup?: string;
    managerGroup?: string;
  }) =>
    api.post<{
      success: boolean;
      message: string;
      data: {
        dn: string;
        email?: string;
        displayName?: string;
        groups: string[];
        isAdmin?: boolean;
        roleName?: string | null;
      } | null;
    }>('/settings/ldap/test-user', params),

  testLdapGroup: (params: { url: string; bindDn: string; bindPassword: string; searchBase: string; groupName: string; verifySsl: boolean }) =>
    api.post<{ success: boolean; message: string; totalUsers: number; sampleUsers: string[] }>('/settings/ldap/test-group', params),

  syncLdapUsers: () =>
    api.post<{ success: boolean; message: string; data: { synced: number; errors: string[] } }>('/settings/ldap/sync-users'),

  // Branding
  getBrandingPublic: () =>
    api.get<ApiResponse<Record<string, string>>>('/settings/branding/public'),

  uploadBrandingAsset: (files: { logoLight?: File; logoDark?: File; favicon?: File; loginBackground?: File }) => {
    const formData = new FormData();
    if (files.logoLight) formData.append('logoLight', files.logoLight);
    if (files.logoDark) formData.append('logoDark', files.logoDark);
    if (files.favicon) formData.append('favicon', files.favicon);
    if (files.loginBackground) formData.append('loginBackground', files.loginBackground);
    return api.post<ApiResponse<Record<string, string>>>('/settings/branding/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteBrandingAsset: (asset: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark' | 'favicon' | 'loginBackground') =>
    api.delete(`/settings/branding/${asset}`),

  // SMTP
  getSmtpProviders: () =>
    api.get<ApiResponse<SmtpProvider[]>>('/settings/smtp/providers'),

  getSmtpConfig: () =>
    api.get<ApiResponse<Record<string, string>>>('/settings/smtp'),

  updateSmtpConfig: (config: {
    provider?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    sslMode?: string;
    fromEmail?: string;
    fromName?: string;
  }) =>
    api.put<ApiResponse<Record<string, string>>>('/settings/smtp', config),

  testSmtp: (recipientEmail: string) =>
    api.post<{ success: boolean; message: string }>('/settings/smtp/test', { recipientEmail }),

  // Notifications
  getNotifications: () =>
    api.get<ApiResponse<Record<NotificationType, NotificationConfig | null>>>('/settings/notifications'),

  getNotificationRecipients: () =>
    api.get<ApiResponse<NotificationRecipients>>('/settings/notifications/recipients'),

  updateNotification: (type: NotificationType, data: {
    enabled?: boolean;
    frequency?: NotificationFrequency;
    recipientRoleIds?: string[];
    recipientGroupIds?: string[];
    recipientUserIds?: string[];
  }) =>
    api.put<ApiResponse<NotificationConfig>>(`/settings/notifications/${type}`, data),

  getNotificationTemplates: (type: NotificationType) =>
    api.get<ApiResponse<NotificationTemplates>>(`/settings/notifications/${type}/templates`),

  updateNotificationTemplate: (type: NotificationType, data: {
    variant: 'immediate' | 'digest';
    subject: string;
    html: string;
  }) =>
    api.put<ApiResponse<void>>(`/settings/notifications/${type}/templates`, data),

  revertNotificationTemplate: (type: NotificationType, variant: 'immediate' | 'digest') =>
    api.delete(`/settings/notifications/${type}/templates/${variant}`),

  // Quarantine
  getQuarantinedItems: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<QuarantinedItem[]> & { pagination: Pagination; retentionDays: number; canManage: boolean; isAdmin: boolean }>('/settings/quarantine', { params }),

  restoreItem: (id: string) =>
    api.post(`/settings/quarantine/${id}/restore`),

  bulkRestoreItems: (itemIds: string[]) =>
    api.post('/settings/quarantine/restore', { itemIds }),

  permanentDeleteItem: (id: string) =>
    api.delete(`/settings/quarantine/${id}`),

  bulkPermanentDeleteItems: (itemIds: string[]) =>
    api.delete('/settings/quarantine', { data: { itemIds } }),

  // Quarantine images
  getQuarantinedImages: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/settings/quarantine/images', { params }),

  restoreQuarantineImage: (id: string) =>
    api.post(`/settings/quarantine/images/${id}/restore`),

  bulkRestoreImages: (imageIds: string[]) =>
    api.post('/settings/quarantine/images/restore', { imageIds }),

  permanentDeleteImage: (id: string) =>
    api.delete(`/settings/quarantine/images/${id}`),

  bulkPermanentDeleteImages: (imageIds: string[]) =>
    api.delete('/settings/quarantine/images', { data: { imageIds } }),

  // Logs
  getLogs: (params?: { limit?: number; level?: string; source?: string; search?: string; since?: string }) =>
    api.get<ApiResponse<{ logs: any[]; stats: any }>>('/settings/logs', { params }),

  getLogsSince: (lastId: string) =>
    api.get<ApiResponse<any[]>>(`/settings/logs/since/${lastId}`),

  clearLogs: () =>
    api.delete('/settings/logs'),

  sendFrontendLogs: (logs: Array<{ level: string; message: string; timestamp: string; metadata?: Record<string, any> }>) =>
    api.post('/settings/logs/frontend', { logs }),

  getNginxLogConfig: () =>
    api.get<ApiResponse<{ 'nginx.accessLog': string; 'nginx.errorLog': string }>>('/settings/logs/nginx-config'),

  updateNginxLogConfig: (config: { accessLog?: string; errorLog?: string }) =>
    api.put<ApiResponse<void>>('/settings/logs/nginx-config', config),

  // Database
  getDatabaseInfo: () =>
    api.get<ApiResponse<any>>('/settings/database/info'),

  getBackupList: () =>
    api.get<ApiResponse<any[]>>('/settings/database/backups'),

  triggerRetentionCleanup: () =>
    api.post<ApiResponse<{ auditDeleted: number; historyDeleted: number }>>('/settings/database/cleanup'),

  createBackup: (includeUploads: boolean = true, includeEnvConfig: boolean = false) =>
    api.post<ApiResponse<{ filename: string; downloadUrl: string }>>('/settings/database/backup', { includeUploads, includeEnvConfig }),

  downloadBackup: (filename: string) =>
    api.get(`/settings/database/backup/${filename}`, { responseType: 'blob' }),

  deleteBackup: (filename: string) =>
    api.delete(`/settings/database/backup/${filename}`),

  restoreBackup: (file: File, createBackupFirst: boolean = true) => {
    const formData = new FormData();
    formData.append('backup', file);
    formData.append('createBackupFirst', createBackupFirst.toString());
    return api.post<ApiResponse<{ message: string }>>('/settings/database/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
};

// Categories
export const categoriesApi = {
  getAll: (flat?: boolean) =>
    api.get<ApiResponse<Category[]>>('/categories', { params: { flat } }),

  getOne: (id: string) =>
    api.get<ApiResponse<Category>>(`/categories/${id}`),

  create: (data: { name: string; description?: string; parentId?: string; icon?: string; iconSize?: string; iconColor?: string; iconBackgroundColor?: string }) =>
    api.post<ApiResponse<Category>>('/categories', data),

  update: (id: string, data: Partial<{ name: string; description: string; parentId: string | null; icon: string | null; iconSize: string; iconColor: string | null; iconBackgroundColor: string | null }>) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`),

  getAttributes: (id: string) =>
    api.get<ApiResponse<AttributeTemplate[]>>(`/categories/${id}/attributes`),

  addAttribute: (id: string, data: { attributeName: string; attributeType?: string; options?: string[]; isRequired?: boolean }) =>
    api.post<ApiResponse<AttributeTemplate>>(`/categories/${id}/attributes`, data),

  deleteAttribute: (categoryId: string, attributeId: string) =>
    api.delete(`/categories/${categoryId}/attributes/${attributeId}`)
};

// Tags
export const tagsApi = {
  getAll: () =>
    api.get<ApiResponse<Tag[]>>('/tags'),

  create: (data: { name: string; color?: string; icon?: string; iconSize?: string; iconColor?: string; iconBackgroundColor?: string }) =>
    api.post<ApiResponse<Tag>>('/tags', data),

  update: (id: string, data: Partial<{ name: string; color: string; icon: string | null; iconSize: string; iconColor: string | null; iconBackgroundColor: string | null }>) =>
    api.put<ApiResponse<Tag>>(`/tags/${id}`, data),

  delete: (id: string) =>
    api.delete(`/tags/${id}`)
};

// Locations
export const locationsApi = {
  getAll: (flat?: boolean) =>
    api.get<ApiResponse<Location[]>>('/locations', { params: { flat } }),

  getOne: (id: string) =>
    api.get<ApiResponse<Location>>(`/locations/${id}`),

  getPath: (id: string) =>
    api.get<ApiResponse<{ id: string; name: string; type: string }[]>>(`/locations/${id}/path`),

  create: (data: { name: string; description?: string; type?: string; address?: string; parentId?: string; capacity?: number }) =>
    api.post<ApiResponse<Location>>('/locations', data),

  update: (id: string, data: Partial<{ name: string; description: string; type: string; address: string | null; parentId: string | null; capacity: number | null }>) =>
    api.put<ApiResponse<Location>>(`/locations/${id}`, data),

  delete: (id: string) =>
    api.delete(`/locations/${id}`),

  generateBarcode: (id: string, format: 'short' | 'full' = 'short') =>
    api.post<ApiResponse<Location>>(`/locations/${id}/generate-barcode`, { format }),

  updateBarcode: (id: string, barcode: string) =>
    api.put<ApiResponse<Location>>(`/locations/${id}/barcode`, { barcode }),

  getBarcodeUrl: (id: string) =>
    `/api/locations/${id}/barcode`,

  scanBarcode: (code: string) =>
    api.get<ApiResponse<Location>>(`/locations/scan/${encodeURIComponent(code)}`),

  getCapacityOverview: () =>
    api.get('/locations/capacity-overview'),

  printLabels: (ids: string[]) =>
    api.post('/locations/print-labels', { ids }, { responseType: 'text' }),
};

// Templates
export const templatesApi = {
  getAll: () =>
    api.get<ApiResponse<ItemTemplate[]>>('/templates'),

  getOne: (id: string) =>
    api.get<ApiResponse<ItemTemplate>>(`/templates/${id}`),

  create: (data: { name: string; description?: string; icon?: string; iconColor?: string; iconBackgroundColor?: string }) =>
    api.post<ApiResponse<ItemTemplate>>('/templates', data),

  update: (id: string, data: Partial<{ name: string; description: string; icon: string; iconColor: string; iconBackgroundColor: string; isActive: boolean }>) =>
    api.put<ApiResponse<ItemTemplate>>(`/templates/${id}`, data),

  delete: (id: string) =>
    api.delete(`/templates/${id}`),

  addField: (templateId: string, data: {
    fieldName: string;
    fieldType?: string;
    isRequired?: boolean;
    defaultValue?: string;
    options?: string[];
    unitType?: string;
    unitOptions?: string[];
    sortOrder?: number;
  }) =>
    api.post<ApiResponse<ItemTemplateField>>(`/templates/${templateId}/fields`, data),

  updateField: (templateId: string, fieldId: string, data: Partial<{
    fieldName: string;
    fieldType: string;
    isRequired: boolean;
    defaultValue: string;
    options: string[];
    unitType: string;
    unitOptions: string[];
    sortOrder: number;
  }>) =>
    api.put<ApiResponse<ItemTemplateField>>(`/templates/${templateId}/fields/${fieldId}`, data),

  deleteField: (templateId: string, fieldId: string) =>
    api.delete(`/templates/${templateId}/fields/${fieldId}`),

  updateFieldGroups: (templateId: string, fieldGroups: string[]) =>
    api.put(`/templates/${templateId}/field-groups`, { fieldGroups }),

  addSuggested: (templateId: string, data: { suggestedTemplateId: string; description?: string; quantityRequired?: number; sortOrder?: number }) =>
    api.post<ApiResponse<ItemTemplateSuggestedSubItem>>(`/templates/${templateId}/suggested`, data),

  removeSuggested: (templateId: string, suggestedId: string) =>
    api.delete(`/templates/${templateId}/suggested/${suggestedId}`),

  seed: () =>
    api.post<ApiResponse<{ created: number }>>('/templates/seed'),

  duplicate: (id: string, name?: string) =>
    api.post<ApiResponse<ItemTemplate>>(`/templates/${id}/duplicate`, { name }),

  restore: (id: string) =>
    api.post<ApiResponse<ItemTemplate>>(`/templates/${id}/restore`),

  getDefaults: () =>
    api.get<ApiResponse<{ name: string; description: string; icon: string; iconColor?: string; fieldCount: number; exists: boolean; isStarter: boolean }[]>>('/templates/defaults/available')
};

// Custom Icons (imported)
export interface CustomIcon {
  id: string;
  name: string;
  prefix: string;
  svgData: string;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

// Customized Icons (user-styled)
export interface CustomizedIcon {
  id: string;
  name: string;
  sourceIcon: string;
  iconColor?: string | null;
  backgroundColor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const iconsApi = {
  getAll: () =>
    api.get<ApiResponse<CustomIcon[]>>('/icons'),

  getUsage: (iconName: string) =>
    api.get<ApiResponse<{
      iconName: string;
      totalUsage: number;
      usage: {
        categories: { id: string; name: string }[];
        tags: { id: string; name: string }[];
        templates: { id: string; name: string }[];
      };
    }>>(`/icons/${encodeURIComponent(iconName)}/usage`),

  searchExternal: (query: string, limit?: number) =>
    api.get<ApiResponse<{ icons: string[] }>>('/icons/search/external', { params: { q: query, limit } }),

  fetchIcon: (prefix: string, name: string) =>
    api.get<ApiResponse<{ name: string; prefix: string; svgData: string }>>(`/icons/fetch/${prefix}/${name}`),

  create: (data: { name: string; svgData: string }) =>
    api.post<ApiResponse<CustomIcon>>('/icons', data),

  delete: (id: string) =>
    api.delete(`/icons/${id}`),

  // Customized icons
  getCustomized: () =>
    api.get<ApiResponse<CustomizedIcon[]>>('/icons/customized'),

  createCustomized: (data: { name: string; sourceIcon: string; iconColor?: string | null; backgroundColor?: string | null }) =>
    api.post<ApiResponse<CustomizedIcon>>('/icons/customized', data),

  updateCustomized: (id: string, data: { name?: string; iconColor?: string | null; backgroundColor?: string | null }) =>
    api.put<ApiResponse<CustomizedIcon>>(`/icons/customized/${id}`, data),

  deleteCustomized: (id: string) =>
    api.delete(`/icons/customized/${id}`)
};

// Dashboard
export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<any>>('/dashboard/stats'),
  getConfig: () =>
    api.get('/dashboard/config'),
  saveConfig: (layout: any) =>
    api.put('/dashboard/config', { layout }),
  getStockTrend: () =>
    api.get('/dashboard/stock-trend'),
};

// Announcements
export const announcementsApi = {
  getAll: () =>
    api.get<ApiResponse<Announcement[]>>('/announcements'),
  getActive: () =>
    api.get<ApiResponse<Announcement[]>>('/announcements/active'),
  create: (data: {
    title: string; message: string; type?: string; icon?: string | null; color?: string | null;
    isActive?: boolean; startDate?: string | null; endDate?: string | null;
    linkedItemId?: string | null; actionUrl?: string | null;
    targetRoleIds?: string[]; targetGroupIds?: string[]; targetUserIds?: string[];
    isPinned?: boolean; priority?: number; dismissType?: 'none' | 'permanent' | 'until_update';
    useLinkedItemImage?: boolean;
  }) =>
    api.post<ApiResponse<Announcement>>('/announcements', data),
  update: (id: string, data: Partial<{
    title: string; message: string; type: string; icon: string | null; color: string | null;
    isActive: boolean; startDate: string | null; endDate: string | null;
    linkedItemId: string | null; actionUrl: string | null;
    targetRoleIds: string[]; targetGroupIds: string[]; targetUserIds: string[];
    isPinned: boolean; priority: number; dismissType: 'none' | 'permanent' | 'until_update';
    useLinkedItemImage: boolean;
  }>) =>
    api.put<ApiResponse<Announcement>>(`/announcements/${id}`, data),
  duplicate: (id: string) =>
    api.post<ApiResponse<Announcement>>(`/announcements/${id}/duplicate`),
  delete: (id: string) =>
    api.delete(`/announcements/${id}`),
  dismiss: (id: string) =>
    api.post(`/announcements/${id}/dismiss`),
  markRead: (id: string) =>
    api.post(`/announcements/${id}/read`),
  getReads: (id: string) =>
    api.get<ApiResponse<{ userId: string; readAt: string; user: { id: string; username: string; firstName?: string; lastName?: string; email: string } }[]>>(`/announcements/${id}/reads`),
  getRecipients: () =>
    api.get<ApiResponse<NotificationRecipients>>('/announcements/recipients'),
  getTemplates: () =>
    api.get<ApiResponse<AnnouncementTemplate[]>>('/announcements/templates'),
  createTemplate: (data: { name: string; titlePrefix?: string; messageTemplate?: string; icon?: string; color?: string }) =>
    api.post<ApiResponse<AnnouncementTemplate>>('/announcements/templates', data),
  updateTemplate: (id: string, data: { name?: string; titlePrefix?: string; messageTemplate?: string; icon?: string; color?: string }) =>
    api.put<ApiResponse<AnnouncementTemplate>>(`/announcements/templates/${id}`, data),
  deleteTemplate: (id: string) =>
    api.delete(`/announcements/templates/${id}`),
};

// Items
export const itemsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    locationId?: string;
    templateId?: string;
    tags?: string;
    lowStock?: boolean;
    componentFilter?: string;
    sortBy?: string;
    sortOrder?: string;
  }) =>
    api.get<ApiResponse<Item[]>>('/items', { params }),

  getLowStock: () =>
    api.get<ApiResponse<Item[]>>('/items/low-stock'),

  checkDuplicates: (params: { name?: string; sku?: string; excludeId?: string }) =>
    api.get<ApiResponse<{ nameMatches: { id: string; name: string; sku: string | null }[]; skuMatch: { id: string; name: string; sku: string | null } | null }>>('/items/check-duplicates', { params }),

  globalSearch: (q: string) =>
    api.get('/items/global-search', { params: { q } }),

  toggleWatch: (id: string) =>
    api.post<ApiResponse<{ watching: boolean }>>(`/items/${id}/watch`),

  getWatchStatus: (id: string) =>
    api.get<ApiResponse<{ watching: boolean }>>(`/items/${id}/watch`),

  getWatchedItems: () =>
    api.get<ApiResponse<Item[]>>('/items/watched/list'),

  getVersions: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/items/${id}/versions`, { params }),

  getVersion: (id: string, version: number) =>
    api.get(`/items/${id}/versions/${version}`),

  rollbackToVersion: (id: string, version: number) =>
    api.post(`/items/${id}/versions/${version}/rollback`),

  getImportHistory: () =>
    api.get('/items/import/history'),

  getOne: (id: string) =>
    api.get<ApiResponse<Item>>(`/items/${id}`),

  getHistory: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<ItemHistory[]>>(`/items/${id}/history`, { params }),

  create: (data: {
    name: string;
    sku?: string;
    description?: string;
    categoryId?: string;
    locationId?: string;
    templateId?: string;
    quantity?: number;
    minQuantity?: number;
    price?: number;
    currency?: string;
    trackSerialNumbers?: boolean;
    tags?: string[];
    attributes?: { name: string; value: string }[];
  }) =>
    api.post<ApiResponse<Item>>('/items', data),

  update: (id: string, data: Partial<{
    name: string;
    sku: string;
    description: string;
    categoryId: string | null;
    locationId: string | null;
    templateId: string | null;
    minQuantity: number;
    price: number | null;
    currency: string | null;
    trackSerialNumbers: boolean;
    tags: string[];
    attributes: { name: string; value: string }[];
  }>) =>
    api.put<ApiResponse<Item>>(`/items/${id}`, data),

  updateQuantity: (id: string, quantity: number, notes?: string) =>
    api.patch<ApiResponse<Item>>(`/items/${id}/quantity`, { quantity, notes }),

  generateSku: (id: string, regenerate: boolean = false) =>
    api.post<ApiResponse<Item>>(`/items/${id}/generate-sku`, { regenerate }),

  updateSku: (id: string, sku: string) =>
    api.put<ApiResponse<Item>>(`/items/${id}/sku`, { sku }),

  getSkuBarcodeUrl: (id: string) =>
    `/api/items/${id}/barcode`,

  scanSku: (code: string) =>
    api.get<ApiResponse<Item>>(`/items/scan/${encodeURIComponent(code)}`),

  uploadImages: async (id: string, files: File[]) => {
    const results: { id: string; filename: string }[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('images', file);
      const response = await api.post<ApiResponse<{ id: string; filename: string }[]>>(
        `/items/${id}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (response.data.data) {
        results.push(...response.data.data);
      }
    }
    return { data: { data: results } };
  },

  setPrimaryImage: (itemId: string, imageId: string) =>
    api.patch(`/items/${itemId}/images/${imageId}/primary`),

  deleteImage: (itemId: string, imageId: string) =>
    api.delete(`/items/${itemId}/images/${imageId}`),

  restoreImage: (itemId: string, imageId: string) =>
    api.post(`/items/${itemId}/images/${imageId}/restore`),

  getDeletedImages: (itemId: string) =>
    api.get(`/items/${itemId}/images/deleted`),

  updateImageBackground: (itemId: string, imageId: string, backgroundColor: string | null) =>
    api.patch(`/items/${itemId}/images/${imageId}/background`, { backgroundColor }),

  addSubItem: (id: string, data: { childItemId: string; quantityRequired?: number; partNumber?: string; notes?: string }) =>
    api.post<ApiResponse<any>>(`/items/${id}/sub-items`, data),

  updateSubItem: (parentId: string, subItemId: string, data: { quantityRequired?: number; partNumber?: string; notes?: string }) =>
    api.patch<ApiResponse<any>>(`/items/${parentId}/sub-items/${subItemId}`, data),

  removeSubItem: (parentId: string, subItemId: string) =>
    api.delete(`/items/${parentId}/sub-items/${subItemId}`),

  reorderSubItems: (id: string, order: { subItemId: string; sortOrder: number }[]) =>
    api.patch<ApiResponse<any>>(`/items/${id}/sub-items/reorder`, { order }),

  bulkAddSubItems: (id: string, subItems: { childItemId: string; quantityRequired?: number; partNumber?: string; notes?: string }[]) =>
    api.post<ApiResponse<any>>(`/items/${id}/sub-items/bulk`, { subItems }),

  getSubItemTree: (id: string) =>
    api.get<ApiResponse<SubItemTreeNode[]>>(`/items/${id}/sub-items/tree`),

  // BOM
  getBom: (id: string) =>
    api.get<ApiResponse<any>>(`/items/${id}/bom`),

  // Linked Items
  getLinks: (id: string) =>
    api.get<ApiResponse<any>>(`/items/${id}/links`),

  addLink: (id: string, data: { targetItemId: string; linkType: string; notes?: string }) =>
    api.post<ApiResponse<any>>(`/items/${id}/links`, data),

  removeLink: (id: string, linkId: string) =>
    api.delete(`/items/${id}/links/${linkId}`),

  // Serial Number Instances
  getInstances: (id: string) =>
    api.get<ApiResponse<any>>(`/items/${id}/instances`),

  createInstance: (id: string, data: { serialNumber: string; status?: string; condition?: string; notes?: string; acquiredDate?: string; warrantyExpiry?: string; purchasePrice?: number }) =>
    api.post<ApiResponse<any>>(`/items/${id}/instances`, data),

  updateInstance: (id: string, instanceId: string, data: { serialNumber?: string; status?: string; condition?: string; notes?: string; acquiredDate?: string; warrantyExpiry?: string; purchasePrice?: number }) =>
    api.patch<ApiResponse<any>>(`/items/${id}/instances/${instanceId}`, data),

  deleteInstance: (id: string, instanceId: string) =>
    api.delete(`/items/${id}/instances/${instanceId}`),

  searchSerial: (q: string) =>
    api.get<ApiResponse<any>>('/items/search/serial', { params: { q } }),

  getSubItemsForDelete: (id: string) =>
    api.get<ApiResponse<{ id: string; name: string; sku: string | null }[]>>(`/items/${id}/sub-items-for-delete`),

  delete: (id: string, subItemIds?: string[]) =>
    api.delete(`/items/${id}`, { data: subItemIds ? { subItemIds } : undefined }),

  restoreFromHistory: (id: string, auditLogId: string, fields?: string[]) =>
    api.post<ApiResponse<Item>>(`/items/${id}/restore`, { auditLogId, fields }),

  bulkUpdate: (data: {
    itemIds: string[];
    categoryId?: string | null;
    locationId?: string | null;
    templateId?: string | null;
    addTags?: string[];
    removeTags?: string[];
  }) =>
    api.patch<ApiResponse<{ updated: number }>>('/items/bulk', data),

  bulkDuplicate: (itemIds: string[]) =>
    api.post<ApiResponse<{ created: number; createdIds: string[] }>>('/items/bulk/duplicate', { itemIds }),

  exportItems: (params: {
    search?: string;
    categoryId?: string;
    locationId?: string;
    templateId?: string;
    tags?: string;
    lowStock?: boolean;
    itemIds?: string[];
    options: {
      includeImages: boolean;
      includeTags: boolean;
      includeCategory: boolean;
      includeLocation: boolean;
    };
  }) => {
    // Always use POST to send options in body
    const { itemIds, options, ...filters } = params;
    return api.post('/items/export', { itemIds, options, filters }, { responseType: 'blob' });
  },

  getImportTemplate: () =>
    api.get('/items/import/template', { responseType: 'blob' }),

  importPreview: (formData: FormData, missingRefHandling?: {
    categories: 'create' | 'skip-field' | 'skip-row';
    tags: 'create' | 'skip-field' | 'skip-row';
    locations: 'create' | 'skip-field' | 'skip-row';
  }) => {
    if (missingRefHandling) {
      formData.append('missingRefHandling', JSON.stringify(missingRefHandling));
    }
    return api.post<ApiResponse<{
      valid: any[];
      errors: { row: number; field: string; message: string }[];
      total: number;
      imageCount: number;
      sessionId: string | null;
      missingRefs: {
        categories: string[];
        tags: string[];
        locations: string[];
      };
    }>>('/items/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  uploadModel3D: (id: string, formData: FormData) =>
    api.post(`/items/${id}/model3d`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  deleteModel3D: (id: string) =>
    api.delete(`/items/${id}/model3d`),

  toggle360: (id: string, enabled: boolean) =>
    api.patch(`/items/${id}/360`, { enabled }),

  reorderImages: (id: string, imageIds: string[]) =>
    api.patch(`/items/${id}/images/reorder`, { imageIds }),

  importItems: (rows: any[], sessionId?: string | null, missingRefHandling?: {
    categories: 'create' | 'skip-field' | 'skip-row';
    tags: 'create' | 'skip-field' | 'skip-row';
    locations: 'create' | 'skip-field' | 'skip-row';
  }) =>
    api.post<ApiResponse<{ created: number; updated: number; imagesImported: number; errors: string[] }>>('/items/import', { rows, sessionId, missingRefHandling })
};

// Version & Updates
export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  checkedAt: string;
}

export const versionApi = {
  getVersion: () =>
    api.get<ApiResponse<{ version: string; name: string; repository: string }>>('/version'),

  checkForUpdates: (force: boolean = false) =>
    api.get<ApiResponse<UpdateInfo>>('/version/check', { params: { force } }),

  getDependencies: () =>
    api.get<ApiResponse<{
      backend: { dependencies: Record<string, string>; devDependencies: Record<string, string> };
      frontend: { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    }>>('/version/dependencies'),
};

// API Keys
export const apiKeysApi = {
  getPermissions: () =>
    api.get<ApiResponse<ApiPermission[]>>('/keys/permissions'),

  list: () =>
    api.get<ApiResponse<ApiKey[]>>('/keys'),

  get: (id: string) =>
    api.get<ApiResponse<ApiKey>>(`/keys/${id}`),

  create: (data: { name: string; permissions: string[]; expiresAt?: string }) =>
    api.post<ApiResponse<ApiKey> & { message: string }>('/keys', data),

  update: (id: string, data: {
    name?: string;
    permissions?: string[];
    isActive?: boolean;
    expiresAt?: string | null;
    ipRestrictionMode?: 'none' | 'whitelist' | 'blacklist';
    ipWhitelist?: string[];
    ipBlacklist?: string[];
    rateLimitPerMinute?: number | null;
    rateLimitPerHour?: number | null;
    rateLimitPerDay?: number | null;
  }) =>
    api.patch<ApiResponse<ApiKey>>(`/keys/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/keys/${id}`),

  regenerate: (id: string) =>
    api.post<ApiResponse<ApiKey> & { message: string }>(`/keys/${id}/regenerate`),

  getUsage: (id: string, params?: { startDate?: string; endDate?: string; groupBy?: 'minute' | 'hour' | 'day' }) =>
    api.get<ApiResponse<any>>(`/keys/${id}/usage`, { params }),

  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<any>>('/keys/analytics/overview', { params }),
};

// Device Blocklist Entry
export interface DeviceBlocklistEntry {
  id: string;
  deviceHash: string;
  reason?: string | null;
  blockedAt: string;
  deviceName?: string | null;
  deviceUuid?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  userId?: string | null;
  blockedBy?: {
    id: string;
    username: string;
    email: string;
  } | null;
}

export const devicesApi = {
  // Get current user's devices
  getMyDevices: (params?: { page?: number; limit?: number; search?: string; isBlocked?: boolean }) =>
    api.get<ApiResponse<Device[]> & { pagination: Pagination }>('/devices', { params }),

  // Admin: get all devices
  getAll: (params?: { page?: number; limit?: number; search?: string; userId?: string; isBlocked?: boolean }) =>
    api.get<ApiResponse<Device[]> & { pagination: Pagination }>('/devices/all', { params }),

  // Get single device
  get: (id: string) =>
    api.get<ApiResponse<Device>>(`/devices/${id}`),

  // Update device (rename)
  update: (id: string, data: { name?: string }) =>
    api.put<ApiResponse<Device>>(`/devices/${id}`, data),

  // Block device
  block: (id: string, reason?: string) =>
    api.post<ApiResponse<Device>>(`/devices/${id}/block`, { reason }),

  // Unblock device
  unblock: (id: string) =>
    api.post<ApiResponse<Device>>(`/devices/${id}/unblock`),

  // Delete device
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/devices/${id}`),

  // Blocklist management (admin only)
  getBlocklist: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<DeviceBlocklistEntry[]> & { pagination: Pagination }>('/devices/blocklist', { params }),

  removeFromBlocklist: (hash: string) =>
    api.delete<ApiResponse<null>>(`/devices/blocklist/${hash}`)
};

export const sessionsApi = {
  getAll: () => api.get('/sessions'),
  revoke: (id: string) => api.delete(`/sessions/${id}`),
  revokeAll: () => api.post('/sessions/revoke-all'),
};

export const webhooksApi = {
  getAll: () => api.get('/webhooks'),
  create: (data: { name: string; url: string; events: string[]; secret?: string }) => api.post('/webhooks', data),
  update: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
};

export const filtersApi = {
  getAll: () => api.get('/filters'),
  create: (data: { name: string; filters: any }) => api.post('/filters', data),
  update: (id: string, data: { name: string; filters: any }) => api.put(`/filters/${id}`, data),
  delete: (id: string) => api.delete(`/filters/${id}`),
  setDefault: (id: string) => api.patch(`/filters/${id}/default`),
};

export default api;
