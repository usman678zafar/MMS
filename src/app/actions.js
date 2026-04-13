'use server'
import { prisma } from '@/lib/prisma'

export async function getDashboardStats() {
  try {
    const [
      donations,
      expenses,
      staffCount,
      inventoryCount,
    ] = await Promise.all([
      prisma.donations.findMany({ select: { amount: true } }),
      prisma.expenses.findMany({ select: { amount: true } }),
      prisma.staff.count(),
      prisma.inventory.count(),
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
