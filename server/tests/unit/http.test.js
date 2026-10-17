// Runs without a database: covers validation, auth guard, 404 and error format.
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../../src/app');

describe('HTTP basics (no DB needed)', () => {
  test('health reports degraded when DB is down', async () => {
    const r = await request(app).get('/api/health'); expect(r.status).toBe(503); expect(r.body.db).toBe('down');
  });
  test('protected routes return 401 in the standard error shape', async () => {
    const r = await request(app).get('/api/orders');
    expect(r.status).toBe(401); expect(r.body.error.code).toBe('UNAUTHORIZED');
  });
  test('garbage bearer token -> 401', async () => {
    const r = await request(app).get('/api/menu').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401); expect(r.body.error.code).toBe('INVALID_TOKEN');
  });
  test('login validation -> 400 with details', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'nope' });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('VALIDATION_ERROR'); expect(r.body.error.details.length).toBeGreaterThan(0);
  });
  test('unknown route -> 404', async () => {
    const r = await request(app).get('/api/nothing'); expect(r.status).toBe(404); expect(r.body.error.code).toBe('NOT_FOUND');
  });
  test('malformed JSON -> 400', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('BAD_JSON');
  });
});
