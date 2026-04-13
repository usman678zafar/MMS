'use server'
import { prisma } from '@/lib/prisma'

export async function addStudent(studentData) {
  try {
    const data = await prisma.students.create({
      data: {
        ...studentData,
        admission_date: studentData.admission_date ? new Date(studentData.admission_date) : null
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('addStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudent(id, studentData) {
  try {
    const data = await prisma.students.update({
      where: { id },
      data: {
        ...studentData,
        admission_date: studentData.admission_date ? new Date(studentData.admission_date) : undefined
      }
    })
    return { success: true, data }
  } catch (error) {
    console.error('updateStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getStudents() {
  try {
    const data = await prisma.students.findMany({
      orderBy: { name: 'asc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('getStudents Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await prisma.students.update({
      where: { id },
      data: { is_active }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteStudent(id) {
  try {
    await prisma.students.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
