'use strict';

// NetCoop AI: Optional Groq LPU Synthesis Module (Web Server Mode Only).
// Security Guarantees:
// 1. Zero secret export: API keys are NEVER exported or stored on module objects.
// 2. Zero MCP exfiltration: Automatically bypassed when opts.offline === true
//    so MCP tool invocations never read credentials or make outbound API calls.
// 3. Single scoped credential: Reads only optional NETCOOP_GROQ_KEY (never harvests
//    unscoped ambient provider keys from developer environments).
// 4. HTTPS origin pinning & automatic token redaction on all error paths.

try { require('dotenv').config({ quiet: true }); } catch (_e) {}

const GROQ_MODEL = String(process.env.NETCOOP_GROQ_MODEL || 'openai/gpt-oss-120b').slice(0, 120);
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PINNED_HOST = 'api.groq.com';

/**
 * Scrub API tokens, Bearer headers, and secret assignments from any string.
 * @param {unknown} input
 * @returns {string}
 */
function redactSecrets(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\bgsk_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/((?:netcoop_)?groq_key|api[_-]?key|authorization|secret|token)\s*([:=])\s*([^\s"',;]+)/gi, '$1$2[REDACTED]');
}

/**
 * Privately read and validate the optional NETCOOP_GROQ_KEY at call time.
 * Never cached on objects or exported. Disabled in MCP mode.
 * @returns {string}
 */
function readOptionalGroqKey() {
  const raw = process.env.NETCOOP_GROQ_KEY;
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 20 || trimmed.length > 256) return '';
  if (/[\s\x00-\x1f]/.test(trimmed)) return '';
  if (/your_groq_api_key|placeholder|<optional/i.test(trimmed)) return '';
  return trimmed;
}

/**
 * Boolean check whether optional Groq synthesis is configured (never exposes the key).
 * @returns {boolean}
 */
function isGroqConfigured() {
  return Boolean(readOptionalGroqKey());
}

function toList(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean).slice(0, 8);
  if (typeof val === 'string') {
    return val
      .split(/(?:\r?\n|\d+\.\s+)/)
      .map(s => s.trim().replace(/^[-*•]\s*/, ''))
      .filter(s => s.length > 5)
      .slice(0, 8);
  }
  return [];
}

/**
 * Enhance the multi-agent diagnosis report with Groq LLM reasoning (Web/CLI optional).
 *
 * @param {object} params
 * @param {string} params.rootCause
 * @param {number} params.confidence
 * @param {Array}  params.evidence
 * @param {Array}  params.affectedDevices
 * @param {Array}  params.alternatives
 * @param {object} [bus] Optional MessageBus to log the LLM agent message
 * @param {object} [opts]
 * @param {boolean} [opts.offline] When true, strictly forbids outbound LLM API calls
 * @returns {Promise<{ reasoning: string, actions: string[], cli_commands: string[], prevention: string[], model: string, elapsed_ms: number } | null>}
 */
async function synthesizeWithGroq(
  { rootCause, confidence, evidence = [], affectedDevices = [], alternatives = [] },
  bus = null,
  opts = {}
) {
  if (opts && opts.offline) return null;
  const apiKey = readOptionalGroqKey();
  if (!apiKey) return null;

  // Verify pinned HTTPS endpoint before transmitting any header
  let parsedUrl;
  try {
    parsedUrl = new URL(GROQ_ENDPOINT);
  } catch (_e) {
    return null;
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== PINNED_HOST) {
    return null;
  }

  const t0 = Date.now();
  const evidenceText = evidence
    .slice(0, 6)
    .map(e => `${String(e.device_id || '').slice(0, 64)}: ${String(e.metric || '').slice(0, 48)}=${e.value}${e.unit ? ' ' + e.unit : ''} (${e.level})`)
    .join(', ');
  const affectedText = affectedDevices.slice(0, 12).map(d => String(d).slice(0, 64)).join(', ') || 'None specified';
  const altText = alternatives
    .slice(0, 5)
    .map(a => typeof a === 'string' ? a : (a.cause || a.hypothesis || ''))
    .filter(Boolean)
    .join(', ');

  const systemPrompt = `You are the Lead Network Engineer and Chief AI Diagnostic Specialist for enterprise and campus network infrastructure.
You analyze telemetry findings from specialized diagnostic agents (Performance, Infrastructure, Connectivity, and Correlation agents) and produce a high-precision, production-grade root cause synthesis and practical remediation plan.
Always respond in strictly valid JSON format with keys:
- "reasoning": string (2-3 sentences explaining the root cause and why it cascades through downstream facilities)
- "actions": array of strings (3 to 5 actionable technical engineering steps to resolve the issue)
- "cli_commands": array of strings (2 to 4 exact Cisco IOS, Aruba, or Linux terminal commands to verify and fix the issue, e.g. "show interface Gi0/1", "nmcli dev wifi rescan")
- "prevention": array of strings (2 to 3 long-term monitoring or architectural recommendations)`;

  const userPrompt = `Multi-Agent Consensus Findings:
- Suspected Root Cause: ${String(rootCause || '').slice(0, 200)}
- Confidence: ${Math.round((confidence || 0) * 100)}%
- Key Telemetry Evidence: ${evidenceText || 'No anomalies'}
- Affected Network Devices: ${affectedText}
- Alternative Causes Considered: ${altText || 'None'}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(parsedUrl.toString(), {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Never log raw upstream response body (may echo headers/tokens)
      return null;
    }

    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content || typeof content !== 'string') return null;

    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(cleaned);
    const elapsed = Date.now() - t0;

    const result = {
      model: GROQ_MODEL,
      elapsed_ms: elapsed,
      reasoning: typeof parsed.reasoning === 'string' ? redactSecrets(parsed.reasoning) : null,
      actions: toList(parsed.actions).map(redactSecrets),
      cli_commands: toList(parsed.cli_commands).map(redactSecrets),
      prevention: toList(parsed.prevention).map(redactSecrets)
    };

    if (bus && typeof bus.send === 'function') {
      bus.send('groq_llm_agent', 'reporting_agent', 'result', {
        kind: 'llm_synthesis',
        model: GROQ_MODEL,
        reasoning: result.reasoning,
        actions: result.actions,
        elapsed_ms: elapsed
      }, { summary: `Groq LLM (${GROQ_MODEL}) completed contextual root cause & remediation synthesis` });
    }

    return result;
  } catch (_err) {
    return null;
  }
}

module.exports = { synthesizeWithGroq, isGroqConfigured, redactSecrets, GROQ_MODEL };
