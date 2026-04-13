'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addStudent(studentData) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([studentData])
    .select()
  if (error) { console.error('addStudent Error:', error); return { success: false, error: error.message } }
  return { success: true, data }
}

export async function updateStudent(id, studentData) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update(studentData)
    .eq('id', id)
    .select()
  if (error) { console.error('updateStudent Error:', error); return { success: false, error: error.message } }
  return { success: true, data }
}

export async function getStudents() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('name')
  if (error) { console.error('getStudents Error:', error); return { success: false, error: error.message } }
  return { success: true, data }
}

export async function updateStudentStatus(id, is_active) {
  const { error } = await supabaseAdmin.from('students').update({ is_active }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteStudent(id) {
  const { error } = await supabaseAdmin.from('students').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
