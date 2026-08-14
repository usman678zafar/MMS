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
  UserCircle,
  Phone,
  Banknote,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  getStaff,
} from "./actions";
import { format } from "date-fns";
import { PERMISSIONS } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";
import { useLanguage } from "@/context/LanguageContext";

const ROLES = [
  "Imam",
  "Moazzin",
  "Qari",
  "Teacher",
  "Cleaner",
  "Manager",
  "Other",
];

const ROLE_KEYS = {
  Imam: "imam", Moazzin: "moazzin", Qari: "qari", Teacher: "teacher",
  Cleaner: "cleaner", Manager: "manager", Other: "other",
};

const defaultForm = {
  name: "",
  role: "Imam",
  monthly_salary: "",
  phone: "",
  joining_date: format(new Date(), "yyyy-MM-dd"),
};

export default function StaffPage() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newStaff, setNewStaff] = useState(defaultForm);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const res = await getStaff(
      currentPage,
      PAGINATION_DEFAULTS.PAGE_SIZE,
      search,
      filterStatus,
    );
    if (res.success) {
      setStaff(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, search, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchStaff();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchStaff]);

  const handleOpenEdit = (member) => {
    setNewStaff({
      name: member.name,
      role: member.role || "Imam",
      monthly_salary: member.monthly_salary || "",
      phone: member.phone || "",
      joining_date: member.joining_date
        ? format(new Date(member.joining_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    });
    setEditingId(member.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewStaff(defaultForm);
    setEditingId(null);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateStaffMember(editingId, newStaff);
    } else {
      res = await addStaffMember(newStaff);
    }

    if (!res.success) {
      alert(`Error: ${res.error}`);
    } else {
      handleCloseModal();
      fetchStaff();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteStaffMember(deleteId);
    if (res.success) fetchStaff();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const active = staff.filter((s) => s.is_active !== false).length;
  const inactive = staff.length - active;
  const totalSalary = staff.reduce(
    (sum, s) => sum + Number(s.monthly_salary || 0),
    0,
  );

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_VIEW}>
        <div className="management-page space-y-5 min-[1700px]:space-y-6">
          {/* Header */}
          <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t("staff", "title")}</h2>
              <p className="text-slate-500">
                {t("staff", "subtitle")}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setNewStaff(defaultForm);
                setShowModal(true);
              }}
              className="btn btn-primary page-primary-action"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("staff", "add")}
            </button>
          </div>

          {/* Stats Bar */}
          {loading ? (
            <StatsSkeleton />
          ) : (
            <div className="metric-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t("staff", "total"),
                  value: staff.length,
                  color: "text-slate-900",
                },
                { label: t("common", "active"), value: active, color: "text-emerald-600" },
                { label: t("common", "inactive"), value: inactive, color: "text-rose-500" },
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
              <SearchField value={searchInput} onChange={setSearchInput} onSearch={handleSearch} placeholder={t("staff", "searchPlaceholder")} />
              <select
                value={filterStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
              >
                <option value="">{t("common", "allStatus")}</option>
                <option value="active">{t("common", "active")}</option>
                <option value="inactive">{t("common", "inactive")}</option>
              </select>
            </div>
          )}

          {/* Staff Table */}
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="data-table-scroll rounded-none border-0 shadow-none">
              <table className="data-table w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "staffMember")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "role")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "contact")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "salary")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "joined")}
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
                      <td colSpan="7" className="p-0">
                        <TableSkeleton columns={7} rows={5} />
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <UserCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-lg font-medium">
                          {t("staff", "empty")}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          {t("staff", "emptyHint")}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                              {member.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {t("staff", "staffId")}: {member.id?.slice(-8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
                            {ROLE_KEYS[member.role] ? t("options", ROLE_KEYS[member.role]) : member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {member.phone || (
                            <span className="text-slate-300 italic text-xs">
                              {t("common", "noPhone")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900">
                            Rs {Number(member.monthly_salary).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {member.joining_date
                            ? format(new Date(member.joining_date), "MMM yyyy")
                            : t("common", "notAvailable")}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                              member.is_active !== false
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                            }`}
                            title={t("staff", "toggleStatus")}
                          >
                            {member.is_active !== false ? t("common", "active") : t("common", "inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={t("staff", "edit")}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(member.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title={t("staff", "delete")}
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
            title={editingId ? t("staff", "edit") : t("staff", "add")}
          >
            <form onSubmit={handleSaveStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t("staff", "fullName")} *
                </label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder={t("staff", "namePlaceholder")}
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("tables", "role")}
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newStaff.role}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, role: e.target.value })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t("options", ROLE_KEYS[r])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("staff", "monthlySalary")}
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field text-sm"
                    placeholder="0"
                    value={newStaff.monthly_salary}
                    onChange={(e) =>
                      setNewStaff({
                        ...newStaff,
                        monthly_salary: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("staff", "phone")}
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="03XX-XXXXXXX"
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("staff", "joiningDate")}
                  </label>
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={newStaff.joining_date}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, joining_date: e.target.value })
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
                      ? t("staff", "updateMember")
                      : t("staff", "saveMember")}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title={t("staff", "delete")}
            message={t("staff", "deleteMessage")}
          />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
