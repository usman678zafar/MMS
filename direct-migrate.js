// Direct MongoDB approach to create super admin
const { MongoClient } = require('mongodb');

async function createSuperAdmin() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const user = {
      email: 'usman@gmail.com',
      name: 'Muhammad Usman',
      role: 'super_admin',
      password: '$2a$10$placeholder', // Will be set via login
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
        { $set: { role: 'super_admin', updated_at: new Date() } }
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
