const express = require('express');
const request = require('supertest');
const { configureTrustProxy, getSubmissionIp } = require('../src/app.clientIp');

function ipApp(trustProxy) {
  const app = express();
  if (trustProxy !== undefined) configureTrustProxy(app, trustProxy);
  app.get('/ip', (req, res) => res.json({ ip: getSubmissionIp(req) }));
  return app;
}

describe('submission IP resolution', () => {
  it('uses the direct backend connection address when no proxy header exists', async () => {
    const response = await request(ipApp()).get('/ip');
    expect(response.body.ip).toBe('127.0.0.1');
  });

  it('does not trust X-Forwarded-For by default', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.25');

    expect(response.body.ip).toBe('127.0.0.1');
    expect(response.body.ip).not.toBe('203.0.113.25');
  });

  it('uses X-Forwarded-For only behind an explicitly trusted proxy', async () => {
    const response = await request(ipApp('loopback'))
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.25');

    expect(response.body.ip).toBe('203.0.113.25');
  });

  it('rejects unsafe global trust-proxy values', () => {
    expect(() => configureTrustProxy(express(), 'true')).toThrow(/explicit IPs/);
    expect(() => configureTrustProxy(express(), '*')).toThrow(/explicit IPs/);
    expect(() => configureTrustProxy(express(), '0.0.0.0/0')).toThrow(/explicit IPs/);
  });
});
