// Middleware to check if user is authenticated admin and ensure session has admin data
const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  if (req.session && req.session.adminId) {
    // If full admin info is missing, reload from database
    if (!req.session.admin) {
      try {
        const admin = await User.findById(req.session.adminId).lean();
        if (admin) {
          req.session.admin = {
            id: admin._id,
            fullName: admin.fullName,
            username: admin.username,
            role: admin.role,
            level: admin.level,
            location: admin.location || {}
          };
        }
      } catch (err) {
        console.error('Error fetching admin in isAdmin middleware:', err);
        // allow falling through, user might not be valid
      }
    }
    return next();
  } else {
    // If AJAX or API request, send JSON error
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') > -1)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/admin/login');
  }
};

module.exports = { isAdmin };
