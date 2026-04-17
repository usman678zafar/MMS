'use server'
import { connectDB } from '@/lib/mongoose'
import mongoose from 'mongoose'
import { getPaginationParams, formatPaginatedResponse, PAGINATION_DEFAULTS } from '@/lib/pagination'
import { serializeDocument, serializeDocuments } from '@/lib/serialization'

export async function addStudent(studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('students');
    
    const data = {
      ...studentData,
      monthly_fee: studentData.monthly_fee ? parseFloat(studentData.monthly_fee) : 0,
      admission_date: studentData.admission_date ? new Date(studentData.admission_date) : null,
      teacher_id: studentData.teacher_id ? new mongoose.Types.ObjectId(studentData.teacher_id) : null,
      fee_status: studentData.fee_status || 'Unpaid',
      current_progress: {
        type: studentData.progress_type || 'Qaida',
        para: studentData.progress_para ? parseInt(studentData.progress_para) : 1,
        surah: studentData.progress_surah || '',
        last_updated: new Date()
      },
      created_at: new Date()
    };
    
    const result = await collection.insertOne(data);
    const sId = result.insertedId;

    // 2. Add initial history record
    const history = db.collection('studentprogresses');
    await history.insertOne({
      student_id: sId,
      teacher_id: data.teacher_id,
      type: data.current_progress.type,
      para: data.current_progress.para,
      surah: data.current_progress.surah,
      notes: 'Initial enrollment progress',
      date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    return { success: true, data: serializeDocument({ ...data, id: sId.toString() }) }
  } catch (error) {
    console.error('addStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudent(id, studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('students');
    
    const updateData = {
      ...studentData,
      monthly_fee: studentData.monthly_fee ? parseFloat(studentData.monthly_fee) : 0,
      admission_date: studentData.admission_date ? new Date(studentData.admission_date) : null,
      updated_at: new Date()
    };

    if (studentData.teacher_id) {
      updateData.teacher_id = new mongoose.Types.ObjectId(studentData.teacher_id);
    }
    
    const result = await collection.updateOne(
      { _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id },
      { $set: updateData }
    );
    return { success: true, data: serializeDocument(updateData) }
  } catch (error) {
    console.error('updateStudent Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getStudents(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = '', status = '') {
  try {
    await connectDB();
    const db = mongoose.connection.db;
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
    
    // Get paginated data with teacher join
    const { skip, limit } = getPaginationParams(page, pageSize);
    
    const data = await collection.aggregate([
      { $match: query },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'staff',
          localField: 'teacher_id',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $addFields: {
          teacher_name: { $arrayElemAt: ['$teacher.name', 0] },
          id: { $toString: '$_id' }
        }
      },
      { $project: { teacher: 0 } }
    ]).toArray();
    
    return formatPaginatedResponse(serializeDocuments(data), totalItems, page, pageSize);
  } catch (error) {
    console.error('getStudents Error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
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
    const db = mongoose.connection.db;
    const collection = db.collection('students');
    
    await collection.deleteOne({ _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id });
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateStudentProgress(studentId, progressData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection('students');
    const history = db.collection('studentprogresses'); // Mongoose pluralizes by default
    
    const sId = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
    
    // 1. Update current progress on student record
    const updateResult = await students.updateOne(
      { _id: sId },
      { 
        $set: { 
          current_progress: {
            ...progressData,
            para: parseInt(progressData.para),
            last_updated: new Date()
          },
          updated_at: new Date()
        } 
      }
    );

    // 2. Record in history
    if (updateResult.modifiedCount > 0) {
      const student = await students.findOne({ _id: sId });
      await history.insertOne({
        student_id: sId,
        teacher_id: student.teacher_id,
        type: progressData.type,
        para: parseInt(progressData.para),
        surah: progressData.surah,
        notes: progressData.notes,
        date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return { success: true }
  } catch (error) {
    console.error('updateStudentProgress Error:', error);
    return { success: false, error: error.message }
  }
}

export async function updateFeeStatus(id, fee_status) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('students');
    
    await collection.updateOne(
      { _id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id },
      { $set: { fee_status, updated_at: new Date() } }
    );
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getStudentProgressHistory(studentId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('studentprogresses');
    
    const history = await collection.find({ 
      student_id: typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId 
    }).sort({ date: -1 }).toArray();
    
    return { 
      success: true, 
      data: serializeDocuments(history)
    };
  } catch (error) {
    console.error('getStudentProgressHistory Error:', error)
    return { success: false, error: error.message }
  }
}
