'use client'
import React, { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import Modal from '@/components/Modal';
import { Plus, Search, GraduationCap, Phone, Calendar, Trash2, User, BookOpen } from 'lucide-react';
import { addStudent, getStudents, deleteStudent, updateStudentStatus } from './actions';
import { format } from 'date-fns';

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
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [newStudent, setNewStudent] = useState(defaultForm);

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    const res = await getStudents();
    if (res.success) setStudents(res.data);
    setLoading(false);
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await addStudent(newStudent);
    if (res.success) {
      setShowModal(false);
      setNewStudent(defaultForm);
      fetchStudents();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this student record?')) return;
    const res = await deleteStudent(id);
    if (res.success) fetchStudents();
    else alert(`Error: ${res.error}`);
  };

  const handleToggleStatus = async (id, current) => {
    await updateStudentStatus(id, !current);
    fetchStudents();
  };

  const filtered = students.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.father_name?.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === 'All' || s.class === filterClass;
    return matchSearch && matchClass;
  });

  const active = students.filter(s => s.is_active !== false).length;
  const inactive = students.length - active;

  return (
    <NavigationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Students</h2>
            <p className="text-slate-500">Manage madrasa student enrollment and records.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Enroll Student
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or father's name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          >
            <option value="All">All Classes</option>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Student Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400">Loading students...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-lg font-medium">No students found</p>
              <p className="text-slate-400 text-sm mt-1">Enroll your first student to get started</p>
            </div>
          ) : (
            filtered.map((student) => (
              <div key={student.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold flex-shrink-0">
                      {student.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{student.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" /> {student.father_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(student.id, student.is_active !== false)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        student.is_active !== false
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title="Toggle status"
                    >
                      {student.is_active !== false ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium">{student.class || 'N/A'}</span>
                    {student.gender && <span className="text-slate-400">· {student.gender}</span>}
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  {student.admission_date && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Admitted: {format(new Date(student.admission_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
                  {student.monthly_fee ? (
                    <span className="text-sm font-bold text-slate-900">
                      रु {Number(student.monthly_fee).toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-300 italic">No fee set</span>
                  )}
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Enroll New Student">
          <form onSubmit={handleAdd} className="space-y-3">
            {/* Name & Father */}
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </NavigationLayout>
  );
}
