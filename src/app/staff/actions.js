'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addStaffMember(staffData) {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .insert([staffData])
    .select()

  if (error) {
    console.error('addStaffMember Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function getStaff() {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .order('name')

  if (error) {
    console.error('getStaff Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}
