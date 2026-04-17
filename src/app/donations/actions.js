'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2";
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination';
import { serializeDocument, serializeDocuments } from '@/lib/serialization'

export async function uploadReceipt(formData) {
  try {
    const file = formData.get('file');
    if (!file) throw new Error("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `receipts/${Date.now()}.${fileExt}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('uploadReceipt Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addDonation(donationData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donations');
    
    const data = {
      ...donationData,
      amount: donationData.amount ? parseFloat(donationData.amount) : 0,
      date: donationData.date ? new Date(donationData.date) : null,
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    return { success: true, data: serializeDocument(data) }
  } catch (error) {
    console.error('addDonation Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateDonation(id, donationData) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donations');
    
    const data = {
      ...donationData,
      amount: donationData.amount ? parseFloat(donationData.amount) : undefined,
      date: donationData.date ? new Date(donationData.date) : undefined,
      updated_at: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id },
      { $set: data }
    );
    return { success: true, data: serializeDocument(data) }
  } catch (error) {
    console.error('updateDonation Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteDonation(id) {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donations');
    
    await collection.deleteOne({ _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getDonations(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', type = '') {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donations');
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { 'donors.name': { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    // Get total count
    const totalItems = await collection.countDocuments(query);
    
    // Get paginated data with donor lookup
    const { skip, limit } = getPaginationParams(page, pageSize);
    const data = await collection.aggregate([
      { $match: query },
      { $lookup: {
        from: 'donors',
        localField: 'donor_id',
        foreignField: '_id',
        as: 'donors'
      }},
      { $unwind: {
        path: '$donors',
        preserveNullAndEmptyArrays: true
      }},
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]).toArray();
    
    return formatPaginatedResponse(serializeDocuments(data), totalItems, page, pageSize);
  } catch (error) {
    console.error('getDonations Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getDonors() {
  try {
    await connectDB();
    const db = mongoose.connection.getClient().db();
    const collection = db.collection('donors');
    
    const data = await collection.find({}).project({ _id: 1, name: 1 }).toArray();
    
    // Use the serialization utility
    const { serializeDocuments } = await import('@/lib/serialization');
    const serializedData = serializeDocuments(data).map(item => ({
      id: item.id,
      name: item.name
    }));
    
    return { success: true, data: serializeDocuments(data) }
  } catch (error) {
    console.error('getDonors Error:', error)
    return { success: false, error: error.message }
  }
}
