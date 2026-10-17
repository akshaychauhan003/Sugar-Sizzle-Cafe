const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const reportService = require('../services/reportService');
const { z } = require('zod');

router.use(authenticate);

const historyQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/export.csv', validate({ query: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  const { password, ...query } = req.query;
  const headerPassword = req.headers['x-report-password'] || req.headers['x-manager-password'];
  const passToVerify = password || headerPassword;
  if (passToVerify) {
    const valid = await reportService.verifyPassword(req.user, passToVerify);
    if (!valid) {
      const { unauthorized } = require('../lib/errors');
      throw unauthorized('Invalid password verification for sales report download', 'INVALID_PASSWORD');
    }
  }
  const csv = await reportService.exportDailyCsv(query);
  const date = query.date || (query.startDate ? `${query.startDate}_to_${query.endDate || query.startDate}` : 'today');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${date}.csv"`);
  res.send(csv);
}));

router.post('/export.csv', validate({ body: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  const { password, ...body } = req.body;
  const headerPassword = req.headers['x-report-password'] || req.headers['x-manager-password'];
  const passToVerify = password || headerPassword;
  if (passToVerify) {
    const valid = await reportService.verifyPassword(req.user, passToVerify);
    if (!valid) {
      const { unauthorized } = require('../lib/errors');
      throw unauthorized('Invalid password verification for sales report download', 'INVALID_PASSWORD');
    }
  }
  const csv = await reportService.exportDailyCsv(body);
  const date = body.date || (body.startDate ? `${body.startDate}_to_${body.endDate || body.startDate}` : 'today');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${date}.csv"`);
  res.send(csv);
}));


router.get('/daily-sales', validate({ query: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  res.json({ report: await reportService.dailySales(req.query) });
}));

router.get('/summary', validate({ query: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  const report = await reportService.salesSummary(req.query);
  res.json({
    summary: {
      date: report.date,
      netSales: report.netSales,
      totalOrders: report.totalOrders,
      completedOrders: report.completedOrders,
      activeOrders: report.activeOrders,
      averageOrderValue: report.averageOrderValue,
      taxCollected: report.taxCollected,
      discountsGiven: report.discountsGiven,
      byStatus: report.byStatus,
    },
  });
}));

router.get('/payment-breakdown', validate({ query: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  res.json({ report: await reportService.paymentBreakdown(req.query) });
}));

router.get('/dine-in-vs-takeaway', validate({ query: S.dailySalesQuery }), asyncHandler(async (req, res) => {
  res.json({ report: await reportService.dineInVsTakeaway(req.query) });
}));

router.get('/completed', validate({ query: historyQuery }), asyncHandler(async (req, res) => {
  res.json(await reportService.completedHistory(req.query));
}));

router.get('/audit', requireAnyRole('admin', 'shift_manager'), validate({ query: S.auditQuery }), asyncHandler(async (req, res) => {
  res.json(await reportService.listAudit(req.query));
}));

module.exports = router;
