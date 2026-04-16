'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton, StatsSkeleton, FilterSkeleton } from '@/components/SkeletonLoader';
import { Plus, Search, GraduationCap, Phone, Calendar, Trash2, User, BookOpen, Edit2 } from 'lucide-react';
import { addStudent, updateStudent, getStudents, deleteStudent, updateStudentStatus } from './actions';
import { format } from 'date-fns';
import { PERMISSIONS } from '@/lib/rbac';
import { PAGINATION_DEFAULTS } from '@/lib/pagination';

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

  useEffect(() => { fetchStudents(); }, [currentPage, search, filterStatus]);

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
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Father's Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Fee</th>
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
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
                          {student.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.father_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {student.phone || (
                          <span className="text-slate-300 italic text-xs">No contact</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(student.id, student.is_active !== false)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                            student.is_active !== false
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {student.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {student.monthly_fee ? `रु ${Number(student.monthly_fee).toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Fee (रु)</label>
                <input type="number" className="input-field text-sm" placeholder="0"
                  value={newStudent.monthly_fee} onChange={(e) => setNewStudent({ ...newStudent, monthly_fee: e.target.value })} />
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input type="tel" className="input-field text-sm" placeholder="03XX-XXXXXXX"
                  value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input type="text" className="input-field text-sm" placeholder="Village, City"
                  value={newStudent.address} onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })} />
              </div>
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
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}
