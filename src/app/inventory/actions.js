'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'
import { serializeDocument, serializeDocuments } from '@/lib/serialization'

export async function addInventoryItem(itemData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('inventory');
    
    const data = {
      ...itemData,
      quantity: itemData.quantity ? parseFloat(itemData.quantity) : 0,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data: serializeDocument(data) }
  } catch (error) {
    console.error('addInventoryItem Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateInventoryItem(id, itemData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('inventory');
    
    const data = {
      ...itemData,
      quantity: itemData.quantity ? parseFloat(itemData.quantity) : undefined,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id },
      { $set: data }
    );
    return { success: true, data: serializeDocument(data) }
  } catch (error) {
    console.error('updateInventoryItem Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteInventoryItem(id) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('inventory');
    
    await collection.deleteOne({ _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getInventory(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', category = '') {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('inventory');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { item_name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { unit: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    // Get total count
    const totalItems = await collection.countDocuments(query);
    
    // Get paginated data
    const { skip, limit } = getPaginationParams(page, pageSize);
    const data = await collection.find(query)
      .sort({ item_name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return formatPaginatedResponse(serializeDocuments(data), totalItems, page, pageSize);
  } catch (error) {
    console.error('getInventory Error:', error)
    return { success: false, error: error.message }
  }
}
