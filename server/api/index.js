const mongoose = require('mongoose');
const env = require('../src/config/env');
const { connectDb } = require('../src/db/connect');
const app = require('../src/app');

/**
 * Serverless entrypoint for Vercel deployment.
 * Ensures the MongoDB connection pool is active before dispatching to Express.
 */
module.exports = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      env.validate();
      await connectDb();
    }
  } catch (err) {
    console.error('MongoDB connection failed on Vercel:', err.message);
    return res.status(500).json({
      error: 'Database connection failed',
      message: err.message,
    });
  }

  return app(req, res);
};
