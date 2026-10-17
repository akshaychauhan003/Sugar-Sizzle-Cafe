const mongoose = require('mongoose');
const env = require('../config/env');

let connecting;

async function connectDb(uri = env.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;
  mongoose.set('strictQuery', true);
  connecting = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  }).then(() => {
    connecting = null;
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err.message);
    });
    return mongoose.connection;
  }).catch((err) => {
    connecting = null;
    throw err;
  });
  return connecting;
}

async function disconnectDb() {
  connecting = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
