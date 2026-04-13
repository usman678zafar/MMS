'use server'
import { prisma } from '@/lib/prisma'

export async function addDonor(donorData) {
  try {
    const data = await prisma.donors.create({
      data: donorData
    })
    return { success: true, data }
  } catch (error) {
    console.error('addDonor Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateDonor(id, donorData) {
  try {
    const data = await prisma.donors.update({
      where: { id },
      data: donorData
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateDonor Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getAllDonors() {
  try {
    const data = await prisma.donors.findMany({
      include: {
        donations: {
          select: { amount: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getAllDonors Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteDonor(id) {
  try {
    await prisma.donors.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
