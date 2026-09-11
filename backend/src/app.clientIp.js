const net = require('net');

function normalizeIp(value) {
  if (typeof value !== 'string' || value.trim() === '') return 'unknown';
  const ip = value.trim();
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function getSubmissionIp(req) {
  return normalizeIp(req?.ip || req?.socket?.remoteAddress);
}

function isSafeTrustProxyEntry(value) {
  if (['loopback', 'linklocal', 'uniquelocal'].includes(value)) return true;
  if (value === '0.0.0.0/0' || value === '::/0') return false;
  const [address, prefix] = value.split('/');
  if (!net.isIP(address)) return false;
  if (prefix === undefined) return true;
  const number = Number(prefix);
  return Number.isInteger(number) && number >= 0 && number <= (net.isIP(address) === 4 ? 32 : 128);
}

function configureTrustProxy(app, rawValue = process.env.TRUST_PROXY) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') return false;
  if (rawValue.trim().toLowerCase() === 'false') return false;
  const entries = rawValue.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0 || !entries.every(isSafeTrustProxyEntry)) {
    throw new Error('TRUST_PROXY must contain only explicit IPs, CIDRs, or loopback/linklocal/uniquelocal');
  }
  app.set('trust proxy', entries.length === 1 ? entries[0] : entries);
  return true;
}

module.exports = { configureTrustProxy, getSubmissionIp, normalizeIp };
