'use server'
import { prisma } from '@/lib/prisma'

export async function addStaffMember(staffData) {
  try {
    const data = await prisma.staff.create({
      data: {
        ...staffData,
        monthly_salary: staffData.monthly_salary ? parseFloat(staffData.monthly_salary) : 0,
        joining_date: staffData.joining_date ? new Date(staffData.joining_date) : null
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('addStaffMember Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStaffMember(id, staffData) {
  try {
    const data = await prisma.staff.update({
      where: { id },
      data: {
        ...staffData,
        monthly_salary: staffData.monthly_salary ? parseFloat(staffData.monthly_salary) : undefined,
        joining_date: staffData.joining_date ? new Date(staffData.joining_date) : undefined
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateStaffMember Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteStaffMember(id) {
  try {
    await prisma.staff.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getStaff() {
  try {
    const data = await prisma.staff.findMany({
      orderBy: { created_at: 'asc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getStaff Error:', error)
    return { success: false, error: error.message }
  }
}
