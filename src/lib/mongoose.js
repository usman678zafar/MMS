import mongoose from 'mongoose';

export async function connectDB() {
  const MONGODB_URI = process.env.DATABASE_URL;

  if (!MONGODB_URI) {
    console.error('❌ Error: DATABASE_URL is not defined in environment variables.');
    return;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

export default mongoose;
