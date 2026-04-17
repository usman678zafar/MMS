'use client'
import React, { useState, useEffect, useCallback } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, ReceiptText, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { addExpense, updateExpense, deleteExpense, getExpenses } from './actions';
import { PERMISSIONS } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

const CATEGORIES = ['Utilities', 'Maintenance', 'Salaries', 'Educational', 'Events', 'Food', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [newExpense, setNewExpense] = useState({ category: 'Utilities', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const res = await getExpenses(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterCategory);
    if (res.success) {
      setExpenses(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, search, filterCategory]);

  useEffect(() => { 
    const t = setTimeout(() => {
      fetchExpenses(); 
    }, 0);
    return () => clearTimeout(t);
  }, [fetchExpenses]);

  const handleOpenEdit = (expense) => {
    setNewExpense({
      category: expense.category || 'Utilities',
      amount: expense.amount,
      description: expense.description || '',
      date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewExpense({ category: 'Utilities', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
    setEditingId(null);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateExpense(editingId, newExpense);
    } else {
      res = await addExpense(newExpense);
    }
    
    if (res.success) { handleCloseModal(); fetchExpenses(); }
    else alert(`Error: ${res.error}`);
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteExpense(deleteId);
    if (res.success) fetchExpenses();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value) => {
    setFilterCategory(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const thisMonth = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.EXPENSES_VIEW}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
            <p className="text-slate-500">Track and categorize spending.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewExpense({ category: 'Utilities', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') }); setShowModal(true); }} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Record Expense
          </button>
        </div>

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Expenses', value: `Rs ${totalExpenses.toLocaleString()}`, color: 'text-slate-900' },
              { label: 'This Month', value: `Rs ${thisMonth.toLocaleString()}`, color: 'text-rose-500' },
              { label: 'Transactions', value: expenses.length, color: 'text-emerald-600' },
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
                placeholder="Search description or category..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-0">
                      <TableSkeleton columns={5} rows={5} />
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <ReceiptText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium">No expenses found</p>
                      <p className="text-slate-400 text-sm mt-1">Add your first expense to get started</p>
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {format(new Date(e.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-base flex-shrink-0">
                            {e.category?.charAt(0)?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{e.category}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              Expense
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {e.description ? (
                          <span className="truncate">{e.description}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">No description</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-rose-600">
                          Rs {Number(e.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(e)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit Expense"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(e.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Expense"
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Expense" : "Record Expense"}>
          <form onSubmit={handleSaveExpense} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (Rs) *</label>
                <input type="number" required className="input-field text-sm" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea className="input-field text-sm" rows="2" placeholder="e.g. Electric bill" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}></textarea>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn bg-rose-600 text-white hover:bg-rose-700 text-sm disabled:opacity-50">{saving ? 'Saving...' : (editingId ? 'Update Expense' : 'Record Expense')}</button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete Expense"
          message="Are you sure you want to completely remove this expense record? This action cannot be undone."
        />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
