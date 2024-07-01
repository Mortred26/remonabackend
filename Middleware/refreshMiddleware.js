const jwt = require('jsonwebtoken');
const { Admin } = require('../models/admin');
const { User } = require('../models/user');

module.exports = async function(req, res, next) {
  const authHeader = req.headers['authorization'];
  const refreshToken = authHeader && authHeader.split(' ')[1]; // Bearer <refreshToken>

  if (!refreshToken) return res.status(401).send('Access denied. No refresh token provided.');

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);

    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded._id);
    } else {
      user = await User.findById(decoded._id);
    }

    if (!user || decoded.role !== user.role) {
      throw new Error('Invalid refresh token.');
    }

    req.user = user;
    next();
  } catch (ex) {
    console.error('Token verification error:', ex);

    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send('Refresh token expired. Please log in again.');
    } else if (ex.name === 'JsonWebTokenError' || ex.message === 'Invalid token.') {
      return res.status(400).send('Invalid refresh token.');
    } else {
      return res.status(500).send('Internal server error: ' + ex.message);
    }
  }
};
