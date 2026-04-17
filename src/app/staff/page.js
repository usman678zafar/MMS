'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, UserCircle, Phone, Banknote, Edit2, Trash2 } from 'lucide-react';
import { addStaffMember, updateStaffMember, deleteStaffMember, getStaff } from './actions';
import { format } from 'date-fns';
import { PERMISSIONS } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

const ROLES = ['Imam', 'Moazzin', 'Qari', 'Teacher', 'Cleaner', 'Manager', 'Other'];

// Debug: Log ROLES to verify Qari is included
if (typeof window !== 'undefined') {
  console.log('Available ROLES:', ROLES);
}
const defaultForm = { name: '', role: 'Imam', monthly_salary: '', phone: '', joining_date: format(new Date(), 'yyyy-MM-dd') };

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newStaff, setNewStaff] = useState(defaultForm);

  useEffect(() => { fetchStaff(); }, [currentPage, search, filterStatus]);

  async function fetchStaff() {
    setLoading(true);
    const res = await getStaff(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterStatus);
    if (res.success) {
      setStaff(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }

  const handleOpenEdit = (member) => {
    setNewStaff({
      name: member.name,
      role: member.role || 'Imam',
      monthly_salary: member.monthly_salary || '',
      phone: member.phone || '',
      joining_date: member.joining_date ? format(new Date(member.joining_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    setEditingId(member.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewStaff(defaultForm);
    setEditingId(null);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateStaffMember(editingId, newStaff);
    } else {
      res = await addStaffMember(newStaff);
    }
    
    if (!res.success) { alert(`Error: ${res.error}`); }
    else { handleCloseModal(); fetchStaff(); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteStaffMember(deleteId);
    if (res.success) fetchStaff();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const active = staff.filter(s => s.is_active !== false).length;
  const inactive = staff.length - active;
  const totalSalary = staff.reduce((sum, s) => sum + Number(s.monthly_salary || 0), 0);

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_VIEW}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
            <p className="text-slate-500">Manage Madrasa and Masjid staff records.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewStaff(defaultForm); setShowModal(true); }} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </button>
        </div>

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Staff', value: staff.length, color: 'text-slate-900' },
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
                placeholder="Search by name, role, or phone..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-0">
                      <TableSkeleton columns={7} rows={5} />
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <UserCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium">No staff members found</p>
                      <p className="text-slate-400 text-sm mt-1">Add your first staff member to get started</p>
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                            {member.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              Staff ID: {member.id?.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {member.phone || (
                          <span className="text-slate-300 italic text-xs">No phone</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          Rs {Number(member.monthly_salary).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {member.joining_date ? format(new Date(member.joining_date), 'MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                            member.is_active !== false
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {member.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(member)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(member.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Staff Member"
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Staff Member" : "Add Staff Member"}>
          <form onSubmit={handleSaveStaff} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input type="text" required className="input-field text-sm" placeholder="Staff member name"
                value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                <select className="input-field text-sm" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Salary (Rs)</label>
                <input type="number" required className="input-field text-sm" placeholder="0"
                  value={newStaff.monthly_salary} onChange={(e) => setNewStaff({ ...newStaff, monthly_salary: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input type="text" className="input-field text-sm" placeholder="03XX-XXXXXXX"
                  value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Joining Date</label>
                <input type="date" className="input-field text-sm"
                  value={newStaff.joining_date} onChange={(e) => setNewStaff({ ...newStaff, joining_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : (editingId ? 'Update Member' : 'Save Member')}</button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete Staff Member"
          message="Are you sure you want to completely remove this staff member? This action cannot be undone."
        />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
