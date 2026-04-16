'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Search, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventory } from './actions';
import { PERMISSIONS } from '@/lib/rbac';

const CATEGORIES = ['General', 'Cleaning', 'Educational', 'Office', 'Kitchen'];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState({ item_name: '', category: 'General', quantity: '', unit: 'pcs' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInventory(); }, []);

  async function fetchInventory() {
    const res = await getInventory();
    if (res.success) setItems(res.data);
    setLoading(false);
  }

  const handleOpenEdit = (item) => {
    setNewItem({
      item_name: item.item_name,
      category: item.category || 'General',
      quantity: item.quantity,
      unit: item.unit || 'pcs'
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewItem({ item_name: '', category: 'General', quantity: '', unit: 'pcs' });
    setEditingId(null);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateInventoryItem(editingId, newItem);
    } else {
      res = await addInventoryItem(newItem);
    }
    
    if (res.success) { handleCloseModal(); fetchInventory(); }
    else alert(`Error: ${res.error}`);
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteInventoryItem(deleteId);
    if (res.success) fetchInventory();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const filtered = items.filter(item => 
    item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_VIEW}>
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Inventory</h2>
            <p className="text-slate-500">Track supplies, equipment, and assets.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewItem({ item_name: '', category: 'General', quantity: '', unit: 'pcs' }); setShowModal(true); }} className="btn btn-primary text-sm">
            <Plus className="h-4 w-4 mr-1.5" />Add Item
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Item Name','Category','Stock Level','Status','Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
                  : filtered.length === 0 ? <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No items found.</td></tr>
                  : filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center mr-2"><Package className="h-3.5 w-3.5 text-slate-500" /></div>
                          <span className="font-semibold text-slate-900 text-sm">{item.item_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{item.category}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900 whitespace-nowrap">{item.quantity} {item.unit}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {item.quantity < 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Low Stock</span>
                        ) : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">In Stock</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenEdit(item)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(item.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Inventory Item" : "Add Inventory Item"}>
          <form onSubmit={handleSaveItem} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
              <input type="text" required className="input-field text-sm" placeholder="e.g. Prayer Mats" value={newItem.item_name} onChange={(e) => setNewItem({...newItem, item_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select className="input-field text-sm" value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                <select className="input-field text-sm" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})}>
                  {['pcs', 'kg', 'liters', 'boxes', 'rolls'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                <input type="number" required className="input-field text-sm" placeholder="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : (editingId ? 'Update Item' : 'Add Item')}</button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="Delete Inventory Item"
          message="Are you sure you want to completely remove this inventory item? This action cannot be undone."
        />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
