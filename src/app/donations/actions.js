'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addDonation(donationData) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .insert([donationData])
    .select()

  if (error) {
    console.error('addDonation Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function updateDonation(id, donationData) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .update(donationData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('updateDonation Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function deleteDonation(id) {
  const { error } = await supabaseAdmin
    .from('donations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteDonation Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function getDonations() {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select(`
      *,
      donors (name)
    `)
    .order('date', { ascending: false })

  if (error) {
    console.error('getDonations Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function getDonors() {
  const { data, error } = await supabaseAdmin
    .from('donors')
    .select('id, name')

  if (error) {
    console.error('getDonors Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}
