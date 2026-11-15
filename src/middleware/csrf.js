'use strict';

const crypto = require('crypto');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function adminCsrf(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  const submitted = req.body && req.body._csrf;
  const expected = req.session.csrfToken;
  if (!submitted || !expected || !safeEqual(submitted, expected)) {
    const error = new Error(
      'The form token is missing or expired. Reload the page and try again.'
    );
    error.status = 403;
    return next(error);
  }
  return next();
}

module.exports = { adminCsrf, verifyCsrf, safeEqual };
