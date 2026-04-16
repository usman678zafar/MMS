import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, name, role } = await request.json();
    
    await connectDB();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Update existing user to super admin
      existingUser.role = 'super_admin';
      existingUser.updated_at = new Date();
      await existingUser.save();

      return NextResponse.json({ 
        success: true, 
        message: 'User updated to Super Admin',
        user: { email, name, role: 'super_admin' }
      });
    }

    // Create new super admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = new User({
      email,
      name,
      role: role || 'super_admin',
      password: hashedPassword
    });

    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Super Admin created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Create super admin error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
