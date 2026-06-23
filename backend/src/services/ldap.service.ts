import ldap from 'ldapjs';
import prisma from '../lib/prisma.js';
import { loggingService } from './logging.service.js';
import { saveLdapAvatar } from './auth.service.js';

export interface LdapUser {
  dn: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  employeeId?: string;
  gender?: string;
  photo?: Buffer;
  groups: string[];
  roleName: string | null; // The role to assign based on group membership
}

// Escapes a value for safe interpolation into an LDAP search filter
// (RFC 4515 sec. 3). Without this, a username like `*)(uid=*` can alter
// the filter's logic (LDAP injection) since it's substituted into the
// filter template as raw text.
function escapeLdapFilterValue(value: string): string {
  return value.replace(/[\\*()\0]/g, (char) => {
    switch (char) {
      case '\\': return '\\5c';
      case '*': return '\\2a';
      case '(': return '\\28';
      case ')': return '\\29';
      case '\0': return '\\00';
      default: return char;
    }
  });
}

interface LdapConfig {
  enabled: boolean;
  url: string;
  bindDn: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  groupSearchBase: string;
  groupSearchFilter: string;
  viewerGroup: string;
  userGroup: string;
  technicianGroup: string;
  managerGroup: string;
  adminGroup: string;
  verifySsl: boolean;
}

// Get LDAP config from database, falling back to env vars
async function getLdapConfig(): Promise<LdapConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: 'ldap.'
      }
    }
  });

  const settingsMap: Record<string, string> = {};
  settings.forEach(s => {
    settingsMap[s.key] = s.value;
  });

  return {
    enabled: settingsMap['ldap.enabled'] === 'true' || !!process.env.LDAP_URL,
    url: settingsMap['ldap.url'] || process.env.LDAP_URL || '',
    bindDn: settingsMap['ldap.bindDn'] || process.env.LDAP_BIND_DN || '',
    bindPassword: settingsMap['ldap.bindPassword'] || process.env.LDAP_BIND_PASSWORD || '',
    searchBase: settingsMap['ldap.searchBase'] || process.env.LDAP_SEARCH_BASE || '',
    searchFilter: settingsMap['ldap.searchFilter'] || process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
    groupSearchBase: settingsMap['ldap.groupSearchBase'] || process.env.LDAP_GROUP_SEARCH_BASE || '',
    groupSearchFilter: settingsMap['ldap.groupSearchFilter'] || process.env.LDAP_GROUP_SEARCH_FILTER || '(member={{userDn}})',
    viewerGroup: settingsMap['ldap.viewerGroup'] || '',
    userGroup: settingsMap['ldap.userGroup'] || '',
    technicianGroup: settingsMap['ldap.technicianGroup'] || '',
    managerGroup: settingsMap['ldap.managerGroup'] || '',
    adminGroup: settingsMap['ldap.adminGroup'] || process.env.LDAP_ADMIN_GROUP || '',
    verifySsl: settingsMap['ldap.verifySsl'] === 'true',
  };
}

// Determine the highest role based on group membership
function determineRole(groups: string[], config: LdapConfig): string | null {
  const lowerGroups = groups.map(g => g.toLowerCase());

  // Check from highest to lowest privilege
  if (config.adminGroup && lowerGroups.includes(config.adminGroup.toLowerCase())) {
    return 'Admin';
  }
  if (config.managerGroup && lowerGroups.includes(config.managerGroup.toLowerCase())) {
    return 'Manager';
  }
  if (config.technicianGroup && lowerGroups.includes(config.technicianGroup.toLowerCase())) {
    return 'Technician';
  }
  if (config.userGroup && lowerGroups.includes(config.userGroup.toLowerCase())) {
    return 'User';
  }
  if (config.viewerGroup && lowerGroups.includes(config.viewerGroup.toLowerCase())) {
    return 'Viewer';
  }

  // No matching group - user cannot log in if any role groups are configured
  const hasAnyRoleGroup = config.viewerGroup || config.userGroup || config.technicianGroup || config.managerGroup || config.adminGroup;
  return hasAnyRoleGroup ? null : 'User'; // Default to User if no role groups configured
}

// Search for user's group memberships
async function getUserGroups(
  client: ldap.Client,
  userDn: string,
  config: LdapConfig
): Promise<string[]> {
  const groups: string[] = [];

  // If no group search base, use the main search base
  const groupSearchBase = config.groupSearchBase || config.searchBase;
  if (!groupSearchBase) return groups;

  const groupFilter = config.groupSearchFilter.replace(/\{\{userDn\}\}/g, userDn);

  return new Promise((resolve) => {
    client.search(
      groupSearchBase,
      {
        filter: groupFilter,
        scope: 'sub',
        attributes: ['cn', 'dn']
      },
      (searchErr, searchRes) => {
        if (searchErr) {
          loggingService.ldap('error', `Group search error: ${searchErr.message}`);
          resolve(groups);
          return;
        }

        searchRes.on('searchEntry', (entry) => {
          const attrs = entry.pojo.attributes;
          for (const attr of attrs) {
            if (attr.type === 'cn') {
              groups.push(attr.values[0]);
            }
          }
        });

        searchRes.on('error', (err) => {
          loggingService.ldap('error', `Group search result error: ${err.message}`);
          resolve(groups);
        });

        searchRes.on('end', () => {
          resolve(groups);
        });
      }
    );
  });
}

// Search for groups that contain a user as a member (alternative to memberOf)
async function searchUserGroups(
  client: ldap.Client,
  userDn: string,
  username: string,
  config: LdapConfig
): Promise<string[]> {
  const groups: string[] = [];

  // Use group search base or fall back to main search base
  const groupSearchBase = config.groupSearchBase || config.searchBase;
  if (!groupSearchBase) return groups;

  // Extract uid from DN if possible
  const userUid = userDn.match(/uid=([^,]+)/i)?.[1] || username;

  // Search for groups where this user is a member
  const groupFilter = `(|(member=${userDn})(uniqueMember=${userDn})(memberUid=${userUid}))`;

  return new Promise((resolve) => {
    client.search(
      groupSearchBase,
      {
        filter: groupFilter,
        scope: 'sub',
        attributes: ['cn', 'dn']
      },
      (searchErr, searchRes) => {
        if (searchErr) {
          loggingService.ldap('error', `User group search error: ${searchErr.message}`);
          resolve(groups);
          return;
        }

        searchRes.on('searchEntry', (entry) => {
          const attrs = entry.pojo.attributes;
          for (const attr of attrs) {
            if (attr.type === 'cn') {
              groups.push(attr.values[0]);
            }
          }
        });

        searchRes.on('error', (err) => {
          loggingService.ldap('error', `User group search result error: ${err.message}`);
          resolve(groups);
        });

        searchRes.on('end', () => {
          resolve(groups);
        });
      }
    );
  });
}

export const ldapAuthenticate = async (
  username: string,
  password: string
): Promise<LdapUser | null> => {
  const config = await getLdapConfig();

  if (!config.enabled || !config.url) {
    loggingService.ldap('debug', 'LDAP not configured');
    return null;
  }

  const { url: ldapUrl, bindDn, bindPassword, searchBase } = config;
  const searchFilter = config.searchFilter.replace('{{username}}', escapeLdapFilterValue(username));

  loggingService.ldap('info', `Authentication attempt for user: ${username}`);

  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: ldapUrl,
      tlsOptions: {
        rejectUnauthorized: config.verifySsl
      }
    });

    client.on('error', (err) => {
      loggingService.ldap('error', `Connection error: ${err.message}`);
      resolve(null);
    });

    // Bind with service account
    client.bind(bindDn!, bindPassword!, (bindErr) => {
      if (bindErr) {
        loggingService.ldap('error', `Service account bind failed: ${bindErr.message}`);
        client.unbind();
        resolve(null);
        return;
      }

      // Search for user
      loggingService.ldap('debug', `Searching for user with filter: ${searchFilter}`);
      client.search(
        searchBase!,
        {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['dn', 'mail', 'email', 'displayName', 'cn', 'givenName', 'sn', 'telephoneNumber', 'mobile', 'employeeNumber', 'employeeID', 'gender', 'sex', 'memberOf', 'thumbnailPhoto', 'jpegPhoto', 'avatar']
        },
        (searchErr, searchRes) => {
          if (searchErr) {
            loggingService.ldap('error', `User search failed: ${searchErr.message}`);
            client.unbind();
            resolve(null);
            return;
          }

          let userDn: string | null = null;
          let userEmail: string | undefined;
          let userDisplayName: string | undefined;
          let userFirstName: string | undefined;
          let userLastName: string | undefined;
          let userPhone: string | undefined;
          let userEmployeeId: string | undefined;
          let userGender: string | undefined;
          let userPhoto: Buffer | undefined;
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
              if (attr.type === 'givenName') {
                userFirstName = attr.values[0];
              }
              if (attr.type === 'sn') {
                userLastName = attr.values[0];
              }
              if (attr.type === 'telephoneNumber' || attr.type === 'mobile') {
                userPhone = attr.values[0];
              }
              if (attr.type === 'employeeNumber' || attr.type === 'employeeID') {
                userEmployeeId = attr.values[0];
              }
              if (attr.type === 'gender' || attr.type === 'sex') {
                userGender = attr.values[0];
              }
              if (attr.type === 'memberOf') {
                // Extract CN from memberOf DNs (e.g., "CN=Admins,OU=Groups,DC=example,DC=com" -> "Admins")
                memberOfGroups = attr.values.map((dn: string) => {
                  const match = dn.match(/^[Cc][Nn]=([^,]+)/);
                  return match ? match[1] : dn;
                });
              }
            }

            // Extract photo using raw binary buffers (pojo.attributes encodes binary as strings which is unreliable)
            const photoAttrNames = ['thumbnailPhoto', 'jpegPhoto', 'avatar'];
            for (const ldapAttr of (entry as any).attributes || []) {
              const attrType = ldapAttr.type || ldapAttr._type;
              if (photoAttrNames.some(n => n.toLowerCase() === (attrType || '').toLowerCase())) {
                try {
                  if (ldapAttr.buffers && ldapAttr.buffers.length > 0) {
                    userPhoto = ldapAttr.buffers[0];
                    loggingService.ldap('debug', `Found photo via buffers in attribute "${attrType}" (${userPhoto.length} bytes)`);
                  } else if (ldapAttr._vals && ldapAttr._vals.length > 0) {
                    // Fallback for older ldapjs versions
                    userPhoto = ldapAttr._vals[0];
                    loggingService.ldap('debug', `Found photo via _vals in attribute "${attrType}" (${userPhoto.length} bytes)`);
                  }
                } catch (e) {
                  loggingService.ldap('warn', `Failed to extract photo from attribute "${attrType}": ${e}`);
                }
                break;
              }
            }

            // Fallback: try pojo values if entry.attributes didn't work
            if (!userPhoto) {
              for (const attr of attrs) {
                if (photoAttrNames.some(n => n.toLowerCase() === attr.type.toLowerCase())) {
                  try {
                    userPhoto = Buffer.from(attr.values[0], 'base64');
                    loggingService.ldap('debug', `Found photo via pojo base64 in attribute "${attr.type}" (${userPhoto.length} bytes)`);
                  } catch { /* ignore malformed photo data */ }
                  break;
                }
              }
            }

            if (!userPhoto) {
              loggingService.ldap('debug', `No photo attribute found. Available attrs: ${attrs.map((a: any) => a.type).join(', ')}`);
            }
          });

          searchRes.on('error', (err) => {
            loggingService.ldap('error', `Search result error: ${err.message}`);
            client.unbind();
            resolve(null);
          });

          searchRes.on('end', async () => {
            if (!userDn) {
              loggingService.ldap('warn', `User not found in LDAP: ${username}`);
              client.unbind();
              resolve(null);
              return;
            }

            // Try to bind as the user to verify password
            client.bind(userDn, password, async (userBindErr) => {
              if (userBindErr) {
                loggingService.ldap('warn', `Authentication failed for ${username}: invalid credentials`);
                client.unbind();
                resolve(null);
                return;
              }

              // Always search for groups after password validation
              // Re-bind as service account to search groups
              client.bind(bindDn!, bindPassword!, async (rebindErr) => {
                let groups = [...memberOfGroups];

                if (!rebindErr) {
                  // Search for groups that contain this user as a member
                  const searchedGroups = await searchUserGroups(client, userDn!, username, config);
                  // Merge with memberOf groups, avoiding duplicates
                  for (const g of searchedGroups) {
                    if (!groups.some(existing => existing.toLowerCase() === g.toLowerCase())) {
                      groups.push(g);
                    }
                  }
                }
                client.unbind();

                // Determine the user's role based on LDAP group membership
                // This is used as a fallback - local warehouse groups take priority
                const roleName = determineRole(groups, config);

                if (!roleName) {
                  loggingService.ldap('info', `User ${username} authenticated but not in any LDAP role group`);
                } else {
                  loggingService.ldap('info', `User ${username} authenticated successfully with role: ${roleName}`);
                }

                // Always allow authenticated LDAP users - local groups can assign roles
                resolve({
                  dn: userDn!,
                  email: userEmail,
                  displayName: userDisplayName,
                  firstName: userFirstName,
                  lastName: userLastName,
                  phone: userPhone,
                  employeeId: userEmployeeId,
                  gender: userGender,
                  photo: userPhoto,
                  groups,
                  roleName // Can be null - local warehouse groups will determine role
                });
              });
            });
          });
        }
      );
    });
  });
};

// Check if LDAP is enabled
export const isLdapEnabled = async (): Promise<boolean> => {
  const config = await getLdapConfig();
  return config.enabled && !!config.url;
};

// Look up a user's info from LDAP without authenticating (for syncing)
export const ldapLookupUser = async (
  username: string
): Promise<Omit<LdapUser, 'groups' | 'roleName'> | null> => {
  const config = await getLdapConfig();

  if (!config.enabled || !config.url) {
    return null;
  }

  const { url: ldapUrl, bindDn, bindPassword, searchBase } = config;
  const searchFilter = config.searchFilter.replace('{{username}}', escapeLdapFilterValue(username));

  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: ldapUrl,
      tlsOptions: {
        rejectUnauthorized: config.verifySsl
      }
    });

    client.on('error', (err) => {
      loggingService.ldap('error', `Connection error during lookup: ${err.message}`);
      resolve(null);
    });

    // Bind with service account
    client.bind(bindDn!, bindPassword!, (bindErr) => {
      if (bindErr) {
        loggingService.ldap('error', `Bind error during lookup: ${bindErr.message}`);
        client.unbind();
        resolve(null);
        return;
      }

      // Search for user
      client.search(
        searchBase!,
        {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['dn', 'mail', 'email', 'displayName', 'cn', 'givenName', 'sn', 'telephoneNumber', 'mobile', 'employeeNumber', 'employeeID', 'gender', 'sex', 'thumbnailPhoto', 'jpegPhoto', 'avatar']
        },
        (searchErr, searchRes) => {
          if (searchErr) {
            loggingService.ldap('error', `Search error during lookup: ${searchErr.message}`);
            client.unbind();
            resolve(null);
            return;
          }

          let userDn: string | null = null;
          let userEmail: string | undefined;
          let userDisplayName: string | undefined;
          let userFirstName: string | undefined;
          let userLastName: string | undefined;
          let userPhone: string | undefined;
          let userEmployeeId: string | undefined;
          let userGender: string | undefined;
          let userPhoto: Buffer | undefined;

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
              if (attr.type === 'givenName') {
                userFirstName = attr.values[0];
              }
              if (attr.type === 'sn') {
                userLastName = attr.values[0];
              }
              if (attr.type === 'telephoneNumber' || attr.type === 'mobile') {
                userPhone = attr.values[0];
              }
              if (attr.type === 'employeeNumber' || attr.type === 'employeeID') {
                userEmployeeId = attr.values[0];
              }
              if (attr.type === 'gender' || attr.type === 'sex') {
                userGender = attr.values[0];
              }
            }

            // Extract photo using raw binary buffers (pojo.attributes encodes binary as strings which is unreliable)
            const photoAttrNames = ['thumbnailPhoto', 'jpegPhoto', 'avatar'];
            for (const ldapAttr of (entry as any).attributes || []) {
              const attrType = ldapAttr.type || ldapAttr._type;
              if (photoAttrNames.some(n => n.toLowerCase() === (attrType || '').toLowerCase())) {
                try {
                  if (ldapAttr.buffers && ldapAttr.buffers.length > 0) {
                    userPhoto = ldapAttr.buffers[0];
                  } else if (ldapAttr._vals && ldapAttr._vals.length > 0) {
                    userPhoto = ldapAttr._vals[0];
                  }
                } catch { /* ignore */ }
                break;
              }
            }

            // Fallback: try pojo values
            if (!userPhoto) {
              for (const attr of attrs) {
                if (photoAttrNames.some(n => n.toLowerCase() === attr.type.toLowerCase())) {
                  try {
                    userPhoto = Buffer.from(attr.values[0], 'base64');
                  } catch { /* ignore malformed photo data */ }
                  break;
                }
              }
            }
          });

          searchRes.on('error', (err) => {
            loggingService.ldap('error', `Search result error during lookup: ${err.message}`);
            client.unbind();
            resolve(null);
          });

          searchRes.on('end', () => {
            client.unbind();
            if (!userDn) {
              resolve(null);
              return;
            }

            resolve({
              dn: userDn,
              email: userEmail,
              displayName: userDisplayName,
              firstName: userFirstName,
              lastName: userLastName,
              phone: userPhone,
              employeeId: userEmployeeId,
              gender: userGender,
              photo: userPhoto,
            });
          });
        }
      );
    });
  });
};

// Sync all LDAP users' info from directory
export const syncAllLdapUsers = async (): Promise<{ synced: number; errors: string[] }> => {
  const errors: string[] = [];
  let synced = 0;

  // Get all users with ldapDn (LDAP users)
  const ldapUsers = await prisma.user.findMany({
    where: {
      ldapDn: { not: null }
    },
    select: {
      id: true,
      username: true,
      ldapDn: true,
      firstName: true,
      lastName: true,
      phone: true,
      employeeId: true,
      email: true,
      gender: true,
      avatarPath: true,
    }
  });

  for (const user of ldapUsers) {
    try {
      const ldapInfo = await ldapLookupUser(user.username);

      if (!ldapInfo) {
        errors.push(`${user.username}: Not found in LDAP`);
        continue;
      }

      // Check if any fields need updating
      const updates: Record<string, string | null> = {};

      if (ldapInfo.firstName && ldapInfo.firstName !== user.firstName) {
        updates.firstName = ldapInfo.firstName;
      }
      if (ldapInfo.lastName && ldapInfo.lastName !== user.lastName) {
        updates.lastName = ldapInfo.lastName;
      }
      if (ldapInfo.phone && ldapInfo.phone !== user.phone) {
        updates.phone = ldapInfo.phone;
      }
      if (ldapInfo.employeeId && ldapInfo.employeeId !== user.employeeId) {
        updates.employeeId = ldapInfo.employeeId;
      }
      if (ldapInfo.email && ldapInfo.email !== user.email) {
        updates.email = ldapInfo.email;
      }
      if (ldapInfo.gender && ldapInfo.gender !== user.gender) {
        updates.gender = ldapInfo.gender;
      }

      // Sync LDAP profile photo
      if (ldapInfo.photo) {
        try {
          const newAvatarPath = await saveLdapAvatar(user.id, ldapInfo.photo);
          if (newAvatarPath !== user.avatarPath) {
            updates.avatarPath = newAvatarPath;
          }
        } catch { /* best effort — don't fail the whole sync for a photo */ }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
        synced++;
      }
    } catch (err: any) {
      errors.push(`${user.username}: ${err.message}`);
    }
  }

  return { synced, errors };
};
