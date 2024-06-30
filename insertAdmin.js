const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin, validateAdmin } = require('./models/admin');

async function createStaticAdmin() {
  try {
    await mongoose.connect('mongodb+srv://IamShadow:IamShadow26@cluster0.nvrqahb.mongodb.net/furniture-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected.');

    const existingAdmin = await Admin.findOne({ email: 'IamNaruto@gmail.com' });

    if (existingAdmin) {
      console.log('Admin already exists.');
      return;
    }

    const newAdminData = {
      name: 'umar',
      email: 'IamNaruto@gmail.com',
      password: 'IamShadow26',
    };

    const { error } = validateAdmin(newAdminData); // Validate admin data
    if (error) {
      console.error('Validation error:', error.details[0].message);
      return;
    }

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    newAdminData.password = await bcrypt.hash(newAdminData.password, salt);

    const newAdmin = new Admin(newAdminData); // Use the Admin constructor

    await newAdmin.save();
    console.log('Admin created successfully.');
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    mongoose.disconnect();
  }
}

createStaticAdmin();
