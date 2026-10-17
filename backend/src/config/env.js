require('dotenv').config();
const isTest = process.env.NODE_ENV === 'test';
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || (isTest ? 'mongodb://127.0.0.1:27017/restoflow_test' : ''),
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-secret-test-secret-test-secret-123' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  defaultTaxRate: Number(process.env.DEFAULT_TAX_RATE ?? 5),
  staffMaxDiscountPercent: Number(process.env.STAFF_MAX_DISCOUNT_PERCENT ?? 10),
  tzOffsetMinutes: Number(process.env.REPORT_TZ_OFFSET_MINUTES ?? 330),
};
env.validate = () => {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is required');
  if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET is required (min 32 chars)');
  if (problems.length) throw new Error('Invalid configuration: ' + problems.join('; '));
};
module.exports = env;
