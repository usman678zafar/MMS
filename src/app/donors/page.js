'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Search, Trash2, Phone, Mail, MapPin, HandHeart, Edit2 } from 'lucide-react';
import { addDonor, updateDonor, getAllDonors, deleteDonor } from './actions';

export default function DonorsPage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [newDonor, setNewDonor] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchDonors();
  }, []);

  async function fetchDonors() {
    setLoading(true);
    const res = await getAllDonors();
    if (res.success) setDonors(res.data);
    setLoading(false);
  }

  const handleOpenEdit = (donor) => {
    setNewDonor({ name: donor.name, email: donor.email || '', phone: donor.phone || '', address: donor.address || '' });
    setEditingId(donor.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewDonor({ name: '', email: '', phone: '', address: '' });
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

  const filtered = donors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalForDonor = (donor) =>
    donor.donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  return (
    <NavigationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Donors</h2>
            <p className="text-slate-500">Manage all donors and their contribution history.</p>
          </div>
          <button
            onClick={() => { setEditingId(null); setNewDonor({ name: '', email: '', phone: '', address: '' }); setShowModal(true); }}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Donor
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search donors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>

        {/* Donor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400">Loading donors...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <HandHeart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-medium">No donors found</p>
              <p className="text-slate-400 text-sm mt-1">Add your first donor to get started</p>
            </div>
          ) : (
            filtered.map((donor) => (
              <div key={donor.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button onClick={() => handleOpenEdit(donor)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(donor.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-start justify-between pr-14">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold flex-shrink-0">
                      {donor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{donor.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {donor.donations?.length || 0} donation{donor.donations?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {donor.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>{donor.phone}</span>
                    </div>
                  )}
                  {donor.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{donor.email}</span>
                    </div>
                  )}
                  {donor.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{donor.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Given</span>
                  <span className="text-base font-bold text-primary-600">
                    रु {totalForDonor(donor).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
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
          message="Are you sure you want to completely remove this donor? This action cannot be undone."
        />
      </div>
    </NavigationLayout>
  );
}
