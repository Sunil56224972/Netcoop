'use strict';

// NetCoop AI: Hardened Standalone Web Application Server.
// Multi-Agent Network Fault Diagnosis and Interoperability System.

try { require('dotenv').config({ quiet: true }); } catch (_e) {}
const path = require('path');
const express = require('express');
const netcoopRoutes = require('./src/routes');
const { redactSecrets } = require('./src/groq');

const PORT = Number(process.env.NETCOOP_PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://m8ven.ai https://img.shields.io",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const app = express();
app.disable('x-powered-by');
app.set('etag', false);

// Apply defense-in-depth HTTP security headers and cache controls on every response
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Middleware — bounded payload size (2 MB) for JSON, URL-encoded forms, and raw CSV/TSV/NDJSON
app.use(express.json({ limit: '2mb' }));
app.use(express.text({
  type: ['text/*', 'application/csv', 'application/vnd.ms-excel', 'application/x-ndjson'],
  limit: '2mb'
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Mount NetCoop API routes
const router = netcoopRoutes({});
app.use('/api/netcoop', router);
app.use('/api', router);

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), {
    etag: false,
    lastModified: false
  });
});

// Global Express error sanitizer — never expose internal stack traces or secrets
app.use((err, _req, res, _next) => {
  const status = err && (err.status || err.statusCode) ? Number(err.status || err.statusCode) : 400;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const msg = status === 413
    ? 'Request payload exceeds 2 MB limit.'
    : redactSecrets((err && err.message) || 'Invalid request');
  res.status(safeStatus).json({ error: msg });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log('\n=============================================================');
    console.log('   NetCoop AI — Multi-Agent Network Fault Diagnosis');
    console.log(`   Running at:  http://localhost:${PORT}`);
    console.log('=============================================================');
    console.log('  Target Network : Enterprise & Campus Facilities');
    console.log('  Agents Active  : 6 Specialized Diagnostic Agents');
    console.log('  Security Mode  : CSP + SSRF/DNS-Rebind Guard + Rate Limited');
    console.log('  Protocol       : JSON-RPC v1.0.0 Interoperable Bus\n');
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
