const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Admin, validateAdmin } = require('../models/admin');
const authMiddleware = require('../Middleware/authMiddleware'); // Ensure you have this middleware for protected routes

// GET: Fetch all admin users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password'); // Exclude password field
    res.send(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).send('Error fetching admins.');
  }
});

// GET: Fetch a specific admin user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password'); // Exclude password field
    if (!admin) return res.status(404).send('Admin not found.');
    res.send(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).send('Error fetching admin.');
  }
});

// PUT: Update an admin user's details
router.put('/:id', authMiddleware, async (req, res) => {
  const { error } = validateAdmin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).send('Admin not found.');

    admin.name = req.body.name;
    admin.email = req.body.email;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(req.body.password, salt);
    }

    await admin.save();
    res.send({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).send('Error updating admin.');
  }
});

// DELETE: Delete an admin user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).send('Admin not found.');

    await admin.remove();
    res.send({ message: 'Admin deleted successfully.' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).send('Error deleting admin.');
  }
});

module.exports = router;
