const { prisma } = require('./src/lib/prisma.js');

async function migrateUser() {
  try {
    // Your current user details - UPDATE THESE
    const currentUserEmail = 'usman@gmail.com'; // Replace with your actual email
    const currentUserName = 'Muhammad Usman'; // Replace with your actual name
    const desiredRole = 'super_admin'; // Change to 'super_admin' for full access
    
    // Check if user already exists in new table
    const existingUser = await prisma.users.findUnique({
      where: { email: currentUserEmail }
    });
    
    if (existingUser) {
      console.log('User already exists in users table');
      console.log('Current role:', existingUser.role);
      
      // Update role if needed
      if (existingUser.role !== desiredRole) {
        await prisma.users.update({
          where: { email: currentUserEmail },
          data: { role: desiredRole }
        });
        console.log(`Updated role to: ${desiredRole}`);
      }
    } else {
      // Create user in new table
      await prisma.users.create({
        data: {
          email: currentUserEmail,
          name: currentUserName,
          role: desiredRole,
          password: '$2a$10$placeholder' // You'll set this via login/update
        }
      });
      console.log('Created user in users table with role:', desiredRole);
    }
    
    console.log('Migration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUser();
