'use server'
import { prisma } from '@/lib/prisma'

export async function addInventoryItem(itemData) {
  try {
    const data = await prisma.inventory.create({
      data: {
        ...itemData,
        quantity: itemData.quantity ? parseFloat(itemData.quantity) : 0
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('addInventoryItem Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateInventoryItem(id, itemData) {
  try {
    const data = await prisma.inventory.update({
      where: { id },
      data: {
        ...itemData,
        quantity: itemData.quantity ? parseFloat(itemData.quantity) : undefined
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateInventoryItem Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteInventoryItem(id) {
  try {
    await prisma.inventory.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getInventory() {
  try {
    const data = await prisma.inventory.findMany({
      orderBy: { item_name: 'asc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getInventory Error:', error)
    return { success: false, error: error.message }
  }
}
