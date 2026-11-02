const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let code = fs.readFileSync(appPath, 'utf-8');

const marker1 = '// \u2500\u2500\u2500 Boot Sequence Orchestrator';
const marker2 = 'window.netcoopReboot';

const startIdx = code.indexOf(marker1);
const endIdx = code.indexOf(marker2);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const newFn = `// \u2500\u2500\u2500 Boot Sequence Orchestrator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r
function runBootSequence(options = {}) {\r
  var bootScreen = $('#netcoop-boot-screen');\r
  var statusText = $('#boot-status-text');\r
  var percentText = $('#boot-percent');\r
  var progressBar = $('#boot-progress-bar');\r
  if (!bootScreen) return;\r
\r
  bootScreen.style.opacity = '1';\r
  bootScreen.style.visibility = 'visible';\r
  bootScreen.classList.remove('is-loaded');\r
  if (progressBar) progressBar.style.width = '0%';\r
  if (percentText) percentText.textContent = '0%';\r
  if (statusText) statusText.textContent = 'Initializing system\\u2026';\r
\r
  var steps = [\r
    { p: 10,  t: 'Loading campus topology\\u2026',          delay: 200 },\r
    { p: 22,  t: 'Binding JSON-RPC message bus\\u2026',     delay: 450 },\r
    { p: 35,  t: 'Starting performance agent\\u2026',       delay: 700 },\r
    { p: 45,  t: 'Starting infrastructure agent\\u2026',    delay: 920 },\r
    { p: 55,  t: 'Starting connectivity agent\\u2026',      delay: 1120 },\r
    { p: 65,  t: 'Starting correlation agent\\u2026',       delay: 1320 },\r
    { p: 75,  t: 'Starting reporting agent\\u2026',         delay: 1500 },\r
    { p: 85,  t: 'Connecting Groq LPU inference\\u2026',    delay: 1680 },\r
    { p: 95,  t: 'Synchronizing agent mesh (6/6)\\u2026',   delay: 1860 },\r
    { p: 100, t: 'System ready',                          delay: 2050 }\r
  ];\r
\r
  steps.forEach(function(step) {\r
    setTimeout(function() {\r
      if (progressBar) progressBar.style.width = step.p + '%';\r
      if (percentText) percentText.textContent = step.p + '%';\r
      if (statusText) statusText.textContent = step.t;\r
    }, step.delay);\r
  });\r
\r
  setTimeout(function() {\r
    bootScreen.style.opacity = '0';\r
    setTimeout(function() {\r
      bootScreen.style.visibility = 'hidden';\r
      bootScreen.classList.add('is-loaded');\r
    }, 800);\r
    if (options.isReboot) {\r
      toast('System rebooted', 'NetCoop AI initialized successfully', 'ok');\r
    }\r
  }, 2500);\r
}\r
\r
`;

const newCode = code.substring(0, startIdx) + newFn + code.substring(endIdx);
fs.writeFileSync(appPath, newCode, 'utf-8');
console.log('Boot JS updated');

