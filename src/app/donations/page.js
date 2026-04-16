'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, Filter, MoreVertical, Download, Edit2, Trash2, HandHeart, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { addDonation, updateDonation, deleteDonation, getDonations, getDonors, uploadReceipt } from './actions';
import { PERMISSIONS } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

const DONATION_TYPES = ['Sadqah', 'Zakat', 'Fitra', 'Hadiya', 'Other'];
const defaultForm = { donor_id: '', amount: '', type: 'Sadqah', date: format(new Date(), 'yyyy-MM-dd'), notes: '', receipt_url: '' };

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [newDonation, setNewDonation] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [donors, setDonors] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => { fetchDonations(); fetchDonors(); }, [currentPage, search, filterType]);

  async function fetchDonations() {
    setLoading(true);
    const res = await getDonations(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterType);
    if (res.success) {
      setDonations(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }
  async function fetchDonors() {
    const res = await getDonors();
    if (res.success) setDonors(res.data);
  }

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await uploadReceipt(formData);
      if (!res.success) throw new Error(res.error);
      
      return res.url;
    } catch (err) { alert('Upload error: ' + err.message); return null; }
    finally { setUploading(false); }
  };

  const handleOpenEdit = (donation) => {
    setNewDonation({
      donor_id: donation.donor_id || '',
      amount: donation.amount,
      type: donation.type,
      date: donation.date ? format(new Date(donation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      notes: donation.notes || '',
      receipt_url: donation.receipt_url || ''
    });
    setEditingId(donation.id);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewDonation(defaultForm);
    setEditingId(null);
    setSelectedFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let url = newDonation.receipt_url;
    if (selectedFile) url = await handleFileUpload(selectedFile);
    
    let res;
    if (editingId) {
      res = await updateDonation(editingId, { ...newDonation, receipt_url: url });
    } else {
      res = await addDonation({ ...newDonation, receipt_url: url });
    }

    if (res.success) { handleCloseModal(); fetchDonations(); }
    else alert(`Error: ${res.error}`);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteDonation(deleteId);
    if (res.success) fetchDonations();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const thisMonth = donations.filter(d => {
    const donationDate = new Date(d.date);
    const now = new Date();
    return donationDate.getMonth() === now.getMonth() && donationDate.getFullYear() === now.getFullYear();
  }).reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.DONATIONS_VIEW}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Donations</h2>
            <p className="text-slate-500">Manage and track all incoming contributions.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewDonation(defaultForm); setShowModal(true); }} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Donation
          </button>
        </div>

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Donations', value: donations.length, color: 'text-slate-900' },
              { label: 'This Month', value: thisMonth, color: 'text-emerald-600' },
              { label: 'Total Amount', value: `रु${totalAmount.toLocaleString()}`, color: 'text-primary-600' },
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
                placeholder="Search donor or type..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">All Types</option>
              {DONATION_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </div>
        )}

        {/* Donations Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Donor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-0">
                      <TableSkeleton columns={6} rows={5} />
                    </td>
                  </tr>
                ) : donations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <HandHeart className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium">No donations found</p>
                      <p className="text-slate-400 text-sm mt-1">Add your first donation to get started</p>
                    </td>
                  </tr>
                ) : (
                  donations.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {format(new Date(d.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                            {d.donors?.name?.charAt(0)?.toUpperCase() || 'W'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{d.donors?.name || 'Walk-in'}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              {d.type}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.type === 'Zakat' ? 'bg-emerald-100 text-emerald-800' : d.type === 'Sadqah' ? 'bg-blue-100 text-blue-800' : d.type === 'Masjid' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>{d.type}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          Rs {Number(d.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {d.notes ? (
                          <span className="truncate">{d.notes}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">No notes</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(d)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit Donation"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(d.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Donation"
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Donation" : "Add Donation"}>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Donor *</label>
              <select required className="input-field text-sm" value={newDonation.donor_id} onChange={(e) => setNewDonation({ ...newDonation, donor_id: e.target.value })}>
                <option value="">Select Donor</option>
                {donors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (रु) *</label>
                <input type="number" required className="input-field text-sm" placeholder="0"
                  value={newDonation.amount} onChange={(e) => setNewDonation({ ...newDonation, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select className="input-field text-sm" value={newDonation.type} onChange={(e) => setNewDonation({ ...newDonation, type: e.target.value })}>
                  {['Zakat','Sadqah','Lillah','Fitrana','Masjid','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" required className="input-field text-sm"
                  value={newDonation.date} onChange={(e) => setNewDonation({ ...newDonation, date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows="2" className="input-field text-sm" value={newDonation.notes} onChange={(e) => setNewDonation({ ...newDonation, notes: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Receipt Image {newDonation.receipt_url && !selectedFile && <>(Current: <a href={newDonation.receipt_url} className="text-primary-600 underline" target="_blank" rel="noreferrer">View</a>)</>}
              </label>
              <input type="file" accept="image/*" className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files[0])} />
              {selectedFile && <p className="text-[10px] text-green-600 mt-1">Image selected, will replace current on save.</p>}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={uploading} className="btn btn-primary text-sm disabled:opacity-50">
                {uploading ? 'Uploading...' : (editingId ? 'Update Donation' : 'Save Donation')}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete Donation"
          message="Are you sure you want to completely remove this donation record? This action cannot be undone."
        />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
