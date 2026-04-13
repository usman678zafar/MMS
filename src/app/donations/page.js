'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Search, Filter, MoreVertical, Download, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { addDonation, updateDonation, deleteDonation, getDonations, getDonors } from './actions';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => { fetchDonations(); fetchDonors(); }, []);

  async function fetchDonations() {
    setLoading(true);
    const res = await getDonations();
    if (res.success) setDonations(res.data);
    setLoading(false);
  }
  async function fetchDonors() {
    const res = await getDonors();
    if (res.success) setDonors(res.data);
  }

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `receipts/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);
      return publicUrl;
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

  const filtered = donations.filter(d => 
    d.donors?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <NavigationLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Donations</h2>
            <p className="text-slate-500">Manage and track all incoming contributions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary text-sm"><Download className="h-4 w-4 mr-1.5" />Export</button>
            <button onClick={() => { setEditingId(null); setNewDonation(defaultForm); setShowModal(true); }} className="btn btn-primary text-sm">
              <Plus className="h-4 w-4 mr-1.5" />Add Donation
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search donor or type..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Date','Donor','Type','Amount','Receipt','Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
                  : filtered.length === 0 ? <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">No donations found.</td></tr>
                  : filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{format(new Date(d.date), 'MMM dd, yyyy')}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 text-sm whitespace-nowrap">{d.donors?.name || 'Walk-in'}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.type === 'Zakat' ? 'bg-emerald-100 text-emerald-800' : d.type === 'Sadqah' ? 'bg-blue-100 text-blue-800' : d.type === 'Masjid' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>{d.type}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 whitespace-nowrap">रु {Number(d.amount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {d.receipt_url ? <a href={d.receipt_url} target="_blank" rel="noreferrer" className="text-primary-600 text-xs font-bold underline">View</a>
                          : <span className="text-slate-300 text-xs italic">None</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenEdit(d)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(d.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
    </NavigationLayout>
  );
}
