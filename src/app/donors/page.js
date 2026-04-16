'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, Trash2, Phone, Mail, MapPin, HandHeart, Edit2, UserCheck, UserX } from 'lucide-react';
import { addDonor, updateDonor, getAllDonors, deleteDonor } from './actions';
import { PERMISSIONS } from '@/lib/rbac';
import { format } from 'date-fns';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

export default function DonorsPage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newDonor, setNewDonor] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDonors();
  }, [currentPage, search, filterStatus]);

  async function fetchDonors() {
    setLoading(true);
    const res = await getAllDonors(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterStatus);
    if (res.success) {
      setDonors(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }

  const handleOpenEdit = (donor) => {
    setNewDonor({ 
      name: donor.name, 
      email: donor.email || '', 
      phone: donor.phone || '', 
      address: donor.address || '',
      is_active: donor.is_active !== false
    });
    setEditingId(donor.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewDonor({ name: '', email: '', phone: '', address: '', is_active: true });
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateDonor(editingId, newDonor);
    } else {
      res = await addDonor(newDonor);
    }
    
    if (res.success) {
      handleCloseModal();
      fetchDonors();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteDonor(deleteId);
    if (res.success) fetchDonors();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleToggleStatus = async (id, current) => {
    const donor = donors.find(d => d.id === id);
    if (donor) {
      const res = await updateDonor(id, { ...donor, is_active: !current });
      if (res.success) fetchDonors();
      else alert(`Error: ${res.error}`);
    }
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

  const active = donors.filter(d => d.is_active !== false).length;
  const inactive = donors.length - active;

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.DONORS_VIEW}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Donors</h2>
            <p className="text-slate-500">Manage donor information and donation records.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewDonor({ name: '', email: '', phone: '', address: '', is_active: true }); setShowModal(true); }} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Donor
          </button>
        </div>

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Donors', value: donors.length, color: 'text-slate-900' },
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
                placeholder="Search by name, email, or phone..."
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

        {/* Donors Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Donor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
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
                ) : donors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <HandHeart className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium">No donors found</p>
                      <p className="text-slate-400 text-sm mt-1">Add your first donor to get started</p>
                    </td>
                  </tr>
                ) : (
                  donors.map((donor) => (
                    <tr key={donor.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                            {donor.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{donor.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              Donor ID: {donor.id?.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {donor.phone || (
                          <span className="text-slate-300 italic text-xs">No phone</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {donor.email ? (
                          <span className="truncate">{donor.email}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">No email</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {donor.address ? (
                          <span className="truncate">{donor.address}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">No address</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(donor.id, donor.is_active !== false)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                            donor.is_active !== false
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {donor.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {donor.created_at ? format(new Date(donor.created_at), 'MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(donor)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit Donor"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(donor.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Donor"
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Donor" : "Add New Donor"}>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input type="text" required className="input-field text-sm" placeholder="e.g. Ahmad Ali Khan"
                value={newDonor.name} onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input type="tel" className="input-field text-sm" placeholder="03XX-XXXXXXX"
                  value={newDonor.phone} onChange={(e) => setNewDonor({ ...newDonor, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input type="email" className="input-field text-sm" placeholder="email@example.com"
                  value={newDonor.email} onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input type="text" className="input-field text-sm" placeholder="City, Area"
                  value={newDonor.address} onChange={(e) => setNewDonor({ ...newDonor, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? 'Saving...' : (editingId ? 'Update Donor' : 'Add Donor')}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete Donor"
          message="Are you sure you want to delete this donor? This action cannot be undone."
        />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
