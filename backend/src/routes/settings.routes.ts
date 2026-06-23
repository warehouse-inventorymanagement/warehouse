import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import ldap from 'ldapjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { authenticate, requirePermission, AuthRequest, AuthUser, isAdmin } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ldapAuthenticate, LdapUser, syncAllLdapUsers } from '../services/ldap.service.js';
import { saveSmtpConfig, getSmtpConfigForDisplay, sendTestEmail, SMTP_PROVIDERS } from '../services/email.service.js';
import { getAllNotificationConfigs, updateNotificationConfig, NotificationType } from '../services/notification.service.js';
import { getTemplateInfo, saveCustomTemplate, revertTemplate } from '../services/templateRenderer.service.js';
import { getQuarantinedItems, restoreItem, restoreItems, permanentDeleteItem, permanentDeleteItems, getRetentionDays, getQuarantinedImages, restoreImage, restoreImages, permanentDeleteImage, permanentDeleteImages } from '../services/quarantine.service.js';
import { loggingService } from '../services/logging.service.js';
import { getDatabaseInfo, createBackup, restoreBackup, getBackupList, deleteBackup, getBackupPath } from '../services/database.service.js';
import { triggerRetentionCleanup } from '../services/scheduler.service.js';
import { sanitizeSvg } from '../utils/sanitizeSvg.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Branding upload configuration
const brandingUploadDir = process.env.UPLOAD_DIR ? path.join(process.env.UPLOAD_DIR, 'branding') : './uploads/branding';
if (!fs.existsSync(brandingUploadDir)) {
  fs.mkdirSync(brandingUploadDir, { recursive: true });
}

const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, brandingUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fieldName = file.fieldname; // logoLight, logoDark, favicon
    cb(null, `${fieldName}${ext}`);
  }
});

const brandingUpload = multer({
  storage: brandingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  // Network settings
  'network.trustProxy': 'false',
  'network.trustedProxies': '',
  // Rate limiting
  'rateLimit.enabled': 'true',
  'rateLimit.general': '500',
  'rateLimit.auth': '10',
  'rateLimit.passwordReset': '5',
  // Nginx log settings
  'nginx.accessLog': '',
  'nginx.errorLog': '',
  // LDAP settings
  'ldap.enabled': 'false',
  'ldap.name': '',
  'ldap.url': '',
  'ldap.bindDn': '',
  'ldap.bindPassword': '',
  'ldap.searchBase': '',
  'ldap.searchFilter': '(uid={{username}})',
  'ldap.groupSearchBase': '',
  'ldap.groupSearchFilter': '(member={{userDn}})',
  'ldap.viewerGroup': '',
  'ldap.userGroup': '',
  'ldap.technicianGroup': '',
  'ldap.managerGroup': '',
  'ldap.adminGroup': '',
  'ldap.verifySsl': 'false',
  // Branding settings
  'branding.appName': 'Warehouse - Inventory Management',
  'branding.sidebarMode': 'icon-text', // 'icon-text' | 'icon' | 'text'
  'branding.logoLight': '', // Custom logo for light theme (PNG/JPG/SVG, recommended: 200x40px)
  'branding.logoDark': '', // Custom logo for dark theme (PNG/JPG/SVG, recommended: 200x40px)
  'branding.iconLight': '', // Custom icon for light theme (PNG/JPG/SVG, recommended: 32x32px)
  'branding.iconDark': '', // Custom icon for dark theme (PNG/JPG/SVG, recommended: 32x32px)
  'branding.favicon': '', // Custom favicon (PNG/ICO/SVG, recommended: 32x32px)
  // Theme preset and colors
  'branding.preset': 'default-dark',
  'branding.accent': '#3b82f6',
  'branding.accentHover': '#2563eb',
  'branding.bgPrimary': '#0f172a',
  'branding.bgSecondary': '#1e293b',
  'branding.bgTertiary': '#334155',
  'branding.textPrimary': '#f1f5f9',
  'branding.textSecondary': '#94a3b8',
  'branding.sidebarBg': '#111827',
  'branding.sidebarText': '#d1d5db',
  'branding.sidebarBorder': '#1f2937',
  // UI Style
  'branding.radius': 'rounded',
  'branding.glassy': 'true',
  'branding.glassBlur': '12', // Blur intensity in px: 0, 4, 8, 12, 16
  'branding.glassOpacity': '85', // Background opacity %: 60, 70, 80, 85, 90, 95
  'branding.customPresets': '[]',
  // Server settings (for email links)
  'server.hostname': '',
  'server.port': '',
  'server.protocol': 'http',
  // SMTP settings
  'smtp.provider': 'custom',
  'smtp.host': '',
  'smtp.port': '587',
  'smtp.username': '',
  'smtp.password': '',
  'smtp.sslMode': 'starttls',
  'smtp.fromEmail': '',
  'smtp.fromName': 'Warehouse',
  // Quarantine settings
  'quarantine.retentionDays': '30',
  // Data retention settings
  'audit.retentionDays': '365',        // 0 = keep forever
  'item.historyRetentionCount': '50',   // 0 = keep forever
  // Audit view settings — column visibility
  'audit.columns.fullName': 'true',
  'audit.columns.username': 'true',
  'audit.columns.role': 'true',
  'audit.columns.authMethod': 'true',
  'audit.columns.ipAddress': 'true',
  'audit.columns.userAgent': 'false',
  'audit.columns.entityType': 'true',
  'audit.columns.entityName': 'true',
  'audit.columns.changes': 'true',
  'audit.columns.timestamp': 'true',
  // Audit view settings — display defaults
  'audit.display.itemsPerPage': '50',
  'audit.display.defaultDateRange': 'all',
  'audit.display.defaultExpanded': 'false',
  // Audit view settings — entity type logging toggles
  'audit.log.items': 'true',
  'audit.log.categories': 'true',
  'audit.log.locations': 'true',
  'audit.log.tags': 'true',
  'audit.log.users': 'true',
  'audit.log.roles': 'true',
  'audit.log.groups': 'true',
  'audit.log.auth': 'true',
  'audit.log.icons': 'true',
  'audit.log.templates': 'true',
  // Audit view settings — export
  'audit.export.enabled': 'true',
  // System timezone setting
  'system.timezone': 'UTC',
  // Notification settings
  'notification.dailySendTime': '02:00', // 24-hour format HH:mm
  'notification.timezone': 'UTC', // Deprecated: use system.timezone instead
  // Dashboard widget configuration
  'dashboard.widgets': '["greeting","stat-cards","activity-feed","category-chart","quarantine-expiring","stock-summary","low-stock-alerts","recently-updated"]',

  // Header settings
  'header.showDateTime': 'true',
  // Announcement ticker settings
  'announcements.scrollSpeed': '8',    // seconds per announcement
  'announcements.textSize': 'small',   // 'small' | 'medium' | 'large'
  // Two-Factor Authentication settings
  'auth.twoFactorRequired': 'false',        // Force all users to enable 2FA
  'auth.twoFactorMethods': 'totp,email',    // Allowed methods (comma-separated: totp, email)
  // Pricing defaults
  'pricing.defaultCurrency': 'USD',          // ISO 4217 currency code
};

// Settings that should be masked in responses (sensitive)
const SENSITIVE_SETTINGS = ['ldap.bindPassword', 'smtp.password'];

// Get all settings
router.get('/', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.setting.findMany();

    // Merge with defaults
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Mask sensitive settings (show if set, but not the value)
    for (const key of SENSITIVE_SETTINGS) {
      if (settingsMap[key] && settingsMap[key] !== '') {
        settingsMap[key] = '••••••••';
      }
    }

    res.json({ success: true, data: settingsMap });
  } catch (error) {
    next(error);
  }
});

// Update settings (batch)
router.put(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  body('settings').isObject(),
  validate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { settings } = req.body as { settings: Record<string, string> };

      // Validate setting keys
      const validKeys = Object.keys(DEFAULT_SETTINGS);
      const invalidKeys = Object.keys(settings).filter(k => !validKeys.includes(k));
      if (invalidKeys.length > 0) {
        throw new AppError(`Invalid setting keys: ${invalidKeys.join(', ')}`, 400);
      }

      // Filter out sensitive settings that are masked (unchanged)
      const filteredSettings = Object.entries(settings).filter(([key, value]) => {
        if (SENSITIVE_SETTINGS.includes(key) && value === '••••••••') {
          return false; // Skip, keep existing value
        }
        return true;
      });

      // Upsert each setting
      await Promise.all(
        filteredSettings.map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
          })
        )
      );

      // Get all settings after update
      const allSettings = await prisma.setting.findMany();
      const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
      allSettings.forEach(s => {
        settingsMap[s.key] = s.value;
      });

      // Mask sensitive settings in response
      for (const key of SENSITIVE_SETTINGS) {
        if (settingsMap[key] && settingsMap[key] !== '') {
          settingsMap[key] = '••••••••';
        }
      }

      res.json({
        success: true,
        data: settingsMap,
        message: 'Settings updated. Server restart may be required for some changes to take effect.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get network interfaces (for dropdown)
router.get('/network/interfaces', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const os = await import('os');
    const interfaces = os.networkInterfaces();

    const result: { name: string; address: string; family: string }[] = [
      { name: 'All Interfaces', address: '0.0.0.0', family: 'IPv4' }
    ];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs) {
          if (!addr.internal) {
            result.push({
              name: `${name} (${addr.address})`,
              address: addr.address,
              family: addr.family,
            });
          }
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Test LDAP connection
router.post('/ldap/test', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { url, bindDn, bindPassword, searchBase, verifySsl } = req.body;

    if (!url) {
      throw new AppError('LDAP URL is required', 400);
    }

    // If password is masked, get the stored one
    let actualPassword = bindPassword;
    if (bindPassword === '••••••••') {
      const storedPassword = await prisma.setting.findUnique({
        where: { key: 'ldap.bindPassword' }
      });
      actualPassword = storedPassword?.value || '';
    }

    const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
      const client = ldap.createClient({
        url,
        connectTimeout: 5000,
        timeout: 5000,
        tlsOptions: {
          rejectUnauthorized: verifySsl === 'true' || verifySsl === true
        }
      });

      const timeoutId = setTimeout(() => {
        client.destroy();
        resolve({ success: false, message: 'Connection timeout after 5 seconds' });
      }, 5000);

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        client.destroy();
        resolve({ success: false, message: `Connection error: ${err.message}` });
      });

      client.on('connect', () => {
        // If no bind DN provided, just test connection
        if (!bindDn) {
          clearTimeout(timeoutId);
          client.unbind();
          resolve({ success: true, message: 'Successfully connected to LDAP server' });
          return;
        }

        // Try to bind with credentials
        client.bind(bindDn, actualPassword || '', (bindErr) => {
          clearTimeout(timeoutId);

          if (bindErr) {
            client.unbind();
            resolve({ success: false, message: `Bind failed: ${bindErr.message}` });
            return;
          }

          // If search base provided, try a simple search
          if (searchBase) {
            client.search(searchBase, { scope: 'base', filter: '(objectClass=*)' }, (searchErr, searchRes) => {
              if (searchErr) {
                client.unbind();
                resolve({ success: false, message: `Search base error: ${searchErr.message}` });
                return;
              }

              searchRes.on('error', (err) => {
                client.unbind();
                resolve({ success: false, message: `Search error: ${err.message}` });
              });

              searchRes.on('end', (result) => {
                client.unbind();
                if (result?.status === 0) {
                  resolve({ success: true, message: 'Successfully connected, bound, and verified search base' });
                } else {
                  resolve({ success: false, message: `Search base not found (status: ${result?.status})` });
                }
              });
            });
          } else {
            client.unbind();
            resolve({ success: true, message: 'Successfully connected and bound to LDAP server' });
          }
        });
      });
    });

    res.json({ success: result.success, message: result.message });
  } catch (error) {
    next(error);
  }
});

// Test LDAP user authentication
router.post('/ldap/test-user', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      username,
      password,
      url,
      bindDn,
      bindPassword,
      searchBase,
      searchFilter,
      verifySsl,
      viewerGroup,
      userGroup,
      technicianGroup,
      managerGroup,
      adminGroup
    } = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    if (!url || !searchBase) {
      throw new AppError('LDAP URL and Search Base are required', 400);
    }

    // If bind password is masked, get the stored one
    let actualBindPassword = bindPassword;
    if (bindPassword === '••••••••') {
      const storedPassword = await prisma.setting.findUnique({
        where: { key: 'ldap.bindPassword' }
      });
      actualBindPassword = storedPassword?.value || '';
    }

    const filter = (searchFilter || '(uid={{username}})').replace('{{username}}', username);

    const result = await new Promise<{
      success: boolean;
      message: string;
      data: {
        dn: string;
        email?: string;
        displayName?: string;
        groups: string[];
        roleName: string | null;
      } | null;
    }>((resolve) => {
      const client = ldap.createClient({
        url,
        connectTimeout: 5000,
        timeout: 10000,
        tlsOptions: {
          rejectUnauthorized: verifySsl === 'true' || verifySsl === true
        }
      });

      const timeoutId = setTimeout(() => {
        client.destroy();
        resolve({ success: false, message: 'Connection timeout', data: null });
      }, 10000);

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        client.destroy();
        resolve({ success: false, message: `Connection error: ${err.message}`, data: null });
      });

      client.on('connect', () => {
        // Bind with service account
        client.bind(bindDn || '', actualBindPassword || '', (bindErr) => {
          if (bindErr) {
            clearTimeout(timeoutId);
            client.unbind();
            resolve({ success: false, message: `Service bind failed: ${bindErr.message}`, data: null });
            return;
          }

          // Search for user
          client.search(searchBase, {
            filter,
            scope: 'sub',
            attributes: ['dn', 'mail', 'email', 'displayName', 'cn', 'memberOf']
          }, (searchErr, searchRes) => {
            if (searchErr) {
              clearTimeout(timeoutId);
              client.unbind();
              resolve({ success: false, message: `Search error: ${searchErr.message}`, data: null });
              return;
            }

            let userDn: string | null = null;
            let userEmail: string | undefined;
            let userDisplayName: string | undefined;
            let memberOfGroups: string[] = [];

            searchRes.on('searchEntry', (entry) => {
              userDn = entry.dn.toString();
              const attrs = entry.pojo.attributes;

              for (const attr of attrs) {
                if (attr.type === 'mail' || attr.type === 'email') {
                  userEmail = attr.values[0];
                }
                if (attr.type === 'displayName' || attr.type === 'cn') {
                  userDisplayName = attr.values[0];
                }
                if (attr.type === 'memberOf') {
                  memberOfGroups = attr.values.map((dn: string) => {
                    const match = dn.match(/^[Cc][Nn]=([^,]+)/);
                    return match ? match[1] : dn;
                  });
                }
              }
            });

            searchRes.on('error', (err) => {
              clearTimeout(timeoutId);
              client.unbind();
              resolve({ success: false, message: `Search result error: ${err.message}`, data: null });
            });

            searchRes.on('end', () => {
              if (!userDn) {
                clearTimeout(timeoutId);
                client.unbind();
                resolve({ success: false, message: 'User not found in LDAP', data: null });
                return;
              }

              // Try to bind as the user to verify password
              client.bind(userDn, password, (userBindErr) => {
                if (userBindErr) {
                  clearTimeout(timeoutId);
                  client.unbind();
                  resolve({ success: false, message: 'Invalid password', data: null });
                  return;
                }

                // Re-bind as service account to search for groups
                client.bind(bindDn || '', actualBindPassword || '', (rebindErr) => {
                  if (rebindErr) {
                    clearTimeout(timeoutId);
                    client.unbind();
                    // Password was valid, but can't search groups - use memberOf if available
                    finishWithGroups(memberOfGroups);
                    return;
                  }

                  // Search for groups that contain this user as a member
                  const groupSearchBase = searchBase;
                  // Search for groups where member matches the user's DN or uid
                  const userUid = userDn!.match(/uid=([^,]+)/i)?.[1] || username;
                  const groupFilter = `(|(member=${userDn})(uniqueMember=${userDn})(memberUid=${userUid}))`;

                  client.search(groupSearchBase, {
                    filter: groupFilter,
                    scope: 'sub',
                    attributes: ['cn', 'dn']
                  }, (groupSearchErr, groupSearchRes) => {
                    if (groupSearchErr) {
                      clearTimeout(timeoutId);
                      client.unbind();
                      // Fall back to memberOf
                      finishWithGroups(memberOfGroups);
                      return;
                    }

                    const foundGroups: string[] = [...memberOfGroups];

                    groupSearchRes.on('searchEntry', (entry) => {
                      const attrs = entry.pojo.attributes;
                      for (const attr of attrs) {
                        if (attr.type === 'cn') {
                          const groupName = attr.values[0];
                          if (!foundGroups.some(g => g.toLowerCase() === groupName.toLowerCase())) {
                            foundGroups.push(groupName);
                          }
                        }
                      }
                    });

                    groupSearchRes.on('error', () => {
                      clearTimeout(timeoutId);
                      client.unbind();
                      finishWithGroups(memberOfGroups);
                    });

                    groupSearchRes.on('end', () => {
                      clearTimeout(timeoutId);
                      client.unbind();
                      finishWithGroups(foundGroups);
                    });
                  });
                });

                function finishWithGroups(groups: string[]) {
                  // Determine role based on group membership (highest privilege first)
                  const lowerGroups = groups.map(g => g.toLowerCase());
                  let roleName: string | null = null;

                  if (adminGroup && lowerGroups.includes(adminGroup.toLowerCase())) {
                    roleName = 'Admin';
                  } else if (managerGroup && lowerGroups.includes(managerGroup.toLowerCase())) {
                    roleName = 'Manager';
                  } else if (technicianGroup && lowerGroups.includes(technicianGroup.toLowerCase())) {
                    roleName = 'Technician';
                  } else if (userGroup && lowerGroups.includes(userGroup.toLowerCase())) {
                    roleName = 'User';
                  } else if (viewerGroup && lowerGroups.includes(viewerGroup.toLowerCase())) {
                    roleName = 'Viewer';
                  }

                  // If no role groups are configured, default to User
                  const hasAnyRoleGroup = viewerGroup || userGroup || technicianGroup || managerGroup || adminGroup;
                  if (!hasAnyRoleGroup) {
                    roleName = 'User';
                  }

                  if (!roleName) {
                    resolve({
                      success: false,
                      message: 'User not in any configured role group',
                      data: {
                        dn: userDn!,
                        email: userEmail,
                        displayName: userDisplayName,
                        groups,
                        roleName: null
                      }
                    });
                    return;
                  }

                  resolve({
                    success: true,
                    message: 'Authentication successful',
                    data: {
                      dn: userDn!,
                      email: userEmail,
                      displayName: userDisplayName,
                      groups,
                      roleName
                    }
                  });
                }
              });
            });
          });
        });
      });
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Test LDAP group search - returns sample users in a group
router.post('/ldap/test-group', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { url, bindDn, bindPassword, searchBase, groupName, verifySsl } = req.body;

    if (!url || !groupName) {
      throw new AppError('LDAP URL and group name are required', 400);
    }

    // If password is masked, get the stored one
    let actualPassword = bindPassword;
    if (bindPassword === '••••••••') {
      const storedPassword = await prisma.setting.findUnique({
        where: { key: 'ldap.bindPassword' }
      });
      actualPassword = storedPassword?.value || '';
    }

    const result = await new Promise<{ success: boolean; message: string; totalUsers: number; sampleUsers: string[] }>((resolve) => {
      const client = ldap.createClient({
        url,
        connectTimeout: 5000,
        timeout: 10000,
        tlsOptions: {
          rejectUnauthorized: verifySsl === 'true' || verifySsl === true
        }
      });

      const timeoutId = setTimeout(() => {
        client.destroy();
        resolve({ success: false, message: 'Connection timeout', totalUsers: 0, sampleUsers: [] });
      }, 10000);

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        client.destroy();
        resolve({ success: false, message: `Connection error: ${err.message}`, totalUsers: 0, sampleUsers: [] });
      });

      client.on('connect', () => {
        // Bind with service account
        client.bind(bindDn || '', actualPassword || '', (bindErr) => {
          if (bindErr) {
            clearTimeout(timeoutId);
            client.unbind();
            resolve({ success: false, message: `Bind failed: ${bindErr.message}`, totalUsers: 0, sampleUsers: [] });
            return;
          }

          // Search for the group and get its members
          const groupSearchBase = searchBase || '';
          const groupFilter = `(cn=${groupName})`;

          client.search(groupSearchBase, {
            filter: groupFilter,
            scope: 'sub',
            attributes: ['member', 'uniqueMember', 'memberUid']
          }, (searchErr, searchRes) => {
            if (searchErr) {
              clearTimeout(timeoutId);
              client.unbind();
              resolve({ success: false, message: `Search error: ${searchErr.message}`, totalUsers: 0, sampleUsers: [] });
              return;
            }

            const members: string[] = [];

            searchRes.on('searchEntry', (entry) => {
              const attrs = entry.pojo.attributes;
              for (const attr of attrs) {
                if (attr.type === 'member' || attr.type === 'uniqueMember') {
                  // Extract CN/uid from DN for display
                  attr.values.forEach((dn: string) => {
                    const match = dn.match(/^(?:uid|cn)=([^,]+)/i);
                    members.push(match ? match[1] : dn);
                  });
                }
                if (attr.type === 'memberUid') {
                  members.push(...attr.values);
                }
              }
            });

            searchRes.on('error', (err) => {
              clearTimeout(timeoutId);
              client.unbind();
              resolve({ success: false, message: `Search result error: ${err.message}`, totalUsers: 0, sampleUsers: [] });
            });

            searchRes.on('end', (result) => {
              clearTimeout(timeoutId);
              client.unbind();

              if (members.length === 0) {
                resolve({
                  success: false,
                  message: `Group "${groupName}" not found or has no members`,
                  totalUsers: 0,
                  sampleUsers: []
                });
              } else {
                resolve({
                  success: true,
                  message: `Found ${members.length} user(s) in group "${groupName}"`,
                  totalUsers: members.length,
                  sampleUsers: members.slice(0, 3)
                });
              }
            });
          });
        });
      });
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Sync all LDAP users' info from directory
router.post('/ldap/sync-users', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const result = await syncAllLdapUsers();

    if (result.errors.length > 0 && result.synced === 0) {
      res.json({
        success: false,
        message: `Sync failed. Errors: ${result.errors.join('; ')}`,
        data: result
      });
    } else if (result.errors.length > 0) {
      res.json({
        success: true,
        message: `Synced ${result.synced} user(s) with some errors`,
        data: result
      });
    } else if (result.synced === 0) {
      res.json({
        success: true,
        message: 'All LDAP users are already up to date',
        data: result
      });
    } else {
      res.json({
        success: true,
        message: `Successfully synced ${result.synced} user(s)`,
        data: result
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get public branding settings (no authentication required - for login page)
router.get('/branding/public', async (req, res, next) => {
  try {
    const brandingKeys = Object.keys(DEFAULT_SETTINGS).filter(k => k.startsWith('branding.'));
    const settings = await prisma.setting.findMany({
      where: { key: { in: brandingKeys } }
    });

    const brandingMap: Record<string, string> = {};
    brandingKeys.forEach(key => {
      brandingMap[key] = DEFAULT_SETTINGS[key];
    });
    settings.forEach(s => {
      brandingMap[s.key] = s.value;
    });

    res.json({ success: true, data: brandingMap });
  } catch (error) {
    next(error);
  }
});

// Upload branding assets (logo, favicon)
router.post(
  '/branding/upload',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  brandingUpload.fields([
    { name: 'logoLight', maxCount: 1 },
    { name: 'logoDark', maxCount: 1 },
    { name: 'iconLight', maxCount: 1 },
    { name: 'iconDark', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'loginBackground', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const updates: { key: string; value: string }[] = [];

      // Process each uploaded file
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0];
          const settingKey = `branding.${fieldName}`;
          const filename = file.filename;

          // Branding assets render on the public, unauthenticated login page,
          // so SVGs must be sanitized in-place before they're served (same
          // pattern as item.routes.ts image uploads).
          if (file.mimetype === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg')) {
            const filePath = path.join(file.destination, filename);
            const raw = fs.readFileSync(filePath, 'utf8');
            fs.writeFileSync(filePath, sanitizeSvg(raw), 'utf8');
          }

          // Delete old file if exists and is different
          const oldSetting = await prisma.setting.findUnique({ where: { key: settingKey } });
          if (oldSetting && oldSetting.value && oldSetting.value !== filename) {
            const oldPath = path.join(brandingUploadDir, oldSetting.value);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }

          updates.push({ key: settingKey, value: filename });
        }
      }

      // Save settings
      await Promise.all(
        updates.map(({ key, value }) =>
          prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
          })
        )
      );

      // Return updated branding settings
      const brandingKeys = Object.keys(DEFAULT_SETTINGS).filter(k => k.startsWith('branding.'));
      const settings = await prisma.setting.findMany({
        where: { key: { in: brandingKeys } }
      });

      const brandingMap: Record<string, string> = {};
      brandingKeys.forEach(key => {
        brandingMap[key] = DEFAULT_SETTINGS[key];
      });
      settings.forEach(s => {
        brandingMap[s.key] = s.value;
      });

      res.json({
        success: true,
        data: brandingMap,
        message: 'Branding assets uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a branding asset
router.delete(
  '/branding/:asset',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const asset = req.params.asset as string;
      const validAssets = ['logoLight', 'logoDark', 'iconLight', 'iconDark', 'favicon', 'loginBackground'];

      if (!validAssets.includes(asset)) {
        throw new AppError('Invalid asset type', 400);
      }

      const settingKey = `branding.${asset}`;
      const setting = await prisma.setting.findUnique({ where: { key: settingKey } });

      if (setting && setting.value) {
        // Delete the file
        const filePath = path.join(brandingUploadDir, setting.value);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Clear the setting
        await prisma.setting.update({
          where: { key: settingKey },
          data: { value: '' }
        });
      }

      res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SMTP CONFIGURATION ====================

// Get SMTP providers list
router.get('/smtp/providers', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const providers = Object.entries(SMTP_PROVIDERS).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ...value
    }));
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
});

// Get SMTP configuration
router.get('/smtp', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const config = await getSmtpConfigForDisplay();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

// Update SMTP configuration
router.put('/smtp', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { provider, host, port, username, password, sslMode, fromEmail, fromName } = req.body;

    await saveSmtpConfig({
      provider,
      host,
      port: port ? parseInt(port, 10) : undefined,
      username,
      password,
      sslMode,
      fromEmail,
      fromName
    });

    const config = await getSmtpConfigForDisplay();
    res.json({ success: true, data: config, message: 'SMTP configuration updated' });
  } catch (error) {
    next(error);
  }
});

// Test SMTP configuration
router.post('/smtp/test', authenticate, requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      throw new AppError('Recipient email is required', 400);
    }

    const result = await sendTestEmail(recipientEmail);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== NOTIFICATION CONFIGURATION ====================

// Get all notification configurations
router.get('/notifications', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const configs = await getAllNotificationConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
});

// Get available recipients (roles, groups, users) for notification configuration
router.get('/notifications/recipients', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const [roles, groups, users] = await Promise.all([
      prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.group.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, username: true, email: true, firstName: true, lastName: true },
        orderBy: { username: 'asc' }
      })
    ]);

    res.json({
      success: true,
      data: {
        roles,
        groups,
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update notification configuration for a specific type
router.put(
  '/notifications/:type',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  param('type').isIn(['low_stock', 'item_quarantined', 'quarantine_expiring', 'failed_login', 'item_created', 'permission_change']),
  body('frequency').optional().isIn(['immediate', 'daily', 'every_2_days', 'every_3_days', 'every_4_days', 'weekly']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const type = req.params.type as string;
      const { enabled, frequency, recipientRoleIds, recipientGroupIds, recipientUserIds } = req.body;

      const config = await updateNotificationConfig(type as NotificationType, {
        enabled,
        frequency,
        recipientRoleIds,
        recipientGroupIds,
        recipientUserIds
      });

      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }
);

// Get email templates for a specific notification type
const VALID_TEMPLATE_TYPES = ['low_stock', 'item_quarantined', 'quarantine_expiring', 'failed_login', 'item_created', 'permission_change', 'new_device', 'blocked_device_attempt'];

router.get(
  '/notifications/:type/templates',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  param('type').isIn(VALID_TEMPLATE_TYPES),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const type = req.params.type as string;
      const templates = await getTemplateInfo(type);
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }
);

// Save custom email template for a notification type
router.put(
  '/notifications/:type/templates',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  param('type').isIn(VALID_TEMPLATE_TYPES),
  body('variant').isIn(['immediate', 'digest']),
  body('subject').isString().notEmpty().isLength({ max: 500 }),
  body('html').isString().notEmpty().isLength({ max: 102400 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const type = req.params.type as string;
      const { variant, subject, html } = req.body;
      await saveCustomTemplate(type, variant, subject, html);
      res.json({ success: true, message: 'Template saved' });
    } catch (error) {
      next(error);
    }
  }
);

// Revert email template to default for a notification type
router.delete(
  '/notifications/:type/templates/:variant',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  param('type').isIn(VALID_TEMPLATE_TYPES),
  param('variant').isIn(['immediate', 'digest']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const type = req.params.type as string;
      const variant = req.params.variant as 'immediate' | 'digest';
      await revertTemplate(type, variant);
      res.json({ success: true, message: 'Template reverted to default' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== QUARANTINE MANAGEMENT ====================

// Helper to check if user can manage quarantine (admin or has quarantine:manage permission)
const canManageQuarantine = (user: AuthUser): boolean => {
  return isAdmin(user) || user.permissions.includes(PERMISSIONS.QUARANTINE_MANAGE);
};

// Get quarantined items (viewable by all authenticated users)
router.get('/quarantine', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const { items, total } = await getQuarantinedItems(page, limit, search);
    const retentionDays = await getRetentionDays();

    // Include user's management permissions in response
    const userIsAdmin = isAdmin(req.user!);
    const canManage = canManageQuarantine(req.user!);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      retentionDays,
      canManage,
      isAdmin: userIsAdmin
    });
  } catch (error) {
    next(error);
  }
});

// Restore single item from quarantine
router.post('/quarantine/:id/restore', authenticate, param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const id = req.params.id as string;
    await restoreItem(id);
    res.json({ success: true, message: 'Item restored' });
  } catch (error) {
    next(error);
  }
});

// Bulk restore items from quarantine
router.post('/quarantine/restore', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new AppError('itemIds array is required', 400);
    }

    await restoreItems(itemIds);
    res.json({ success: true, message: `${itemIds.length} item(s) restored` });
  } catch (error) {
    next(error);
  }
});

// Permanently delete single item
router.delete('/quarantine/:id', authenticate, param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const id = req.params.id as string;
    await permanentDeleteItem(id);
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// Bulk permanently delete items
router.delete('/quarantine', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new AppError('itemIds array is required', 400);
    }

    await permanentDeleteItems(itemIds);
    res.json({ success: true, message: `${itemIds.length} item(s) permanently deleted` });
  } catch (error) {
    next(error);
  }
});

// ==================== QUARANTINE IMAGES ====================

// Get quarantined images
router.get('/quarantine/images', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;

    const { images, total } = await getQuarantinedImages(page, limit, search);
    const retentionDays = await getRetentionDays();

    const userIsAdmin = isAdmin(req.user!);
    const canManage = canManageQuarantine(req.user!);

    res.json({
      success: true,
      data: images,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      retentionDays,
      canManage,
      isAdmin: userIsAdmin
    });
  } catch (error) {
    next(error);
  }
});

// Restore single image from quarantine
router.post('/quarantine/images/:id/restore', authenticate, param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const id = req.params.id as string;
    await restoreImage(id);
    res.json({ success: true, message: 'Image restored' });
  } catch (error) {
    next(error);
  }
});

// Bulk restore images from quarantine
router.post('/quarantine/images/restore', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new AppError('imageIds array is required', 400);
    }

    await restoreImages(imageIds);
    res.json({ success: true, message: `${imageIds.length} image(s) restored` });
  } catch (error) {
    next(error);
  }
});

// Permanently delete single image
router.delete('/quarantine/images/:id', authenticate, param('id').isUUID(), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const id = req.params.id as string;
    await permanentDeleteImage(id);
    res.json({ success: true, message: 'Image permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// Bulk permanently delete images
router.delete('/quarantine/images', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!canManageQuarantine(req.user!)) {
      throw new AppError('Access denied. Requires quarantine:manage permission.', 403);
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new AppError('imageIds array is required', 400);
    }

    await permanentDeleteImages(imageIds);
    res.json({ success: true, message: `${imageIds.length} image(s) permanently deleted` });
  } catch (error) {
    next(error);
  }
});

// ============================================
// LOGS ENDPOINTS (Admin only)
// ============================================

// Get backend logs
router.get('/logs', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const source = req.query.source as string;
    const search = req.query.search as string;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const levels = level ? level.split(',') as any[] : undefined;
    // Filter by source if provided (and not 'all')
    const sources = source && source !== 'all' ? source.split(',') as any[] : undefined;

    const logs = loggingService.getLogs({
      limit,
      level: levels,
      source: sources,
      search,
      since,
    });

    const stats = loggingService.getStats();

    res.json({
      success: true,
      data: {
        logs,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get logs since a specific ID (for polling)
router.get('/logs/since/:lastId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const lastId = req.params.lastId as string;
    const logs = loggingService.getLogsSince(lastId || null);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

// Clear logs
router.delete('/logs', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    loggingService.clearLogs();
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    next(error);
  }
});

// Get nginx log configuration
router.get('/logs/nginx-config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['nginx.accessLog', 'nginx.errorLog']
        }
      }
    });

    const settingsMap: Record<string, string> = {
      'nginx.accessLog': '',
      'nginx.errorLog': ''
    };
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, data: settingsMap });
  } catch (error) {
    next(error);
  }
});

// Update nginx log configuration
router.put('/logs/nginx-config', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const { accessLog, errorLog } = req.body;

    // Save settings
    const updates: { key: string; value: string }[] = [];
    if (accessLog !== undefined) {
      updates.push({ key: 'nginx.accessLog', value: accessLog || '' });
    }
    if (errorLog !== undefined) {
      updates.push({ key: 'nginx.errorLog', value: errorLog || '' });
    }

    await Promise.all(
      updates.map(({ key, value }) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
    );

    // Reload nginx log watcher with new config
    const { reloadNginxLogWatcher } = await import('../services/nginx-logs.service.js');
    await reloadNginxLogWatcher();

    res.json({ success: true, message: 'Nginx log configuration updated' });
  } catch (error) {
    next(error);
  }
});

// Store frontend logs
router.post('/logs/frontend', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) {
      throw new AppError('logs array is required', 400);
    }

    // Rate limit: max 100 log entries per request
    if (logs.length > 100) {
      throw new AppError('Too many log entries (max 100 per request)', 400);
    }

    // Validate and sanitize each log entry
    const validLevels = ['info', 'warn', 'error', 'debug'];
    const sanitizedLogs = logs
      .filter((log: any) => log && typeof log.message === 'string' && validLevels.includes(log.level))
      .map((log: any) => ({
        level: log.level,
        message: log.message.substring(0, 2000), // Max 2KB per message
        timestamp: log.timestamp,
        metadata: log.metadata ? JSON.parse(JSON.stringify(log.metadata).substring(0, 1000)) : undefined,
      }));

    loggingService.addFrontendLogs(sanitizedLogs);

    res.json({ success: true, message: `${sanitizedLogs.length} log(s) received` });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DATABASE ENDPOINTS (Admin only)
// ============================================

// Get database info
router.get('/database/info', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const info = await getDatabaseInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

// Trigger data retention cleanup
router.post('/database/cleanup', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const result = await triggerRetentionCleanup();
    res.json({ success: true, data: result, message: `Deleted ${result.auditDeleted} audit logs and ${result.historyDeleted} item history entries` });
  } catch (error) {
    next(error);
  }
});

// Get backup list
router.get('/database/backups', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const backups = getBackupList();
    res.json({ success: true, data: backups });
  } catch (error) {
    next(error);
  }
});

// Create backup
router.post('/database/backup', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const includeUploads = req.body.includeUploads !== false;
    const includeEnvConfig = req.body.includeEnvConfig === true;

    console.log(`[Database] Creating backup (includeUploads: ${includeUploads}, includeEnvConfig: ${includeEnvConfig})...`);
    const { filepath, filename } = await createBackup(includeUploads, includeEnvConfig);

    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/api/settings/database/backup/${filename}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Download backup
router.get('/database/backup/:filename', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const filename = req.params.filename as string;
    const filepath = getBackupPath(filename);
    if (!filepath) {
      throw new AppError('Backup not found', 404);
    }

    res.download(filepath, filename);
  } catch (error) {
    next(error);
  }
});

// Delete backup
router.delete('/database/backup/:filename', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    const filename = req.params.filename as string;
    const deleted = deleteBackup(filename);
    if (!deleted) {
      throw new AppError('Backup not found', 404);
    }

    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    next(error);
  }
});

// Configure multer for backup restore uploads
const backupUploadDir = path.join(process.cwd(), 'backups', 'uploads');
if (!fs.existsSync(backupUploadDir)) {
  fs.mkdirSync(backupUploadDir, { recursive: true });
}

const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backupUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `restore-${Date.now()}.zip`);
  },
});

const backupUpload = multer({
  storage: backupStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

// Restore backup
router.post('/database/restore', authenticate, backupUpload.single('backup'), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isAdmin(req.user!)) {
      throw new AppError('Access denied. Admin only.', 403);
    }

    if (!req.file) {
      throw new AppError('No backup file uploaded', 400);
    }

    console.log(`[Database] Restoring from backup: ${req.file.filename}`);

    // Create automatic backup before restore (optional)
    if (req.body.createBackupFirst === 'true') {
      console.log('[Database] Creating backup before restore...');
      await createBackup(true);
    }

    const result = await restoreBackup(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (!result.success) {
      throw new AppError(result.message, 500);
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Get specific setting - MUST be last because /:key matches any path
router.get('/:key', authenticate, requirePermission(PERMISSIONS.SETTINGS_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const key = req.params.key as string;
    const setting = await prisma.setting.findUnique({ where: { key } });

    const value = setting?.value ?? DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] ?? null;

    if (value === null) {
      throw new AppError('Setting not found', 404);
    }

    res.json({ success: true, data: { key, value } });
  } catch (error) {
    next(error);
  }
});

export default router;
