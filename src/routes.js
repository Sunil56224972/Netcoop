'use strict';

// NetCoop AI: Express router for the multi-agent network fault diagnosis API.
// Handles arbitrary external telemetry (JSON/NDJSON/CSV/TSV), live network probing,
// scenarios, and direct RFC-4180 CSV diagnostic report streaming (?format=csv).

const express = require('express');
const { diagnose, generateScenario, listScenarios, PROTOCOL, SCORING, ROLES } = require('./orchestrator');
const { probeLiveTelemetry } = require('./probe');

function csvEsc(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function avgNums(arr) {
  const valid = arr.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!valid.length) return '';
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
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
    const metricVals = (mKey) => devSamples.map((s) => (s.metrics ? s.metrics[mKey] : undefined));
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
  const accept = String(req.headers.accept || '').toLowerCase();
  return accept.includes('text/csv') && !accept.includes('text/html');
}

module.exports = function netcoopRoutes(ctx = {}) {
  const router = express.Router();
  router.use(express.text({
    type: ['text/*', 'application/csv', 'application/vnd.ms-excel', 'application/x-ndjson'],
    limit: '10mb'
  }));

  const auth = ctx && ctx.store ? ctx.store.auth : null;
  const protect = auth && auth.protect ? auth.protect() : (req, res, next) => next();

  // POST /api/netcoop/diagnose — run a full cooperative diagnosis on JSON, CSV, TSV, or NDJSON
  router.post('/diagnose', protect, async (req, res) => {
    try {
      let input = req.body;
      let runId;
      if (Buffer.isBuffer(req.body)) {
        input = req.body.toString('utf8');
      } else if (typeof req.body === 'string') {
        input = req.body;
      } else if (req.body && typeof req.body === 'object') {
        input = req.body.telemetry !== undefined ? req.body.telemetry : req.body;
        runId = req.body.run_id;
      }

      const result = await diagnose(input, { runId: runId || req.query.run_id });
      if (wantsCsvResponse(req)) {
        const inc = ((result.report && result.report.incident_id) || 'netcoop-report').toLowerCase();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${inc}-diagnostic-result.csv"`);
        return res.send(formatDiagnosisAsCsv(result));
      }
      res.json(result);
    } catch (err) {
      console.error('[NetCoop] diagnose error:', err);
      res.status(400).json({ error: err.message || 'Diagnosis failed' });
    }
  });

  // GET or POST /api/netcoop/probe-live — actively measure real host, CPU, RAM, DNS & TCP RTT telemetry
  const handleLiveProbe = async (req, res) => {
    try {
      const targets = (req.body && typeof req.body === 'object' && req.body.targets) || req.query.targets || null;
      const csvRequested = wantsCsvResponse(req);
      const runDiag = csvRequested || Boolean(
        (req.body && typeof req.body === 'object' && req.body.diagnose)
        || req.query.diagnose === '1'
        || req.query.diagnose === 'true'
      );
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
        || req.ip
        || (req.socket && req.socket.remoteAddress)
        || '127.0.0.1';
      const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(String(req.headers['x-vercel-ip-city'])) : null;
      const country = req.headers['x-vercel-ip-country'] ? String(req.headers['x-vercel-ip-country']) : null;
      const edgeRegion = req.headers['x-vercel-id'] ? String(req.headers['x-vercel-id']).split('::')[0] : null;
      const browserMetrics = (req.body && typeof req.body === 'object' && req.body.client_edge && typeof req.body.client_edge === 'object')
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
        if (csvRequested) {
          const inc = ((diagnosis.report && diagnosis.report.incident_id) || 'netcoop-live-probe').toLowerCase();
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${inc}-live-probe.csv"`);
          return res.send(formatDiagnosisAsCsv(diagnosis));
        }
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
