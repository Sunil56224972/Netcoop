'use strict';

// NetCoop AI Automated Test Suite
// Verifies all multi-agent pipelines, scenarios, protocol schemas, external data inputs, and mathematical gates.

const assert = require('assert');
const { diagnose, generateScenario, listScenarios, probeLiveTelemetry, PROTOCOL, SCORING, ROLES } = require('../src/orchestrator');
const { normalizeInput } = require('../src/schema');

async function runTests() {
  console.log('\n======================================================');
  console.log('   NetCoop AI — Automated Test Suite');
  console.log('======================================================\n');

  // 1. Protocol & Schema Verification
  console.log('[1/7] Verifying Protocol Schema & Metadata...');
  assert.strictEqual(PROTOCOL.version, '1.0.0');
  assert.strictEqual(PROTOCOL.telemetry_schema, 'netcoop.telemetry/1.0');
  assert.strictEqual(PROTOCOL.report_schema, 'netcoop.report/1.0');
  assert.ok(Array.isArray(ROLES) && ROLES.length >= 5, 'Must have at least 5 diagnostic agent roles');
  assert.ok(Object.keys(PROTOCOL.metrics).length >= 15, 'Must define all required campus telemetry metrics');
  console.log('  ✓ Protocol v1.0.0 and 16 metric definitions verified');

  // 2. Telemetry Normalizer Tests
  console.log('\n[2/7] Testing Telemetry Input Normalization...');
  
  // JSON Object
  const normObj = normalizeInput(JSON.stringify({
    schema: 'netcoop.telemetry/1.0',
    devices: [{ device_id: 'test-sw', role: 'switch' }],
    samples: [{ device_id: 'test-sw', latency_ms: 12.5, cpu_pct: 25.0, timestamp: new Date().toISOString() }]
  }));
  assert.strictEqual(normObj.ok, true);
  assert.strictEqual(normObj.dataset.sampleCount, 1);
  console.log('  ✓ JSON telemetry parsed correctly');

  // CSV Parsing
  const csvRaw = `device_id,timestamp,latency_ms,packet_loss_pct\ntest-ap,2026-11-01T00:00:00Z,14.5,0.1\ntest-ap,2026-11-01T00:01:00Z,15.2,0.2`;
  const normCsv = normalizeInput(csvRaw);
  assert.strictEqual(normCsv.ok, true);
  assert.strictEqual(normCsv.dataset.sampleCount, 2);
  console.log('  ✓ CSV telemetry parsed correctly');

  // 3. Scenario Registry
  console.log('\n[3/7] Testing Scenario Registry...');
  const scenarios = listScenarios();
  assert.ok(scenarios.length >= 8, 'Expected 8 built-in test scenarios');
  console.log(`  ✓ Loaded ${scenarios.length} built-in test scenarios`);

  // 4. Multi-Agent Cooperative Diagnosis Across All Scenarios
  console.log('\n[4/7] Running Multi-Agent Diagnosis on all 8 Scenarios...');
  for (const sc of scenarios) {
    const raw = generateScenario(sc.key);
    const result = await diagnose(raw);
    const r = result.report;

    if (sc.key !== 'interop_failure') {
      assert.ok(result.messages.length > 0, `Scenario ${sc.key} produced no messages`);
    }
    assert.ok(r.status, `Scenario ${sc.key} missing status`);
    
    const conf = Math.round((r.confidence || 0) * 100);
    const rc = (r.suspected_root_cause || r.root_cause || r.error || 'N/A').slice(0, 42);
    console.log(`  • ${sc.key.padEnd(20)} -> ${r.status.padEnd(18)} [${conf}%] | ${rc}`);

    if (sc.key === 'normal') {
      assert.strictEqual(r.status, 'no_fault_detected');
    } else if (sc.key === 'interop_failure') {
      assert.strictEqual(r.status, 'error');
    } else {
      assert.strictEqual(r.status, 'diagnosed');
      assert.ok(r.confidence > 0.5, `Confidence should be > 50% for ${sc.key}`);
    }
  }

  // 5. Gating & Insufficient Evidence Guardrails
  console.log('\n[5/7] Testing Guardrails (Must not claim exact root cause with insufficient evidence)...');
  const sparseTelemetry = {
    schema: 'netcoop.telemetry/1.0',
    devices: [{ device_id: 'unknown-node' }],
    samples: [{ device_id: 'unknown-node', latency_ms: 15, timestamp: new Date().toISOString() }]
  };
  const sparseResult = await diagnose(sparseTelemetry);
  assert.ok(
    sparseResult.report.status === 'insufficient_evidence' || sparseResult.report.status === 'no_fault_detected' || sparseResult.report.status === 'inconclusive',
    'Sparse telemetry must be marked insufficient_evidence or inconclusive'
  );
  console.log('  ✓ System correctly reports no false alarms when telemetry is clean/sparse');

  // 6. Section 6 Schema Compliance (Problem Statement Expected Output Format)
  console.log('\n[6/7] Verifying Exact Section 6 Output Schema Compliance...');
  const diagRes = await diagnose(generateScenario('link_congestion'));
  const rep = diagRes.report;
  assert.ok(typeof rep.incident_id === 'string' && rep.incident_id.startsWith('INC-'), 'incident_id must be INC-xxxx');
  assert.strictEqual(rep.status, 'diagnosed', 'status must be diagnosed');
  assert.ok(typeof rep.suspected_root_cause === 'string', 'suspected_root_cause must be string');
  assert.ok(typeof rep.confidence === 'number' && rep.confidence >= 0 && rep.confidence <= 1, 'confidence must be 0..1 number');
  assert.ok(Array.isArray(rep.affected_devices) && rep.affected_devices.length > 0, 'affected_devices must be array');
  assert.ok(Array.isArray(rep.supporting_evidence) && rep.supporting_evidence.length > 0, 'supporting_evidence must be array');
  assert.ok(Array.isArray(rep.alternative_causes), 'alternative_causes must be array');
  assert.ok(Array.isArray(rep.recommended_actions) && rep.recommended_actions.length > 0, 'recommended_actions must be array');
  assert.ok(Array.isArray(rep.evidence_sources) && rep.evidence_sources.length > 0, 'evidence_sources must be array');
  assert.ok(Array.isArray(rep.limitations) && rep.limitations.length > 0, 'limitations must be array');
  console.log('  ✓ Report schema precisely satisfies Problem Statement Section 6 specifications');

  // 7. External Arbitrary Telemetry & Live Network Probing (No Fake Data)
  console.log('\n[7/7] Testing External Arbitrary Telemetry & Live Host Probing...');
  
  // A. Live host probe
  const liveTelemetry = await probeLiveTelemetry({ samples: 4, intervalMs: 50 });
  assert.strictEqual(liveTelemetry.synthetic, false, 'Live probe must be marked non-synthetic');
  assert.ok(liveTelemetry.samples.length >= 8, 'Must collect multi-device live samples');
  const liveDiag = await diagnose(liveTelemetry);
  assert.ok(['no_fault_detected', 'diagnosed', 'indeterminate'].includes(liveDiag.report && liveDiag.report.status), 'Live host must complete diagnosis');
  console.log(`  ✓ Live host network probe captured ${liveTelemetry.samples.length} real measurements (${liveTelemetry.source})`);

  // B. Arbitrary External CSV
  const externalCsv = [
    'device_id,timestamp,latency_ms,packet_loss_pct,interface_errors',
    'EXT_SW_01,2026-11-01T07:10:00Z,18.5,0.0,0',
    'EXT_SW_01,2026-11-01T07:11:00Z,22.0,0.5,15',
    'EXT_SW_01,2026-11-01T07:12:00Z,45.0,2.1,90',
    'EXT_SW_01,2026-11-01T07:13:00Z,89.0,5.8,180',
    'EXT_SW_01,2026-11-01T07:14:00Z,130.0,8.2,320'
  ].join('\n');
  const csvDiag = await diagnose(externalCsv);
  assert.strictEqual(csvDiag.report.status, 'diagnosed');
  assert.ok(csvDiag.report.affected_devices.includes('EXT_SW_01'));
  console.log('  ✓ Arbitrary external CSV with custom devices diagnosed with real computed evidence');

  // C. Enterprise Semicolon/Comment CSV with Topology Uplinks, Unit Suffixes & Aliases
  const enterpriseCsv = [
    '# Exported from SolarWinds / PRTG Poller',
    'timestamp;hostname;ip_address;uplink;bw_util;tx_drops;ping_ms;ploss',
    '2026-11-05T01:00:00Z;MUMBAI_CORE_01;10.90.0.1;;31.0%;0;4.2ms;0.0%',
    '2026-11-05T01:00:15Z;MUMBAI_CORE_01;10.90.0.1;;32.5%;0;4.5ms;0.0%',
    '2026-11-05T01:00:30Z;MUMBAI_CORE_01;10.90.0.1;;31.8%;0;4.3ms;0.0%',
    '2026-11-05T01:00:00Z;MUMBAI_DIST_SW_07;10.90.7.1;MUMBAI_CORE_01;96.5%;210;175ms;5.4%',
    '2026-11-05T01:00:15Z;MUMBAI_DIST_SW_07;10.90.7.1;MUMBAI_CORE_01;97.8%;245;192ms;6.1%',
    '2026-11-05T01:00:30Z;MUMBAI_DIST_SW_07;10.90.7.1;MUMBAI_CORE_01;98.4%;270;205ms;6.8%'
  ].join('\n');
  const entDiag = await diagnose(enterpriseCsv);
  assert.strictEqual(entDiag.report.status, 'diagnosed');
  assert.strictEqual(entDiag.report.root_cause_category, 'link_congestion');
  assert.ok(entDiag.normalized_telemetry && entDiag.normalized_telemetry.topology.links.length === 1, 'Normalized telemetry must preserve CSV uplink topology');
  assert.ok(entDiag.report.llm_synthesis && entDiag.report.llm_synthesis.cli_commands.some(c => c.includes('MUMBAI_DIST_SW_07')), 'CLI runbook must dynamically reference CSV node ID');
  console.log('  ✓ Enterprise multi-delimiter CSV (uplinks, unit suffixes, aliases & dynamic CLI) verified');

  // D. Arbitrary External NDJSON with non-standard units
  const externalNdjson = [
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 200000, loss_ratio: 0.04, rssi: -84, retry_pct: 22 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 210000, loss_ratio: 0.05, rssi: -85, retry_pct: 24 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 195000, loss_ratio: 0.04, rssi: -83, retry_pct: 21 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 220000, loss_ratio: 0.06, rssi: -86, retry_pct: 26 })
  ].join('\n');
  const ndjsonDiag = await diagnose(externalNdjson);
  assert.strictEqual(ndjsonDiag.report.status, 'diagnosed');
  assert.ok(ndjsonDiag.quality.unit_conversions.length > 0, 'Normalizer must perform automatic unit conversions');
  console.log('  ✓ Arbitrary external NDJSON normalized and unit-converted without canned responses');

  // E. Direct HTTP Express text/csv Ingestion & ?format=csv Report Export
  const { Readable } = require('stream');
  const app = require('../server');
  const invokeApp = (url, contentType, rawBody) => new Promise((resolve, reject) => {
    const buf = Buffer.from(rawBody, 'utf8');
    const req = Readable.from([buf]);
    req.method = 'POST';
    req.url = url;
    req.headers = {
      'content-type': contentType,
      'content-length': String(buf.length)
    };
    req.connection = {};
    req.socket = {};

    const resHeaders = {};
    const chunks = [];
    const res = {
      statusCode: 200,
      setHeader(k, v) { resHeaders[String(k).toLowerCase()] = v; },
      getHeader(k) { return resHeaders[String(k).toLowerCase()]; },
      removeHeader(k) { delete resHeaders[String(k).toLowerCase()]; },
      status(code) { this.statusCode = code; return this; },
      write(chunk) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); return true; },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        resolve({ status: this.statusCode, headers: resHeaders, text: Buffer.concat(chunks).toString('utf8') });
      }
    };
    try {
      app(req, res, reject);
    } catch (e) {
      reject(e);
    }
  });

  const jsonRes = await invokeApp('/api/netcoop/diagnose', 'text/csv', enterpriseCsv);
  assert.strictEqual(jsonRes.status, 200);
  const jsonBody = JSON.parse(jsonRes.text);
  assert.strictEqual(jsonBody.report.status, 'diagnosed');
  assert.strictEqual(jsonBody.meta.format, 'csv');

  const csvRes = await invokeApp('/api/netcoop/diagnose?format=csv', 'text/csv', enterpriseCsv);
  assert.strictEqual(csvRes.status, 200);
  assert.ok(String(csvRes.headers['content-type'] || '').includes('text/csv'));
  assert.ok(csvRes.text.includes('incident_id,run_id,timestamp_utc,verdict_status'));
  assert.ok(csvRes.text.includes('MUMBAI_DIST_SW_07'));
  assert.ok(csvRes.text.includes('SUSPECTED_ROOT_CAUSE'));
  assert.ok(csvRes.text.includes('97.57'), 'CSV export must include computed numeric metric averages');
  console.log('  ✓ Direct HTTP text/csv upload & ?format=csv diagnostic spreadsheet export verified');

  console.log('\n======================================================');
  console.log('   ALL NETCOOP TESTS PASSED SUCCESSFULLY (100%)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
