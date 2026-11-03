'use strict';

// NetCoop AI: Express router for the multi-agent network fault diagnosis API.
// Handles arbitrary external telemetry (JSON/NDJSON/CSV), live network probing, and scenarios.

const express = require('express');
const { diagnose, generateScenario, listScenarios, PROTOCOL, SCORING, ROLES } = require('./orchestrator');
const { probeLiveTelemetry } = require('./probe');

module.exports = function netcoopRoutes(ctx = {}) {
  const router = express.Router();
  const auth = ctx && ctx.store ? ctx.store.auth : null;
  const protect = auth && auth.protect ? auth.protect() : (req, res, next) => next();

  // POST /api/netcoop/diagnose — run a full cooperative diagnosis on any telemetry
  router.post('/diagnose', protect, async (req, res) => {
    try {
      const input = req.body.telemetry || req.body;
      const result = await diagnose(input, { runId: req.body.run_id });
      res.json(result);
    } catch (err) {
      console.error('[NetCoop] diagnose error:', err);
      res.status(400).json({ error: err.message || 'Diagnosis failed' });
    }
  });

  // GET or POST /api/netcoop/probe-live — actively measure real host, CPU, RAM, DNS & TCP RTT telemetry
  const handleLiveProbe = async (req, res) => {
    try {
      const targets = (req.body && req.body.targets) || req.query.targets || null;
      const runDiag = Boolean((req.body && req.body.diagnose) || req.query.diagnose === '1' || req.query.diagnose === 'true');
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
        || req.ip
        || (req.socket && req.socket.remoteAddress)
        || '127.0.0.1';
      const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(String(req.headers['x-vercel-ip-city'])) : null;
      const country = req.headers['x-vercel-ip-country'] ? String(req.headers['x-vercel-ip-country']) : null;
      const edgeRegion = req.headers['x-vercel-id'] ? String(req.headers['x-vercel-id']).split('::')[0] : null;
      const browserMetrics = (req.body && req.body.client_edge && typeof req.body.client_edge === 'object')
        ? req.body.client_edge
        : {};

      const clientEdge = {
        client_ip: String(clientIp).replace(/^::ffff:/, ''),
        location: [city, country].filter(Boolean).join(', ') || null,
        edge_region: edgeRegion || null,
        http_rtt_ms: typeof browserMetrics.http_rtt_ms === 'number' ? browserMetrics.http_rtt_ms : null,
        http_jitter_ms: typeof browserMetrics.http_jitter_ms === 'number' ? browserMetrics.http_jitter_ms : null,
        downlink_mbps: typeof browserMetrics.downlink_mbps === 'number' ? browserMetrics.downlink_mbps : null,
        effective_type: browserMetrics.effective_type || null
      };

      const data = await probeLiveTelemetry({
        samples: Number(req.query.samples || (req.body && req.body.samples) || 5),
        intervalMs: Number(req.query.interval || (req.body && req.body.interval) || 50),
        targets,
        clientEdge
      });
      if (runDiag) {
        const diagnosis = await diagnose(data);
        return res.json({ ok: true, telemetry: data, diagnosis });
      }
      res.json({ ok: true, telemetry: data });
    } catch (err) {
      console.error('[NetCoop] probe-live error:', err);
      res.status(500).json({ error: err.message || 'Live probe failed' });
    }
  };
  router.get('/probe-live', protect, handleLiveProbe);
  router.post('/probe-live', protect, handleLiveProbe);

  // GET /api/netcoop/protocol — return the agent protocol documentation
  router.get('/protocol', protect, (req, res) => {
    res.json({ protocol: PROTOCOL, scoring: SCORING, roles: ROLES });
  });

  // GET /api/netcoop/scenarios — list available test scenarios
  router.get('/scenarios', protect, (req, res) => {
    res.json({ scenarios: listScenarios() });
  });

  // GET or POST /api/netcoop/scenarios/:key — generate telemetry for a scenario
  const handleScenarioGen = (req, res) => {
    try {
      const data = generateScenario(req.params.key);
      res.json({ scenario: req.params.key, telemetry: data });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  router.get('/scenarios/:key', protect, handleScenarioGen);
  router.post('/scenarios/:key', protect, handleScenarioGen);

  return router;
};
