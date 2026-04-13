'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import { Plus, Search, ReceiptText, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { addExpense, getExpenses } from './actions';

const CATEGORIES = ['Utilities', 'Maintenance', 'Salaries', 'Educational', 'Events', 'Food', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'Utilities', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchExpenses(); }, []);

  async function fetchExpenses() {
    const res = await getExpenses();
    if (res.success) setExpenses(res.data);
    setLoading(false);
  }

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await addExpense(newExpense);
    if (res.success) { setShowModal(false); fetchExpenses(); setNewExpense({ category: 'Utilities', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') }); }
    else alert(`Error: ${res.error}`);
    setSaving(false);
  };

  return (
    <NavigationLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
            <p className="text-slate-500">Track and categorize spending.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary bg-rose-600 hover:bg-rose-700 shadow-rose-100 text-sm">
            <Plus className="h-4 w-4 mr-1.5" />Record Expense
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search expenses..." className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Date','Category','Description','Amount',''].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
                  : expenses.length === 0 ? <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No records found.</td></tr>
                  : expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-600">{format(new Date(e.date), 'MMM dd, yyyy')}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded bg-rose-50 flex items-center justify-center mr-2"><ReceiptText className="h-3 w-3 text-rose-600" /></div>
                          <span className="font-medium text-slate-900 text-sm">{e.category}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 truncate max-w-[200px]">{e.description}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-rose-600">रु {Number(e.amount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right"><button className="text-slate-300 hover:text-slate-500"><MoreVertical className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Expense">
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select className="input-field text-sm" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input type="date" required className="input-field text-sm" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (रु) *</label>
                <input type="number" required className="input-field text-sm" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea className="input-field text-sm" rows="2" placeholder="e.g. Electric bill" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}></textarea>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn bg-rose-600 text-white hover:bg-rose-700 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Record Expense'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </NavigationLayout>
  );
}
