'use server'
import { prisma } from '@/lib/prisma'

export async function addExpense(expenseData) {
  try {
    const data = await prisma.expenses.create({
      data: {
        ...expenseData,
        date: expenseData.date ? new Date(expenseData.date) : null
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('addExpense Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateExpense(id, expenseData) {
  try {
    const data = await prisma.expenses.update({
      where: { id },
      data: {
        ...expenseData,
        date: expenseData.date ? new Date(expenseData.date) : undefined
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateExpense Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteExpense(id) {
  try {
    await prisma.expenses.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getExpenses() {
  try {
    const data = await prisma.expenses.findMany({
      orderBy: { date: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getExpenses Error:', error)
    return { success: false, error: error.message }
  }
}
