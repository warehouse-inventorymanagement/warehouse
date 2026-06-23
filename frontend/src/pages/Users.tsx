import { useState, useEffect } from 'react';
import { usersApi, rolesApi } from '../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import type { User, Role } from '../types';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll({ search: search || undefined });
      setUsers(response.data.data);
    } catch (error) {
      toast.error('Failed to load users');
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

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setEmail(user.email);
      setPassword('');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmployeeId(user.employeeId || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setGender(user.gender || '');
      setRoleId(user.roleId || '');
      setIsActive(user.isActive ?? true);
    } else {
      setEditingUser(null);
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setEmployeeId('');
      setPhone('');
      setAddress('');
      setGender('');
      setRoleId(roles.find((r) => r.name === 'User')?.id || '');
      setIsActive(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userData = {
        username,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        employeeId: employeeId || undefined,
        phone: phone || undefined,
        address: address || undefined,
        gender: gender || undefined,
        roleId: roleId || undefined,
      };
      if (editingUser) {
        await usersApi.update(editingUser.id, { ...userData, isActive });
        toast.success('User updated');
      } else {
        await usersApi.create({ ...userData, password });
        toast.success('User created');
      }
      closeModal();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    try {
      await usersApi.delete(user.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      toast.success('User status updated');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const getRoleColor = (roleName?: string) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
    }
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    return user.username.charAt(0).toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.username;
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
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{users.length} users total</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input pl-10"
        />
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>User</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover-row" style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                <td className="px-6 py-4">
                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                    {user.id}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(user)}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{getUserDisplayName(user)}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.username} • {user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role?.name)}`}>
                    {user.role?.name || 'No Role'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(user)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openModal(user)}
                    className="p-2 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-2 hover:text-red-600 hover:bg-red-500/10 rounded-lg ml-1 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <UserCircleIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No users found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingUser ? 'Edit User' : 'New User'}
              </h3>
              <button onClick={closeModal} className="p-2 hover-bg rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {editingUser && (
                <div>
                  <label className="label">User ID (Permanent)</label>
                  <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {editingUser.id}
                    </code>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    required={!editingUser}
                    minLength={8}
                    placeholder="Min. 8 characters"
                  />
                </div>
              )}

              {/* Personal Information */}
              <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--bg-tertiary)' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="label">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="input"
                    >
                      <option value="">Not specified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--bg-tertiary)' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Contact Information</h4>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="Optional"
                  />
                </div>
                <div className="mt-4">
                  <label className="label">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--bg-tertiary)' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Role & Status</h4>
              </div>

              <div>
                <label className="label">Role</label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="input">
                  <option value="">No Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {roles.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    No roles available. Create roles first in the Roles page.
                  </p>
                )}
              </div>

              {editingUser && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: 'var(--accent)', borderColor: 'var(--bg-tertiary)' }}
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    Active
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--bg-tertiary)' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
