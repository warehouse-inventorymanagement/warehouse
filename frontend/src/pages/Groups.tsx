import { useState, useEffect } from 'react';
import { groupsApi, rolesApi } from '../services/api';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Group, Role } from '../types';
import { useAuth } from '../context/AuthContext';

interface GroupMember {
  id: string;
  username: string;
  email: string;
  ldapDn?: string;
}

export default function Groups() {
  const { hasPermission } = useAuth();
  const canManageGroups = hasPermission('groups:create') || hasPermission('groups:update');

  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<(Group & { members: GroupMember[] }) | null>(null);
  const [availableUsers, setAvailableUsers] = useState<GroupMember[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [availableSearch, setAvailableSearch] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchRoles();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupsApi.getAll();
      setGroups(response.data.data);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      setRoles(response.data.data);
    } catch (error) {
      console.error('Failed to load roles');
    }
  };

  const openModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setDescription(group.description || '');
      setRoleId(group.roleId);
    } else {
      setEditingGroup(null);
      setName('');
      setDescription('');
      setRoleId(roles[0]?.id || '');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGroup(null);
  };

  const openMembersModal = async (group: Group) => {
    try {
      const [groupResponse, usersResponse] = await Promise.all([
        groupsApi.getOne(group.id),
        groupsApi.getAvailableUsers(group.id)
      ]);
      setSelectedGroup(groupResponse.data.data);
      setAvailableUsers(usersResponse.data.data);
      setShowMembersModal(true);
    } catch (error) {
      toast.error('Failed to load group members');
    }
  };

  const closeMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
    setAvailableUsers([]);
    setMemberSearch('');
    setAvailableSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingGroup) {
        await groupsApi.update(editingGroup.id, { name, description, roleId });
        toast.success('Group updated');
      } else {
        await groupsApi.create({ name, description, roleId });
        toast.success('Group created');
      }
      closeModal();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Delete group "${group.name}"? This will remove all users from this group.`)) return;

    try {
      await groupsApi.delete(group.id);
      toast.success('Group deleted');
      fetchGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!selectedGroup) return;
    setAddingUser(true);

    try {
      await groupsApi.addMember(selectedGroup.id, userId);
      toast.success('User added to group');
      // Refresh the modal data
      const [groupResponse, usersResponse] = await Promise.all([
        groupsApi.getOne(selectedGroup.id),
        groupsApi.getAvailableUsers(selectedGroup.id)
      ]);
      setSelectedGroup(groupResponse.data.data);
      setAvailableUsers(usersResponse.data.data);
      fetchGroups(); // Refresh group list for updated count
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      await groupsApi.removeMember(selectedGroup.id, userId);
      toast.success('User removed from group');
      // Refresh the modal data
      const [groupResponse, usersResponse] = await Promise.all([
        groupsApi.getOne(selectedGroup.id),
        groupsApi.getAvailableUsers(selectedGroup.id)
      ]);
      setSelectedGroup(groupResponse.data.data);
      setAvailableUsers(usersResponse.data.data);
      fetchGroups(); // Refresh group list for updated count
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove user');
    }
  };

  if (!hasPermission('groups:read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserGroupIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Groups access required</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Groups</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage local groups to assign roles to users
          </p>
        </div>
        {canManageGroups && (
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Create Group
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>How it works:</strong> Users in a group inherit the group's role.
          If a user is in multiple groups, they get the highest privilege role.
          If removed from all groups, LDAP users fall back to their LDAP-determined role.
        </p>
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {groups.map((group) => (
          <div key={group.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10">
                  <UserGroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{group.name}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {group.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1">
                      <ShieldCheckIcon className="w-4 h-4" />
                      Role: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{group.role?.name || 'None'}</span>
                    </span>
                  </div>

                  {/* Member Avatars */}
                  <div className="flex items-center gap-3 mt-3">
                    {(group.memberPreview && group.memberPreview.length > 0) ? (
                      <>
                        <div className="flex -space-x-2">
                          {group.memberPreview.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-dark-card"
                              title={member.username}
                            >
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {(group.userCount || 0) > 4 && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', boxShadow: '0 0 0 2px var(--bg-secondary)' }}>
                              +{(group.userCount || 0) - 4}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openMembersModal(group)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors hover:opacity-80"
                          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <EyeIcon className="w-4 h-4" />
                          View Users
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openMembersModal(group)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-dashed hover:border-primary hover:text-primary rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)', borderColor: 'var(--bg-tertiary)' }}
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        Add Members
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {canManageGroups && (
                  <>
                    <button
                      onClick={() => openModal(group)}
                      className="p-2 hover-bg rounded-lg transition-colors"
                      title="Edit Group"
                    >
                      <PencilIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Group"
                    >
                      <TrashIcon className="w-5 h-5 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="card p-12 text-center">
            <UserGroupIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No groups created yet</p>
            {canManageGroups && (
              <button onClick={() => openModal()} className="btn btn-primary">
                Create First Group
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingGroup ? 'Edit Group' : 'Create Group'}
              </h2>
              <button onClick={closeModal} className="p-2 hover-bg rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="label">Group Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="e.g., Warehouse Admins"
                    required
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input"
                    placeholder="Brief description of this group"
                  />
                </div>

                <div>
                  <label className="label">Assigned Role</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description || 'No description'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    All members of this group will have this role's permissions
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeMembersModal} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedGroup.name}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Role: {selectedGroup.role?.name} · {selectedGroup.members.length} members
                </p>
              </div>
              <button onClick={closeMembersModal} className="p-2 hover-bg rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Current Members */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Current Members ({selectedGroup.members.length})
                  </h3>
                </div>
                {selectedGroup.members.length > 0 && (
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="input pl-9 py-2 text-sm"
                    />
                  </div>
                )}
                {selectedGroup.members.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedGroup.members
                      .filter(m =>
                        !memberSearch ||
                        m.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        m.email.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-hover rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {member.username}
                              </span>
                              {member.ldapDn && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                                  LDAP
                                </span>
                              )}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {member.email}
                            </span>
                          </div>
                        </div>
                        {canManageGroups && (
                          <button
                            onClick={() => handleRemoveUser(member.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove from group"
                          >
                            <UserMinusIcon className="w-5 h-5 text-red-500" />
                          </button>
                        )}
                      </div>
                    ))}
                    {selectedGroup.members.length > 0 &&
                     memberSearch &&
                     selectedGroup.members.filter(m =>
                       m.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
                       m.email.toLowerCase().includes(memberSearch.toLowerCase())
                     ).length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                        No members match "{memberSearch}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No members in this group</p>
                )}
              </div>

              {/* Add Members */}
              {canManageGroups && (
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    Add Members ({availableUsers.length} available)
                  </h3>
                  {availableUsers.length > 0 && (
                    <div className="relative mb-3">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search available users..."
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        className="input pl-9 py-2 text-sm"
                      />
                    </div>
                  )}
                  {availableUsers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableUsers
                        .filter(u =>
                          !availableSearch ||
                          u.username.toLowerCase().includes(availableSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(availableSearch.toLowerCase())
                        )
                        .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          style={{ borderColor: 'var(--bg-tertiary)' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {user.username}
                                </span>
                                {user.ldapDn && (
                                  <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                                    LDAP
                                  </span>
                                )}
                              </div>
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {user.email}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddUser(user.id)}
                            disabled={addingUser}
                            className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Add to group"
                          >
                            <UserPlusIcon className="w-5 h-5 text-green-600" />
                          </button>
                        </div>
                      ))}
                      {availableUsers.length > 0 &&
                       availableSearch &&
                       availableUsers.filter(u =>
                         u.username.toLowerCase().includes(availableSearch.toLowerCase()) ||
                         u.email.toLowerCase().includes(availableSearch.toLowerCase())
                       ).length === 0 && (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                          No users match "{availableSearch}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All users are already members of this group</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <button onClick={closeMembersModal} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
