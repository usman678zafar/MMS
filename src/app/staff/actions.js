'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addStaffMember(staffData) {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .insert([staffData])
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateStaffMember(id, staffData) {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .update(staffData)
    .eq('id', id)
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteStaffMember(id) {
  const { error } = await supabaseAdmin
    .from('staff')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getStaff() {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
