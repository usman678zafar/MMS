'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Search, Trash2, Mail, Shield, Edit2, UserCheck, UserX } from 'lucide-react';
import { addUser, updateUser, getUsers, deleteUser, toggleUserStatus } from './actions';
import { PERMISSIONS, ROLES } from '@/lib/rbac';

const defaultForm = { name: '', email: '', role: 'viewer', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState(defaultForm);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.success) {
      setUsers(res.users);
    } else {
      alert(`Error: ${res.error}`);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateUser(editingId, newUser);
    } else {
      res = await addUser(newUser);
    }
    
    if (res.success) {
      fetchUsers();
      handleCloseModal();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewUser(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (user) => {
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteUser(deleteId);
    if (res.success) fetchUsers();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleToggleStatus = async (userId) => {
    const res = await toggleUserStatus(userId);
    if (res.success) {
      fetchUsers();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const filtered = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.role?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return 'bg-purple-100 text-purple-800';
      case ROLES.ADMIN: return 'bg-blue-100 text-blue-800';
      case ROLES.ACCOUNTANT: return 'bg-green-100 text-green-800';
      case ROLES.TEACHER: return 'bg-yellow-100 text-yellow-800';
      case ROLES.INVENTORY_MANAGER: return 'bg-orange-100 text-orange-800';
      case ROLES.VIEWER: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return 'Super Admin';
      case ROLES.ADMIN: return 'Admin';
      case ROLES.ACCOUNTANT: return 'Accountant';
      case ROLES.TEACHER: return 'Teacher';
      case ROLES.INVENTORY_MANAGER: return 'Inventory Manager';
      case ROLES.VIEWER: return 'Viewer';
      default: return role;
    }
  };

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.USERS_VIEW}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
              <p className="text-slate-500">Manage system users and their access permissions.</p>
            </div>
            <button onClick={() => { setEditingId(null); setNewUser(defaultForm); setShowModal(true); }} className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        {search ? 'No users found matching your search.' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{user.name}</div>
                            <div className="text-sm text-slate-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(user.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.is_active 
                                  ? 'text-amber-600 hover:bg-amber-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(user.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit User Modal */}
          <Modal open={showModal} onClose={handleCloseModal}>
            <form onSubmit={handleSave} className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editingId ? 'Edit User' : 'Add New User'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    <option value={ROLES.VIEWER}>Viewer</option>
                    <option value={ROLES.INVENTORY_MANAGER}>Inventory Manager</option>
                    <option value={ROLES.TEACHER}>Teacher</option>
                    <option value={ROLES.ACCOUNTANT}>Accountant</option>
                    <option value={ROLES.ADMIN}>Admin</option>
                    <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
                
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
                  {saving ? 'Saving...' : (editingId ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title="Delete User"
            message="Are you sure you want to completely remove this user? This action cannot be undone."
          />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
