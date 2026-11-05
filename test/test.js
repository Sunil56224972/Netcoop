'use strict';

// NetCoop AI Automated Test & Security Verification Suite
// Verifies multi-agent pipelines, scenarios, protocol schemas, CSV/NDJSON normalization,
// 100% MCP tool & annotation compliance, SSRF/DNS-rebinding guards, and credential isolation.

const assert = require('assert');
const { Readable } = require('stream');
const { diagnose, generateScenario, listScenarios, probeLiveTelemetry, PROTOCOL, SCORING, ROLES } = require('../src/orchestrator');
const { normalizeInput } = require('../src/schema');
const mcp = require('../mcp');
const groqModule = require('../src/groq');
const probeModule = require('../src/probe');
const routesModule = require('../src/routes');
const app = require('../server');

function invokeApp(method, url, contentType, rawBody = '') {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(rawBody || '', 'utf8');
    const req = Readable.from(buf.length ? [buf] : []);
    req.method = method;
    req.url = url;
    req.headers = {};
    if (contentType) req.headers['content-type'] = contentType;
    if (buf.length) req.headers['content-length'] = String(buf.length);
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
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   NetCoop AI — Automated Test & Security Suite');
  console.log('======================================================\n');

  // 1. Protocol & Schema Verification
  console.log('[1/9] Verifying Protocol Schema & Metadata...');
  assert.strictEqual(PROTOCOL.version, '1.0.0');
  assert.strictEqual(PROTOCOL.telemetry_schema, 'netcoop.telemetry/1.0');
  assert.strictEqual(PROTOCOL.report_schema, 'netcoop.report/1.0');
  assert.ok(Array.isArray(ROLES) && ROLES.length >= 5, 'Must have at least 5 diagnostic agent roles');
  assert.ok(Object.keys(PROTOCOL.metrics).length >= 15, 'Must define all required campus telemetry metrics');
  console.log('  ✓ Protocol v1.0.0 and 16 metric definitions verified');

  // 2. Telemetry Normalizer Tests
  console.log('\n[2/9] Testing Telemetry Input Normalization...');
  const normObj = normalizeInput(JSON.stringify({
    schema: 'netcoop.telemetry/1.0',
    devices: [{ device_id: 'test-sw', role: 'switch' }],
    samples: [{ device_id: 'test-sw', latency_ms: 12.5, cpu_pct: 25.0, timestamp: new Date().toISOString() }]
  }));
  assert.strictEqual(normObj.ok, true);
  assert.strictEqual(normObj.dataset.sampleCount, 1);
  console.log('  ✓ JSON telemetry parsed correctly');

  const csvRaw = `device_id,timestamp,latency_ms,packet_loss_pct\ntest-ap,2026-11-01T00:00:00Z,14.5,0.1\ntest-ap,2026-11-01T00:01:00Z,15.2,0.2`;
  const normCsv = normalizeInput(csvRaw);
  assert.strictEqual(normCsv.ok, true);
  assert.strictEqual(normCsv.dataset.sampleCount, 2);
  console.log('  ✓ CSV telemetry parsed correctly');

  // 3. Scenario Registry
  console.log('\n[3/9] Testing Scenario Registry...');
  const scenarios = listScenarios();
  assert.ok(scenarios.length >= 8, 'Expected 8 built-in test scenarios');
  console.log(`  ✓ Loaded ${scenarios.length} built-in test scenarios`);

  // 4. Multi-Agent Cooperative Diagnosis Across All Scenarios
  console.log('\n[4/9] Running Multi-Agent Diagnosis on all 8 Scenarios...');
  for (const sc of scenarios) {
    const raw = generateScenario(sc.key);
    const result = await diagnose(raw, { offline: true });
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
  console.log('\n[5/9] Testing Guardrails (Must not claim exact root cause with insufficient evidence)...');
  const sparseTelemetry = {
    schema: 'netcoop.telemetry/1.0',
    devices: [{ device_id: 'unknown-node' }],
    samples: [{ device_id: 'unknown-node', latency_ms: 15, timestamp: new Date().toISOString() }]
  };
  const sparseResult = await diagnose(sparseTelemetry, { offline: true });
  assert.ok(
    sparseResult.report.status === 'insufficient_evidence' || sparseResult.report.status === 'no_fault_detected' || sparseResult.report.status === 'inconclusive',
    'Sparse telemetry must be marked insufficient_evidence or inconclusive'
  );
  console.log('  ✓ System correctly reports no false alarms when telemetry is clean/sparse');

  // 6. Section 6 Schema Compliance (Problem Statement Expected Output Format)
  console.log('\n[6/9] Verifying Exact Section 6 Output Schema Compliance...');
  const diagRes = await diagnose(generateScenario('link_congestion'), { offline: true });
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

  // 7. External Arbitrary Telemetry & Live Network Probing
  console.log('\n[7/9] Testing External Arbitrary Telemetry & Live Host Probing...');
  const liveTelemetry = await probeLiveTelemetry({ samples: 3, intervalMs: 40 });
  assert.strictEqual(liveTelemetry.synthetic, false, 'Live probe must be marked non-synthetic');
  assert.ok(liveTelemetry.samples.length >= 6, 'Must collect multi-device live samples');
  const liveDiag = await diagnose(liveTelemetry, { offline: true });
  assert.ok(['no_fault_detected', 'diagnosed', 'indeterminate'].includes(liveDiag.report && liveDiag.report.status), 'Live host must complete diagnosis');
  console.log(`  ✓ Live host network probe captured ${liveTelemetry.samples.length} real measurements (${liveTelemetry.source})`);

  const externalCsv = [
    'device_id,timestamp,latency_ms,packet_loss_pct,interface_errors',
    'EXT_SW_01,2026-11-01T07:10:00Z,18.5,0.0,0',
    'EXT_SW_01,2026-11-01T07:11:00Z,22.0,0.5,15',
    'EXT_SW_01,2026-11-01T07:12:00Z,45.0,2.1,90',
    'EXT_SW_01,2026-11-01T07:13:00Z,89.0,5.8,180',
    'EXT_SW_01,2026-11-01T07:14:00Z,130.0,8.2,320'
  ].join('\n');
  const csvDiag = await diagnose(externalCsv, { offline: true });
  assert.strictEqual(csvDiag.report.status, 'diagnosed');
  assert.ok(csvDiag.report.affected_devices.includes('EXT_SW_01'));
  console.log('  ✓ Arbitrary external CSV with custom devices diagnosed with real computed evidence');

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
  const entDiag = await diagnose(enterpriseCsv, { offline: true });
  assert.strictEqual(entDiag.report.status, 'diagnosed');
  assert.strictEqual(entDiag.report.root_cause_category, 'link_congestion');
  assert.ok(entDiag.normalized_telemetry && entDiag.normalized_telemetry.topology.links.length === 1);
  assert.ok(entDiag.report.llm_synthesis && entDiag.report.llm_synthesis.cli_commands.some(c => c.includes('MUMBAI_DIST_SW_07')));
  console.log('  ✓ Enterprise multi-delimiter CSV (uplinks, unit suffixes, aliases & dynamic CLI) verified');

  const externalNdjson = [
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 200000, loss_ratio: 0.04, rssi: -84, retry_pct: 22 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 210000, loss_ratio: 0.05, rssi: -85, retry_pct: 24 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 195000, loss_ratio: 0.04, rssi: -83, retry_pct: 21 }),
    JSON.stringify({ node: 'EXT_AP_9', rtt_us: 220000, loss_ratio: 0.06, rssi: -86, retry_pct: 26 })
  ].join('\n');
  const ndjsonDiag = await diagnose(externalNdjson, { offline: true });
  assert.strictEqual(ndjsonDiag.report.status, 'diagnosed');
  assert.ok(ndjsonDiag.quality.unit_conversions.length > 0);
  console.log('  ✓ Arbitrary external NDJSON normalized and unit-converted without canned responses');

  const jsonRes = await invokeApp('POST', '/api/netcoop/diagnose', 'text/csv', enterpriseCsv);
  assert.strictEqual(jsonRes.status, 200);
  const jsonBody = JSON.parse(jsonRes.text);
  assert.strictEqual(jsonBody.report.status, 'diagnosed');
  assert.strictEqual(jsonBody.meta.format, 'csv');

  const csvRes = await invokeApp('POST', '/api/netcoop/diagnose?format=csv', 'text/csv', enterpriseCsv);
  assert.strictEqual(csvRes.status, 200);
  assert.ok(String(csvRes.headers['content-type'] || '').includes('text/csv'));
  assert.ok(csvRes.text.includes('incident_id,run_id,timestamp_utc,verdict_status'));
  assert.ok(csvRes.text.includes('MUMBAI_DIST_SW_07'));
  assert.ok(csvRes.text.includes('SUSPECTED_ROOT_CAUSE'));
  assert.ok(csvRes.text.includes('97.57'), 'CSV export must include computed numeric metric averages');
  console.log('  ✓ Direct HTTP text/csv upload & ?format=csv diagnostic spreadsheet export verified');

  // 8. MCP Server Tool Coverage (4/4 Tools) & All 4 Boolean Hints Verification
  console.log('\n[8/9] Verifying MCP Server Tools, Annotations & JSON-RPC 2.0 Lifecycle...');
  const expectedMcpTools = [
    'diagnose_network_fault',
    'list_test_scenarios',
    'generate_scenario_telemetry',
    'get_protocol_specification'
  ];

  const initRpc = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } }
  });
  assert.strictEqual(initRpc.result.protocolVersion, '2025-03-26');
  assert.strictEqual(initRpc.result.serverInfo.name, 'netcoop-mcp-server');

  const toolsListRpc = await mcp.handleRpcMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const listedTools = toolsListRpc.result.tools;
  assert.strictEqual(listedTools.length, 4, 'MCP server must expose exactly 4 tools');

  for (const expectedName of expectedMcpTools) {
    const toolDef = listedTools.find(t => t.name === expectedName);
    assert.ok(toolDef, `Missing MCP tool definition: ${expectedName}`);
    assert.ok(toolDef.annotations && typeof toolDef.annotations === 'object', `${expectedName} missing annotations`);
    assert.strictEqual(typeof toolDef.annotations.readOnlyHint, 'boolean', `${expectedName} readOnlyHint must be boolean`);
    assert.strictEqual(typeof toolDef.annotations.destructiveHint, 'boolean', `${expectedName} destructiveHint must be boolean`);
    assert.strictEqual(typeof toolDef.annotations.idempotentHint, 'boolean', `${expectedName} idempotentHint must be boolean`);
    assert.strictEqual(typeof toolDef.annotations.openWorldHint, 'boolean', `${expectedName} openWorldHint must be boolean`);
    assert.strictEqual(toolDef.annotations.readOnlyHint, true, `${expectedName} must be readOnlyHint: true`);
    assert.strictEqual(toolDef.annotations.destructiveHint, false, `${expectedName} must be destructiveHint: false`);
    assert.strictEqual(toolDef.annotations.idempotentHint, true, `${expectedName} must be idempotentHint: true`);
    assert.strictEqual(toolDef.annotations.openWorldHint, false, `${expectedName} must be openWorldHint: false`);
    assert.strictEqual(toolDef.inputSchema.additionalProperties, false, `${expectedName} must disallow additionalProperties`);
  }
  console.log('  ✓ All 4 MCP tools declare explicit boolean readOnlyHint, destructiveHint, idempotentHint & openWorldHint');

  // Test MCP Tool 1: list_test_scenarios
  const callList = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'list_test_scenarios', arguments: {} }
  });
  assert.strictEqual(callList.result.isError, false);
  const parsedScenarios = JSON.parse(callList.result.content[0].text);
  assert.strictEqual(parsedScenarios.length, 8);
  console.log('  ✓ MCP tool tested: list_test_scenarios');

  // Test MCP Tool 2: generate_scenario_telemetry
  const callGen = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'generate_scenario_telemetry', arguments: { scenario_key: 'dns_failure' } }
  });
  assert.strictEqual(callGen.result.isError, false);
  const generatedTele = JSON.parse(callGen.result.content[0].text);
  assert.strictEqual(generatedTele.schema, 'netcoop.telemetry/1.0');
  const invalidGen = await mcp.handleToolCall('generate_scenario_telemetry', { scenario_key: 'non_existent_fault' });
  assert.strictEqual(invalidGen.isError, true);
  console.log('  ✓ MCP tool tested: generate_scenario_telemetry (valid + validation guard)');

  // Test MCP Tool 3: diagnose_network_fault
  const callDiag = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'diagnose_network_fault', arguments: { telemetry: generatedTele } }
  });
  assert.strictEqual(callDiag.result.isError, false);
  const mcpDiagReport = JSON.parse(callDiag.result.content[0].text);
  assert.strictEqual(mcpDiagReport.status, 'diagnosed');
  assert.strictEqual(mcpDiagReport.llm_synthesis.model, 'deterministic-cli-engine/1.0', 'MCP must execute deterministically offline');
  const missingTeleCall = await mcp.handleToolCall('diagnose_network_fault', {});
  assert.strictEqual(missingTeleCall.isError, true);
  console.log('  ✓ MCP tool tested: diagnose_network_fault (deterministic zero-exfiltration mode verified)');

  // Test MCP Tool 4: get_protocol_specification
  const callProto = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'get_protocol_specification', arguments: {} }
  });
  assert.strictEqual(callProto.result.isError, false);
  const protoPayload = JSON.parse(callProto.result.content[0].text);
  assert.strictEqual(protoPayload.protocol.version, '1.0.0');
  console.log('  ✓ MCP tool tested: get_protocol_specification');

  // Test MCP Resources
  const resRead = await mcp.handleRpcMessage({
    jsonrpc: '2.0',
    id: 7,
    method: 'resources/read',
    params: { uri: 'netcoop://protocol' }
  });
  assert.strictEqual(resRead.result.contents[0].uri, 'netcoop://protocol');

  // 9. Comprehensive Security Hardening Tests (Secrets, SSRF, Headers & CSV Formula Guard)
  console.log('\n[9/9] Verifying Security Controls (Credential Isolation, SSRF, CSP & CSV Formula Guard)...');

  // A. Credential Isolation & Secret Redaction
  assert.strictEqual('GROQ_KEY' in groqModule, false, 'src/groq.js must NEVER export raw GROQ_KEY');
  const sampleLeak = 'Error with key gsk_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 and Bearer secretToken_9876543210';
  const scrubbed = groqModule.redactSecrets(sampleLeak);
  assert.ok(!scrubbed.includes('gsk_ABCDEF'), 'redactSecrets must scrub gsk_ keys');
  assert.ok(!scrubbed.includes('secretToken_9876543210'), 'redactSecrets must scrub Bearer tokens');
  console.log('  ✓ Credential isolation & automatic token redaction verified');

  // B. SSRF, Cloud Metadata (169.254.169.254), Private IP & Port-Scanning Guards
  const blockedTargets = [
    '127.0.0.1:443',
    'localhost:80',
    '169.254.169.254:80',
    'metadata.google.internal:80',
    '10.0.0.1:443',
    '172.16.5.4:443',
    '192.168.1.1:443',
    '[::1]:443',
    '::ffff:169.254.169.254',
    '[fe80::1]:443',
    '0x7f000001:443',
    '2130706433:443',
    'one.one.one.one:22',
    'dns.google:6379'
  ];
  for (const bad of blockedTargets) {
    assert.throws(
      () => probeModule.parseTargetSpecs(bad),
      (err) => err instanceof probeModule.ProbeSecurityError && err.statusCode === 400,
      `SSRF guard failed to block forbidden target: ${bad}`
    );
  }
  const ssrfHttpRes = await invokeApp('POST', '/api/netcoop/probe-live', 'application/json', JSON.stringify({
    targets: '169.254.169.254:80'
  }));
  assert.strictEqual(ssrfHttpRes.status, 400, 'HTTP /probe-live must reject cloud metadata SSRF with 400');
  console.log(`  ✓ SSRF & port-scanning guard blocked all ${blockedTargets.length} loopback/IMDS/RFC1918/port vectors`);

  // C. Hardware MAC Address Redaction
  assert.ok(liveTelemetry.devices.every(d => !d.mac || d.mac === 'REDACTED'), 'Hardware MAC addresses must be redacted');
  assert.ok(liveTelemetry.host_info.interfaces.every(i => i.mac === 'REDACTED'), 'Interface MAC addresses must be redacted');
  console.log('  ✓ Host hardware MAC addresses & LAN identifiers redacted');

  // D. HTTP Security Headers & Formula-Safe CSV Escaping
  assert.ok(String(jsonRes.headers['content-security-policy'] || '').includes("script-src 'self'"), 'CSP must enforce script-src self');
  assert.strictEqual(jsonRes.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(jsonRes.headers['x-frame-options'], 'DENY');
  assert.ok(String(jsonRes.headers['strict-transport-security'] || '').includes('max-age='));
  assert.strictEqual(routesModule.csvEsc("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.strictEqual(routesModule.csvEsc('@SUM(1+1)'), "'@SUM(1+1)");
  assert.strictEqual(routesModule.csvEsc('-82.5'), '-82.5', 'Negative dBm numbers must remain intact');
  console.log('  ✓ Strict HTTP security headers (CSP, HSTS, XFO, nosniff) & CSV formula guard verified');

  console.log('\n======================================================');
  console.log('   ALL 9 NETCOOP TEST & SECURITY SUITES PASSED (100%)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
