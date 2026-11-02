const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let code = fs.readFileSync(appPath, 'utf-8');

const marker1 = '// \u2500\u2500\u2500 Boot Sequence Orchestrator';
const marker2 = 'window.netcoopReboot';

const startIdx = code.indexOf(marker1);
const endIdx = code.indexOf(marker2);

if (startIdx === -1 || endIdx === -1) {
  console.error('Boot function markers not found');
  process.exit(1);
}

const newBootFn = `// \u2500\u2500\u2500 Boot Sequence Orchestrator (Inline-Styled POST) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r
function runBootSequence(options = {}) {\r
  const bootScreen = $('#netcoop-boot-screen');\r
  const statusText = $('#boot-status-text');\r
  const percentText = $('#boot-percent');\r
  const progressBar = $('#boot-progress-bar');\r
  const postLog = $('#boot-post-log');\r
  if (!bootScreen) return;\r
\r
  bootScreen.style.opacity = '1';\r
  bootScreen.style.visibility = 'visible';\r
  bootScreen.classList.remove('is-loaded');\r
  if (progressBar) progressBar.style.width = '0%';\r
  if (percentText) percentText.textContent = '0%';\r
  if (statusText) statusText.textContent = 'INITIALIZING';\r
  if (postLog) postLog.innerHTML = '';\r
\r
  const lines = [\r
    { p: 8,   msg: 'NetCoop AI Kernel v1.0.0 \\u2014 POST sequence initiated',             st: 'INIT',   color: '#3b82f6', delay: 150 },\r
    { p: 16,  msg: 'Loading campus topology: IIT-BBS (32 nodes, 6 zones)',               st: 'OK',     color: '#22c55e', delay: 380 },\r
    { p: 26,  msg: 'JSON-RPC v1.0.0 message bus \\u2192 localhost:7331',                    st: 'OK',     color: '#22c55e', delay: 580 },\r
    { p: 38,  msg: 'performance_agent \\u2192 latency, jitter, loss, utilization',           st: 'ONLINE', color: '#22c55e', delay: 780 },\r
    { p: 48,  msg: 'infrastructure_agent \\u2192 CPU, RAM, queue drops, errors',             st: 'ONLINE', color: '#22c55e', delay: 980 },\r
    { p: 58,  msg: 'connectivity_agent \\u2192 topology graph, downstream scope',            st: 'ONLINE', color: '#22c55e', delay: 1180 },\r
    { p: 68,  msg: 'correlation_agent \\u2192 multi-hypothesis fault ranking',               st: 'ONLINE', color: '#22c55e', delay: 1380 },\r
    { p: 78,  msg: 'reporting_agent \\u2192 Section 6 JSON report schema',                   st: 'ONLINE', color: '#22c55e', delay: 1560 },\r
    { p: 88,  msg: 'groq_llm_agent \\u2192 Groq LPU gpt-oss-120b inference',                st: 'ONLINE', color: '#22c55e', delay: 1740 },\r
    { p: 96,  msg: 'Cooperative arbitration mesh synced (6/6 agents)',                    st: 'SYNC',   color: '#3b82f6', delay: 1920 },\r
    { p: 100, msg: 'System ready \\u2014 standing by for telemetry input',                   st: 'READY',  color: '#22c55e', delay: 2100 }\r
  ];\r
\r
  lines.forEach(({ p, msg, st, color, delay }) => {\r
    setTimeout(() => {\r
      if (progressBar) progressBar.style.width = p + '%';\r
      if (percentText) percentText.textContent = p + '%';\r
      if (statusText) statusText.textContent = st === 'READY' ? 'SYSTEM READY' : msg.substring(0, 40);\r
\r
      if (postLog) {\r
        const line = document.createElement('div');\r
        line.style.cssText = 'display:flex;align-items:baseline;gap:8px;font-family:IBM Plex Mono,monospace;font-size:11.5px;line-height:1.8;';\r
        \r
        const prefix = document.createElement('span');\r
        prefix.textContent = '>>';\r
        prefix.style.cssText = 'color:#3b82f6;flex:none;font-weight:600;';\r
        \r
        const msgEl = document.createElement('span');\r
        msgEl.textContent = msg;\r
        msgEl.style.cssText = 'color:#94a3b8;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';\r
        \r
        const badge = document.createElement('span');\r
        badge.textContent = '[' + st + ']';\r
        badge.style.cssText = 'flex:none;font-weight:700;font-size:10.5px;color:' + color + ';';\r
        \r
        line.appendChild(prefix);\r
        line.appendChild(msgEl);\r
        line.appendChild(badge);\r
        postLog.appendChild(line);\r
      }\r
    }, delay);\r
  });\r
\r
  setTimeout(() => {\r
    bootScreen.style.opacity = '0';\r
    bootScreen.style.visibility = 'hidden';\r
    bootScreen.classList.add('is-loaded');\r
    if (options.isReboot) {\r
      toast('System rebooted', 'NetCoop AI initialized successfully', 'ok');\r
    }\r
  }, 2600);\r
}\r
\r
`;

const newCode = code.substring(0, startIdx) + newBootFn + code.substring(endIdx);
fs.writeFileSync(appPath, newCode, 'utf-8');
console.log('Boot JS replaced with inline-styled version');
