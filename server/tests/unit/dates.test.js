const { dayBounds, todayStr, offsetString } = require('../../src/lib/dates');
test('IST day bounds', () => {
  const { start, end } = dayBounds('2026-10-14', 330);
  expect(start.toISOString()).toBe('2026-10-13T18:30:00.000Z'); expect(end - start).toBe(86400000);
});
test('todayStr uses offset', () => { expect(todayStr(330, new Date('2026-10-14T19:00:00Z'))).toBe('2026-10-15'); });
test('offset string', () => { expect(offsetString(330)).toBe('+0530'); expect(offsetString(-300)).toBe('-0500'); });
