'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'

export async function getUsers(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', role = '') {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    // Get total count
    const totalItems = await collection.countDocuments(query);
    
    // Get paginated data
    const { skip, limit } = getPaginationParams(page, pageSize);
    const users = await collection.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Remove password field before serialization
    const sanitizedUsers = users.map(user => ({
      ...user,
      password: undefined // Don't send password to client
    }));
    
    return formatPaginatedResponse(sanitizedUsers, totalItems, page, pageSize);
  } catch (error) {
    console.error('getUsers Error:', error)
    return { success: false, error: error.message }
  }
}

export async function addUser(userData) {
  try {
    const { name, email, role, password } = userData
    await connectDB();
    
    // Check if user already exists
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('users');
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = new User({
      name,
      email,
      role: role || 'super_admin',
      password: hashedPassword
    });
    
    await user.save();
    
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
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('users');
    const existingUser = await collection.findOne({ _id: userId });

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if email is being changed and if new email already exists
    if (email !== existingUser.email) {
      const emailExists = await collection.findOne({ email });

      if (emailExists) {
        return { success: false, error: 'User with this email already exists' }
      }
    }

    const updateData = {
      name,
      email,
      role,
      updated_at: new Date()
    }

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10)
    }

    await collection.updateOne(
      { _id: userId },
      { $set: updateData }
    );

    const user = await collection.findOne({ _id: userId });

    return { success: true, user }
  } catch (error) {
    console.error('updateUser Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteUser(userId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Check if user exists
    const existingUser = await collection.findOne({ _id: userId });

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    await collection.deleteOne({ _id: userId });

    return { success: true }
  } catch (error) {
    console.error('deleteUser Error:', error)
    return { success: false, error: error.message }
  }
}

export async function toggleUserStatus(userId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Check if user exists
    const existingUser = await collection.findOne({ _id: userId });

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    await collection.updateOne(
      { _id: userId },
      { $set: { is_active: !existingUser.is_active, updated_at: new Date() } }
    );

    const user = await collection.findOne({ _id: userId });
    return { success: true, user }
  } catch (error) {
    console.error('toggleUserStatus Error:', error)
    return { success: false, error: error.message }
  }
}
