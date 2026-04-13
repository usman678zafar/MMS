import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, MoreVertical, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDonation, setNewDonation] = useState({
    donor_id: '',
    amount: '',
    type: 'Sadqah',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    receipt_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [donors, setDonors] = useState([]);

  useEffect(() => {
    fetchDonations();
    fetchDonors();
  }, []);

  async function fetchDonations() {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        donors (name)
      `)
      .order('date', { ascending: false });
    
    if (data) setDonations(data);
    setLoading(false);
  }

  async function fetchDonors() {
    const { data } = await supabase.from('donors').select('id, name');
    if (data) setDonors(data);
  }

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      alert('Error uploading image: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddDonation = async (e) => {
    e.preventDefault();
    let url = '';
    if (selectedFile) {
      url = await handleFileUpload(selectedFile);
    }

    const { error } = await supabase.from('donations').insert([
      { ...newDonation, receipt_url: url }
    ]);

    if (!error) {
      setShowModal(false);
      fetchDonations();
      setNewDonation({
        donor_id: '',
        amount: '',
        type: 'Sadqah',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        receipt_url: ''
      });
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Donations</h2>
          <p className="text-slate-500">Manage and track all incoming contributions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Donation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search donor or receipt..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Donor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading donations...</td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No donations found.</td>
                </tr>
              ) : (
                donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{format(new Date(donation.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{donation.donors?.name || 'Walk-in'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${donation.type === 'Zakat' ? 'bg-emerald-100 text-emerald-800' : 
                          donation.type === 'Sadqah' ? 'bg-blue-100 text-blue-800' : 
                          'bg-amber-100 text-amber-800'}`}>
                        {donation.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">रु {Number(donation.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {donation.receipt_url ? (
                        <a href={donation.receipt_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 text-xs font-bold underline">View</a>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No Receipt</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Add New Donation</h3>
            </div>
            <form onSubmit={handleAddDonation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Donor</label>
                  <select 
                    required
                    className="input-field"
                    value={newDonation.donor_id}
                    onChange={(e) => setNewDonation({...newDonation, donor_id: e.target.value})}
                  >
                    <option value="">Select Donor</option>
                    {donors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (रु)</label>
                  <input 
                    type="number" 
                    required 
                    className="input-field"
                    value={newDonation.amount}
                    onChange={(e) => setNewDonation({...newDonation, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    className="input-field"
                    value={newDonation.type}
                    onChange={(e) => setNewDonation({...newDonation, type: e.target.value})}
                  >
                    <option>Zakat</option>
                    <option>Sadqah</option>
                    <option>Lillah</option>
                    <option>Fitrana</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required 
                    className="input-field"
                    value={newDonation.date}
                    onChange={(e) => setNewDonation({...newDonation, date: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Image (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="input-field py-2" 
                  rows="3"
                  value={newDonation.notes}
                  onChange={(e) => setNewDonation({...newDonation, notes: e.target.value})}
                ></textarea>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={uploading} className="btn btn-primary">
                  {uploading ? 'Uploading...' : 'Save Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
