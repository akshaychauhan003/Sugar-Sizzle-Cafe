class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
module.exports = {
  AppError,
  badRequest: (m, d, c = 'BAD_REQUEST') => new AppError(400, c, m, d),
  unauthorized: (m = 'Authentication required', c = 'UNAUTHORIZED') => new AppError(401, c, m),
  forbidden: (m = 'You do not have permission to do this', c = 'FORBIDDEN') => new AppError(403, c, m),
  notFound: (m = 'Resource not found', c = 'NOT_FOUND') => new AppError(404, c, m),
  conflict: (m, c = 'CONFLICT', d) => new AppError(409, c, m, d),
};
