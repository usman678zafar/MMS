'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addInventoryItem(itemData) {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .insert([itemData])
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateInventoryItem(id, itemData) {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .update(itemData)
    .eq('id', id)
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteInventoryItem(id) {
  const { error } = await supabaseAdmin
    .from('inventory')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getInventory() {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .order('item_name')

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
