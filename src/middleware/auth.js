'use strict';

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }
  return res.redirect('/admin/login');
}

module.exports = { requireAuth };
