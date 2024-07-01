const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, validateUser, validateLogin } = require('../models/user');
const { Admin, validateAdmin } = require('../models/admin');
const authMiddleware = require('../Middleware/authMiddleware'); // Import auth middleware
const refreshMiddleware = require('../Middleware/refreshMiddleware'); // Import refresh middleware

// Function to generate tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { _id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_PRIVATE_KEY,
    { expiresIn: '50m' }
  );

  const refreshToken = jwt.sign(
    { _id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_REFRESH_KEY,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// Refresh token endpoint
router.post('/refresh', refreshMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId) || await Admin.findById(userId);

    if (!user) return res.status(400).send('Invalid refresh token.');

    const { accessToken, refreshToken } = generateTokens(user);

    res.header('x-auth-token', accessToken).header('x-refresh-token', refreshToken).send({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).send('Error refreshing token.');
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  // Validate the request body
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    // Check if the user already exists
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('User already registered.');

    // Create a new user instance
    user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: 'user', // Set default role for regular users
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    // Save the user to the database
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Send tokens in response headers and user details in the body
    res.header('x-auth-token', accessToken).header('x-refresh-token', refreshToken).send({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user.');
  }
});

// Register a static admin (Example route, ensure it's protected)
router.post('/register-admin', authMiddleware, async (req, res) => {
  // Validate the request body
  const { error } = validateAdmin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    // Check if the admin already exists
    let admin = await Admin.findOne({ email: req.body.email });
    if (admin) return res.status(400).send('Admin already registered.');

    // Create a new admin instance
    admin = new Admin({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: 'admin', // Set role as admin
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);

    // Save the admin to the database
    await admin.save();

    // Generate tokens (optional for admin)
    const { accessToken, refreshToken } = generateTokens(admin);

    // Send tokens in response headers and admin details in the body
    res.header('x-auth-token', accessToken).header('x-refresh-token', refreshToken).send({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).send('Error registering admin.');
  }
});

// PATCH endpoint to update user role by admin (protected route)
router.patch('/users/:id', authMiddleware, async (req, res) => {
  const { id } = req.params; // Destructure 'id' from req.params
  const { role } = req.body; // Destructure 'role' from req.body

  try {
    // Check if the logged-in user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin rights required.');
    }

    // Find the user by userId
    let user = await User.findById(id);
    if (!user) return res.status(404).send('User not found.');

    // Update the user's role
    user.role = role;
    await user.save();

    // Create new admin if the role is changed to admin
    if (role === 'admin') {
      const admin = new Admin({
        name: user.name,
        email: user.email,
        password: user.password,
        role: 'admin',
      });

      // Save the new admin to the database
      await admin.save();

      // Delete the user from the User collection
      await User.findByIdAndDelete(id);
    }

    // Respond with updated user details
    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).send('Error updating user role.');
  }
});

// Example route protected by auth middleware for admin-only access
router.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    // Fetch all users (example)
    const users = await User.find().select('-password'); // Exclude password field

    res.send(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users.');
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    let user = await Admin.findOne({ email: req.body.email });
    let isAdmin = true;

    if (!user) {
      user = await User.findOne({ email: req.body.email });
      isAdmin = false;
    }

    if (!user) return res.status(400).send('Invalid email or password.');

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');

    const { accessToken, refreshToken } = generateTokens(user);

    res.header('x-auth-token', accessToken).header('x-refresh-token', refreshToken).send({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error during login.');
  }
});

module.exports = router;
