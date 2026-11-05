#!/usr/bin/env node
'use strict';

/**
 * NetCoop AI — Hardened Model Context Protocol (MCP) Server
 * Implements MCP JSON-RPC 2.0 over stdio with:
 * - Complete, truthful tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
 * - Zero-exfiltration deterministic execution ({ offline: true } — never sends telemetry externally)
 * - Strict inputSchema validation, payload size bounds (2 MB), and prototype-pollution guards
 * - Sanitized error envelopes with secret redaction
 */

const readline = require('readline');
const { diagnose, generateScenario, listScenarios, PROTOCOL, SCORING, ROLES } = require('./src/orchestrator');
const { redactSecrets } = require('./src/groq');

const SERVER_NAME = 'netcoop-mcp-server';
const SERVER_VERSION = '1.1.0';
const DEFAULT_PROTOCOL_VERSION = '2024-11-05';
const SUPPORTED_PROTOCOL_VERSIONS = new Set(['2025-03-26', '2024-11-05']);
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024; // 2 MB strict stdio frame ceiling
const VALID_SCENARIO_KEYS = [
  'normal',
  'link_congestion',
  'weak_wifi',
  'interface_fault',
  'dns_failure',
  'dhcp_failure',
  'interop_failure',
  'device_overload'
];

const TOOLS = [
  {
    name: 'diagnose_network_fault',
    description: 'Run deterministic multi-agent cooperative fault diagnosis on network telemetry (JSON, NDJSON, or CSV) locally with zero external API calls. Identifies probable root cause, affected devices, supporting evidence, confidence rating, and recommended corrective actions.',
    annotations: {
      title: 'Diagnose Network Telemetry Faults',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        telemetry: {
          description: 'Network telemetry payload as a JSON object, JSON string, NDJSON string, or RFC-4180 CSV/TSV string.',
          anyOf: [
            { type: 'string', minLength: 2, maxLength: 1500000 },
            { type: 'object' }
          ]
        }
      },
      required: ['telemetry'],
      additionalProperties: false
    }
  },
  {
    name: 'list_test_scenarios',
    description: 'List all 8 pre-configured synthetic network telemetry fault benchmark scenarios for campus and enterprise infrastructure.',
    annotations: {
      title: 'List Network Fault Test Scenarios',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'generate_scenario_telemetry',
    description: 'Generate deterministic synthetic network telemetry for a named benchmark scenario (normal, link_congestion, weak_wifi, interface_fault, dns_failure, dhcp_failure, interop_failure, device_overload).',
    annotations: {
      title: 'Generate Synthetic Scenario Telemetry',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        scenario_key: {
          type: 'string',
          enum: VALID_SCENARIO_KEYS,
          maxLength: 64,
          description: 'Key of the benchmark scenario to generate (e.g. "link_congestion", "weak_wifi", "dns_failure").'
        }
      },
      required: ['scenario_key'],
      additionalProperties: false
    }
  },
  {
    name: 'get_protocol_specification',
    description: 'Retrieve the NetCoop AI multi-agent JSON-RPC communication protocol specification, canonical 16-metric catalogue, agent roles, and mathematical scoring methodology.',
    annotations: {
      title: 'Get NetCoop Protocol Specification',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

const RESOURCES = [
  {
    uri: 'netcoop://protocol',
    name: 'NetCoop AI Protocol Specification',
    mimeType: 'application/json',
    description: 'Standard JSON-RPC 2.0 multi-agent message envelopes and metric catalogue.'
  },
  {
    uri: 'netcoop://scenarios',
    name: 'NetCoop AI Test Scenarios',
    mimeType: 'application/json',
    description: 'Registry of 8 pre-configured benchmark fault scenarios.'
  }
];

/**
 * Strip dangerous prototype-pollution keys recursively from untrusted JSON objects.
 */
function sanitizeObject(val, depth = 0) {
  if (depth > 20 || val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(item => sanitizeObject(item, depth + 1));
  const clean = Object.create(null);
  for (const [k, v] of Object.entries(val)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    clean[k] = sanitizeObject(v, depth + 1);
  }
  return Object.assign({}, clean);
}

function toolErrorResult(message) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: redactSecrets(message)
      }
    ]
  };
}

async function handleToolCall(name, rawArgs) {
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? sanitizeObject(rawArgs)
    : {};

  switch (name) {
    case 'diagnose_network_fault': {
      if (args.telemetry === undefined || args.telemetry === null || args.telemetry === '') {
        return toolErrorResult('Validation error: Missing required "telemetry" argument.');
      }
      if (typeof args.telemetry === 'string' && Buffer.byteLength(args.telemetry, 'utf8') > 1500000) {
        return toolErrorResult('Validation error: Telemetry payload exceeds 1.5 MB limit.');
      }
      if (typeof args.telemetry !== 'string' && (typeof args.telemetry !== 'object' || Array.isArray(args.telemetry))) {
        return toolErrorResult('Validation error: "telemetry" must be a JSON object or string.');
      }
      // Run strictly offline & deterministically — zero external API calls, zero credential usage
      const res = await diagnose(args.telemetry, { offline: true, runId: 'MCP-DIAG' });
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.report, null, 2)
          }
        ]
      };
    }

    case 'list_test_scenarios': {
      const list = listScenarios();
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(list, null, 2)
          }
        ]
      };
    }

    case 'generate_scenario_telemetry': {
      if (!args.scenario_key || typeof args.scenario_key !== 'string') {
        return toolErrorResult(`Validation error: "scenario_key" is required. Valid keys: ${VALID_SCENARIO_KEYS.join(', ')}`);
      }
      const key = args.scenario_key.trim();
      if (!VALID_SCENARIO_KEYS.includes(key)) {
        return toolErrorResult(`Validation error: Unknown scenario_key "${key}". Valid keys: ${VALID_SCENARIO_KEYS.join(', ')}`);
      }
      const data = generateScenario(key);
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    case 'get_protocol_specification': {
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ protocol: PROTOCOL, scoring: SCORING, roles: ROLES }, null, 2)
          }
        ]
      };
    }

    default: {
      const err = new Error(`Unknown tool: ${String(name).slice(0, 64)}`);
      err.code = -32602;
      throw err;
    }
  }
}

/**
 * Process a single parsed JSON-RPC 2.0 request object and return a JSON-RPC response
 * (or null for notifications that expect no response).
 */
async function handleRpcMessage(rawRequest) {
  if (!rawRequest || typeof rawRequest !== 'object' || Array.isArray(rawRequest)) {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC request' } };
  }

  const request = sanitizeObject(rawRequest);
  const { id, method, params = {} } = request;
  const isNotification = id === undefined || id === null;

  try {
    if (method === 'initialize') {
      const requestedVersion = params && typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const negotiated = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)
        ? requestedVersion
        : DEFAULT_PROTOCOL_VERSION;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: negotiated,
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
        }
      };
    }

    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return null;
    }

    if (method === 'ping') {
      return isNotification ? null : { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }

    if (method === 'tools/call') {
      if (!params || typeof params.name !== 'string') {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool "name" parameter' } };
      }
      const result = await handleToolCall(params.name, params.arguments);
      return { jsonrpc: '2.0', id, result };
    }

    if (method === 'resources/list') {
      return { jsonrpc: '2.0', id, result: { resources: RESOURCES } };
    }

    if (method === 'resources/read') {
      const uri = params && typeof params.uri === 'string' ? params.uri : '';
      if (uri === 'netcoop://protocol') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ protocol: PROTOCOL, scoring: SCORING, roles: ROLES }, null, 2)
            }]
          }
        };
      }
      if (uri === 'netcoop://scenarios') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(listScenarios(), null, 2)
            }]
          }
        };
      }
      return { jsonrpc: '2.0', id, error: { code: -32602, message: `Resource not found: ${uri.slice(0, 80)}` } };
    }

    if (isNotification) return null;
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${String(method).slice(0, 64)}` } };
  } catch (err) {
    if (isNotification) return null;
    const code = typeof err.code === 'number' ? err.code : -32000;
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message: redactSecrets((err && err.message) || 'Internal MCP server error')
      }
    };
  }
}

function startStdioServer() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line) => {
    if (Buffer.byteLength(line, 'utf8') > MAX_MESSAGE_BYTES) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'JSON-RPC payload exceeds 2 MB limit' }
      }) + '\n');
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (_e) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON' }
      }) + '\n');
      return;
    }

    const response = await handleRpcMessage(parsed);
    if (response && response.id !== undefined) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  });
}

if (require.main === module) {
  startStdioServer();
}

module.exports = {
  SERVER_NAME,
  SERVER_VERSION,
  TOOLS,
  RESOURCES,
  VALID_SCENARIO_KEYS,
  handleToolCall,
  handleRpcMessage,
  startStdioServer
};
