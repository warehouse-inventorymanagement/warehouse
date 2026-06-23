import { useState, useEffect } from 'react';
import { rolesApi } from '../services/api';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Role } from '../types';

const PERMISSION_LABELS: Record<string, string> = {
  'items:create': 'Create Items',
  'items:read': 'View Items',
  'items:update': 'Edit Items',
  'items:delete': 'Delete Items',
  'categories:create': 'Create Categories',
  'categories:read': 'View Categories',
  'categories:update': 'Edit Categories',
  'categories:delete': 'Delete Categories',
  'locations:create': 'Create Locations',
  'locations:read': 'View Locations',
  'locations:update': 'Edit Locations',
  'locations:delete': 'Delete Locations',
  'tags:create': 'Create Tags',
  'tags:read': 'View Tags',
  'tags:update': 'Edit Tags',
  'tags:delete': 'Delete Tags',
  'users:create': 'Create Users',
  'users:read': 'View Users',
  'users:update': 'Edit Users',
  'users:delete': 'Delete Users',
  'roles:create': 'Create Roles',
  'roles:read': 'View Roles',
  'roles:update': 'Edit Roles',
  'roles:delete': 'Delete Roles',
  'groups:create': 'Create Groups',
  'groups:read': 'View Groups',
  'groups:update': 'Edit Groups',
  'groups:delete': 'Delete Groups',
  'templates:create': 'Create Templates',
  'templates:read': 'View Templates',
  'templates:update': 'Edit Templates',
  'templates:delete': 'Delete Templates',
  'audit:read': 'View Audit Logs',
  'settings:read': 'View Settings',
  'settings:update': 'Edit Settings',
  'icons:read': 'View Icons',
  'icons:create': 'Import Icons',
  'icons:delete': 'Delete Icons',
  'quarantine:manage': 'Manage Quarantine',
};

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [, setAllPermissions] = useState<string[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      setRoles(response.data.data);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await rolesApi.getPermissions();
      setAllPermissions(response.data.data.all);
      setGroupedPermissions(response.data.data.grouped);
    } catch (error) {
      console.error('Failed to load permissions');
    }
  };

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description || '');
      setPermissions(role.permissions);
    } else {
      setEditingRole(null);
      setName('');
      setDescription('');
      setPermissions([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleGroup = (group: string) => {
    const groupPerms = groupedPermissions[group] || [];
    const allSelected = groupPerms.every((p) => permissions.includes(p));

    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, { name, description, permissions });
        toast.success('Role updated');
      } else {
        await rolesApi.create({ name, description, permissions });
        toast.success('Role created');
      }
      closeModal();
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (role.userCount && role.userCount > 0) {
      toast.error('Cannot delete role with assigned users');
      return;
    }

    if (!confirm(`Delete role "${role.name}"?`)) return;

    try {
      await rolesApi.delete(role.id);
      toast.success('Role deleted');
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const seedRoles = async () => {
    try {
      await rolesApi.seed();
      toast.success('Default roles created');
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to seed roles');
    }
  };

  const syncPermissions = async () => {
    try {
      const response = await rolesApi.syncPermissions();
      const { updated } = response.data.data;
      if (updated.length > 0) {
        toast.success(`Updated ${updated.length} role(s) with new permissions`);
        fetchRoles();
      } else {
        toast.success('All roles are up to date');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to sync permissions');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Roles & Permissions</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Manage user roles and their permissions</p>
        </div>
        <div className="flex gap-2">
          {roles.length === 0 && (
            <button onClick={seedRoles} className="btn btn-secondary">
              Create Default Roles
            </button>
          )}
          {roles.length > 0 && (
            <button
              onClick={syncPermissions}
              className="btn btn-secondary flex items-center gap-2"
              title="Update system roles with latest permissions"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Sync Permissions
            </button>
          )}
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Create Role
          </button>
        </div>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ShieldCheckIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{role.name}</h3>
                    {role.isSystem && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {role.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="w-4 h-4" />
                      {role.userCount || 0} direct users
                    </span>
                    {(role.groupCount || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <UserGroupIcon className="w-4 h-4" />
                        {role.groupCount} {role.groupCount === 1 ? 'group' : 'groups'} ({role.groupUserCount || 0} users)
                      </span>
                    )}
                    <span>{role.permissions.length} permissions</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {role.permissions.slice(0, 8).map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 text-xs rounded border"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--bg-tertiary)'
                        }}
                      >
                        {PERMISSION_LABELS[perm] || perm}
                      </span>
                    ))}
                    {role.permissions.length > 8 && (
                      <span
                        className="px-2 py-0.5 text-xs rounded border"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--bg-tertiary)'
                        }}
                      >
                        +{role.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(role)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <PencilIcon className="w-5 h-5 text-gray-500" />
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDelete(role)}
                    className="p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <TrashIcon className="w-5 h-5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="card p-12 text-center">
            <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No roles defined</p>
            <button onClick={seedRoles} className="btn btn-primary">
              Create Default Roles
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="label">Role Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="e.g., Inventory Manager"
                    required
                    disabled={editingRole?.isSystem}
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input"
                    placeholder="Brief description of this role"
                  />
                </div>

                <div>
                  <label className="label">Permissions</label>
                  <div className="space-y-4 mt-2">
                    {Object.entries(groupedPermissions).map(([group, perms]) => {
                      const allSelected = perms.every((p) => permissions.includes(p));
                      const someSelected = perms.some((p) => permissions.includes(p));

                      return (
                        <div key={group} className="border rounded-xl p-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
                          <label className="flex items-center gap-2 mb-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected && !allSelected;
                              }}
                              onChange={() => toggleGroup(group)}
                              className="h-4 w-4 accent-primary rounded border-gray-300"
                            />
                            <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                              {group}
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            {perms.map((perm) => (
                              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={permissions.includes(perm)}
                                  onChange={() => togglePermission(perm)}
                                  className="h-4 w-4 accent-primary rounded border-gray-300"
                                />
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {PERMISSION_LABELS[perm] || perm}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
