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
  addDonor,
  updateDonor,
  getAllDonors,
  deleteDonor,
} from "./donor-actions";
import {
  UserRound,
  HandHeart,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  UserCheck,
  UserX,
  History,
} from "lucide-react";
import {
  addDonation,
  updateDonation,
  deleteDonation,
  getDonations,
  getDonors,
  uploadReceipt,
  getDonorDonations,
} from "./actions";
import { PERMISSIONS } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";
import { format } from "date-fns";

const DONATION_TYPES = ["Sadqah", "Zakat", "Fitra", "Hadiya", "Other"];
const defaultForm = {
  donor_id: "",
  amount: "",
  type: "Sadqah",
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  receipt_url: "",
};

export default function DonationsPage() {
  const [activeTab, setActiveTab] = useState("donations"); // 'donations' | 'donors'

  useEffect(() => {
    // 1. Initialize from URL hash/query or localStorage initially
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");

    if (tabFromUrl && ["donations", "donors"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
      localStorage.setItem("donationsActiveTab", tabFromUrl);
    } else {
      const savedTab = localStorage.getItem("donationsActiveTab");
      if (savedTab && ["donations", "donors"].includes(savedTab)) {
        setActiveTab(savedTab);
        window.history.replaceState(
          { activeTab: savedTab },
          "",
          `?tab=${savedTab}`
        );
      } else {
        window.history.replaceState(
          { activeTab: "donations" },
          "",
          `?tab=donations`
        );
      }
    }

    // 2. Listen to browser back/forward buttons
    const handlePopState = (event) => {
      const currentUrlParams = new URLSearchParams(window.location.search);
      const poppedTab = currentUrlParams.get("tab") || "donations";
      setActiveTab(poppedTab);
      localStorage.setItem("donationsActiveTab", poppedTab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("donationsActiveTab", tab);
    // Push new state to history stack so "Back" works
    window.history.pushState({ activeTab: tab }, "", `?tab=${tab}`);
  };

  const [donations, setDonations] = useState([]);
  const [donorList, setDonorList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteDonorId, setDeleteDonorId] = useState(null);

  const [newDonation, setNewDonation] = useState(defaultForm);
  const [newDonor, setNewDonor] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    is_active: true,
  });

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [donorsForSelect, setDonorsForSelect] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDonorHistory, setSelectedDonorHistory] = useState(null);
  const [donorHistory, setDonorHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    const res = await getDonations(
      currentPage,
      PAGINATION_DEFAULTS.PAGE_SIZE,
      search,
      filterType,
    );
    if (res.success) {
      setDonations(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, search, filterType]);

  const fetchDonorsForSelect = useCallback(async () => {
    const res = await getDonors();
    if (res.success) setDonorsForSelect(res.data);
  }, []);

  const fetchDonorsList = useCallback(async () => {
    setLoading(true);
    const res = await getAllDonors(
      currentPage,
      PAGINATION_DEFAULTS.PAGE_SIZE,
      search,
      filterStatus,
    );
    if (res.success) {
      setDonorList(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [currentPage, search, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === "donations") {
        fetchDonations();
        fetchDonorsForSelect();
      } else {
        fetchDonorsList();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, fetchDonations, fetchDonorsForSelect, fetchDonorsList]);

  const handleOpenDonorEdit = (donor) => {
    setNewDonor({
      name: donor.name,
      email: donor.email || "",
      phone: donor.phone || "",
      address: donor.address || "",
      is_active: donor.is_active !== false,
    });
    setEditingId(donor.id);
    setShowDonorModal(true);
  };

  const handleCloseDonorModal = () => {
    setShowDonorModal(false);
    setNewDonor({
      name: "",
      email: "",
      phone: "",
      address: "",
      is_active: true,
    });
    setEditingId(null);
  };

  const handleSaveDonor = async (e) => {
    e.preventDefault();
    setUploading(true);
    let res;
    if (editingId) res = await updateDonor(editingId, newDonor);
    else res = await addDonor(newDonor);

    if (res.success) {
      handleCloseDonorModal();
      fetchDonorsList();
    } else alert(`Error: ${res.error}`);
    setUploading(false);
  };

  const confirmDeleteDonor = async () => {
    if (!deleteDonorId) return;
    const res = await deleteDonor(deleteDonorId);
    if (res.success) fetchDonorsList();
    else alert(`Error: ${res.error}`);
    setDeleteDonorId(null);
  };

  const handleToggleDonorStatus = async (id, current) => {
    const donor = donorList.find((d) => d.id === id);
    if (donor) {
      const res = await updateDonor(id, { ...donor, is_active: !current });
      if (res.success) fetchDonorsList();
      else alert(`Error: ${res.error}`);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadReceipt(formData);
      if (!res.success) throw new Error(res.error);

      return res.url;
    } catch (err) {
      alert("Upload error: " + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (donation) => {
    setNewDonation({
      donor_id: donation.donor_id || "",
      amount: donation.amount,
      type: donation.type,
      date: donation.date
        ? format(new Date(donation.date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      notes: donation.notes || "",
      receipt_url: donation.receipt_url || "",
    });
    setEditingId(donation.id);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewDonation(defaultForm);
    setEditingId(null);
    setSelectedFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let url = newDonation.receipt_url;
    if (selectedFile) url = await handleFileUpload(selectedFile);

    let res;
    if (editingId) {
      res = await updateDonation(editingId, {
        ...newDonation,
        receipt_url: url,
      });
    } else {
      res = await addDonation({ ...newDonation, receipt_url: url });
    }

    if (res.success) {
      handleCloseModal();
      fetchDonations();
    } else alert(`Error: ${res.error}`);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteDonation(deleteId);
    if (res.success) fetchDonations();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleViewHistory = async (donor) => {
    setSelectedDonorHistory(donor);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    const res = await getDonorDonations(donor.id);
    if (res.success) {
      setDonorHistory(res.data);
    } else {
      alert(`Error fetching history: ${res.error}`);
    }
    setHistoryLoading(false);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalAmount = donations.reduce(
    (sum, d) => sum + Number(d.amount || 0),
    0,
  );
  const thisMonth = donations
    .filter((d) => {
      const donationDate = new Date(d.date);
      const now = new Date();
      return (
        donationDate.getMonth() === now.getMonth() &&
        donationDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.DONATIONS_VIEW}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Donations & Donors
              </h2>
              <p className="text-slate-500">
                Manage contributions and donor profiles.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (activeTab === "donations") {
                    setEditingId(null);
                    setNewDonation(defaultForm);
                    setShowModal(true);
                  } else {
                    setEditingId(null);
                    setNewDonor({
                      name: "",
                      email: "",
                      phone: "",
                      address: "",
                      is_active: true,
                    });
                    setShowDonorModal(true);
                  }
                }}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === "donations" ? "Add Donation" : "Add Donor"}
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => {
                handleTabChange("donations");
                setCurrentPage(1);
                setSearch("");
              }}
              className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "donations"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <HandHeart className="h-4 w-4" />
                Donations
              </div>
            </button>
            <button
              onClick={() => {
                handleTabChange("donors");
                setCurrentPage(1);
                setSearch("");
              }}
              className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "donors"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Donors
              </div>
            </button>
          </div>

          {/* Stats Bar */}
          {loading ? (
            <StatsSkeleton />
          ) : activeTab === "donations" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Total Donations",
                  value: pagination?.totalItems || 0,
                  color: "text-slate-900",
                },
                {
                  label: "This Month",
                  value: `Rs ${thisMonth.toLocaleString()}`,
                  color: "text-emerald-600",
                },
                {
                  label: "Total Amount",
                  value: `Rs ${totalAmount.toLocaleString()}`,
                  color: "text-primary-600",
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Total Donors",
                  value: pagination?.totalItems || 0,
                  color: "text-slate-900",
                },
                {
                  label: "Active",
                  value: donorList.filter((d) => d.is_active !== false).length,
                  color: "text-emerald-600",
                },
                {
                  label: "Inactive",
                  value: donorList.filter((d) => d.is_active === false).length,
                  color: "text-rose-500",
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
                  placeholder={
                    activeTab === "donations"
                      ? "Search donor or type..."
                      : "Search donors..."
                  }
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {activeTab === "donations" ? (
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                >
                  <option value="">All Types</option>
                  {DONATION_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              )}
            </div>
          )}

          {activeTab === "donations" ? (
            /* Donations Table */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Donor
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {donations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <HandHeart className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 text-lg font-medium">
                            No donations found
                          </p>
                        </td>
                      </tr>
                    ) : (
                      donations.map((d) => (
                        <tr
                          key={d.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                            {(() => {
                              if (!d.date) return "N/A";
                              try {
                                return format(new Date(d.date), "MMM dd, yyyy");
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                                {d.donors?.name?.charAt(0)?.toUpperCase() ||
                                  "W"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {d.donors?.name || "Walk-in"}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                  {d.type}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.type === "Zakat" ? "bg-emerald-100 text-emerald-800" : d.type === "Sadqah" ? "bg-blue-100 text-blue-800" : d.type === "Masjid" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}`}
                            >
                              {d.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              Rs {Number(d.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {d.notes ? (
                              <span className="truncate">{d.notes}</span>
                            ) : (
                              <span className="text-slate-300 italic text-xs">
                                No notes
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(d)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit Donation"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(d.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Donation"
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
            </div>
          ) : (
            /* Donors Table */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Donor
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Email
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
                    {donorList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <UserRound className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 text-lg font-medium">
                            No donors found
                          </p>
                        </td>
                      </tr>
                    ) : (
                      donorList.map((donor) => (
                        <tr
                          key={donor.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-base flex-shrink-0">
                                {donor.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {donor.name}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                  ID: {donor.id?.slice(-8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {donor.phone || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {donor.email || "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                handleToggleDonorStatus(
                                  donor.id,
                                  donor.is_active !== false,
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                donor.is_active !== false
                                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                  : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                              }`}
                            >
                              {donor.is_active !== false
                                ? "Active"
                                : "Inactive"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewHistory(donor)}
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                title="View History"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDonorEdit(donor)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit Donor"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteDonorId(donor.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Donor"
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
            </div>
          )}
          {pagination && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
            />
          )}

          <Modal
            open={showModal}
            onClose={handleCloseModal}
            title={editingId ? "Edit Donation" : "Add Donation"}
          >
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Donor *
                </label>
                <select
                  required
                  className="input-field text-sm"
                  value={newDonation.donor_id}
                  onChange={(e) =>
                    setNewDonation({ ...newDonation, donor_id: e.target.value })
                  }
                >
                  <option value="">Select Donor</option>
                  {donorsForSelect.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Amount (Rs) *
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field text-sm"
                    placeholder="0"
                    value={newDonation.amount}
                    onChange={(e) =>
                      setNewDonation({ ...newDonation, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Type
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newDonation.type}
                    onChange={(e) =>
                      setNewDonation({ ...newDonation, type: e.target.value })
                    }
                  >
                    {[
                      "Zakat",
                      "Sadqah",
                      "Lillah",
                      "Fitrana",
                      "Masjid",
                      "Other",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field text-sm"
                    value={newDonation.date}
                    onChange={(e) =>
                      setNewDonation({ ...newDonation, date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Notes
                </label>
                <textarea
                  rows="2"
                  className="input-field text-sm"
                  value={newDonation.notes}
                  onChange={(e) =>
                    setNewDonation({ ...newDonation, notes: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Receipt Image{" "}
                  {newDonation.receipt_url && !selectedFile && (
                    <>
                      (Current:{" "}
                      <a
                        href={newDonation.receipt_url}
                        className="text-primary-600 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                      )
                    </>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
                {selectedFile && (
                  <p className="text-[10px] text-green-600 mt-1">
                    Image selected, will replace current on save.
                  </p>
                )}
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
                  disabled={uploading}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {uploading
                    ? "Processing..."
                    : editingId
                      ? "Update Donation"
                      : "Save Donation"}
                </button>
              </div>
            </form>
          </Modal>

          {/* Donor Modal */}
          <Modal
            open={showDonorModal}
            onClose={handleCloseDonorModal}
            title={editingId ? "Edit Donor" : "Add Donor"}
          >
            <form onSubmit={handleSaveDonor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder="e.g. Ahmad Ali"
                  value={newDonor.name}
                  onChange={(e) =>
                    setNewDonor({ ...newDonor, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="input-field text-sm"
                    placeholder="03XXXXXXXXX"
                    value={newDonor.phone}
                    onChange={(e) =>
                      setNewDonor({ ...newDonor, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input-field text-sm"
                    placeholder="email@example.com"
                    value={newDonor.email}
                    onChange={(e) =>
                      setNewDonor({ ...newDonor, email: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="City, Area"
                    value={newDonor.address}
                    onChange={(e) =>
                      setNewDonor({ ...newDonor, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseDonorModal}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {uploading
                    ? "Processing..."
                    : editingId
                      ? "Update Donor"
                      : "Add Donor"}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title="Delete Donation"
            message="Are you sure you want to remove this donation record?"
          />

          <ConfirmModal
            open={!!deleteDonorId}
            onClose={() => setDeleteDonorId(null)}
            onConfirm={confirmDeleteDonor}
            title="Delete Donor"
            message="Are you sure you want to remove this donor? This will not delete their historical donations."
          />

          {/* Donor History Modal */}
          <Modal
            open={showHistoryModal}
            onClose={() => {
              setShowHistoryModal(false);
              setDonorHistory([]);
              setSelectedDonorHistory(null);
            }}
            title={`Donation History: ${selectedDonorHistory?.name || ""}`}
          >
            <div className="space-y-4">
              {historyLoading ? (
                <div className="py-12 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-slate-50 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : donorHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">
                    No donation history found for this donor.
                  </p>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  <div className="bg-primary-50 p-4 rounded-2xl flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs text-primary-600 font-bold uppercase tracking-wider">
                        Total Contributed
                      </p>
                      <p className="text-2xl font-black text-primary-900">
                        Rs{" "}
                        {donorHistory
                          .reduce((sum, h) => sum + Number(h.amount), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center ">
                      <HandHeart className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>

                  {donorHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-200 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Rs {Number(h.amount).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                            {h.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-600">
                            {h.date
                              ? format(new Date(h.date), "MMM dd, yyyy")
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      {h.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-2 italic line-clamp-2">
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setDonorHistory([]);
                    setSelectedDonorHistory(null);
                  }}
                  className="btn btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
