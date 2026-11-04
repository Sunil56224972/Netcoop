'use strict';

// NetCoop AI: Standalone Web Application Server.
// Multi-Agent Network Fault Diagnosis and Interoperability System.
// Grand Finale Hackathon Solution — IIT Bhubaneswar Campus Infrastructure.

try { require('dotenv').config(); } catch (_e) {}
const path = require('path');
const express = require('express');
const netcoopRoutes = require('./src/routes');

const PORT = Number(process.env.NETCOOP_PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.set('etag', false);

// Middleware — support JSON, URL-encoded forms, and direct raw CSV / TSV / NDJSON payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.text({
  type: ['text/*', 'application/csv', 'application/vnd.ms-excel', 'application/x-ndjson'],
  limit: '10mb'
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent stale 304 Not Modified on Vercel serverless (which sets static 2018 mtime)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Mount NetCoop API routes
const router = netcoopRoutes({});
app.use('/api/netcoop', router);
app.use('/api', router); // Convenient alias

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

// SPA fallback
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'), {
    etag: false,
    lastModified: false
  });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log('\n=============================================================');
    console.log('   NetCoop AI — Multi-Agent Network Fault Diagnosis');
    console.log(`   Running at:  http://localhost:${PORT}`);
    console.log('=============================================================');
    console.log('  Target Network : IIT Bhubaneswar Campus Facilities');
    console.log('  Agents Active  : 5 Specialized Diagnostic Agents + Groq LLM Agent');
    console.log('  Groq AI Model  : openai/gpt-oss-120b (Groq LPUs)');
    console.log('  Protocol       : JSON-RPC v1.0.0 Interoperable Bus');
    console.log('  Status         : Ready for live telemetry analysis\n');
  });

  const shutdown = () => {
    console.log('\nShutting down NetCoop AI server...');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
