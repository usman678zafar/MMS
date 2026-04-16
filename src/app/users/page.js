'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, Trash2, Mail, Shield, Edit2, UserCheck, UserX } from 'lucide-react';
import { addUser, updateUser, getUsers, deleteUser, toggleUserStatus } from './actions';
import { PERMISSIONS, ROLES } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

const defaultForm = { name: '', email: '', role: 'viewer', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState(defaultForm);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getUsers(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterRole);
    if (res.success) {
      setUsers(res.data);
      setPagination(res.pagination);
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

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (value) => {
    setFilterRole(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const active = users.filter(u => u.is_active !== false).length;
  const inactive = users.length - active;

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

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Users', value: users.length, color: 'text-slate-900' },
              { label: 'Active', value: active, color: 'text-emerald-600' },
              { label: 'Inactive', value: inactive, color: 'text-rose-500' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {loading ? (
          <FilterSkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">All Roles</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.ACCOUNTANT}>Accountant</option>
              <option value={ROLES.TEACHER}>Teacher</option>
              <option value={ROLES.VIEWER}>Viewer</option>
            </select>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-0">
                        <TableSkeleton columns={5} rows={5} />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Shield className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-lg font-medium">No users found</p>
                        <p className="text-slate-400 text-sm mt-1">Add your first user to get started</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                              user.is_active
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleEdit(user)} 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Edit User"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteId(user.id)} 
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete User"
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
            {pagination && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
              />
            )}
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
