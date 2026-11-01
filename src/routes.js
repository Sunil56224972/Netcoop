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

  // GET or POST /api/netcoop/probe-live — actively measure real host, CPU, RAM & network telemetry
  const handleLiveProbe = async (req, res) => {
    try {
      const data = await probeLiveTelemetry({
        samples: Number(req.query.samples || (req.body && req.body.samples) || 6),
        intervalMs: Number(req.query.interval || (req.body && req.body.interval) || 150)
      });
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
