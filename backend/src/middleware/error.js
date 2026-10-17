const { ZodError } = require('zod');
const env = require('../config/env');
const { AppError } = require('../lib/errors');

const body = (code, message, details) => ({ error: { code, message, ...(details ? { details } : {}) } });

const notFoundHandler = (req, res) => res.status(404).json(body('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) return res.status(err.status).json(body(err.code, err.message, err.details));
  if (err instanceof ZodError) {
    return res.status(400).json(body('VALIDATION_ERROR', 'Request validation failed',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
  }
  if (err.name === 'CastError') return res.status(400).json(body('BAD_REQUEST', `Invalid value for '${err.path}'`));
  if (err.name === 'ValidationError') return res.status(400).json(body('VALIDATION_ERROR', err.message));
  if (err.code === 11000) return res.status(409).json(body('DUPLICATE', 'A record with this value already exists', err.keyValue));
  if (err.type === 'entity.parse.failed') return res.status(400).json(body('BAD_JSON', 'Malformed JSON body'));
  if (err.type === 'entity.too.large') return res.status(413).json(body('PAYLOAD_TOO_LARGE', 'Request body too large'));
  console.error('[unhandled]', err);
  return res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong', env.isProd ? undefined : [{ message: err.message }]));
};
module.exports = { notFoundHandler, errorHandler };
