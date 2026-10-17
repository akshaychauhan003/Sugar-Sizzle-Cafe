const router = require('express').Router();
const Order = require('../models/Order');
const svc = require('../services/orderService');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, badRequest } = require('../lib/errors');

router.use(authenticate);
const managerOnly = requireAnyRole('admin', 'shift_manager');
const idemKey = (req) => {
  const k = req.get('Idempotency-Key');
  if (k && (k.length < 8 || k.length > 100)) throw badRequest('Idempotency-Key must be 8-100 characters');
  return k || undefined;
};

router.post('/quote', validate({ body: S.createOrder }), asyncHandler(async (req, res) => {
  res.json({ quote: await svc.quote(req.user, req.body) });
}));

router.post('/', validate({ body: S.createOrder }), asyncHandler(async (req, res) => {
  const { order, replay } = await svc.createOrder(req.user, req.body, idemKey(req));
  res.status(replay ? 200 : 201).json({ order });
}));

router.get('/', validate({ query: S.orderQuery }), asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const filter = svc.buildListFilter(req.query);
  const [data, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/:id', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('createdBy', 'name role').populate('statusHistory.by', 'name');
  if (!order) throw notFound('Order not found');
  res.json({ order });
}));

router.get('/:id/history', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('statusHistory.by', 'name role');
  if (!order) throw notFound('Order not found');
  res.json({ history: order.statusHistory });
}));

router.get('/:id/payments', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  const payments = await svc.getOrderPayments(req.params.id);
  res.json({ data: payments, embedded: order.payments });
}));

router.patch('/:id', validate({ params: S.idParam, body: S.updateOrder }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.updateOrder(req.user, req.params.id, req.body) });
}));

router.patch('/:id/status', validate({ params: S.idParam, body: S.changeStatus }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.changeStatus(req.user, req.params.id, req.body.status, req.body.note) });
}));

router.post('/:id/confirm', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.confirmOrder(req.user, req.params.id, req.body?.note) });
}));

router.post('/:id/accept-delivery', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.acceptDelivery(req.user, req.params.id) });
}));

router.post('/:id/deliver', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.changeStatus(req.user, req.params.id, 'delivered', req.body?.note) });
}));

router.post('/:id/payment', validate({ params: S.idParam, body: S.recordPayment }), asyncHandler(async (req, res) => {
  const body = { ...req.body, idempotencyKey: req.body.idempotencyKey || idemKey(req) };
  const { order, replay } = await svc.recordPayment(req.user, req.params.id, body);
  res.status(replay ? 200 : 201).json({ order });
}));

router.post('/:id/refund', managerOnly, validate({ params: S.idParam, body: S.refundOrder }), asyncHandler(async (req, res) => {
  res.json({ order: await svc.refundOrder(req.user, req.params.id, req.body) });
}));

router.post('/:id/return', validate({ params: S.idParam, body: S.salesReturn }), asyncHandler(async (req, res) => {
  const result = await svc.processSalesReturn(req.user, req.params.id, req.body);
  res.json(result);
}));

router.post('/:id/sales-return', validate({ params: S.idParam, body: S.salesReturn }), asyncHandler(async (req, res) => {
  const result = await svc.processSalesReturn(req.user, req.params.id, req.body);
  res.json(result);
}));

module.exports = router;

