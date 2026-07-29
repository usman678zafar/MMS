// Direct MongoDB approach to create super admin
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    if (process.env.ADMIN_PASSWORD.length < 8) {
      throw new Error('ADMIN_PASSWORD must contain at least 8 characters');
    }
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    
    const user = {
      email,
      name: 'Muhammad Usman',
      role: 'super_admin',
      password: hashedPassword,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email: user.email });
    
    if (existingUser) {
      // Update to super admin
      await usersCollection.updateOne(
        { email: user.email },
        {
          $set: {
            role: 'super_admin',
            password: hashedPassword,
            is_active: true,
            updated_at: new Date()
          }
        }
      );
      console.log('✅ User updated to Super Admin!');
    } else {
      // Create new user
      await usersCollection.insertOne(user);
      console.log('✅ Super Admin created!');
    }
    
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🔑 Role:', user.role);
    console.log('\n🔄 Please refresh your browser to see changes.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

createSuperAdmin();
