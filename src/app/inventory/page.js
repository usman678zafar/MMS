"use client";
import React, { useState, useEffect, useCallback } from "react";
import NavigationLayout from "@/components/NavigationLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";
import {
  TableSkeleton,
  StatsSkeleton,
  FilterSkeleton,
} from "@/components/SkeletonLoader";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventory,
} from "./actions";
import { PERMISSIONS } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";

const CATEGORIES = ["General", "Cleaning", "Educational", "Office", "Kitchen"];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "General",
    quantity: "",
    unit: "pcs",
  });
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const res = await getInventory(
      currentPage,
      PAGINATION_DEFAULTS.PAGE_SIZE,
      search,
      filterCategory,
    );
    if (res.success) {
      setItems(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, search, filterCategory]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchInventory();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchInventory]);

  const handleOpenEdit = (item) => {
    setNewItem({
      item_name: item.item_name,
      category: item.category || "General",
      quantity: item.quantity,
      unit: item.unit || "pcs",
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewItem({
      item_name: "",
      category: "General",
      quantity: "",
      unit: "pcs",
    });
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

    if (res.success) {
      handleCloseModal();
      fetchInventory();
    } else alert(`Error: ${res.error}`);
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteInventoryItem(deleteId);
    if (res.success) fetchInventory();
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

  const totalItems = items.length;
  const lowStockItems = items.filter(
    (item) => Number(item.quantity) < 5,
  ).length;
  const totalCategories = [...new Set(items.map((item) => item.category))]
    .length;

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_VIEW}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Inventory</h2>
              <p className="text-slate-500">
                Track supplies, equipment, and assets.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setNewItem({
                  item_name: "",
                  category: "General",
                  quantity: "",
                  unit: "pcs",
                });
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>

          {/* Stats Bar */}
          {loading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Total Items",
                  value: totalItems,
                  color: "text-slate-900",
                },
                {
                  label: "Low Stock",
                  value: lowStockItems,
                  color: "text-amber-500",
                },
                {
                  label: "Categories",
                  value: totalCategories,
                  color: "text-emerald-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl border border-slate-100 p-4 text-center"
                >
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {stat.label}
                  </p>
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
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
          )}

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Storage Item
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-0">
                        <TableSkeleton columns={5} rows={5} />
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-lg font-medium">
                          No items found
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          Add your first item to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-base flex-shrink-0">
                              {item.item_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {item.item_name}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {item.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4">
                          {Number(item.quantity) < 5 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 ">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 ">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Edit Item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete Item"
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

          <Modal
            open={showModal}
            onClose={handleCloseModal}
            title={editingId ? "Edit Inventory Item" : "Add Inventory Item"}
          >
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder="e.g. Prayer Mats"
                  value={newItem.item_name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, item_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Unit
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                  >
                    {["pcs", "kg", "liters", "boxes", "rolls"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field text-sm"
                    placeholder="0"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem({ ...newItem, quantity: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Item"
                      : "Add Item"}
                </button>
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
