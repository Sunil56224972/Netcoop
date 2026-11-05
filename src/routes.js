'use strict';

// NetCoop AI: Hardened Express router for the multi-agent network fault diagnosis API.
// Includes SSRF/port error handling, per-IP sliding-window rate limiting,
// secret redaction, and CSV/Excel formula injection (DDE) protection.

const express = require('express');
const { diagnose, generateScenario, listScenarios, PROTOCOL, SCORING, ROLES } = require('./orchestrator');
const { probeLiveTelemetry, ProbeSecurityError } = require('./probe');
const { redactSecrets } = require('./groq');

/**
 * Escape CSV cell and neutralize Excel/Sheets formula injection (=, +, -, @, tab, CR)
 * while preserving genuine negative numeric readings (e.g. -82.5).
 */
function csvEsc(val) {
  if (val === null || val === undefined) return '';
  let s = String(val);
  if (/^[=+\-@\t\r]/.test(s) && !/^-\d+(?:\.\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function avgNums(arr) {
  const valid = arr.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!valid.length) return '';
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
}

function sanitizeFilenameToken(val, fallback) {
  const clean = String(val || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return clean || fallback;
}

/**
 * Lightweight in-memory sliding-window rate limiter per client IP.
 */
function createRateLimiter({ windowMs = 60000, max = 60 }) {
  const buckets = new Map();
  return (req, res, next) => {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
      || req.ip
      || (req.socket && req.socket.remoteAddress)
      || '';
    // Allow internal stream-based unit test invocations that carry no remote socket address
    if (!rawIp) return next();

    const now = Date.now();
    if (buckets.size > 2000) {
      for (const [k, v] of buckets.entries()) {
        if (now - v.start >= windowMs) buckets.delete(k);
      }
    }

    let entry = buckets.get(rawIp);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      buckets.set(rawIp, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retrySec = Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({
        error: `Rate limit exceeded. Retry in ${retrySec}s.`
      });
    }
    return next();
  };
}

function formatDiagnosisAsCsv(result) {
  const r = (result && result.report) || {};
  const norm = (result && result.normalized_telemetry) || { devices: [], samples: [] };
  const evList = r.supporting_evidence || [];
  const actions = r.recommended_actions || [];
  const primaryAction = actions[0] ? String(actions[0]) : '';
  const llm = r.llm_synthesis || result.groq || null;
  const cliLine = llm && Array.isArray(llm.cli_commands)
    ? llm.cli_commands.filter((c) => !String(c).trim().startsWith('#')).join(' ; ')
    : '';
  const impairedSet = new Set(r.affected_devices || []);
  const rootText = String(r.suspected_root_cause || '');

  const headers = [
    'incident_id', 'run_id', 'timestamp_utc', 'verdict_status', 'suspected_root_cause',
    'confidence_pct', 'confidence_band', 'device_id', 'device_type', 'ip_endpoint',
    'upstream_parent', 'node_diagnostic_state', 'samples_count', 'avg_latency_ms',
    'avg_jitter_ms', 'packet_loss_pct', 'dns_latency_ms', 'dns_failure_pct',
    'link_utilization_pct', 'queue_drops', 'interface_errors', 'wifi_signal_dbm',
    'wifi_retry_pct', 'cpu_pct', 'memory_pct', 'node_anomalous_evidence',
    'primary_recommended_action', 'cli_remediation_sequence'
  ];

  const samplesByDev = new Map();
  (norm.samples || []).forEach((s) => {
    const id = s.device_id;
    if (!id) return;
    if (!samplesByDev.has(id)) samplesByDev.set(id, []);
    samplesByDev.get(id).push(s);
  });

  const devices = (norm.devices && norm.devices.length)
    ? norm.devices
    : [...samplesByDev.keys()].map((id) => ({ id, type: 'network_node' }));

  const confPct = Math.round((r.confidence || 0) * 100);
  const rows = devices.map((d) => {
    const id = d.id || d.device_id;
    const devSamples = samplesByDev.get(id) || [];
    const metricVals = (mKey) => devSamples.map((s) => (s.metrics ? s.metrics[mKey] : s[mKey]));
    const isRoot = r.status === 'diagnosed' && rootText.includes(id);
    const isImpaired = impairedSet.has(id) || isRoot;
    const stateLabel = isRoot ? 'SUSPECTED_ROOT_CAUSE' : isImpaired ? 'IMPAIRED_DOWNSTREAM' : 'HEALTHY';
    const devEv = evList
      .filter((e) => e.device_id === id)
      .map((e) => `${e.metric}=${e.value}${e.unit || ''} (${e.level})`)
      .join(' | ');

    return [
      r.incident_id || '',
      r.run_id || '',
      r.timestamp || new Date().toISOString(),
      r.status || '',
      r.suspected_root_cause || '',
      confPct,
      r.confidence_category || '',
      id,
      d.type || 'network_node',
      d.ip || '',
      d.parent || '',
      stateLabel,
      devSamples.length,
      avgNums(metricVals('latency_ms')),
      avgNums(metricVals('jitter_ms')),
      avgNums(metricVals('packet_loss_pct')),
      avgNums(metricVals('dns_latency_ms')),
      avgNums(metricVals('dns_failure_pct')),
      avgNums(metricVals('link_utilization_pct')),
      avgNums(metricVals('queue_drops')),
      avgNums(metricVals('interface_errors')),
      avgNums(metricVals('signal_dbm')),
      avgNums(metricVals('retransmission_pct')),
      avgNums(metricVals('cpu_pct')),
      avgNums(metricVals('memory_pct')),
      devEv,
      isImpaired ? primaryAction : 'Nominal — continue baseline monitoring',
      isRoot ? cliLine : ''
    ];
  });

  return [
    headers.map(csvEsc).join(','),
    ...rows.map((row) => row.map(csvEsc).join(','))
  ].join('\n') + '\n';
}

function wantsCsvResponse(req) {
  const qFmt = String((req.query && (req.query.format || req.query.export)) || '').toLowerCase();
  if (qFmt === 'csv') return true;
  const accept = String((req.headers && req.headers.accept) || '').toLowerCase();
  return accept.includes('text/csv') && !accept.includes('text/html');
}

module.exports = function netcoopRoutes(ctx = {}) {
  const router = express.Router();
  router.use(express.text({
    type: ['text/*', 'application/csv', 'application/vnd.ms-excel', 'application/x-ndjson'],
    limit: '2mb'
  }));

  const auth = ctx && ctx.store ? ctx.store.auth : null;
  const protect = auth && auth.protect ? auth.protect() : (_req, _res, next) => next();
  const limitDiagnose = createRateLimiter({ windowMs: 60000, max: 90 });
  const limitProbe = createRateLimiter({ windowMs: 60000, max: 30 });

  // POST /api/netcoop/diagnose — run a full cooperative diagnosis on JSON, CSV, TSV, or NDJSON
  router.post('/diagnose', protect, limitDiagnose, async (req, res) => {
    try {
      let input = req.body;
      let runId;
      if (Buffer.isBuffer(req.body)) {
        input = req.body.toString('utf8');
      } else if (typeof req.body === 'string') {
        input = req.body;
      } else if (req.body && typeof req.body === 'object') {
        input = req.body.telemetry !== undefined ? req.body.telemetry : req.body;
        runId = typeof req.body.run_id === 'string' ? req.body.run_id.slice(0, 64) : undefined;
      }

      const safeQueryRunId = req.query && typeof req.query.run_id === 'string'
        ? req.query.run_id.slice(0, 64)
        : undefined;

      const result = await diagnose(input, { runId: runId || safeQueryRunId });
      if (wantsCsvResponse(req)) {
        const inc = sanitizeFilenameToken(result.report && result.report.incident_id, 'netcoop-report');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${inc}-diagnostic-result.csv"`);
        return res.send(formatDiagnosisAsCsv(result));
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: redactSecrets((err && err.message) || 'Diagnosis failed') });
    }
  });

  // GET or POST /api/netcoop/probe-live — actively measure verified public DNS & TCP RTT telemetry
  const handleLiveProbe = async (req, res) => {
    try {
      const targets = (req.body && typeof req.body === 'object' && req.body.targets) || (req.query && req.query.targets) || null;
      const csvRequested = wantsCsvResponse(req);
      const runDiag = csvRequested || Boolean(
        (req.body && typeof req.body === 'object' && req.body.diagnose)
        || (req.query && req.query.diagnose === '1')
        || (req.query && req.query.diagnose === 'true')
      );
      const forwarded = req.headers && req.headers['x-forwarded-for'];
      const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
        || req.ip
        || (req.socket && req.socket.remoteAddress)
        || '127.0.0.1';
      const city = req.headers && req.headers['x-vercel-ip-city'] ? decodeURIComponent(String(req.headers['x-vercel-ip-city'])).slice(0, 64) : null;
      const country = req.headers && req.headers['x-vercel-ip-country'] ? String(req.headers['x-vercel-ip-country']).slice(0, 8) : null;
      const edgeRegion = req.headers && req.headers['x-vercel-id'] ? String(req.headers['x-vercel-id']).split('::')[0].slice(0, 32) : null;
      const browserMetrics = (req.body && typeof req.body === 'object' && req.body.client_edge && typeof req.body.client_edge === 'object')
        ? req.body.client_edge
        : {};

      const clientEdge = {
        client_ip: String(clientIp).replace(/^::ffff:/, '').slice(0, 64),
        location: [city, country].filter(Boolean).join(', ') || null,
        edge_region: edgeRegion || null,
        http_rtt_ms: typeof browserMetrics.http_rtt_ms === 'number' && Number.isFinite(browserMetrics.http_rtt_ms) ? browserMetrics.http_rtt_ms : null,
        http_jitter_ms: typeof browserMetrics.http_jitter_ms === 'number' && Number.isFinite(browserMetrics.http_jitter_ms) ? browserMetrics.http_jitter_ms : null,
        downlink_mbps: typeof browserMetrics.downlink_mbps === 'number' && Number.isFinite(browserMetrics.downlink_mbps) ? browserMetrics.downlink_mbps : null,
        effective_type: typeof browserMetrics.effective_type === 'string' ? browserMetrics.effective_type.slice(0, 16) : null
      };

      const data = await probeLiveTelemetry({
        samples: Number((req.query && req.query.samples) || (req.body && req.body.samples) || 5),
        intervalMs: Number((req.query && req.query.interval) || (req.body && req.body.interval) || 50),
        targets,
        clientEdge
      });
      if (runDiag) {
        const diagnosis = await diagnose(data);
        if (csvRequested) {
          const inc = sanitizeFilenameToken(diagnosis.report && diagnosis.report.incident_id, 'netcoop-live-probe');
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${inc}-live-probe.csv"`);
          return res.send(formatDiagnosisAsCsv(diagnosis));
        }
        return res.json({ ok: true, telemetry: data, diagnosis });
      }
      res.json({ ok: true, telemetry: data });
    } catch (err) {
      const status = err instanceof ProbeSecurityError || (err && err.statusCode === 400) ? 400 : 500;
      res.status(status).json({
        error: redactSecrets((err && err.message) || 'Live probe failed'),
        code: (err && err.code) || undefined
      });
    }
  };
  router.get('/probe-live', protect, limitProbe, handleLiveProbe);
  router.post('/probe-live', protect, limitProbe, handleLiveProbe);

  // GET /api/netcoop/protocol — return the agent protocol documentation
  router.get('/protocol', protect, (_req, res) => {
    res.json({ protocol: PROTOCOL, scoring: SCORING, roles: ROLES });
  });

  // GET /api/netcoop/scenarios — list available test scenarios
  router.get('/scenarios', protect, (_req, res) => {
    res.json({ scenarios: listScenarios() });
  });

  // GET or POST /api/netcoop/scenarios/:key — generate telemetry for a scenario
  const handleScenarioGen = (req, res) => {
    try {
      const key = String(req.params.key || '').slice(0, 64);
      const data = generateScenario(key);
      res.json({ scenario: key, telemetry: data });
    } catch (err) {
      res.status(400).json({ error: redactSecrets((err && err.message) || 'Unknown scenario') });
    }
  };
  router.get('/scenarios/:key', protect, handleScenarioGen);
  router.post('/scenarios/:key', protect, handleScenarioGen);

  return router;
};

module.exports.csvEsc = csvEsc;
module.exports.formatDiagnosisAsCsv = formatDiagnosisAsCsv;
