'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function getDashboardStats() {
  try {
    const [
      { data: donations },
      { data: expenses },
      { count: staffCount },
      { count: inventoryCount },
    ] = await Promise.all([
      supabaseAdmin.from('donations').select('amount'),
      supabaseAdmin.from('expenses').select('amount'),
      supabaseAdmin.from('staff').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('inventory_items').select('*', { count: 'exact', head: true }),
    ])

    return {
      success: true,
      totalDonations: donations?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      totalExpenses: expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      activeStaff: staffCount || 0,
      inventoryCount: inventoryCount || 0,
    }
  } catch (error) {
    console.error('getDashboardStats Error:', error)
    return { success: false, error: error.message }
  }
}
