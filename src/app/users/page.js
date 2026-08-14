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
  Trash2,
  Mail,
  Shield,
  Edit2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  addUser,
  updateUser,
  getUsers,
  deleteUser,
  toggleUserStatus,
} from "./actions";
import { PERMISSIONS, ROLES } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";
import { useLanguage } from "@/context/LanguageContext";

const defaultForm = { name: "", email: "", role: "viewer", password: "" };

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState(defaultForm);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await getUsers(
      currentPage,
      PAGINATION_DEFAULTS.PAGE_SIZE,
      search,
      filterRole,
    );
    if (res.success) {
      setUsers(res.data);
      setPagination(res.pagination);
    } else {
      alert(`Error: ${res.error}`);
    }
    setLoading(false);
  }, [currentPage, search, filterRole]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateUser(editingId, newUser);
    } else {
      res = await addUser(newUser);
    }

    if (res.success) {
      fetchUsers();
      handleCloseModal();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewUser(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (user) => {
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteUser(deleteId);
    if (res.success) fetchUsers();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleToggleStatus = async (userId) => {
    const res = await toggleUserStatus(userId);
    if (res.success) {
      fetchUsers();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleRoleFilter = (value) => {
    setFilterRole(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const active = users.filter((u) => u.is_active !== false).length;
  const inactive = users.length - active;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return "bg-purple-100 text-purple-800";
      case ROLES.ADMIN:
        return "bg-blue-100 text-blue-800";
      case ROLES.ACCOUNTANT:
        return "bg-green-100 text-green-800";
      case ROLES.TEACHER:
        return "bg-yellow-100 text-yellow-800";
      case ROLES.INVENTORY_MANAGER:
        return "bg-orange-100 text-orange-800";
      case ROLES.VIEWER:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return t("options", "superAdmin");
      case ROLES.ADMIN:
        return t("options", "admin");
      case ROLES.ACCOUNTANT:
        return t("options", "accountant");
      case ROLES.TEACHER:
        return t("options", "teacher");
      case ROLES.INVENTORY_MANAGER:
        return t("options", "inventoryManager");
      case ROLES.VIEWER:
        return t("options", "viewer");
      default:
        return role;
    }
  };

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.USERS_VIEW}>
        <div className="management-page space-y-5 min-[1700px]:space-y-6">
          {/* Header */}
          <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {t("users", "title")}
              </h2>
              <p className="text-slate-500">
                {t("users", "subtitle")}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setNewUser(defaultForm);
                setShowModal(true);
              }}
              className="btn btn-primary page-primary-action"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("users", "add")}
            </button>
          </div>

          {/* Stats Bar */}
          {loading ? (
            <StatsSkeleton />
          ) : (
            <div className="metric-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t("users", "total"),
                  value: users.length,
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
              <SearchField value={searchInput} onChange={setSearchInput} onSearch={handleSearch} placeholder={t("users", "searchPlaceholder")} />
              <select
                value={filterRole}
                onChange={(e) => handleRoleFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
              >
                <option value="">{t("users", "allRoles")}</option>
                <option value={ROLES.SUPER_ADMIN}>{t("options", "superAdmin")}</option>
                <option value={ROLES.ADMIN}>{t("options", "admin")}</option>
                <option value={ROLES.ACCOUNTANT}>{t("options", "accountant")}</option>
                <option value={ROLES.TEACHER}>{t("options", "teacher")}</option>
                <option value={ROLES.VIEWER}>{t("options", "viewer")}</option>
              </select>
            </div>
          )}

          {/* Users Table */}
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="data-table-scroll rounded-none border-0 shadow-none">
              <table className="data-table w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "user")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "role")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "status")}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("tables", "created")}
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
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Shield className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-lg font-medium">
                          {t("users", "empty")}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          {t("users", "emptyHint")}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getRoleBadgeColor(user.role)}`}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                            }`}
                            title={t("users", "toggleStatus")}
                          >
                            {user.is_active ? t("common", "active") : t("common", "inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : t("common", "notAvailable")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={t("users", "edit")}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(user.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title={t("users", "delete")}
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

          {/* Add/Edit User Modal */}
          <Modal open={showModal} onClose={handleCloseModal}>
            <form onSubmit={handleSave} className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editingId ? t("users", "edit") : t("users", "add")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("users", "fullName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("users", "email")}
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("tables", "role")}
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary-500 outline-none"
                  >
                    <option value={ROLES.VIEWER}>{t("options", "viewer")}</option>
                    <option value={ROLES.INVENTORY_MANAGER}>
                      {t("options", "inventoryManager")}
                    </option>
                    <option value={ROLES.TEACHER}>{t("options", "teacher")}</option>
                    <option value={ROLES.ACCOUNTANT}>{t("options", "accountant")}</option>
                    <option value={ROLES.ADMIN}>{t("options", "admin")}</option>
                    <option value={ROLES.SUPER_ADMIN}>{t("options", "superAdmin")}</option>
                  </select>
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t("users", "password")}
                    </label>
                    <input
                      type="password"
                      minLength={8}
                      required
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                >
                  {t("common", "cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {saving
                    ? t("common", "saving")
                    : editingId
                      ? t("users", "updateUser")
                      : t("users", "createUser")}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title={t("users", "delete")}
            message={t("users", "deleteMessage")}
          />
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
