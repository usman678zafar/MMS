'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'

export async function addStudent(studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('students');
    
    const data = {
      ...studentData,
      monthly_fee: studentData.monthly_fee ? parseFloat(studentData.monthly_fee) : 0,
      admission_date: studentData.admission_date ? new Date(studentData.admission_date) : null,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data }
  } catch (error) {
    console.error('addStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudent(id, studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('students');
    
    const data = {
      ...studentData,
      monthly_fee: studentData.monthly_fee ? parseFloat(studentData.monthly_fee) : 0,
      admission_date: studentData.admission_date ? new Date(studentData.admission_date) : null,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: id },
      { $set: data }
    );
    return { success: true, data }
  } catch (error) {
    console.error('updateStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getStudents(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', status = '') {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('students');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { father_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.is_active = status === 'active';
    }
    
    // Get total count
    const totalItems = await collection.countDocuments(query);
    
    // Get paginated data
    const { skip, limit } = getPaginationParams(page, pageSize);
    const data = await collection.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return formatPaginatedResponse(data, totalItems, page, pageSize);
  } catch (error) {
    console.error('getStudents Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('students');
    
    await collection.updateOne(
      { _id: id },
      { $set: { is_active, updated_at: new Date() } }
    );
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteStudent(id) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('students');
    
    await collection.deleteOne({ _id: id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
