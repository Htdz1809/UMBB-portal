'use strict';

const config = require('../config');

function notFound(req, res) {
  res.status(404).render('error', {
    pageTitle: 'Page not found',
    statusCode: 404,
    message: 'The page you requested does not exist.',
    detail: null,
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number(error.status) || 500;
  if (status >= 500) {
    console.error('[http]', error.stack || error.message);
  }

  const message =
    status >= 500
      ? 'An unexpected error occurred. Please try again later.'
      : error.message || 'The request could not be completed.';

  return res.status(status).render('error', {
    pageTitle: status === 403 ? 'Access denied' : 'Something went wrong',
    statusCode: status,
    message,
    detail: config.isProduction ? null : error.stack,
  });
}

module.exports = { notFound, errorHandler };
