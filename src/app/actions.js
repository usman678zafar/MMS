'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import User from '@/models/User'
import { serializeDocument, serializeDocuments } from '@/lib/serialization'

export async function getDashboardStats() {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    
    const [donations, expenses, staffCount, inventoryCount, studentCount, pendingFeesCount] = await Promise.all([
      db.collection('donations').find({}).toArray(),
      db.collection('expenses').find({}).toArray(),
      db.collection('staff').countDocuments(),
      db.collection('inventory').countDocuments(),
      db.collection('students').countDocuments(),
      db.collection('students').countDocuments({ fee_status: 'Unpaid' })
    ])

    return {
      success: true,
      totalDonations: donations?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      totalExpenses: expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      activeStaff: staffCount || 0,
      inventoryCount: inventoryCount || 0,
      studentCount: studentCount || 0,
      pendingFees: pendingFeesCount || 0,
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

    await connectDB();
    const db = mongoose.connection.getClient().db();
    
    const [donations, expenses] = await Promise.all([
      db.collection('donations').find({ date: { $gte: sixMonthsAgo } }).toArray(),
      db.collection('expenses').find({ date: { $gte: sixMonthsAgo } }).toArray()
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
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const donationsCollection = db.collection('donations');
    
    const recentDonations = await donationsCollection.find({}).sort({ created_at: -1 }).limit(4).toArray();

    const activities = recentDonations.map(donation => ({
      type: 'donation',
      amount: Number(donation.amount),
      donor: donation.donors?.name || 'Anonymous',
      date: donation.created_at
    }))

    return { success: true, activities: serializeDocuments(activities) }
  } catch (error) {
    console.error('getRecentActivity Error:', error)
    return { success: false, error: error.message }
  }
}
