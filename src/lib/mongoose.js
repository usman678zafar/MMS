import mongoose from 'mongoose';

<<<<<<< HEAD
const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.warn('DATABASE_URL environment variable not found. MongoDB connection will not be available.');
}

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('Cannot connect to MongoDB: DATABASE_URL environment variable is not set');
    return;
  }
  
=======
export async function connectDB() {
  const MONGODB_URI = process.env.DATABASE_URL;

  if (!MONGODB_URI) {
    console.error('❌ Error: DATABASE_URL is not defined in environment variables.');
    return;
  }

>>>>>>> dev
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
<<<<<<< HEAD
    console.error('MongoDB connection error:', error);
    process.exit(1);
=======
    console.error('❌ MongoDB connection error:', error);
>>>>>>> dev
  }
}

export default mongoose;
