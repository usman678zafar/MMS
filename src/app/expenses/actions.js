'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Expense from '@/models/Expense'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'

export async function addExpense(expenseData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('expenses');
    
    const data = {
      ...expenseData,
      amount: expenseData.amount ? parseFloat(expenseData.amount) : 0,
      date: expenseData.date ? new Date(expenseData.date) : null,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data }
  } catch (error) {
    console.error('addExpense Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateExpense(id, expenseData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('expenses');
    
    const data = {
      ...expenseData,
      amount: expenseData.amount ? parseFloat(expenseData.amount) : undefined,
      date: expenseData.date ? new Date(expenseData.date) : undefined,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: id },
      { $set: data }
    );
    return { success: true, data }
  } catch (error) {
    console.error('updateExpense Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteExpense(id) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('expenses');
    
    await collection.deleteOne({ _id: id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getExpenses(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', category = '') {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('expenses');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
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
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return formatPaginatedResponse(data, totalItems, page, pageSize);
  } catch (error) {
    console.error('getExpenses Error:', error)
    return { success: false, error: error.message }
  }
}
