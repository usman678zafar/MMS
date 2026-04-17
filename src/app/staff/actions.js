'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Staff from '@/models/Staff'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'

export async function addStaffMember(staffData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('staff');
    
    const data = {
      ...staffData,
      monthly_salary: staffData.monthly_salary ? parseFloat(staffData.monthly_salary) : 0,
      joining_date: staffData.joining_date ? new Date(staffData.joining_date) : null,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data }
  } catch (error) {
    console.error('addStaffMember Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStaffMember(id, staffData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('staff');
    
    const data = {
      ...staffData,
      monthly_salary: staffData.monthly_salary ? parseFloat(staffData.monthly_salary) : undefined,
      joining_date: staffData.joining_date ? new Date(staffData.joining_date) : undefined,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: id },
      { $set: data }
    );
    return { success: true, data }
  } catch (error) {
    console.error('updateStaffMember Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteStaffMember(id) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('staff');
    
    await collection.deleteOne({ _id: id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getStaff(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', status = '') {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('staff');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
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
      .sort({ created_at: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return formatPaginatedResponse(data, totalItems, page, pageSize);
  } catch (error) {
    console.error('getStaff Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getAllTeachers() {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('staff');
    
    const teachers = await collection.find({ 
      role: { $regex: /teacher/i },
      is_active: true 
    }).project({ name: 1, _id: 1 }).toArray();
    
    return { 
      success: true, 
      data: teachers.map(t => ({ id: t._id.toString(), name: t.name })) 
    };
  } catch (error) {
    console.error('getAllTeachers Error:', error)
    return { success: false, error: error.message }
  }
}
