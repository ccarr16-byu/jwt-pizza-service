const logger = require('./logger');

class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => {
    const logData = {
      auth: !!req.headers.authorization,
      path: req.originalUrl,
      method: req.method,
      status: err.statusCode || 500,
      error: err.message,
      stack: err.stack,
      req: JSON.stringify(req.body ?? {}),
    };

    const level = logger.statusToLogLevel(logData.status);

    logger.log(level, 'error', logData);

    next(err);
  });
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};
