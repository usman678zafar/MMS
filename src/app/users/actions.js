'use server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function getUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    return { success: true, users }
  } catch (error) {
    console.error('getUsers Error:', error)
    return { success: false, error: error.message }
  }
}

export async function addUser(userData) {
  try {
    const { name, email, role, password } = userData

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.users.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true
      }
    })

    return { success: true, user }
  } catch (error) {
    console.error('addUser Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateUser(userId, userData) {
  try {
    const { name, email, role, password } = userData

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if email is being changed and if new email already exists
    if (email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email }
      })

      if (emailExists) {
        return { success: false, error: 'User with this email already exists' }
      }
    }

    const updateData = {
      name,
      email,
      role
    }

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    })

    return { success: true, user }
  } catch (error) {
    console.error('updateUser Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteUser(userId) {
  try {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    await prisma.users.delete({
      where: { id: userId }
    })

    return { success: true }
  } catch (error) {
    console.error('deleteUser Error:', error)
    return { success: false, error: error.message }
  }
}

export async function toggleUserStatus(userId) {
  try {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: {
        is_active: !existingUser.is_active
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    })

    return { success: true, user }
  } catch (error) {
    console.error('toggleUserStatus Error:', error)
    return { success: false, error: error.message }
  }
}
