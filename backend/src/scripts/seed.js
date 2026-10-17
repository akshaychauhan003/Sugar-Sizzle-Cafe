/**
 * Backend Seed Script Adapter
 * Delegates execution to the unified master database seeder in database/seeds/seed.js.
 */
const { runSeed } = require('../../../database/seeds/seed');

runSeed().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
