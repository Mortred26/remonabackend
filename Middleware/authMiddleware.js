const jwt = require('jsonwebtoken');
const { Admin } = require('../models/admin');

module.exports = async function (req, res, next) {
  const accessToken = req.header('x-auth-token');
  if (!accessToken) return res.status(401).send('Access denied. No token provided or forbidden.');

  try {    // Verify the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_PRIVATE_KEY);
    const admin = await Admin.findById(decoded._id);
    if (!admin || decoded.role !== 'admin') {
      throw new Error('Invalid token.');
    }

    req.user = admin; // Attach the admin object to the request
    next(); // Pass control to the next middleware function
  } catch (ex) {
    console.error('Token verification error:', ex); // Log the error for debugging

    // Handle specific errors
    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send('Access token expired. Please log in again.');
    } else if (ex.name === 'JsonWebTokenError' || ex.message === 'Invalid token.') {
      return res.status(400).send('Invalid token or forbidden.');
    } else {
      return res.status(500).send('Internal server error: ' + ex.message); // Return the actual error message
    }
  }
};

