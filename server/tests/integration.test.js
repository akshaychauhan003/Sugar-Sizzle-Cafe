// Needs a real MongoDB. Run with:  MONGODB_URI_TEST=mongodb://127.0.0.1:27017/restoflow_test npm test
// Skipped automatically when MONGODB_URI_TEST is not set.
process.env.NODE_ENV = 'test';
const uri = process.env.MONGODB_URI_TEST;
const d = uri ? describe : describe.skip;
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

d('API integration', () => {
  jest.setTimeout(30000);
  let app, admin, staff, pizza, soldOut;
  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;

  beforeAll(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.dropDatabase();
    app = require('../src/app');

    const User = require('../src/models/User');
    await User.create([
      { name: 'A', email: 'a@t.test', role: 'admin', passwordHash: await bcrypt.hash('Admin@12345', 4) },
      { name: 'S', email: 's@t.test', role: 'staff', passwordHash: await bcrypt.hash('Staff@12345', 4) },
    ]);
    admin = await login('a@t.test', 'Admin@12345'); staff = await login('s@t.test', 'Staff@12345');
  });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  test('bad login -> 401, good login -> token', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'a@t.test', password: 'wrong' })).status).toBe(401);
    expect(admin).toBeTruthy();
  });

  test('staff cannot create menu items; admin can', async () => {
    const body = { name: 'Margherita', category: 'Pizzas', price: 100 };
    expect((await request(app).post('/api/menu').set(auth(staff)).send(body)).status).toBe(403);
    const r = await request(app).post('/api/menu').set(auth(admin)).send(body);
    expect(r.status).toBe(201); pizza = r.body.item;
    soldOut = (await request(app).post('/api/menu').set(auth(admin)).send({ name: 'Gone', category: 'Pizzas', price: 5, isAvailable: false })).body.item;
  });

  test('server computes totals and ignores client-sent price/total', async () => {
    const r = await request(app).post('/api/orders').set(auth(staff))
      .send({ type: 'dine-in', tableNumber: 'T-1', total: 1, items: [{ menuItemId: pizza.id, quantity: 2, price: 0.01 }] });
    expect(r.status).toBe(201);
    expect(r.body.order.subtotal).toBe(200); expect(r.body.order.taxAmount).toBe(10); expect(r.body.order.total).toBe(210);
    expect(r.body.order.orderNumber).toMatch(/^ORD-\d{8}-0001$/);
  });

  test('unavailable item cannot be ordered', async () => {
    const r = await request(app).post('/api/orders').set(auth(staff)).send({ type: 'takeaway', items: [{ menuItemId: soldOut.id, quantity: 1 }] });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('ITEM_UNAVAILABLE');
  });

  test('staff discount above limit rejected', async () => {
    const r = await request(app).post('/api/orders').set(auth(staff)).send({ type: 'takeaway', discount: { type: 'percent', value: 50 }, items: [{ menuItemId: pizza.id, quantity: 1 }] });
    expect(r.status).toBe(403); expect(r.body.error.code).toBe('DISCOUNT_LIMIT_EXCEEDED');
  });

  test('workflow, payment rules and idempotency', async () => {
    const o = (await request(app).post('/api/orders').set(auth(staff)).send({ type: 'takeaway', items: [{ menuItemId: pizza.id, quantity: 1 }] })).body.order;
    const st = (status) => request(app).patch(`/api/orders/${o.id}/status`).set(auth(staff)).send({ status });
    expect((await st('ready')).status).toBe(409);                 // skipping preparing
    expect((await st('preparing')).status).toBe(200);
    expect((await st('ready')).status).toBe(200);
    const early = await st('completed'); expect(early.status).toBe(409); expect(early.body.error.code).toBe('PAYMENT_REQUIRED');

    const pay = (b) => request(app).post(`/api/orders/${o.id}/payment`).set(auth(staff)).send(b);
    expect((await pay({ method: 'cash', amount: 500 })).body.error.code).toBe('OVERPAYMENT');
    const p1 = await pay({ method: 'upi', amount: 50, idempotencyKey: 'key-12345678' });
    expect(p1.status).toBe(201); expect(p1.body.order.paymentStatus).toBe('partial');
    const replay = await pay({ method: 'upi', amount: 50, idempotencyKey: 'key-12345678' });
    expect(replay.status).toBe(200); expect(replay.body.order.payments).toHaveLength(1);
    const p2 = await pay({ method: 'cash' });                    // defaults to remaining balance
    expect(p2.body.order.paymentStatus).toBe('paid'); expect(p2.body.order.balanceDue).toBe(0);
    expect((await pay({ method: 'cash' })).body.error.code).toBe('ALREADY_PAID');
    expect((await st('completed')).status).toBe(200);
  });

  test('menu price change does not rewrite order history', async () => {
    const o = (await request(app).post('/api/orders').set(auth(staff)).send({ type: 'takeaway', items: [{ menuItemId: pizza.id, quantity: 1 }] })).body.order;
    await request(app).put(`/api/menu/${pizza.id}`).set(auth(admin)).send({ price: 999 });
    const again = (await request(app).get(`/api/orders/${o.id}`).set(auth(staff))).body.order;
    expect(again.items[0].unitPrice).toBe(100);
  });

  test('daily sales report reflects paid orders', async () => {
    const r = await request(app).get('/api/reports/daily-sales').set(auth(staff));
    expect(r.status).toBe(200); expect(r.body.report.completedOrders).toBe(1); expect(r.body.report.netSales).toBe(105);
  });

  test('stock status, image, history, payments, refunds, shifts and range reports', async () => {
    // 1. Stock status update
    const ss = await request(app).patch(`/api/menu/${pizza.id}/stock-status`).set(auth(admin)).send({ stockStatus: 'low_stock', inventoryQuantity: 15 });
    expect(ss.status).toBe(200);
    expect(ss.body.item.stockStatus).toBe('low_stock');
    expect(ss.body.item.inventoryQuantity).toBe(15);

    // 2. Image URL update
    const img = await request(app).post(`/api/menu/${pizza.id}/image`).set(auth(admin)).send({ imageUrl: 'https://example.com/pizza.jpg' });
    expect(img.status).toBe(200);
    expect(img.body.item.imageUrl).toBe('https://example.com/pizza.jpg');

    // 3. Create paid order for testing order history, payments, and refund
    const ordRes = await request(app).post('/api/orders').set(auth(staff)).send({ type: 'takeaway', items: [{ menuItemId: pizza.id, quantity: 1 }] });
    expect(ordRes.status).toBe(201);
    const ord = ordRes.body.order;
    const pRes = await request(app).post(`/api/orders/${ord.id}/payment`).set(auth(staff)).send({ method: 'cash' });
    expect(pRes.status).toBe(201);

    // 4. Retrieve order status history
    const hist = await request(app).get(`/api/orders/${ord.id}/history`).set(auth(staff));
    expect(hist.status).toBe(200);
    expect(hist.body.history.length).toBeGreaterThan(0);

    // 5. Retrieve order payments
    const pays = await request(app).get(`/api/orders/${ord.id}/payments`).set(auth(staff));
    expect(pays.status).toBe(200);
    expect(pays.body.data.length).toBeGreaterThan(0);

    // 6. Authorized refund
    const ref = await request(app).post(`/api/orders/${ord.id}/refund`).set(auth(admin)).send({ amount: 50, reason: 'Customer requested discount post-facto' });
    if (ref.status !== 200) console.error('REFUND ERROR:', ref.body);
    expect(ref.status).toBe(200);
    expect(ref.body.order.amountPaid).toBeLessThan(ord.total);

    // 7. Shifts list and history
    const shifts = await request(app).get('/api/shifts').set(auth(staff));
    expect(shifts.status).toBe(200);

    // 8. Date range report
    const rangeRep = await request(app).get('/api/reports/daily-sales?startDate=2026-01-01&endDate=2026-12-31').set(auth(staff));
    expect(rangeRep.status).toBe(200);
    expect(rangeRep.body.report.netSales).toBeGreaterThanOrEqual(0);
  });

  test('once confirmed, user cannot confirm the same order again (ORDER_ALREADY_CONFIRMED)', async () => {
    // 1. Create a fresh order in pending state
    const createRes = await request(app)
      .post('/api/orders')
      .set(auth(staff))
      .send({ type: 'takeaway', items: [{ menuItemId: pizza.id, quantity: 1 }] });
    expect(createRes.status).toBe(201);
    const order = createRes.body.order;
    expect(order.status).toBe('pending');
    expect(order.isConfirmed).toBe(false);

    // 2. Confirm the order for the first time
    const confRes = await request(app)
      .post(`/api/orders/${order.id}/confirm`)
      .set(auth(staff))
      .send({ note: 'Order confirmed and fired to kitchen' });
    expect(confRes.status).toBe(200);
    expect(confRes.body.order.status).toBe('preparing');
    expect(confRes.body.order.isConfirmed).toBe(true);

    // 3. Attempting to confirm the exact SAME order via /confirm must be rejected
    const reConfirmRes = await request(app)
      .post(`/api/orders/${order.id}/confirm`)
      .set(auth(staff))
      .send();
    expect(reConfirmRes.status).toBe(409);
    expect(reConfirmRes.body.error.code).toBe('ORDER_ALREADY_CONFIRMED');
    expect(reConfirmRes.body.error.message).toMatch(/already been confirmed/i);

    // 4. Attempting to confirm the exact SAME order via /status { status: 'preparing' } must also be rejected
    const patchRes = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set(auth(staff))
      .send({ status: 'preparing' });
    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error.code).toBe('ORDER_ALREADY_CONFIRMED');
    expect(patchRes.body.error.message).toMatch(/already been confirmed/i);

    // 5. Concurrent double-confirmation race condition check:
    const raceOrder = (await request(app)
      .post('/api/orders')
      .set(auth(staff))
      .send({ type: 'takeaway', items: [{ menuItemId: pizza.id, quantity: 1 }] })).body.order;

    const [req1, req2] = await Promise.all([
      request(app).post(`/api/orders/${raceOrder.id}/confirm`).set(auth(staff)),
      request(app).post(`/api/orders/${raceOrder.id}/confirm`).set(auth(staff)),
    ]);

    const statuses = [req1.status, req2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const conflictReq = req1.status === 409 ? req1 : req2;
    expect(conflictReq.body.error.code).toBe('ORDER_ALREADY_CONFIRMED');
  });

  test('stock validation, deduction on order, and restoration on sales return', async () => {
    // 1. Create a tracked stock menu item with 5 units
    const burgerRes = await request(app)
      .post('/api/menu')
      .set(auth(admin))
      .send({
        name: 'Tracked Burger',
        category: 'Main Course',
        price: 50,
        inventoryQuantity: 5,
        stockStatus: 'in_stock',
      });
    expect(burgerRes.status).toBe(201);
    const burgerId = burgerRes.body.item.id;

    // 2. Ordering more than available stock should fail with INSUFFICIENT_STOCK
    const failOrder = await request(app)
      .post('/api/orders')
      .set(auth(staff))
      .send({ type: 'takeaway', items: [{ menuItemId: burgerId, quantity: 10 }] });
    expect(failOrder.status).toBe(400);
    expect(failOrder.body.error.code).toBe('INSUFFICIENT_STOCK');

    // 3. Ordering 3 units succeeds and reduces stock from 5 to 2
    const orderRes = await request(app)
      .post('/api/orders')
      .set(auth(staff))
      .send({ type: 'takeaway', items: [{ menuItemId: burgerId, quantity: 3 }] });
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.order;

    const checkItem = (await request(app).get(`/api/menu/${burgerId}`)).body.item;
    expect(checkItem.inventoryQuantity).toBe(2);

    // Pay for the order
    const payRes = await request(app)
      .post(`/api/orders/${order.id}/payment`)
      .set(auth(staff))
      .send({ method: 'cash' });
    expect(payRes.status).toBe(201);

    // 4. Sales Return workflow: return 2 burgers with restock: true
    const returnRes = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .set(auth(staff))
      .send({
        reason: 'Customer returned 2 burgers',
        restock: true,
        items: [{ menuItemId: burgerId, quantity: 2, restock: true }],
      });
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.salesReturn).toBeTruthy();
    expect(returnRes.body.salesReturn.returnNumber).toMatch(/^RET-/);
    expect(returnRes.body.restoredStock).toHaveLength(1);
    expect(returnRes.body.restoredStock[0].quantityRestored).toBe(2);

    // Verify stock is restored from 2 to 4
    const restoredItem = (await request(app).get(`/api/menu/${burgerId}`)).body.item;
    expect(restoredItem.inventoryQuantity).toBe(4);
    expect(restoredItem.stockStatus).toBe('in_stock');
    expect(restoredItem.isAvailable).toBe(true);
  });

  test('download sales report as CSV with and without password', async () => {
    // 1. Download without password -> 200 with text/csv
    const csvRes = await request(app)
      .get('/api/reports/export.csv')
      .set(auth(admin));
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toContain('Order Number');

    // 2. Download with valid password -> 200
    const passRes = await request(app)
      .get('/api/reports/export.csv?password=Admin@12345')
      .set(auth(admin));
    expect(passRes.status).toBe(200);

    // 3. Download with wrong password -> 401 INVALID_PASSWORD
    const wrongPassRes = await request(app)
      .get('/api/reports/export.csv?password=WrongPassword')
      .set(auth(admin));
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe('INVALID_PASSWORD');
  });

  test('update password with new password and confirmation (2 times)', async () => {
    // 1. Mismatched confirmation should fail
    const mismatchRes = await request(app)
      .put('/api/auth/password')
      .set(auth(staff))
      .send({
        currentPassword: 'Staff@12345',
        newPassword: 'BrandNewPassword123',
        confirmPassword: 'MismatchPassword123',
      });
    expect(mismatchRes.status).toBe(400);

    // 2. Wrong current password should fail
    const wrongCurrentRes = await request(app)
      .put('/api/auth/password')
      .set(auth(staff))
      .send({
        currentPassword: 'WrongStaffPassword',
        newPassword: 'BrandNewPassword123',
        confirmPassword: 'BrandNewPassword123',
      });
    expect(wrongCurrentRes.status).toBe(400);
    expect(wrongCurrentRes.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    // 3. Valid update with matching confirmation
    const successRes = await request(app)
      .put('/api/auth/password')
      .set(auth(staff))
      .send({
        currentPassword: 'Staff@12345',
        newPassword: 'BrandNewPassword123',
        confirmPassword: 'BrandNewPassword123',
      });
    expect(successRes.status).toBe(200);
    expect(successRes.body.ok).toBe(true);

    // 4. Verify login succeeds with the new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 's@t.test', password: 'BrandNewPassword123' });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.token).toBeTruthy();
  });
});

