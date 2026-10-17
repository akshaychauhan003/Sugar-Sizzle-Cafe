// All arithmetic is done in integer minor units (paise/cents) to avoid float drift.
const toMinor = (amount) => Math.round(Number(amount) * 100);
const fromMinor = (minor) => minor / 100;
const roundPct = (baseMinor, percent) => Math.round((baseMinor * percent) / 100);
module.exports = { toMinor, fromMinor, roundPct };
