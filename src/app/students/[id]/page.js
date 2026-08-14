"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  History,
  Loader2,
  MapPin,
  NotebookPen,
  Phone,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import NavigationLayout from "@/components/NavigationLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { PERMISSIONS } from "@/lib/rbac";
import {
  deleteStudentDocument,
  getStudentProfile,
  recordFeePayment,
  recordStudentAttendance,
  updateStudentNotes,
  updateStudentProgress,
  uploadStudentDocument,
  uploadStudentPhoto,
} from "../actions";

const tabs = [
  { id: "overview", nameKey: "overview", icon: UserRound },
  { id: "academic", nameKey: "academicProgress", icon: BookOpen },
  { id: "attendance", nameKey: "attendance", icon: CalendarCheck },
  { id: "fees", nameKey: "fees", icon: WalletCards },
  { id: "documents", nameKey: "documentsNotes", icon: FileText },
  { id: "history", nameKey: "history", icon: History },
];

const months = [
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

const today = () => format(new Date(), "yyyy-MM-dd");
const currentMonth = () => format(new Date(), "MMMM");
const currentYear = () => new Date().getFullYear();
const formatDate = (value, pattern = "MMM d, yyyy") => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, pattern);
};
const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const attendanceTone = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Absent: "bg-rose-50 text-rose-700 border-rose-100",
  Late: "bg-amber-50 text-amber-700 border-amber-100",
  Leave: "bg-blue-50 text-blue-700 border-blue-100",
};

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
      <Icon className="mx-auto h-9 w-9 text-slate-300" />
      <p className="mt-3 text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50/80 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const canView =
    !authLoading && Boolean(user) && hasPermission(PERMISSIONS.STUDENTS_VIEW);
  const canEdit = hasPermission(PERMISSIONS.STUDENTS_UPDATE);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState("");
  const [progressForm, setProgressForm] = useState({
    type: "Qaida",
    para: 1,
    surahNumber: "",
    surah: "",
    ayat: "",
    month: currentMonth(),
    year: currentYear(),
    notes: "",
  });
  const [attendanceForm, setAttendanceForm] = useState({
    date: today(),
    status: "Present",
    notes: "",
  });
  const [feeForm, setFeeForm] = useState({
    amount: "",
    month: currentMonth(),
    year: currentYear(),
    notes: "",
  });

  const loadProfile = useCallback(async ({ showLoader = true } = {}) => {
    if (!canView || !id) return;
    if (showLoader) setLoading(true);
    try {
      const result = await getStudentProfile(id);
      if (result.success) {
        setData(result.data);
        setNotes(result.data.student.profile_notes || "");
        setFeeForm((current) => ({
          ...current,
          amount: String(result.data.student.monthly_fee || ""),
        }));
        const currentProgress = result.data.student.current_progress || {};
        setProgressForm((current) => ({
          ...current,
          type: currentProgress.type || result.data.student.religious_class || "Qaida",
          para: currentProgress.para || 1,
          surahNumber: currentProgress.surah_number || "",
          surah: currentProgress.surah || "",
          ayat: currentProgress.ayat || "",
        }));
      } else {
        setError(result.error || "Unable to load this student record");
      }
    } catch (error) {
      console.error("Student profile load failed:", error);
      setError("The student profile could not be refreshed. Please try again.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [canView, id]);

  useEffect(() => {
    const timer = setTimeout(loadProfile, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const runMutation = async (
    operation,
    successMessage,
    { onSuccess, refresh = true } = {},
  ) => {
    setSaving(true);
    setError("");
    try {
      const result = await operation();
      if (result.success) {
        setModal(null);
        onSuccess?.(result);
        showNotice(successMessage);
        if (refresh) await loadProfile({ showLoader: false });
        return true;
      }
      setError(result.error || "The update could not be completed");
      return false;
    } catch (error) {
      console.error("Student profile update failed:", error);
      setError(
        error?.message === "Failed to fetch"
          ? "The request could not reach the server. Check your connection and try again."
          : error?.message || "The update could not be completed",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const activity = useMemo(() => {
    if (!data) return [];
    const documents = Array.isArray(data.student.documents)
      ? data.student.documents
      : [];
    return [
      ...data.progress.map((entry) => ({
        id: `progress-${entry.id}`,
        type: t("studentProfile", "academic"),
        title: `${entry.type || t("studentProfile", "academic")} ${t("studentProfile", "progressRecorded")}`,
        detail:
          entry.notes ||
          [entry.surah, entry.para ? `${t("studentProfile", "para")} ${entry.para}` : ""]
            .filter(Boolean)
            .join(" · "),
        date: entry.date || entry.created_at,
        color: "bg-indigo-500",
      })),
      ...data.fees.map((entry) => ({
        id: `fee-${entry.id}`,
        type: t("studentProfile", "fee"),
        title: `${t("months", entry.month)} ${entry.year} ${t("studentProfile", "feeReceived")}`,
        detail: `${currency(entry.amount)}${entry.notes ? ` · ${entry.notes}` : ""}`,
        date: entry.date || entry.created_at,
        color: "bg-emerald-500",
      })),
      ...data.attendance.map((entry) => ({
        id: `attendance-${entry.id}`,
        type: t("studentProfile", "attendance"),
        title: `${t("studentProfile", "marked")} ${t("students", entry.status.toLowerCase())}`,
        detail: entry.notes || t("studentProfile", "dailyAttendance"),
        date: entry.date,
        color: "bg-amber-500",
      })),
      ...documents.map((entry) => ({
        id: `document-${entry.id}`,
        type: t("studentProfile", "document"),
        title: t("studentProfile", "documentUploaded"),
        detail: entry.name,
        date: entry.uploaded_at,
        color: "bg-blue-500",
      })),
    ]
      .filter((entry) => entry.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, t]);

  const saveNotes = async () => {
    await runMutation(
      () => updateStudentNotes(id, notes),
      "Student notes saved",
    );
  };

  const uploadDocument = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Documents must be 5 MB or smaller");
      input.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    await runMutation(
      () => uploadStudentDocument(id, formData),
      "Document uploaded",
      {
        refresh: false,
        onSuccess: (result) => {
          setData((current) => {
            if (!current) return current;
            const documents = Array.isArray(current.student.documents)
              ? current.student.documents
              : [];
            return {
              ...current,
              student: {
                ...current.student,
                documents: [...documents, result.data],
              },
            };
          });
        },
      },
    );
    input.value = "";
  };

  const uploadPhoto = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile photos must be 3 MB or smaller");
      input.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    await runMutation(
      () => uploadStudentPhoto(id, formData),
      "Profile photo updated",
      {
        refresh: false,
        onSuccess: (result) => {
          setData((current) =>
            current
              ? {
                  ...current,
                  student: {
                    ...current.student,
                    profile_photo: result.data,
                  },
                }
              : current,
          );
        },
      },
    );
    input.value = "";
  };

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.STUDENTS_VIEW}>
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error && !data ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-rose-100 bg-white p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {t("studentProfile", "unavailable")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <Link href="/students" className="btn btn-primary mx-auto mt-6 w-fit text-sm">
              {t("studentProfile", "returnToStudents")}
            </Link>
          </div>
        ) : data ? (
          <div className="management-page space-y-5 min-[1700px]:space-y-6">
            {notice && (
              <div className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
                {notice}
              </div>
            )}
            {error && (
              <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span>{error}</span>
                <button onClick={() => setError("")} aria-label={t("studentProfile", "dismissError")}>
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}

            <Link
              href="/students"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("studentProfile", "backToStudents")}
            </Link>

            <section className="surface-card overflow-hidden rounded-2xl">
              <div className="bg-[#065f46] px-5 py-7 text-white sm:px-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 bg-cover bg-center text-2xl font-bold backdrop-blur"
                      style={
                        data.student.profile_photo?.url
                          ? { backgroundImage: `url(${JSON.stringify(data.student.profile_photo.url)})` }
                          : undefined
                      }
                    >
                      {!data.student.profile_photo?.url &&
                        (data.student.name?.charAt(0)?.toUpperCase() || "S")}
                      {canEdit && (
                        <label
                          title={t("studentProfile", "updatePhoto")}
                          className="absolute -bottom-2 -right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white text-primary-700 shadow-md hover:bg-primary-50"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={uploadPhoto}
                            disabled={saving}
                            className="sr-only"
                          />
                        </label>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                          {data.student.name}
                        </h1>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            data.student.is_active !== false
                              ? "bg-emerald-300/20 text-emerald-100"
                              : "bg-white/15 text-white/70"
                          }`}
                        >
                          {data.student.is_active !== false ? t("common", "active") : t("common", "inactive")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/70">
                        {t("studentProfile", "studentId")}: {data.student.id.slice(-8).toUpperCase()} · {t("studentProfile", "admitted")} {formatDate(data.student.admission_date)}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex sm:w-auto sm:flex-wrap">
                      <button onClick={() => setModal("progress")} className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-primary-800 hover:bg-primary-50">
                        {t("studentProfile", "updateProgress")}
                      </button>
                      <button onClick={() => setModal("attendance")} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20">
                        {t("studentProfile", "recordAttendance")}
                      </button>
                      <button onClick={() => setModal("fee")} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20">
                        {t("studentProfile", "receiveFee")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border-b border-slate-100 px-3 sm:px-6">
                <nav className="flex min-w-max gap-1" aria-label={t("studentProfile", "recordSections")}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 border-b-2 px-3 py-4 text-xs font-bold transition-colors sm:px-4 ${
                        activeTab === tab.id
                          ? "border-primary-600 text-primary-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {t("studentProfile", tab.nameKey)}
                    </button>
                  ))}
                </nav>
              </div>
            </section>

            {activeTab === "overview" && (
              <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-6">
                  <section className="surface-card rounded-2xl p-5 sm:p-6">
                    <h2 className="text-base font-bold text-slate-900">{t("studentProfile", "personalInfo")}</h2>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <InfoItem label={t("studentProfile", "guardian")} value={data.student.father_name} icon={UserRound} />
                      <InfoItem label={t("studentProfile", "gender")} value={data.student.gender === "Female" ? t("students", "female") : t("students", "male")} icon={UserRound} />
                      <InfoItem label={t("studentProfile", "phone")} value={data.student.phone} icon={Phone} />
                      <InfoItem label={t("studentProfile", "address")} value={data.student.address} icon={MapPin} />
                    </div>
                  </section>
                  <section className="surface-card rounded-2xl p-5 sm:p-6">
                    <h2 className="text-base font-bold text-slate-900">{t("studentProfile", "enrollmentInstruction")}</h2>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <InfoItem label={t("studentProfile", "religiousClass")} value={data.student.religious_class} icon={BookOpen} />
                      <InfoItem label={t("studentProfile", "contemporaryClass")} value={data.student.contemporary_class === "None" ? t("studentProfile", "notEnrolled") : data.student.contemporary_class} icon={GraduationCap} />
                      <InfoItem label={t("studentProfile", "assignedTeacher")} value={data.student.teacher_name || t("students", "unassigned")} icon={UserRound} />
                      <InfoItem label={t("studentProfile", "teacherPhone")} value={data.student.teacher_phone} icon={Phone} />
                    </div>
                  </section>
                </div>
                <aside className="space-y-4">
                  <div className="metric-card metric-card-emerald p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("studentProfile", "attendanceRate")}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-3xl font-extrabold text-slate-900">{data.summary.attendanceRate}%</p>
                      <p className="text-xs text-slate-400">{data.summary.totalAttendance} {t("studentProfile", "records")}</p>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${data.summary.attendanceRate}%` }} />
                    </div>
                  </div>
                  <div className="metric-card metric-card-indigo p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("studentProfile", "currentProgress")}</p>
                    <p className="mt-3 text-xl font-extrabold text-primary-800">{data.student.current_progress?.type || t("studentProfile", "notRecorded")}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[data.student.current_progress?.para ? `${t("studentProfile", "para")} ${data.student.current_progress.para}` : "", data.student.current_progress?.surah].filter(Boolean).join(" · ") || t("studentProfile", "noMilestoneDetails")}
                    </p>
                    <p className="mt-4 text-xs text-slate-400">{t("studentProfile", "updated")} {formatDate(data.student.current_progress?.last_updated)}</p>
                  </div>
                  <div className="metric-card metric-card-amber p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("studentProfile", "currentFeeStatus")}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className={`text-xl font-extrabold ${data.student.fee_status === "Paid" ? "text-emerald-600" : "text-rose-600"}`}>{data.student.fee_status === "Paid" ? t("common", "paid") : t("dashboard", "unpaid")}</p>
                      <p className="text-sm font-bold text-slate-700">{currency(data.student.monthly_fee)} / {t("studentProfile", "perMonth")}</p>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "academic" && (
              <section className="surface-card rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-base font-bold text-slate-900">{t("studentProfile", "academicMilestones")}</h2><p className="mt-1 text-xs text-slate-400">{t("studentProfile", "learningProgress")}</p></div>
                  {canEdit && <button onClick={() => setModal("progress")} className="btn btn-primary gap-2 text-xs"><Plus className="h-4 w-4" /> {t("studentProfile", "addMilestone")}</button>}
                </div>
                <div className="mt-6">
                  {data.progress.length === 0 ? <EmptyState icon={BookOpen} title={t("studentProfile", "noProgress")} description={t("studentProfile", "noProgressHint")} /> : (
                    <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-7">
                      {data.progress.map((entry) => (
                        <article key={entry.id} className="relative">
                          <span className="absolute -left-[34px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-600 ring-2 ring-primary-100" />
                          <div className="flex flex-col justify-between gap-2 sm:flex-row">
                            <div><p className="text-sm font-bold text-slate-900">{["Qaida", "Nazra", "Hifz", "Girdan"].includes(entry.type) ? t("options", entry.type.toLowerCase()) : entry.type} {entry.para ? `· ${t("studentProfile", "para")} ${entry.para}` : ""} {entry.ayat ? `· ${t("studentProfile", "ayat")} ${entry.ayat}` : ""}</p><p className="mt-1 text-sm text-slate-500">{entry.surah || t("studentProfile", "generalMilestone")}</p>{entry.notes && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-600">{entry.notes}</p>}</div>
                            <time className="shrink-0 text-xs font-semibold text-slate-400">{formatDate(entry.date)}</time>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div className="metric-grid grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {[
                    [t("studentProfile", "attendanceRate"), `${data.summary.attendanceRate}%`, "text-primary-700"],
                    [t("students", "present"), data.summary.attendance.present, "text-emerald-600"],
                    [t("students", "absent"), data.summary.attendance.absent, "text-rose-600"],
                    [t("students", "late"), data.summary.attendance.late, "text-amber-600"],
                    [t("students", "leave"), data.summary.attendance.leave, "text-blue-600"],
                  ].map(([label, value, tone]) => <div key={label} className="metric-card p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-extrabold ${tone}`}>{value}</p></div>)}
                </div>
                <section className="surface-card rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-base font-bold text-slate-900">{t("studentProfile", "attendanceLog")}</h2>{canEdit && <button onClick={() => setModal("attendance")} className="btn btn-primary gap-2 text-xs"><Plus className="h-4 w-4" /> {t("studentProfile", "record")}</button>}</div>
                  <div className="data-table-scroll mt-5">
                    {data.attendance.length === 0 ? <EmptyState icon={CalendarCheck} title={t("studentProfile", "noAttendance")} description={t("studentProfile", "noAttendanceHint")} /> : <table className="data-table min-w-[560px] text-left"><thead><tr><th className="px-4 py-3">{t("tables", "date")}</th><th className="px-4 py-3">{t("tables", "status")}</th><th className="px-4 py-3">{t("tables", "notes")}</th></tr></thead><tbody>{data.attendance.map((entry) => <tr key={entry.id}><td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatDate(entry.date, "EEEE, MMM d, yyyy")}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${attendanceTone[entry.status] || "bg-slate-50 text-slate-600"}`}>{t("students", entry.status.toLowerCase())}</span></td><td className="px-4 py-4 text-sm text-slate-500">{entry.notes || "—"}</td></tr>)}</tbody></table>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "fees" && (
              <div className="space-y-6">
                <div className="metric-grid grid gap-3 sm:grid-cols-3">
                  <div className="metric-card p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("studentProfile", "totalReceived")}</p><p className="mt-2 text-2xl font-extrabold text-emerald-600">{currency(data.summary.paidTotal)}</p></div>
                  <div className="metric-card p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("studentProfile", "paymentsRecorded")}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{data.summary.paidMonths}</p></div>
                  <div className="metric-card p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("studentProfile", "currentDue")}</p><p className={`mt-2 text-2xl font-extrabold ${data.summary.currentDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>{currency(data.summary.currentDue)}</p></div>
                </div>
                <section className="surface-card rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-base font-bold text-slate-900">{t("studentProfile", "paymentHistory")}</h2>{canEdit && <button onClick={() => setModal("fee")} className="btn btn-primary gap-2 text-xs"><Plus className="h-4 w-4" /> {t("studentProfile", "receiveFee")}</button>}</div>
                  <div className="data-table-scroll mt-5">
                    {data.fees.length === 0 ? <EmptyState icon={Receipt} title={t("studentProfile", "noPayments")} description={t("studentProfile", "noPaymentsHint")} /> : <table className="data-table min-w-[620px] text-left"><thead><tr><th className="px-4 py-3">{t("tables", "period")}</th><th className="px-4 py-3">{t("tables", "paidOn")}</th><th className="px-4 py-3">{t("tables", "notes")}</th><th className="px-4 py-3 text-right">{t("tables", "amount")}</th></tr></thead><tbody>{data.fees.map((entry) => <tr key={entry.id}><td className="px-4 py-4 text-sm font-bold text-slate-800">{t("months", entry.month)} {entry.year}</td><td className="px-4 py-4 text-sm text-slate-500">{formatDate(entry.date)}</td><td className="px-4 py-4 text-sm text-slate-500">{entry.notes || "—"}</td><td className="px-4 py-4 text-right text-sm font-extrabold text-emerald-600">{currency(entry.amount)}</td></tr>)}</tbody></table>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="surface-card rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold text-slate-900">{t("studentProfile", "documents")}</h2><p className="mt-1 text-xs text-slate-400">{t("studentProfile", "fileHint")}</p></div>{canEdit && <label className="btn btn-primary cursor-pointer gap-2 text-xs"><Upload className="h-4 w-4" /> {t("studentProfile", "upload")}<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={uploadDocument} disabled={saving} className="sr-only" /></label>}</div>
                  <div className="mt-5 space-y-3">
                    {!Array.isArray(data.student.documents) || data.student.documents.length === 0 ? <EmptyState icon={FileText} title={t("studentProfile", "noDocuments")} description={t("studentProfile", "noDocumentsHint")} /> : data.student.documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-600"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{document.name}</p><p className="text-[10px] text-slate-400">{Math.max(1, Math.round(document.size / 1024))} KB · {formatDate(document.uploaded_at)}</p></div><a href={document.url} target="_blank" rel="noreferrer" title={t("studentProfile", "openDocument")} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Download className="h-4 w-4" /></a>{canEdit && <button onClick={() => { if (window.confirm(t("studentProfile", "confirmDeleteDocument"))) runMutation(() => deleteStudentDocument(id, document.id), t("studentProfile", "deleteDocument")); }} title={t("studentProfile", "deleteDocument")} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>)}
                  </div>
                </section>
                <section className="surface-card rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2"><NotebookPen className="h-5 w-5 text-primary-600" /><h2 className="text-base font-bold text-slate-900">{t("studentProfile", "staffNotes")}</h2></div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{t("studentProfile", "notesHint")}</p>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canEdit} maxLength={5000} rows={10} placeholder={t("studentProfile", "notesPlaceholder")} className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed" />
                  <div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-slate-400">{notes.length}/5000</span>{canEdit && <button onClick={saveNotes} disabled={saving} className="btn btn-primary gap-2 text-xs disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("studentProfile", "saveNotes")}</button>}</div>
                </section>
              </div>
            )}

            {activeTab === "history" && (
              <section className="surface-card rounded-2xl p-5 sm:p-6">
                <h2 className="text-base font-bold text-slate-900">{t("studentProfile", "completeActivity")}</h2>
                <p className="mt-1 text-xs text-slate-400">{t("studentProfile", "activityHint")}</p>
                <div className="mt-6">{activity.length === 0 ? <EmptyState icon={History} title={t("studentProfile", "noActivity")} description={t("studentProfile", "noActivityHint")} /> : <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-7">{activity.map((entry) => <article key={entry.id} className="relative"><span className={`absolute -left-[34px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ring-slate-100 ${entry.color}`} /><div className="flex flex-col justify-between gap-1 sm:flex-row"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.type}</p><p className="mt-1 text-sm font-bold text-slate-800">{entry.title}</p><p className="mt-1 text-xs text-slate-500">{entry.detail || t("studentProfile", "noDetails")}</p></div><time className="shrink-0 text-xs font-semibold text-slate-400">{formatDate(entry.date)}</time></div></article>)}</div>}</div>
              </section>
            )}

            <Modal open={modal === "progress"} onClose={() => setModal(null)} title={t("studentProfile", "recordProgress")}>
              <form onSubmit={(event) => { event.preventDefault(); runMutation(() => updateStudentProgress(id, progressForm), "Academic progress recorded"); }} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "track")}<select value={progressForm.type} onChange={(e) => setProgressForm({ ...progressForm, type: e.target.value })} className="input-field mt-1 text-sm">{["Qaida", "Nazra", "Hifz", "Girdan"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "para")}<select value={progressForm.para} onChange={(e) => setProgressForm({ ...progressForm, para: e.target.value })} className="input-field mt-1 text-sm">{Array.from({ length: 30 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "surahLesson")}<input value={progressForm.surah} onChange={(e) => setProgressForm({ ...progressForm, surah: e.target.value })} className="input-field mt-1 text-sm" /></label><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "ayat")}<input type="number" min="1" value={progressForm.ayat} onChange={(e) => setProgressForm({ ...progressForm, ayat: e.target.value })} className="input-field mt-1 text-sm" /></label></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "month")}<select value={progressForm.month} onChange={(e) => setProgressForm({ ...progressForm, month: e.target.value })} className="input-field mt-1 text-sm">{months.map((value) => <option key={value}>{t("months", value)}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "year")}<input type="number" min="2000" max="2200" value={progressForm.year} onChange={(e) => setProgressForm({ ...progressForm, year: e.target.value })} className="input-field mt-1 text-sm" /></label></div>
                <label className="block text-xs font-semibold text-slate-600">{t("studentProfile", "notes")}<textarea value={progressForm.notes} onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} rows={3} className="input-field mt-1 resize-none text-sm" /></label>
                <button disabled={saving} className="btn btn-primary w-full text-sm disabled:opacity-50">{saving ? t("students", "recording") : t("studentProfile", "recordMilestone")}</button>
              </form>
            </Modal>

            <Modal open={modal === "attendance"} onClose={() => setModal(null)} title={t("studentProfile", "recordAttendance")}>
              <form onSubmit={(event) => { event.preventDefault(); runMutation(() => recordStudentAttendance(id, attendanceForm.status, attendanceForm.date, attendanceForm.notes), "Attendance recorded"); }} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-600">{t("tables", "date")}<input type="date" required value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} className="input-field mt-1 text-sm" /></label>
                <div><p className="text-xs font-semibold text-slate-600">{t("tables", "status")}</p><div className="mt-2 grid grid-cols-2 gap-2">{["Present", "Absent", "Late", "Leave"].map((status) => <button key={status} type="button" onClick={() => setAttendanceForm({ ...attendanceForm, status })} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${attendanceForm.status === status ? attendanceTone[status] : "border-slate-200 text-slate-500"}`}>{t("students", status.toLowerCase())}</button>)}</div></div>
                <label className="block text-xs font-semibold text-slate-600">{t("tables", "notes")}<textarea value={attendanceForm.notes} onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })} rows={3} className="input-field mt-1 resize-none text-sm" /></label>
                <button disabled={saving} className="btn btn-primary w-full text-sm disabled:opacity-50">{saving ? t("common", "saving") : t("studentProfile", "saveAttendance")}</button>
              </form>
            </Modal>

            <Modal open={modal === "fee"} onClose={() => setModal(null)} title={t("studentProfile", "receiveFee")}>
              <form onSubmit={(event) => { event.preventDefault(); runMutation(() => recordFeePayment(id, feeForm), "Fee payment recorded"); }} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-600">{t("studentProfile", "amount")}<input type="number" min="0" required value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} className="input-field mt-1 text-sm" /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "month")}<select value={feeForm.month} onChange={(e) => setFeeForm({ ...feeForm, month: e.target.value })} className="input-field mt-1 text-sm">{months.map((value) => <option key={value}>{t("months", value)}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">{t("studentProfile", "year")}<input type="number" min="2000" max="2200" value={feeForm.year} onChange={(e) => setFeeForm({ ...feeForm, year: e.target.value })} className="input-field mt-1 text-sm" /></label></div>
                <label className="block text-xs font-semibold text-slate-600">{t("tables", "notes")}<textarea value={feeForm.notes} onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })} rows={3} className="input-field mt-1 resize-none text-sm" /></label>
                <button disabled={saving} className="btn btn-primary w-full text-sm disabled:opacity-50">{saving ? t("students", "recording") : t("studentProfile", "recordPayment")}</button>
              </form>
            </Modal>
          </div>
        ) : null}
      </ProtectedRoute>
    </NavigationLayout>
  );
}
