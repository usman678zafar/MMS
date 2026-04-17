'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Donor from '@/models/Donor'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'

export async function addDonor(donorData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donors');
    
    const data = {
      ...donorData,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data }
  } catch (error) {
    console.error('addDonor Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateDonor(id, donorData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donors');
    
    const data = {
      ...donorData,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: id },
      { $set: data }
    );
    return { success: true, data }
  } catch (error) {
    console.error('updateDonor Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getAllDonors(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', status = '') {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donors');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
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
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return formatPaginatedResponse(data, totalItems, page, pageSize);
  } catch (error) {
    console.error('getAllDonors Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteDonor(id) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donors');
    
    await collection.deleteOne({ _id: id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
