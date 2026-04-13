'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import { Plus, Search, Trash2, Phone, Mail, MapPin, HandHeart } from 'lucide-react';
import { addDonor, getAllDonors, deleteDonor } from './actions';

export default function DonorsPage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const handleAddDonor = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await addDonor(newDonor);
    if (res.success) {
      setShowModal(false);
      setNewDonor({ name: '', email: '', phone: '', address: '' });
      fetchDonors();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this donor?')) return;
    const res = await deleteDonor(id);
    if (res.success) fetchDonors();
    else alert(`Error: ${res.error}`);
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
            onClick={() => setShowModal(true)}
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
              <div key={donor.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold flex-shrink-0">
                      {donor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{donor.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {donor.donations?.length || 0} donation{donor.donations?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(donor.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Donor">
          <form onSubmit={handleAddDonor} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input type="text" required className="input-field text-sm" placeholder="e.g. Ahmad Ali Khan"
                value={newDonor.name} onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Donor'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </NavigationLayout>
  );
}
