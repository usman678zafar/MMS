// Simple script to create super admin user
// Run this in your browser console or as a server action

const createSuperAdmin = async () => {
  try {
    const response = await fetch('/api/users/create-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'usman@gmail.com', // Update with your email
        name: 'Usman Zafar', // Update with your name
        role: 'super_admin'
      })
    });

    if (response.ok) {
      console.log('Super admin created successfully!');
      console.log('Please refresh the page to see changes.');
    } else {
      console.error('Failed to create super admin:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Auto-run
createSuperAdmin();
