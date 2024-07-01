const jwt = require('jsonwebtoken');
const { Admin } = require('../models/admin');
const { User } = require('../models/user');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Access denied. No token provided or forbidden.');
  }

  const accessToken = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_PRIVATE_KEY);
    let user;
    
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded._id);
    } else {
      user = await User.findById(decoded._id);
    }

    if (!user) {
      throw new Error('Invalid token.');
    }

    req.user = user;
    next();
  } catch (ex) {
    console.error('Token verification error:', ex);
    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send('Access token expired. Please log in again.');
    } else if (ex.name === 'JsonWebTokenError' || ex.message === 'Invalid token.') {
      return res.status(401).send('Invalid token or forbidden.');
    } else {
      return res.status(500).send('Internal server error: ' + ex.message);
    }
  }
};
