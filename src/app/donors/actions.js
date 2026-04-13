'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addDonor(donorData) {
  const { data, error } = await supabaseAdmin
    .from('donors')
    .insert([donorData])
    .select()

  if (error) {
    console.error('addDonor Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function updateDonor(id, donorData) {
  const { data, error } = await supabaseAdmin
    .from('donors')
    .update(donorData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('updateDonor Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function getAllDonors() {
  const { data, error } = await supabaseAdmin
    .from('donors')
    .select(`
      *,
      donations(amount)
    `)
    .order('name')

  if (error) {
    console.error('getAllDonors Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function deleteDonor(id) {
  const { error } = await supabaseAdmin
    .from('donors')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
