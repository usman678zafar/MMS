'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import { Plus, Search, UserCircle, Phone, Banknote } from 'lucide-react';
import { addStaffMember, getStaff } from './actions';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Imam', monthly_salary: '', phone: '', joining_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    const res = await getStaff();
    if (res.success) setStaff(res.data);
    setLoading(false);
  }

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await addStaffMember(newStaff);
    if (!res.success) { alert(`Error: ${res.error}`); }
    else { setShowModal(false); fetchStaff(); setNewStaff({ name: '', role: 'Imam', monthly_salary: '', phone: '', joining_date: '' }); }
    setSaving(false);
  };

  return (
    <NavigationLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
            <p className="text-slate-500">Manage Madrasa and Masjid staff records.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />Add Staff Member
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400">Loading staff records...</div>
          ) : staff.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">No staff members found.</div>
          ) : staff.map((member) => (
            <div key={member.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">{member.name?.charAt(0) || '?'}</div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                <p className="text-sm text-slate-500">{member.role}</p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-slate-600"><Banknote className="h-4 w-4 mr-2 text-slate-400" />रु {Number(member.monthly_salary).toLocaleString()} / mo</div>
                <div className="flex items-center text-sm text-slate-600"><Phone className="h-4 w-4 mr-2 text-slate-400" />{member.phone || 'N/A'}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                <button className="flex-1 py-1.5 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors uppercase tracking-wider">Salary History</button>
                <button className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><UserCircle className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Staff Member">
          <form onSubmit={handleAddStaff} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input type="text" required className="input-field text-sm" placeholder="Staff member name"
                value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                <select className="input-field text-sm" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                  {['Imam', 'Moazzin', 'Teacher', 'Cleaner', 'Manager', 'Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Salary (रु)</label>
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
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Member'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </NavigationLayout>
  );
}
