'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addInventoryItem(itemData) {
  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .insert([itemData])
    .select()

  if (error) {
    console.error('addInventoryItem Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function getInventory() {
  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .order('item_name')

  if (error) {
    console.error('getInventory Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}
