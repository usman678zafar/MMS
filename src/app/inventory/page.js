"use client";
import React, { useState, useEffect, useCallback } from "react";
import NavigationLayout from "@/components/NavigationLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";
import SearchField from "@/components/SearchField";
import {
  TableSkeleton,
  StatsSkeleton,
  FilterSkeleton,
} from "@/components/SkeletonLoader";
import {
  Plus,
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
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = ["General", "Cleaning", "Educational", "Office", "Kitchen"];
const CATEGORY_KEYS = {
  General: "general", Cleaning: "cleaning", Educational: "educational",
  Office: "office", Kitchen: "kitchen",
};
const UNIT_KEYS = { pcs: "pcs", kg: "kg", liters: "liters", boxes: "boxes", rolls: "rolls" };

export default function InventoryPage() {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.INVENTORY_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.INVENTORY_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.INVENTORY_DELETE);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
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

  const handleSearch = () => {
    setSearch(searchInput.trim());
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
        <div className="management-page space-y-5 min-[1700px]:space-y-6">
          {/* Header */}
          <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t("inventory", "title")}</h2>
              <p className="text-slate-500">
                {t("inventory", "subtitle")}
              </p>
            </div>
            {canCreate && <button
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
              className="btn btn-primary page-primary-action"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("inventory", "add")}
            </button>}
          </div>

          {/* Stats Bar */}
          {loading ? (
            <StatsSkeleton />
          ) : (
            <div className="metric-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t("inventory", "total"),
                  value: totalItems,
                  color: "text-slate-900",
                },
                {
                  label: t("inventory", "lowStock"),
                  value: lowStockItems,
                  color: "text-amber-500",
                },
                {
                  label: t("inventory", "categories"),
                  value: totalCategories,
                  color: "text-emerald-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="metric-card p-4 text-center"
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
              <SearchField value={searchInput} onChange={setSearchInput} onSearch={handleSearch} placeholder={t("inventory", "searchPlaceholder")} />
              <select
                value={filterCategory}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
              >
                <option value="">{t("common", "allCategories")}</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{t("options", CATEGORY_KEYS[category])}</option>
                ))}
              </select>
            </div>
          )}

          {/* Inventory Table */}
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="data-table-scroll rounded-none border-0 shadow-none">
              <table className="data-table w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "storageItem")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "currentStock")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "status")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                      {t("tables", "actions")}
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
                          {t("inventory", "empty")}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          {t("inventory", "emptyHint")}
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
                                {CATEGORY_KEYS[item.category] ? t("options", CATEGORY_KEYS[item.category]) : item.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                          <bdi>{item.quantity}</bdi> {UNIT_KEYS[item.unit] ? t("options", UNIT_KEYS[item.unit]) : item.unit}
                        </td>
                        <td className="px-6 py-4">
                          {Number(item.quantity) < 5 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 ">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t("inventory", "lowStock")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 ">
                              {t("inventory", "inStock")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={t("inventory", "editAction")}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>}
                            {canDelete && <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title={t("inventory", "deleteAction")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>}
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
            title={editingId ? t("inventory", "edit") : t("inventory", "add")}
          >
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t("inventory", "itemName")} *
                </label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder={t("inventory", "itemPlaceholder")}
                  value={newItem.item_name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, item_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("tables", "category")}
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t("options", CATEGORY_KEYS[c])}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("inventory", "unit")}
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                  >
                    {["pcs", "kg", "liters", "boxes", "rolls"].map((u) => (
                      <option key={u} value={u}>{t("options", UNIT_KEYS[u])}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("inventory", "quantity")} *
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
                  {t("common", "cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {saving
                    ? t("common", "saving")
                    : editingId
                      ? t("inventory", "updateItem")
                      : t("inventory", "add")}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title={t("inventory", "delete")}
            message={t("inventory", "deleteMessage")}
          />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
