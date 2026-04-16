import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.warn('DATABASE_URL environment variable not found. MongoDB connection will not be available.');
}

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('Cannot connect to MongoDB: DATABASE_URL environment variable is not set');
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export default mongoose;
