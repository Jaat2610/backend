const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

async function seedUser() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/junior-soccer-tool', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);

    // Check if admin user exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('   Username: admin');
      console.log('   Password: password123');
    }
    
    // Create a coach user too
    const existingCoach = await User.findOne({ username: 'coach' });
    
    if (!existingCoach) {
      const coachUser = new User({
        username: 'coach',
        password: 'coach123',
        email: 'coach@example.com',
        firstName: 'John',
        lastName: 'Coach',
        role: 'coach'
      });
      
      await coachUser.save();
      console.log('✅ Coach user created successfully');
      console.log('   Username: coach');
      console.log('   Password: coach123');
    }

  } catch (error) {
    console.error('Error seeding user:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    console.log('🎉 User seeding complete!');
  }
}

// Run the seed function
seedUser().catch(console.error);
