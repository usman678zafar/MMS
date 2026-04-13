import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, UserCircle, Phone, Calendar, Banknote } from 'lucide-react';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Imam',
    monthly_salary: '',
    phone: '',
    joining_date: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').order('name');
    if (data) setStaff(data);
    setLoading(false);
  }

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('staff').insert([newStaff]);
    if (!error) {
      setShowModal(false);
      fetchStaff();
      setNewStaff({ name: '', role: 'Imam', monthly_salary: '', phone: '', joining_date: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
          <p className="text-slate-500">Manage Madrasa and Masjid staff records.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">Loading staff records...</div>
        ) : staff.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 text-lg">No staff members found.</div>
        ) : (
          staff.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">
                  {member.name.charAt(0)}
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <p className="text-sm font-medium text-slate-500">{member.role}</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                  <Banknote className="h-4 w-4 mr-2 text-slate-400" />
                  रु {Number(member.monthly_salary).toLocaleString()} / month
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="h-4 w-4 mr-2 text-slate-400" />
                  {member.phone || 'N/A'}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50 flex gap-2">
                <button className="flex-1 py-2 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors uppercase tracking-wider">
                  View Salary History
                </button>
                <button className="px-3 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <UserCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Add Staff Member</h3>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" required className="input-field"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select 
                    className="input-field"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  >
                    <option>Imam</option>
                    <option>Moazzin</option>
                    <option>Teacher</option>
                    <option>Cleaner</option>
                    <option>Manager</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Salary (रु)</label>
                  <input 
                    type="number" required className="input-field"
                    value={newStaff.monthly_salary}
                    onChange={(e) => setNewStaff({...newStaff, monthly_salary: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input 
                    type="text" className="input-field"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
                  <input 
                    type="date" className="input-field"
                    value={newStaff.joining_date}
                    onChange={(e) => setNewStaff({...newStaff, joining_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
