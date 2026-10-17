const env = require('./config/env');
env.validate();
const { connectDb, disconnectDb } = require('./db/connect');
const app = require('./app');

(async () => {
  await connectDb();
  console.log('MongoDB connected');
  const server = app.listen(env.port, () => console.log(`RestoFlow API listening on :${env.port} (${env.nodeEnv})`));
  const shutdown = () => server.close(() => disconnectDb().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
})().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
