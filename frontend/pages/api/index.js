const mongoose = require('mongoose');
const env = require('../../server/config/env');
const { connectDb } = require('../../server/db/connect');
const app = require('../../server/app');

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  try {
    if (mongoose.connection.readyState !== 1 && env.mongoUri) {
      env.validate();
      await connectDb();
    }
  } catch (err) {
    console.error('MongoDB connection error in API route:', err);
    return res.status(500).json({ error: 'Database connection failed', message: err.message });
  }

  return app(req, res);
}
