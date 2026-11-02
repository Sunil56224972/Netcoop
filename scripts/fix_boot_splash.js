const fs = require('fs');
const fpath = 'c:\\Users\\sunil\\Downloads\\Netcoop-main\\public\\js\\app.js';
let src = fs.readFileSync(fpath, 'utf8');

// Find the boot function boundaries
const startMarker = '// ─── Boot Sequence Orchestrator';
const endMarker = 'window.netcoopReboot';

const startIdx = src.indexOf(startMarker);
const endIdx = src.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('ERROR: Could not find boot function markers');
  console.log('startMarker found:', startIdx !== -1);
  console.log('endMarker found:', endIdx !== -1);
  process.exit(1);
}

const newBootFn = `// ─── Boot Sequence Orchestrator ──────────────────────────────────────────────
function runBootSequence(options) {
  if (!options) options = {};
  var el = document.getElementById('netcoop-boot-screen');
  var bar = document.getElementById('boot-progress-bar');
  var txt = document.getElementById('boot-status-text');
  if (!el) return;

  el.classList.remove('out');
  el.style.display = '';
  if (bar) bar.style.width = '0%';
  if (txt) txt.textContent = 'Preparing workspace\\u2026';

  var msgs = [
    [15,  'Loading network topology\\u2026'],
    [30,  'Connecting diagnostic agents\\u2026'],
    [50,  'Binding Groq LPU inference\\u2026'],
    [70,  'Synchronising agent mesh\\u2026'],
    [90,  'Running self-checks\\u2026'],
    [100, 'Ready']
  ];

  var t = 0;
  for (var i = 0; i < msgs.length; i++) {
    t += 350 + Math.floor(Math.random() * 100);
    (function(pct, msg, d) {
      setTimeout(function() {
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = msg;
      }, d);
    })(msgs[i][0], msgs[i][1], t);
  }

  setTimeout(function() {
    el.classList.add('out');
    setTimeout(function() { el.style.display = 'none'; }, 600);
    if (options.isReboot) {
      toast('System rebooted', 'NetCoop AI ready', 'ok');
    }
  }, t + 300);
}

`;

src = src.substring(0, startIdx) + newBootFn + src.substring(endIdx);
fs.writeFileSync(fpath, src, 'utf8');
console.log('SUCCESS: Boot function replaced with minimal splash version');
