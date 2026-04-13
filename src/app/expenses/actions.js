'use server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function addExpense(expenseData) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert([expenseData])
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateExpense(id, expenseData) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update(expenseData)
    .eq('id', id)
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteExpense(id) {
  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getExpenses() {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
