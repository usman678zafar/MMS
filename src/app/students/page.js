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
  recordBulkFeePayments,
  deleteFeePayment,
  deleteBulkFeePayments,
} from "./actions";
import { getAllTeachers } from "../staff/actions";

import { format } from "date-fns";
import { PERMISSIONS } from "@/lib/rbac";
import { PAGINATION_DEFAULTS } from "@/lib/pagination";
import { useLanguage } from "@/context/LanguageContext";

const PROGRESS_TYPES = ["Qaida", "Nazra", "Hifz", "Girdan"];
const PARA_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);
const SURAH_NUMBERS = Array.from({ length: 114 }, (_, i) => i + 1);

// Mapping of Surah numbers to their names
const SURAH_NAMES = {
  1: "Al-Fatihah",
  2: "Al-Baqarah", 
  3: "Aali Imran",
  4: "An-Nisa",
  5: "Al-Maidah",
  6: "Al-Anam",
  7: "Al-Araf",
  8: "At-Tawbah",
  9: "At-Tawbah",
  10: "Yunus",
  11: "Hud",
  12: "Yusuf",
  13: "Ar-Rad",
  14: "Ibrahim",
  15: "Al-Hijr",
  16: "An-Nahl",
  17: "Al-Isra",
  18: "Al-Kahf",
  19: "Maryam",
  20: "Ta-Ha",
  21: "Al-Anbiya",
  22: "Al-Hajj",
  23: "Al-Muminun",
  24: "An-Nur",
  25: "Al-Furqan",
  26: "Ash-Shuara",
  27: "An-Naml",
  28: "Al-Qasas",
  29: "Al-Ankabut",
  30: "Ar-Rum",
  31: "Luqman",
  32: "As-Sajdah",
  33: "Al-Ahzab",
  34: "Saba",
  35: "Fatir",
  36: "Ya-Sin",
  37: "As-Saffat",
  38: "Sad",
  39: "Az-Zumar",
  40: "Ghafir",
  41: "Fussilat",
  42: "Ash-Shura",
  43: "Az-Zukhruf",
  44: "Ad-Dukhan",
  45: "Al-Jathiyah",
  46: "Al-Ahqaf",
  47: "Muhammad",
  48: "Al-Fath",
  49: "Al-Hujurat",
  50: "Qaf",
  51: "Adh-Dhariyat",
  52: "At-Tur",
  53: "An-Najm",
  54: "Al-Qamar",
  55: "Ar-Rahman",
  56: "Al-Waqiah",
  57: "Al-Hadid",
  58: "An-Nisa",
  59: "Al-Hashr",
  60: "Al-Mumtahanah",
  61: "As-Saff",
  62: "Al-Jumuah",
  63: "Al-Munafiqun",
  64: "At-Taghabun",
  65: "At-Talaq",
  66: "At-Tahrim",
  67: "Al-Mulk",
  68: "Al-Haqqah",
  69: "Al-Maarij",
  70: "Nuh",
  71: "Al-Jinn",
  72: "Al-Muzzammil",
  73: "Al-Muddaththir",
  74: "Al-Qiyamah",
  75: "Al-Insan",
  76: "Al-Mursalat",
  77: "An-Naba",
  78: "An-Nazi'at",
  79: "Abasa",
  80: "At-Takwir",
  81: "Al-Infitar",
  82: "Al-Mutaffifin",
  83: "Al-Inshiqaq",
  84: "Al-Buruj",
  85: "At-Tariq",
  86: "Al-Ala",
  87: "Al-Ghashiyah",
  88: "Al-Fajr",
  89: "Al-Balad",
  90: "Ash-Shams",
  91: "Ad-Duha",
  92: "Al-Lail",
  93: "Al-Lail",
  94: "Ad-Duha",
  95: "At-Tin",
  96: "Al-Alaq",
  97: "Al-Qadr",
  98: "Al-Bayyinah",
  99: "Az-Zalzalah",
  100: "Al-Adiyat",
  101: "Al-Qariah",
  102: "At-Takathur",
  103: "Al-Asr",
  104: "Al-Humazah",
  105: "Al-Fil",
  106: "Quraysh",
  107: "Al-Maun",
  108: "Al-Kawthar",
  109: "Al-Kafirun",
  110: "An-Nasr",
  111: "Al-Masad",
  112: "Al-Ikhlas",
  113: "Al-Falaq",
  114: "An-Nas"
};

const PARA_NAMES = {
  1: "الم",
  2: "سيقول",
  3: "تلك الرسل",
  4: "لن تنالوا",
  5: "والمحصنات",
  6: "لا يحب الله",
  7: "واذا سمعوا",
  8: "ولو اننا",
  9: "قال الملاء",
  10: "واعلموا",
  11: "يعتذرون",
  12: "وما من دابة",
  13: "وما ابرئ",
  14: "ربما",
  15: "سبحان الذي",
  16: "قال الم",
  17: "اقترب",
  18: "قد افلح",
  19: "وقال الذين",
  20: "امن خلق",
  21: "اتل ما اوحي",
  22: "ومن يقنت",
  23: "وما لي",
  24: "فمن اظلم",
  25: "اليه يرد",
  26: "ح م",
  27: "قال فما خطبكم",
  28: "قد سمع الله",
  29: "تبارك الذي",
  30: "عم"
};

// Arabic script display for Surah names
const getArabicScript = (surahNumber) => {
  const arabicScripts = {
    1: "الفاتحة",
    2: "البقرة",
    3: "آل عمران",
    4: "النساء",
    5: "المائدة",
    6: "الأنعام",
    7: "الأعراف",
    8: "الأنفال",
    9: "التوبة",
    10: "يونس",
    11: "هود",
    12: "يوسف",
    13: "الرعد",
    14: "إبراهيم",
    15: "الحجر",
    16: "النحل",
    17: "الإسراء",
    18: "الكهف",
    19: "مريم",
    20: "طه",
    21: "الأنبياء",
    22: "الحج",
    23: "المؤمنون",
    24: "النور",
    25: "الفرقان",
    26: "الشعراء",
    27: "النمل",
    28: "القصص",
    29: "العنكبوت",
    30: "الروم",
    31: "لقمان",
    32: "السجدة",
    33: "الأحزاب",
    34: "سبأ",
    35: "فاطر",
    36: "يس",
    37: "الصافات",
    38: "ص",
    39: "الزمر",
    40: "غافر",
    41: "فصلت",
    42: "الشورى",
    43: "الزخرف",
    44: "الدخان",
    45: "الجاثية",
    46: "الأحقاف",
    47: "محمد",
    48: "الفتح",
    49: "الحجرات",
    50: "ق",
    51: "الذاريات",
    52: "الطور",
    53: "النجم",
    54: "القمر",
    55: "الرحمن",
    56: "الواقعة",
    57: "الحديد",
    58: "المجادلة",
    59: "الحشر",
    60: "الممتحنة",
    61: "الصف",
    62: "الجمعة",
    63: "المنافقون",
    64: "التغابن",
    65: "الطلاق",
    66: "التحريم",
    67: "الملك",
    68: "القلم",
    69: "الحاقة",
    70: "المعارج",
    71: "نوح",
    72: "الجن",
    73: "المزمل",
    74: "المدثر",
    75: "القيامة",
    76: "الإنسان",
    77: "المرسلات",
    78: "النبأ",
    79: "النازعات",
    80: "عبس",
    81: "التكوير",
    82: "الانفطار",
    83: "المطففين",
    84: "الانشقاق",
    85: "البروج",
    86: "الطارق",
    87: "الأعلى",
    88: "الغاشية",
    89: "الفجر",
    90: "البلد",
    91: "الشمس",
    92: "الليل",
    93: "الضحى",
    94: "الشرح",
    95: "التين",
    96: "العلق",
    97: "القدر",
    98: "البينة",
    99: "الزلزلة",
    100: "العاديات",
    101: "القارعة",
    102: "التكاثر",
    103: "العصر",
    104: "الهمزة",
    105: "الفيل",
    106: "قريش",
    107: "الماعون",
    108: "الكوثر",
    109: "الكافرون",
    110: "النصر",
    111: "المسد",
    112: "الإخلاص",
    113: "الفلق",
    114: "الناس"
  };

  return arabicScripts[surahNumber] || "";
};

const RELIGIOUS_CLASSES = [
  "Hifz",
  "Nazra",
  "Qaida",
  "Girdan",
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
  const { t } = useLanguage();
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
    surahNumber: "",
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
  const [selectedFeeStudents, setSelectedFeeStudents] = useState(new Set());
  const [selectedAttendanceStudents, setSelectedAttendanceStudents] = useState(new Set());
  const [isBulkMarking, setIsBulkMarking] = useState(false);

  useEffect(() => {
    // 1. Initialize from URL hash/query or localStorage initially
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");

    if (
      tabFromUrl &&
      ["management", "fees", "attendance"].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
      localStorage.setItem("studentsActiveTab", tabFromUrl);
    } else {
      const savedTab = localStorage.getItem("studentsActiveTab");
      if (
        savedTab &&
        ["management", "fees", "attendance"].includes(savedTab)
      ) {
        setActiveTab(savedTab);
        window.history.replaceState(
          { activeTab: savedTab },
          "",
          `?tab=${savedTab}`
        );
      } else {
        window.history.replaceState(
          { activeTab: "management" },
          "",
          `?tab=management`
        );
      }
    }

    // 2. Listen to browser back/forward buttons
    const handlePopState = (event) => {
      const currentUrlParams = new URLSearchParams(window.location.search);
      const poppedTab = currentUrlParams.get("tab") || "management";
      setActiveTab(poppedTab);
      localStorage.setItem("studentsActiveTab", poppedTab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("studentsActiveTab", tab);
    // Push new state to history stack so "Back" works
    window.history.pushState({ activeTab: tab }, "", `?tab=${tab}`);
  };

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
        filterClass,
      );
      if (res.success) {
        setStudents(res.data);
        setPagination(res.pagination);
      }
      setLoading(false);
    },
    [currentPage, search, filterStatus, filterClass],
  );

  const fetchMonthlyFeeStatus = useCallback(async () => {
    setLoadingFeeStatus(true);
    const res = await getMonthlyFeeStatus(feeMonth, feeYear);
    if (res.success) setMonthlyPayments(res.data);
    setLoadingFeeStatus(false);
    setSelectedFeeStudents(new Set());
  }, [feeMonth, feeYear]);


  const fetchAttendanceForDate = useCallback(async () => {
    setLoading(true);
    const res = await getAttendanceByDate(attendanceDate);
    if (res.success) {
      const attMap = {};
      res.data.forEach((rec) => (attMap[rec.student_id] = rec.status));
      setAttendance(attMap);
    }
    setSelectedAttendanceStudents(new Set());
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
    // Lock progress type to student's religious class
    const classToType = { Hifz: "Hifz", Nazra: "Nazra", Qaida: "Qaida", Girdan: "Girdan" };
    const lockedType =
      classToType[student.religious_class] ||
      student.current_progress?.type ||
      "Qaida";
    
    // Always use student's current Surah number, not allow manual override
    const currentSurahNumber = student.current_progress?.surah_number || "";
    const surahName = getArabicScript(currentSurahNumber);
    const initialSurahDisplay = surahName ? `${surahName} (${currentSurahNumber})` : "";
    
    setProgressData({
      type: lockedType,
      para: student.current_progress?.para || 1,
      surahNumber: currentSurahNumber,
      surah: initialSurahDisplay,
      ayat: student.current_progress?.ayat || "",
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
      res = await deleteFeePayment(id, feeMonth, feeYear);
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

  const handleBulkMarkPaid = async () => {
    setIsBulkMarking(true);
    const paymentsData = Array.from(selectedFeeStudents).map((id) => {
      const student = students.find((s) => s.id === id);
      return {
        studentId: id,
        amount: student.monthly_fee || 0,
        month: feeMonth,
        year: feeYear,
        notes: `Bulk Mark Paid (${feeMonth} ${feeYear})`,
      };
    });

    const res = await recordBulkFeePayments(paymentsData);
    if (res.success) {
      await fetchMonthlyFeeStatus();
      await fetchStudents(true);
      setSelectedFeeStudents(new Set());
    } else {
      alert(`Error: ${res.error}`);
    }
    setIsBulkMarking(false);
  };

  const handleBulkMarkUnpaid = async () => {
    setIsBulkMarking(true);
    const ids = Array.from(selectedFeeStudents);
    const res = await deleteBulkFeePayments(ids, feeMonth, feeYear);
    if (res.success) {
      await fetchMonthlyFeeStatus();
      await fetchStudents(true);
      setSelectedFeeStudents(new Set());
    } else {
      alert(`Error: ${res.error}`);
    }
    setIsBulkMarking(false);
  };

  const handleOpenFeeHistory = async (student) => {
    setActiveStudentId(student.id);
    setFetchingHistory(true);
    setShowFeeHistoryModal(true);
    const res = await getStudentFeeHistory(student.id);
    if (res.success) setFeeHistoryList(res.data);
    setFetchingHistory(false);
  };

  const handleBulkAttendanceChange = (status) => {
    setAttendance((prev) => {
      const next = { ...prev };
      selectedAttendanceStudents.forEach((id) => {
        next[id] = status;
      });
      return next;
    });
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
              <h2 className="text-2xl font-bold text-slate-900">{t("students", "title")}</h2>
              <p className="text-slate-500">
                {t("students", "subtitle")}
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
              {t("students", "enrollBtn")}
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100 mb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabChange("management")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "management"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t("students", "tabManagement")}
              {activeTab === "management" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("fees")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "fees"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t("students", "tabFees")}
              {activeTab === "fees" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("attendance")}
              className={`px-6 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === "attendance"
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t("students", "tabAttendance")}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <p className={`text-2xl font-bold ${students.filter(s => {
                      if (!s.current_progress?.last_updated) return true;
                      const d = new Date(s.current_progress.last_updated);
                      return d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear();
                    }).length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                      {students.filter(s => {
                        if (!s.current_progress?.last_updated) return true;
                        const d = new Date(s.current_progress.last_updated);
                        return d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear();
                      }).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Pending Progress
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
                      placeholder={t("students", "searchPlaceholder")}
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
                    <option value="">{t("students", "allStatus")}</option>
                    <option value="active">{t("students", "active")}</option>
                    <option value="inactive">{t("students", "inactive")}</option>
                  </select>
                  <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => { setFilterClass("All"); setCurrentPage(1); }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterClass === "All"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      All
                    </button>
                    {RELIGIOUS_CLASSES.filter(c => c !== "None").map((c) => (
                      <button
                        key={c}
                        onClick={() => { setFilterClass(c); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          filterClass === c
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Students Table */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("students", "colStudent")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("students", "colFather")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">
                          {t("students", "colEducation")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                          {t("students", "colTeacher")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                          {t("students", "colProgress")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                          {t("students", "colStatus")}
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-32">
                          {t("students", "colActions")}
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
                                <span className="text-[10px] text-slate-500 flex flex-col items-start gap-0.5">
                                  <span>
                                    {!student.current_progress?.type || student.current_progress?.type === "Qaida"
                                      ? "Progressing"
                                      : `${PARA_NAMES[student.current_progress?.para || 1]} (${student.current_progress?.para || 1})${student.current_progress?.ayat ? ` · Ayat ${student.current_progress.ayat}` : ""}`}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1 ${
                                    (!student.current_progress?.last_updated || 
                                     new Date(student.current_progress.last_updated).getMonth() !== new Date().getMonth() ||
                                     new Date(student.current_progress.last_updated).getFullYear() !== new Date().getFullYear())
                                    ? "text-rose-400"
                                    : "text-emerald-500"
                                  }`}>
                                    {student.current_progress?.last_updated 
                                      ? `Last Update: ${format(new Date(student.current_progress.last_updated), "MMM dd")}`
                                      : "No Update This Month"}
                                    <BookOpen className="h-2 w-2 opacity-50 transition-opacity" />
                                  </span>
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

                <div className="flex items-center gap-4">
                  {selectedFeeStudents.size > 0 && (
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
                      <button
                        onClick={handleBulkMarkPaid}
                        disabled={isBulkMarking}
                        className="flex items-center gap-1 hover:bg-emerald-50 text-emerald-600 px-3 py-1.5 transition-colors font-semibold"
                      >
                        {isBulkMarking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Mark Paid
                      </button>
                      <div className="w-px h-5 bg-slate-200" />
                      <button
                        onClick={handleBulkMarkUnpaid}
                        disabled={isBulkMarking}
                        className="flex items-center gap-1 hover:bg-rose-50 text-rose-600 px-3 py-1.5 transition-colors font-semibold"
                      >
                        {isBulkMarking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Mark Unpaid
                      </button>
                    </div>
                  )}
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
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={
                              students.length > 0 &&
                              selectedFeeStudents.size === students.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFeeStudents(new Set(students.map((s) => s.id)));
                              } else {
                                setSelectedFeeStudents(new Set());
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </th>
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
                          className={`transition-colors ${
                            monthlyPayments[student.id]
                              ? "bg-emerald-50/30"
                              : selectedFeeStudents.has(student.id)
                                ? "bg-slate-50"
                                : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedFeeStudents.has(student.id)}
                              onChange={(e) => {
                                const next = new Set(selectedFeeStudents);
                                if (e.target.checked) next.add(student.id);
                                else next.delete(student.id);
                                setSelectedFeeStudents(next);
                              }}
                              className="rounded w-4 h-4 cursor-pointer border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-opacity"
                            />
                          </td>
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
                                "UNPAID"
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
                  {selectedAttendanceStudents.size > 0 && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg ml-0 sm:ml-4">
                      {["Present", "Absent", "Late", "Leave"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleBulkAttendanceChange(status)}
                          className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                            status === "Present"
                              ? "hover:bg-emerald-100 text-emerald-700"
                              : status === "Absent"
                                ? "hover:bg-rose-100 text-rose-700"
                                : status === "Late"
                                  ? "hover:bg-amber-100 text-amber-700"
                                  : "hover:bg-blue-100 text-blue-700"
                          } bg-white shadow-sm border border-slate-200`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
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
                      <th className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={
                            students.length > 0 &&
                            selectedAttendanceStudents.size === students.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttendanceStudents(
                                new Set(students.map((s) => s.id))
                              );
                            } else {
                              setSelectedAttendanceStudents(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
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
                        className={`transition-colors group ${
                          selectedAttendanceStudents.has(student.id)
                            ? "bg-blue-50/30"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedAttendanceStudents.has(student.id)}
                            onChange={(e) => {
                              const next = new Set(selectedAttendanceStudents);
                              if (e.target.checked) next.add(student.id);
                              else next.delete(student.id);
                              setSelectedAttendanceStudents(next);
                            }}
                            className="rounded w-4 h-4 cursor-pointer border-slate-300 text-blue-600 focus:ring-blue-500 transition-opacity"
                          />
                        </td>
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
                  <div className="flex flex-wrap gap-2 mt-1">
                    {RELIGIOUS_CLASSES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, religious_class: c })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          newStudent.religious_class === c
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-200"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1 leading-none">
                    Contemporary Education
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {CONTEMPORARY_CLASSES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, contemporary_class: c })}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          newStudent.contemporary_class === c
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-200"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {PROGRESS_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewStudent({ ...newStudent, progress_type: t })}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${
                              newStudent.progress_type === t
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
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
                  <div className="input-field text-sm bg-slate-50 flex items-center justify-between cursor-not-allowed select-none">
                    <span className="font-semibold text-slate-700">{progressData.type}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                      Locked
                    </span>
                  </div>
                </div>
                <div
                  className={progressData.type === "Qaida" || progressData.type === "Girdan" ? "opacity-50" : ""}
                >
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Para
                  </label>
                  <select
                    disabled={progressData.type === "Qaida" || progressData.type === "Girdan"}
                    className="input-field text-sm"
                    value={progressData.para}
                    onChange={(e) =>
                      setProgressData({ ...progressData, para: e.target.value })
                    }
                  >
                    {PARA_NUMBERS.map((n) => (
                      <option key={n} value={n}>
                        {PARA_NAMES[n]} ({n})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={progressData.type === "Qaida" || progressData.type === "Girdan" ? "opacity-50" : ""}
                >
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Surah
                  </label>
                  <select
                    disabled={progressData.type === "Qaida" || progressData.type === "Girdan"}
                    readOnly
                    title="Surah number is automatically updated based on current progress"
                    className="input-field text-sm"
                    value={progressData.surahNumber}
                    onChange={(e) => {
                      const newSurahNumber = e.target.value;
                      const surahName = getArabicScript(newSurahNumber);
                      const displayName = surahName ? `${surahName} (${newSurahNumber})` : "";
                      setProgressData({ 
                        ...progressData, 
                        surahNumber: newSurahNumber,
                        surah: displayName 
                      });
                    }}
                  >
                    <option value="">— Select —</option>
                    {SURAH_NUMBERS.map((n) => (
                      <option key={n} value={n}>
                        {getArabicScript(n)} ({n})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ayat Number
                  </label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    placeholder="0"
                    value={progressData.ayat}
                    onChange={(e) =>
                      setProgressData({ ...progressData, ayat: e.target.value })
                    }
                  />
                </div>
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
                            {entry.ayat ? ` · Ayat ${entry.ayat}` : ""}
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
