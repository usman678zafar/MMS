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
  GraduationCap,
  Phone,
  Calendar,
  Trash2,
  User,
  BookOpen,
  Edit2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  addStudent,
  updateStudent,
  getStudents,
  deleteStudent,
  updateStudentStatus,
  updateStudentProgress,
  updateFeeStatus,
  getStudentProgressHistory,
  recordFeePayment,
  getStudentFeeHistory,
  recordAttendance,
  getAttendanceByDate,
  getStudentAttendanceReport,
  getMonthlyFeeStatus,
} from "./actions";
import { getAllTeachers } from "../staff/actions";
import { format } from "date-fns";
import { PERMISSIONS } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";

const PROGRESS_TYPES = ["Qaida", "Quran", "Hifz"];
const PARA_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

const RELIGIOUS_CLASSES = [
  "Hifz",
  "Nazra",
  "Qaida",
  "Dars-e-Nizami",
  "Tajweed",
  "None",
];
const CONTEMPORARY_CLASSES = [
  "Nursery",
  "KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Inter",
  "Bachelor",
  "None",
];
const GENDERS = ["Male", "Female"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from(
  { length: 5 },
  (_, i) => new Date().getFullYear() - 1 + i,
);

const defaultForm = {
  name: "",
  father_name: "",
  religious_class: "Hifz",
  contemporary_class: "None",
  admission_date: format(new Date(), "yyyy-MM-dd"),
  phone: "",
  address: "",
  gender: "Male",
  monthly_fee: "",
  teacher_id: "",
  fee_status: "Unpaid",
  progress_type: "Qaida",
  progress_para: 1,
  progress_surah: "",
  is_active: true,
};

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState("management"); // 'management' | 'attendance'
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: status }
  const [attendanceDate, setAttendanceDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [newStudent, setNewStudent] = useState(defaultForm);
  const [teachers, setTeachers] = useState([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [progressData, setProgressData] = useState({
    type: "Qaida",
    para: 1,
    surah: "",
    notes: "",
  });
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [feeHistoryList, setFeeHistoryList] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showFeeHistoryModal, setShowFeeHistoryModal] = useState(false);
  const [feeData, setFeeData] = useState({
    amount: "",
    month: format(new Date(), "MMMM"),
    year: format(new Date(), "yyyy"),
    notes: "",
  });
  const [updatingStatusIds, setUpdatingStatusIds] = useState(new Set());
  const [updatingFeeIds, setUpdatingFeeIds] = useState(new Set());

  // Period Filters
  const [feeMonth, setFeeMonth] = useState(format(new Date(), "MMMM"));
  const [feeYear, setFeeYear] = useState(format(new Date(), "yyyy"));
  const [monthlyPayments, setMonthlyPayments] = useState({}); // { studentId: true/false }
  const [loadingFeeStatus, setLoadingFeeStatus] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchTeachers = useCallback(async () => {
    const res = await getAllTeachers();
    if (res.success) setTeachers(res.data);
  }, []);

  const fetchStudents = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const res = await getStudents(
        currentPage,
        PAGINATION_DEFAULTS.PAGE_SIZE,
        search,
        filterStatus,
      );
      if (res.success) {
        setStudents(res.data);
        setPagination(res.pagination);
      }
      setLoading(false);
    },
    [currentPage, search, filterStatus],
  );

  const fetchMonthlyFeeStatus = useCallback(async () => {
    setLoadingFeeStatus(true);
    const res = await getMonthlyFeeStatus(feeMonth, feeYear);
    if (res.success) setMonthlyPayments(res.data);
    setLoadingFeeStatus(false);
  }, [feeMonth, feeYear]);

  const fetchAttendanceForDate = useCallback(async () => {
    setLoading(true);
    const res = await getAttendanceByDate(attendanceDate);
    if (res.success) {
      const attMap = {};
      res.data.forEach((rec) => (attMap[rec.student_id] = rec.status));
      setAttendance(attMap);
    }
    setLoading(false);
  }, [attendanceDate]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchStudents();
      fetchTeachers();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchStudents, fetchTeachers]);

  useEffect(() => {
    if (activeTab === "fees") fetchMonthlyFeeStatus();
    if (activeTab === "attendance") fetchAttendanceForDate();
  }, [activeTab, fetchMonthlyFeeStatus, fetchAttendanceForDate]);

  const handleOpenEdit = (student) => {
    fetchTeachers();
    setNewStudent({ ...student });
    setEditingId(student.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewStudent(defaultForm);
    setEditingId(null);
  };

  const handleOpenHistory = async (student) => {
    setActiveStudentId(student.id);
    setFetchingHistory(true);
    setShowHistoryModal(true);
    const res = await getStudentProgressHistory(student.id);
    if (res.success) setHistoryList(res.data);
    setFetchingHistory(false);
  };

  const handleOpenProgress = (student) => {
    setActiveStudentId(student.id);
    setProgressData({
      type: student.current_progress?.type || "Qaida",
      para: student.current_progress?.para || 1,
      surah: student.current_progress?.surah || "",
      notes: "",
    });
    setShowProgressModal(true);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateStudentProgress(activeStudentId, progressData);
    if (res.success) {
      setShowProgressModal(false);
      fetchStudents();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleToggleFeeStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Paid" ? "Unpaid" : "Paid";
    const student = students.find((s) => s.id === id);

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, fee_status: newStatus } : s)),
    );
    setUpdatingFeeIds((prev) => new Set(prev).add(id));

    let res;
    if (newStatus === "Unpaid") {
      res = await updateFeeStatus(id, "Unpaid");
    } else {
      // Record payment for the SELECTED filter month/year
      res = await recordFeePayment(id, {
        amount: student.monthly_fee || 0,
        month: feeMonth,
        year: feeYear,
        notes: `Quick Toggle (${feeMonth} ${feeYear})`,
      });
    }

    setUpdatingFeeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (res.success) {
      fetchMonthlyFeeStatus();
      fetchStudents(true);
    } else {
      fetchStudents();
    }
  };

  const handleOpenFeeHistory = async (student) => {
    setActiveStudentId(student.id);
    setFetchingHistory(true);
    setShowFeeHistoryModal(true);
    const res = await getStudentFeeHistory(student.id);
    if (res.success) setFeeHistoryList(res.data);
    setFetchingHistory(false);
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    const records = students.map((s) => ({
      student_id: s.id,
      status: attendance[s.id] || "Present",
    }));
    // Save for the selected attendanceDate
    const res = await recordAttendance(records, attendanceDate);
    if (res.success) {
      setShowSuccessModal(true);
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingId) {
      res = await updateStudent(editingId, newStudent);
    } else {
      res = await addStudent(newStudent);
    }

    if (res.success) {
      handleCloseModal();
      fetchStudents();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteStudent(deleteId);
    if (res.success) fetchStudents();
    else alert(`Error: ${res.error}`);
    setDeleteId(null);
  };

  const handleToggleStatus = async (id, current) => {
    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s)),
    );
    setUpdatingStatusIds((prev) => new Set(prev).add(id));
    const res = await updateStudentStatus(id, !current);
    setUpdatingStatusIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (res.success) fetchStudents(true);
    else fetchStudents(); // Fallback on error
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const active = students.filter((s) => s.is_active !== false).length;
  const inactive = students.length - active;

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.STUDENTS_VIEW}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Students</h2>
              <p className="text-slate-500">
                Manage madrasa student enrollment and records.
              </p>
            </div>
            <button
              onClick={() => {
                fetchTeachers();
                setEditingId(null);
                setNewStudent(defaultForm);
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Enroll Student
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100 mb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("management")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "management"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Management
              {activeTab === "management" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("fees")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "fees"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Fee Tracking
              {activeTab === "fees" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "attendance"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Daily Attendance
              {activeTab === "attendance" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {activeTab === "management" && (
            <div className="space-y-6">
              {/* Stats Bar */}
              {loading ? (
                <StatsSkeleton />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {students.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Total Enrolled
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {students.filter((s) => s.is_active !== false).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Active
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <p className="text-2xl font-bold text-rose-500">
                      {students.filter((s) => s.is_active === false).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Inactive
                    </p>
                  </div>
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
                      placeholder="Search by name or father's name..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all"
                  >
                    <option value="All">All Education</option>
                    {RELIGIOUS_CLASSES.filter((c) => c !== "None").map((c) => (
                      <option key={c} value={c}>
                        {c} (Religious)
                      </option>
                    ))}
                    {CONTEMPORARY_CLASSES.filter((c) => c !== "None").map(
                      (c) => (
                        <option key={c} value={c}>
                          {c} (Contemporary)
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              {/* Students Table */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Father Name
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">
                          Education Track
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                          Teacher / Qari
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                          Current Progress
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                          Status
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-32">
                          Actions
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
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center">
                            <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-lg font-medium">
                              No students found
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                              Enroll your first student to get started
                            </p>
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-base flex-shrink-0">
                                  {student.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">
                                    {student.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                    {student.gender || "Male"} ·{" "}
                                    {student.admission_date
                                      ? format(
                                          new Date(student.admission_date),
                                          "MMM yyyy",
                                        )
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-slate-700">
                                {student.father_name || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                  <span className="text-xs font-bold text-slate-700">
                                    {student.religious_class ||
                                      student.class ||
                                      "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {student.contemporary_class ||
                                      "No Schooling"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                              {student.teacher_name || (
                                <span className="text-slate-300 italic text-xs">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleOpenProgress(student)}
                                className="flex flex-col items-start hover:bg-slate-100 p-1.5 rounded-lg transition-all group/progress w-full"
                              >
                                <span className="text-xs font-bold text-blue-600">
                                  {student.current_progress?.type || "Qaida"}
                                </span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  {student.current_progress?.type === "Qaida"
                                    ? "Progressing"
                                    : `Para ${student.current_progress?.para || 1}`}
                                  <BookOpen className="h-2.5 w-2.5 opacity-0 group-hover/progress:opacity-50 transition-opacity" />
                                </span>
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() =>
                                  handleToggleStatus(
                                    student.id,
                                    student.is_active !== false,
                                  )
                                }
                                disabled={updatingStatusIds.has(student.id)}
                                className={`w-20 h-6 flex items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  updatingStatusIds.has(student.id)
                                    ? "opacity-50 cursor-wait"
                                    : ""
                                } ${
                                  student.is_active !== false
                                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                                }`}
                              >
                                {updatingStatusIds.has(student.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : student.is_active !== false ? (
                                  "Active"
                                ) : (
                                  "Inactive"
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenHistory(student)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="View Progress History"
                                >
                                  <Calendar className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(student)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="Edit Student"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(student.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Delete Student"
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
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      Fee Tracking
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Month-wise Records
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={feeMonth}
                      onChange={(e) => setFeeMonth(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none "
                    >
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={feeYear}
                      onChange={(e) => setFeeYear(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none "
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Paid:{" "}
                    {
                      Object.values(monthlyPayments).filter((v) => v === true)
                        .length
                    }
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    Unpaid:{" "}
                    {students.length -
                      Object.values(monthlyPayments).filter((v) => v === true)
                        .length}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Father Name
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Education tracks
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Monthly Fee
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Last Payment
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.map((student) => (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                {student.name?.charAt(0)}
                              </div>
                              <p className="font-bold text-slate-900 text-sm">
                                {student.name}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-700">
                              {student.father_name || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-emerald-600">
                                {student.religious_class || "N/A"}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {student.contemporary_class || "None"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-700">
                              Rs {Number(student.monthly_fee).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400 font-medium">
                              {student.last_fee_paid
                                ? format(
                                    new Date(student.last_fee_paid),
                                    "MMM dd, yyyy",
                                  )
                                : "No records"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                handleToggleFeeStatus(
                                  student.id,
                                  monthlyPayments[student.id]
                                    ? "Paid"
                                    : "Unpaid",
                                )
                              }
                              disabled={
                                updatingFeeIds.has(student.id) ||
                                loadingFeeStatus
                              }
                              className={`w-24 h-8 flex items-center justify-center rounded-xl text-[10px] font-bold transition-all ml-auto ${
                                updatingFeeIds.has(student.id)
                                  ? "opacity-50 cursor-wait"
                                  : ""
                              } ${
                                monthlyPayments[student.id]
                                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                  : "bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"
                              }`}
                            >
                              {updatingFeeIds.has(student.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                              ) : monthlyPayments[student.id] ? (
                                "PAID"
                              ) : (
                                "MARK PAID"
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Mark Attendance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daily presence records
                    </p>
                  </div>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none w-full sm:w-auto"
                  />
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Father Name
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">
                            {student.name}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-700">
                            {student.father_name || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500 font-semibold">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {["Present", "Absent", "Late", "Leave"].map(
                              (status) => (
                                <button
                                  key={status}
                                  onClick={() =>
                                    handleAttendanceChange(student.id, status)
                                  }
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                    (attendance[student.id] || "Present") ===
                                    status
                                      ? status === "Present"
                                        ? "bg-emerald-500 text-white border-emerald-500 "
                                        : status === "Absent"
                                          ? "bg-rose-500 text-white border-rose-500 "
                                          : status === "Late"
                                            ? "bg-amber-500 text-white border-amber-500 "
                                            : "bg-blue-500 text-white border-blue-500 "
                                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  {status.toUpperCase()}
                                </button>
                              ),
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Modal
            open={showModal}
            onClose={handleCloseModal}
            title={editingId ? "Edit Student" : "Enroll New Student"}
          >
            <form onSubmit={handleSave} className="space-y-3">
              {/* Name & Father */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    placeholder="Full name"
                    value={newStudent.name}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    placeholder="Father's full name"
                    value={newStudent.father_name}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        father_name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Education Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1 leading-none">
                    Religious Education
                  </label>
                  <select
                    className="input-field text-sm border-emerald-100 "
                    value={newStudent.religious_class}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        religious_class: e.target.value,
                      })
                    }
                  >
                    {RELIGIOUS_CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1 leading-none">
                    Contemporary Education
                  </label>
                  <select
                    className="input-field text-sm border-blue-100 "
                    value={newStudent.contemporary_class}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        contemporary_class: e.target.value,
                      })
                    }
                  >
                    {CONTEMPORARY_CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admission date & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={newStudent.admission_date}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        admission_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Monthly Fee (Rs)
                  </label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    placeholder="0"
                    value={newStudent.monthly_fee}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        monthly_fee: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Phone & Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    className="input-field text-sm"
                    placeholder="03XX-XXXXXXX"
                    value={newStudent.phone}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Assigned Teacher (Qari)
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newStudent.teacher_id}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        teacher_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gender & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Gender
                  </label>
                  <select
                    className="input-field text-sm"
                    value={newStudent.gender}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, gender: e.target.value })
                    }
                  >
                    {GENDERS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Village, City"
                    value={newStudent.address}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, address: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Progress (New Enrollment Only) */}
              {!editingId && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Initial Educational Progress
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Type
                      </label>
                      <select
                        className="input-field text-xs py-1"
                        value={newStudent.progress_type}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            progress_type: e.target.value,
                          })
                        }
                      >
                        {PROGRESS_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div
                      className={
                        newStudent.progress_type === "Qaida" ? "opacity-50" : ""
                      }
                    >
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Para #
                      </label>
                      <select
                        disabled={newStudent.progress_type === "Qaida"}
                        className="input-field text-xs py-1"
                        value={newStudent.progress_para}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            progress_para: e.target.value,
                          })
                        }
                      >
                        {PARA_NUMBERS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Surah / Lesson
                      </label>
                      <input
                        type="text"
                        className="input-field text-xs py-1"
                        placeholder="e.g. Al-Baqarah"
                        value={newStudent.progress_surah}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            progress_surah: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 text-sm">
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
                      ? "Update Student"
                      : "Enroll Student"}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            title="Delete Student Record"
            message="Are you sure you want to completely remove this student? This action cannot be undone."
          />

          <Modal
            open={showProgressModal}
            onClose={() => setShowProgressModal(false)}
            title="Update Progress Milestone"
          >
            <form onSubmit={handleSaveProgress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Progress Type
                  </label>
                  <select
                    className="input-field text-sm"
                    value={progressData.type}
                    onChange={(e) =>
                      setProgressData({ ...progressData, type: e.target.value })
                    }
                  >
                    {PROGRESS_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div
                  className={progressData.type === "Qaida" ? "opacity-50" : ""}
                >
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Para Number
                  </label>
                  <select
                    disabled={progressData.type === "Qaida"}
                    className="input-field text-sm"
                    value={progressData.para}
                    onChange={(e) =>
                      setProgressData({ ...progressData, para: e.target.value })
                    }
                  >
                    {PARA_NUMBERS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Current Surah / Lesson
                </label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Name of Surah or lesson"
                  value={progressData.surah}
                  onChange={(e) =>
                    setProgressData({ ...progressData, surah: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Academic Notes
                </label>
                <textarea
                  className="input-field text-sm h-20"
                  placeholder="Observations about progress, memorization quality, etc."
                  value={progressData.notes}
                  onChange={(e) =>
                    setProgressData({ ...progressData, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {saving ? "Recording..." : "Update Progress"}
                </button>
              </div>
            </form>
          </Modal>

          <Modal
            open={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            title="Progress Milestones History"
          >
            <div className="space-y-4">
              {fetchingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No history records found for this student.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-6">
                  {historyList.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-white border-2 border-primary-500"></div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {entry.type}{" "}
                            {entry.para ? `· Para ${entry.para}` : ""}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {format(new Date(entry.date), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">
                          {entry.surah || "General Progress"}
                        </p>
                        {entry.notes && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-600 italic">
                              &quot; {entry.notes} &quot;
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Verified by:{" "}
                          {teachers.find((t) => t.id === entry.teacher_id)
                            ?.name || "Unknown Teacher"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={showFeeHistoryModal}
            onClose={() => setShowFeeHistoryModal(false)}
            title="Student Fee History"
          >
            <div className="space-y-4">
              {fetchingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : feeHistoryList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No fee payment records found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {feeHistoryList.map((fee, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {fee.month} {fee.year}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {format(new Date(fee.date), "MMM dd, yyyy")}
                        </p>
                        {fee.notes && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            &quot;{fee.notes}&quot;
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          Rs. {fee.amount}
                        </p>
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                          Paid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowFeeHistoryModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
          >
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Attendance Saved!
              </h3>
              <p className="text-sm text-slate-500">
                The daily attendance records for{" "}
                {format(new Date(attendanceDate), "PPP")} have been successfully
                updated.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="mt-4 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors w-full"
              >
                Continue
              </button>
            </div>
          </Modal>
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
