'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, GraduationCap, Phone, Calendar, Trash2, User, BookOpen, Edit2 } from 'lucide-react';
import { addStudent, updateStudent, getStudents, deleteStudent, updateStudentStatus, updateStudentProgress, updateFeeStatus, getStudentProgressHistory } from './actions';
import { getAllTeachers } from '../staff/actions';
import { format } from 'date-fns';
import { PERMISSIONS } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

const PROGRESS_TYPES = ['Qaida', 'Quran', 'Hifz'];
const PARA_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

const CLASSES = ['Hifz', 'Nazra', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Dars-e-Nizami', 'Other'];
const GENDERS = ['Male', 'Female'];

const defaultForm = {
  name: '',
  father_name: '',
  class: 'Hifz',
  admission_date: format(new Date(), 'yyyy-MM-dd'),
  phone: '',
  address: '',
  gender: 'Male',
  monthly_fee: '',
  teacher_id: '',
  fee_status: 'Unpaid',
  progress_type: 'Qaida',
  progress_para: 1,
  progress_surah: '',
  is_active: true,
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [newStudent, setNewStudent] = useState(defaultForm);
  const [teachers, setTeachers] = useState([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [progressData, setProgressData] = useState({ type: 'Qaida', para: 1, surah: '', notes: '' });
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  useEffect(() => { 
    fetchStudents(); 
    fetchTeachers();
  }, [currentPage, search, filterStatus]);

  async function fetchTeachers() {
    const res = await getAllTeachers();
    if (res.success) setTeachers(res.data);
  }

  async function fetchStudents() {
    setLoading(true);
    const res = await getStudents(currentPage, PAGINATION_DEFAULTS.PAGE_SIZE, search, filterStatus);
    if (res.success) {
      setStudents(res.data);
      setPagination(res.pagination);
    }
    setLoading(false);
  }

  const handleOpenEdit = (student) => {
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
      type: student.current_progress?.type || 'Qaida',
      para: student.current_progress?.para || 1,
      surah: student.current_progress?.surah || '',
      notes: ''
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
    const nextStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    const res = await updateFeeStatus(id, nextStatus);
    if (res.success) fetchStudents();
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
    await updateStudentStatus(id, !current);
    fetchStudents();
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

  const active = students.filter(s => s.is_active !== false).length;
  const inactive = students.length - active;

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.STUDENTS_VIEW}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Students</h2>
            <p className="text-slate-500">Manage madrasa student enrollment and records.</p>
          </div>
          <button onClick={() => { setEditingId(null); setNewStudent(defaultForm); setShowModal(true); }} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Enroll Student
          </button>
        </div>

        {/* Stats Bar */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Enrolled', value: students.length, color: 'text-slate-900' },
              { label: 'Active', value: active, color: 'text-emerald-600' },
              { label: 'Inactive', value: inactive, color: 'text-rose-500' },
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
                placeholder="Search by name or father's name..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            >
              <option value="All">All Classes</option>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher / Qari</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Fee Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                      <p className="text-slate-400 text-lg font-medium">No students found</p>
                      <p className="text-slate-400 text-sm mt-1">Enroll your first student to get started</p>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-base flex-shrink-0">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              {student.gender || 'Male'} · {student.admission_date ? format(new Date(student.admission_date), 'MMM yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {student.teacher_name || <span className="text-slate-300 italic">Unassigned</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{student.class}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleOpenProgress(student)}
                          className="flex flex-col items-start hover:bg-slate-100 p-1.5 rounded-lg transition-all group/progress w-full"
                        >
                          <span className="text-xs font-bold text-blue-600">
                            {student.current_progress?.type || 'Qaida'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            {student.current_progress?.type === 'Qaida' ? 'Progressing' : `Para ${student.current_progress?.para || 1}`}
                            <BookOpen className="h-2.5 w-2.5 opacity-0 group-hover/progress:opacity-50 transition-opacity" />
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(student.id, student.is_active !== false)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                            student.is_active !== false
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                          }`}
                        >
                          {student.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleFeeStatus(student.id, student.fee_status)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            student.fee_status === 'Paid'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100'
                          }`}
                        >
                          {student.fee_status === 'Paid' ? 'PAID' : 'UNPAID'}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">Rs {Number(student.monthly_fee).toLocaleString()}</p>
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

        <Modal open={showModal} onClose={handleCloseModal} title={editingId ? "Edit Student" : "Enroll New Student"}>
          <form onSubmit={handleSave} className="space-y-3">
            {/* Name & Father */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Name *</label>
                <input type="text" required className="input-field text-sm" placeholder="Full name"
                  value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Father's Name *</label>
                <input type="text" required className="input-field text-sm" placeholder="Father's full name"
                  value={newStudent.father_name} onChange={(e) => setNewStudent({ ...newStudent, father_name: e.target.value })} />
              </div>
            </div>

            {/* Class & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Level</label>
                <select className="input-field text-sm" value={newStudent.class}
                  onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                <select className="input-field text-sm" value={newStudent.gender}
                  onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Admission date & Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Date</label>
                <input type="date" className="input-field text-sm"
                  value={newStudent.admission_date} onChange={(e) => setNewStudent({ ...newStudent, admission_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Fee (Rs)</label>
                <input type="number" className="input-field text-sm" placeholder="0"
                  value={newStudent.monthly_fee} onChange={(e) => setNewStudent({ ...newStudent, monthly_fee: e.target.value })} />
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input type="tel" className="input-field text-sm" placeholder="03XX-XXXXXXX"
                  value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Teacher (Qari)</label>
                <select className="input-field text-sm" value={newStudent.teacher_id}
                  onChange={(e) => setNewStudent({ ...newStudent, teacher_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Progress (New Enrollment Only) */}
            {!editingId && (
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Educational Progress</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Type</label>
                    <select className="input-field text-xs py-1" value={newStudent.progress_type}
                      onChange={(e) => setNewStudent({ ...newStudent, progress_type: e.target.value })}>
                      {PROGRESS_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={newStudent.progress_type === 'Qaida' ? 'opacity-50' : ''}>
                    <label className="block text-[10px] text-slate-500 mb-1">Para #</label>
                    <select 
                      disabled={newStudent.progress_type === 'Qaida'}
                      className="input-field text-xs py-1" value={newStudent.progress_para}
                      onChange={(e) => setNewStudent({ ...newStudent, progress_para: e.target.value })}>
                      {PARA_NUMBERS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Surah / Lesson</label>
                    <input type="text" className="input-field text-xs py-1" placeholder="e.g. Al-Baqarah"
                      value={newStudent.progress_surah} onChange={(e) => setNewStudent({ ...newStudent, progress_surah: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input type="text" className="input-field text-sm" placeholder="Village, City"
                  value={newStudent.address} onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })} />
            </div>

            <div className="flex gap-2 justify-end pt-2 text-sm">
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? 'Saving...' : (editingId ? 'Update Student' : 'Enroll Student')}
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

        <Modal open={showProgressModal} onClose={() => setShowProgressModal(false)} title="Update Progress Milestone">
          <form onSubmit={handleSaveProgress} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Progress Type</label>
                <select className="input-field text-sm" value={progressData.type}
                  onChange={(e) => setProgressData({ ...progressData, type: e.target.value })}>
                  {PROGRESS_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className={progressData.type === 'Qaida' ? 'opacity-50' : ''}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Para Number</label>
                <select 
                  disabled={progressData.type === 'Qaida'}
                  className="input-field text-sm" value={progressData.para}
                  onChange={(e) => setProgressData({ ...progressData, para: e.target.value })}>
                  {PARA_NUMBERS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Surah / Lesson</label>
              <input type="text" className="input-field text-sm" placeholder="Name of Surah or lesson"
                value={progressData.surah} onChange={(e) => setProgressData({ ...progressData, surah: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Notes</label>
              <textarea className="input-field text-sm h-20" placeholder="Observations about progress, memorization quality, etc."
                value={progressData.notes} onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowProgressModal(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? 'Recording...' : 'Update Progress'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Progress Milestones History">
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
                          {entry.type} {entry.para ? `· Para ${entry.para}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(new Date(entry.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{entry.surah || 'General Progress'}</p>
                      {entry.notes && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-600 italic">" {entry.notes} "</p>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">Verified by: {teachers.find(t => t.id === entry.teacher_id)?.name || 'Unknown Teacher'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-secondary text-sm">Close</button>
            </div>
          </div>
        </Modal>
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
