const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let code = fs.readFileSync(appPath, 'utf-8');

// Find the boot sequence function
const marker1 = '// ─── Boot Sequence Orchestrator';
const marker2 = 'window.netcoopReboot';

const startIdx = code.indexOf(marker1);
const endIdx = code.indexOf(marker2);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find boot sequence markers');
  console.log('marker1 found:', startIdx !== -1);
  console.log('marker2 found:', endIdx !== -1);
  process.exit(1);
}

const newBootCode = `// ─── Boot Sequence Orchestrator (Terminal POST Style) ─────────────────────\r
function runBootSequence(options = {}) {\r
  const bootScreen = $('#netcoop-boot-screen');\r
  const statusText = $('#boot-status-text');\r
  const percentText = $('#boot-percent');\r
  const progressBar = $('#boot-progress-bar');\r
  const postLog = $('#boot-post-log');\r
  if (!bootScreen) return;\r
\r
  bootScreen.classList.remove('is-loaded');\r
  if (progressBar) progressBar.style.width = '0%';\r
  if (percentText) percentText.textContent = '0%';\r
  if (statusText) statusText.textContent = 'INITIALIZING SYSTEM';\r
  if (postLog) postLog.innerHTML = '';\r
\r
  const postLines = [\r
    { p: 8,   prefix: '>>',  msg: 'NetCoop AI Kernel v1.0.0 — POST sequence initiated',           status: 'INIT',   cls: 'sync',  delay: 100 },\r
    { p: 16,  prefix: '>>',  msg: 'Loading campus topology: IIT Bhubaneswar (32 nodes, 6 zones)', status: 'OK',     cls: 'ok',    delay: 320 },\r
    { p: 28,  prefix: '>>',  msg: 'JSON-RPC v1.0.0 message bus binding to localhost:7331',         status: 'OK',     cls: 'ok',    delay: 520 },\r
    { p: 40,  prefix: '>>',  msg: 'performance_agent \\u2192 latency, jitter, loss, utilization',    status: 'ONLINE', cls: 'ok',    delay: 720 },\r
    { p: 52,  prefix: '>>',  msg: 'infrastructure_agent \\u2192 CPU, RAM, queue drops, errors',      status: 'ONLINE', cls: 'ok',    delay: 920 },\r
    { p: 62,  prefix: '>>',  msg: 'connectivity_agent \\u2192 topology graph & downstream scope',    status: 'ONLINE', cls: 'ok',    delay: 1100 },\r
    { p: 72,  prefix: '>>',  msg: 'correlation_agent \\u2192 multi-hypothesis fault ranking',        status: 'ONLINE', cls: 'ok',    delay: 1280 },\r
    { p: 82,  prefix: '>>',  msg: 'reporting_agent \\u2192 Section 6 JSON report schema active',     status: 'ONLINE', cls: 'ok',    delay: 1450 },\r
    { p: 90,  prefix: '>>',  msg: 'groq_llm_agent \\u2192 Groq LPU gpt-oss-120b inference bridge',  status: 'ONLINE', cls: 'ok',    delay: 1620 },\r
    { p: 96,  prefix: '>>',  msg: 'Cooperative arbitration mesh synchronized (6/6 agents)',         status: 'SYNC',   cls: 'sync',  delay: 1800 },\r
    { p: 100, prefix: '>>',  msg: 'System ready \\u2014 standing by for telemetry input',             status: 'READY',  cls: 'ready', delay: 2000 }\r
  ];\r
\r
  postLines.forEach(({ p, prefix, msg, status, cls, delay }) => {\r
    setTimeout(() => {\r
      if (progressBar) progressBar.style.width = \`\${p}%\`;\r
      if (percentText) percentText.textContent = \`\${p}%\`;\r
      if (statusText) statusText.textContent = msg.length > 42 ? msg.substring(0, 42) + '\\u2026' : msg;\r
\r
      if (postLog) {\r
        const line = document.createElement('div');\r
        line.className = 'boot-post-line';\r
        line.innerHTML = \`<span class="post-prefix">\${esc(prefix)}</span><span class="post-msg">\${esc(msg)}</span><span class="post-status \${cls}">[\${esc(status)}]</span>\`;\r
        postLog.appendChild(line);\r
        // Keep cursor at end\r
        const oldCursor = postLog.querySelector('.boot-cursor');\r
        if (oldCursor) oldCursor.remove();\r
        const cursor = document.createElement('span');\r
        cursor.className = 'boot-cursor';\r
        line.appendChild(cursor);\r
      }\r
    }, delay);\r
  });\r
\r
  setTimeout(() => {\r
    // Remove cursor before hiding\r
    if (postLog) {\r
      const c = postLog.querySelector('.boot-cursor');\r
      if (c) c.remove();\r
    }\r
    bootScreen.classList.add('is-loaded');\r
    if (options.isReboot) {\r
      toast('System rebooted', 'NetCoop AI initialized successfully', 'ok');\r
    }\r
  }, 2400);\r
}\r
\r
`;

const newCode = code.substring(0, startIdx) + newBootCode + code.substring(endIdx);
fs.writeFileSync(appPath, newCode, 'utf-8');
console.log('Boot JS replaced successfully');

