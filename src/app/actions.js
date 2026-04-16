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

export async function getFinancialData() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [donations, expenses] = await Promise.all([
      prisma.donations.findMany({
        where: {
          date: { gte: sixMonthsAgo }
        },
        select: { amount: true, date: true }
      }),
      prisma.expenses.findMany({
        where: {
          date: { gte: sixMonthsAgo }
        },
        select: { amount: true, date: true }
      })
    ])

    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const currentMonth = new Date().getMonth()
    const data = []

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      const monthStart = new Date()
      monthStart.setMonth(monthIndex)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      monthEnd.setHours(23, 59, 59, 999)

      const monthDonations = donations
        .filter(d => new Date(d.date) >= monthStart && new Date(d.date) <= monthEnd)
        .reduce((sum, d) => sum + Number(d.amount), 0)

      const monthExpenses = expenses
        .filter(e => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
        .reduce((sum, e) => sum + Number(e.amount), 0)

      data.push({
        name: monthNames[monthIndex],
        donations: monthDonations,
        expenses: monthExpenses
      })
    }

    return { success: true, data }
  } catch (error) {
    console.error('getFinancialData Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getRecentActivity() {
  try {
    const recentDonations = await prisma.donations.findMany({
      take: 4,
      orderBy: { created_at: 'desc' },
      include: {
        donors: {
          select: { name: true }
        }
      }
    })

    const activities = recentDonations.map(donation => ({
      type: 'donation',
      amount: Number(donation.amount),
      donor: donation.donors?.name || 'Anonymous',
      date: donation.created_at
    }))

    return { success: true, activities }
  } catch (error) {
    console.error('getRecentActivity Error:', error)
    return { success: false, error: error.message }
  }
}
