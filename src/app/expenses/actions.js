'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addExpense(expenseData) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert([expenseData])
    .select()

  if (error) {
    console.error('addExpense Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

export async function getExpenses() {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('getExpenses Error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}
