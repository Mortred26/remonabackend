const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Admin } = require('../models/admin');

module.exports = async function(req, res, next) {
  const refreshToken = req.header('x-refresh-token');
  if (!refreshToken) return res.status(401).send('Access denied. No refresh token provided.');

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
    
    // Check if the decoded token is for a user or an admin
    let user = await User.findById(decoded._id);
    if (!user) {
      user = await Admin.findById(decoded._id);
    }

    if (!user) {
      throw new Error('Invalid refresh token.');
    }

    req.user = user; // Attach the user or admin object to the request
    next(); // Pass control to the next middleware function
  } catch (ex) {
    console.error('Token verification error:', ex);

    // Handle specific errors
    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send('Refresh token expired. Please log in again.');
    } else if (ex.name === 'JsonWebTokenError' || ex.message === 'Invalid token.') {
      return res.status(400).send('Invalid refresh token.');
    } else {
      return res.status(500).send('Internal server error: ' + ex.message);
    }
  }
};
