# Security Policy & MCP Trust Architecture

NetCoop AI is engineered as a **zero-exfiltration, read-only, deterministic** Model Context Protocol (MCP) diagnostic server and hardened web application.

[![M8ven Verified](https://m8ven.ai/badge/mcp/sunil56224972/netcoop?variant=verified)](https://m8ven.ai/mcp/sunil56224972/netcoop?s=security)
[![M8ven Score](https://m8ven.ai/badge/mcp/sunil56224972-netcoop-1nir0d?v=a9c68a336c8daa8c65d4a33c7d3da0ef)](https://m8ven.ai/mcp/sunil56224972-netcoop-1nir0d?s=readme)

---

## 1. MCP Server Security Guarantees (`mcp.js`)

When connected to any MCP host (Claude Desktop, Cursor, ChatGPT, Windsurf, VS Code, or Antigravity), `mcp.js` enforces the following guarantees:

1. **Zero Credentials Required & Zero Secret Exfiltration**
   - `mcp.js` executes `diagnose(telemetry, { offline: true })` exclusively.
   - It **never** reads API keys, **never** loads `.env` secrets during tool execution, and **never** transmits user network telemetry to any external cloud or LLM endpoint.
2. **100% Explicit Tool Annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)**
   - Every exposed tool declares all four boolean MCP hints matching its exact runtime behavior:

| MCP Tool Name | `readOnlyHint` | `destructiveHint` | `idempotentHint` | `openWorldHint` |
| :--- | :---: | :---: | :---: | :---: |
| `diagnose_network_fault` | `true` | `false` | `true` | `false` |
| `list_test_scenarios` | `true` | `false` | `true` | `false` |
| `generate_scenario_telemetry` | `true` | `false` | `true` | `false` |
| `get_protocol_specification` | `true` | `false` | `true` | `false` |

3. **Zero Shell Execution**
   - Zero calls to `child_process` (`exec`, `execSync`, `spawn`, `fork`), `eval()`, or `new Function()` anywhere in the codebase. Remediation CLI commands are returned strictly as advisory text strings for human operator review.
4. **Input Schema, Prototype-Pollution & Frame Size Defenses**
   - Every tool schema enforces `additionalProperties: false` and strict type/length constraints.
   - Incoming JSON-RPC 2.0 frames over `stdio` are capped at `2 MB`, and `__proto__`, `constructor`, and `prototype` keys are recursively stripped before processing.

---

## 2. Web API & Live Probe Security Controls (`server.js`, `src/probe.js`, `src/routes.js`)

1. **SSRF, Cloud Metadata (`169.254.169.254`) & DNS-Rebinding Protection**
   - `/api/netcoop/probe-live` blocks loopback (`127.0.0.0/8`, `::1`), RFC-1918 private networks (`10/8`, `172.16/12`, `192.168/16`), CGNAT (`100.64/10`), link-local and cloud instance metadata (`169.254.0.0/16`, `fe80::/10`, `metadata.google.internal`), IPv4-mapped IPv6 (`::ffff:...`), NAT64 (`64:ff9b::/96`), and obfuscated hex/octal/integer IP literals (`0x7f000001`, `2130706433`).
   - Post-resolution **DNS-rebinding verification** inspects every IP returned by `dns.lookup()` *before* opening a TCP socket and connects directly to the verified public IP.
   - Outbound TCP probes are restricted strictly to diagnostic ports: `53, 80, 443, 853, 8080, 8443`.
2. **Host Hardware & PII Redaction**
   - Hardware NIC MAC addresses are redacted (`REDACTED`) and private LAN interface host octets are masked (`x.x.x.x` &rarr; `x.x.x.x` subnet prefix).
3. **Credential Isolation (`src/groq.js`)**
   - Optional web-mode LLM synthesis reads only the scoped `NETCOOP_GROQ_KEY` variable privately at call time, **never** exports the key, pins HTTPS strictly to `https://api.groq.com`, disables redirects (`redirect: 'error'`), never logs raw upstream bodies, and scrubs token patterns via `redactSecrets()`.
4. **HTTP Security Headers, Rate Limiting & CSV Formula Guard**
   - Enforces strict `Content-Security-Policy` (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, per-IP sliding-window rate limiting, `2 MB` body limits, and CSV/Excel DDE formula neutralization (`=`, `+`, `-`, `@`).

---

## 3. Reporting a Vulnerability

If you discover a security issue, please open a GitHub Security Advisory on [`Sunil56224972/Netcoop`](https://github.com/Sunil56224972/Netcoop/security/advisories) rather than posting exploit details in a public issue. We review and patch verified findings within 48 hours.
