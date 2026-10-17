const env = require('../config/env');
// Start/end (UTC Date) of a calendar day 'YYYY-MM-DD' in the configured reporting timezone.
function dayBounds(dateStr, offsetMin = env.tzOffsetMinutes) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - offsetMin * 60000);
  return { start, end: new Date(start.getTime() + 86400000) };
}
function todayStr(offsetMin = env.tzOffsetMinutes, now = new Date()) {
  return new Date(now.getTime() + offsetMin * 60000).toISOString().slice(0, 10);
}
function offsetString(offsetMin = env.tzOffsetMinutes) {
  const sign = offsetMin < 0 ? '-' : '+';
  const a = Math.abs(offsetMin);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}${String(a % 60).padStart(2, '0')}`;
}
function rangeBounds(startDate, endDate, offsetMin = env.tzOffsetMinutes) {
  if (!endDate) return dayBounds(startDate, offsetMin);
  const { start } = dayBounds(startDate, offsetMin);
  const { end } = dayBounds(endDate, offsetMin);
  return { start, end };
}
module.exports = { dayBounds, rangeBounds, todayStr, offsetString };
