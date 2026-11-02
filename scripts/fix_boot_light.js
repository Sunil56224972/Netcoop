const fs = require('fs');
const path = require('path');

// Update BOTH directories
const htmlPaths = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'Netcoop-main', 'public', 'index.html')
];

htmlPaths.forEach(htmlPath => {
  if (!fs.existsSync(htmlPath)) return;
  
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  const bootStart = '  <!-- NetCoop AI';
  const shellStart = '  <div class="shell"';
  
  const si = html.indexOf(bootStart);
  const ei = html.indexOf(shellStart);
  
  if (si === -1 || ei === -1) {
    console.log('Skip:', htmlPath);
    return;
  }

  const boot = `  <!-- NetCoop AI Boot Screen -->
  <div id="netcoop-boot-screen" style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;color-scheme:light;">
    <img src="images/netcoop-emblem.png" alt="NetCoop AI" style="width:120px;height:120px;object-fit:contain;margin-bottom:24px;" />
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:28px;font-weight:800;color:#0f172a;margin-bottom:4px;text-align:center;">NETCOOP AI</div>
    <div style="font-family:monospace;font-size:11px;color:#64748b;margin-bottom:32px;letter-spacing:0.04em;text-align:center;">AUTONOMOUS MULTI-AGENT NETWORK DIAGNOSTICS</div>
    <div style="width:240px;margin-bottom:14px;">
      <div style="width:100%;height:3px;border-radius:2px;background:#e2e8f0;overflow:hidden;">
        <div id="boot-progress-bar" style="width:0%;height:100%;background:#3b82f6;transition:width 0.3s ease;border-radius:2px;"></div>
      </div>
    </div>
    <div id="boot-status-text" style="font-family:monospace;font-size:11px;color:#94a3b8;text-align:center;">Initializing system...</div>
    <div id="boot-percent" style="font-family:monospace;font-size:11px;font-weight:700;color:#3b82f6;margin-top:6px;">0%</div>
    <div style="position:absolute;bottom:24px;display:flex;gap:20px;font-family:monospace;font-size:10px;color:#94a3b8;letter-spacing:0.04em;">
      <span>IIT Bhubaneswar</span>
      <span>&#8226;</span>
      <span>Groq LPU 120B</span>
      <span>&#8226;</span>
      <span>6 AI Agents</span>
    </div>
  </div>

`;

  html = html.substring(0, si) + boot + html.substring(ei);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('Updated:', htmlPath);
});

// Update app.js in BOTH directories  
const jsPaths = [
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  path.join(__dirname, '..', 'Netcoop-main', 'public', 'js', 'app.js')
];

jsPaths.forEach(jsPath => {
  if (!fs.existsSync(jsPath)) return;
  
  let code = fs.readFileSync(jsPath, 'utf-8');
  
  const m1 = '// \u2500\u2500\u2500 Boot Sequence Orchestrator';
  const m2 = 'window.netcoopReboot';
  
  const si = code.indexOf(m1);
  const ei = code.indexOf(m2);
  
  if (si === -1 || ei === -1) { console.log('Skip JS:', jsPath); return; }

  const fn = '// \u2500\u2500\u2500 Boot Sequence Orchestrator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n' +
'function runBootSequence(options) {\r\n' +
'  if (!options) options = {};\r\n' +
'  var bs = document.getElementById("netcoop-boot-screen");\r\n' +
'  var st = document.getElementById("boot-status-text");\r\n' +
'  var pc = document.getElementById("boot-percent");\r\n' +
'  var pb = document.getElementById("boot-progress-bar");\r\n' +
'  if (!bs) return;\r\n' +
'  bs.style.opacity = "1";\r\n' +
'  bs.style.visibility = "visible";\r\n' +
'  bs.style.display = "flex";\r\n' +
'  if (pb) pb.style.width = "0%";\r\n' +
'  if (pc) pc.textContent = "0%";\r\n' +
'  if (st) st.textContent = "Initializing system...";\r\n' +
'  var steps = [\r\n' +
'    [12, "Loading campus topology...", 250],\r\n' +
'    [25, "Binding JSON-RPC bus...", 500],\r\n' +
'    [38, "Starting performance agent...", 750],\r\n' +
'    [50, "Starting infrastructure agent...", 1000],\r\n' +
'    [62, "Starting connectivity agent...", 1200],\r\n' +
'    [74, "Starting correlation agent...", 1400],\r\n' +
'    [84, "Starting reporting agent...", 1600],\r\n' +
'    [92, "Connecting Groq LPU...", 1800],\r\n' +
'    [98, "Synchronizing agent mesh...", 2000],\r\n' +
'    [100, "System ready", 2200]\r\n' +
'  ];\r\n' +
'  for (var i = 0; i < steps.length; i++) {\r\n' +
'    (function(p, t, d) {\r\n' +
'      setTimeout(function() {\r\n' +
'        if (pb) pb.style.width = p + "%";\r\n' +
'        if (pc) pc.textContent = p + "%";\r\n' +
'        if (st) st.textContent = t;\r\n' +
'      }, d);\r\n' +
'    })(steps[i][0], steps[i][1], steps[i][2]);\r\n' +
'  }\r\n' +
'  setTimeout(function() {\r\n' +
'    bs.style.transition = "opacity 0.6s ease";\r\n' +
'    bs.style.opacity = "0";\r\n' +
'    setTimeout(function() {\r\n' +
'      bs.style.display = "none";\r\n' +
'      bs.style.visibility = "hidden";\r\n' +
'    }, 700);\r\n' +
'    if (options.isReboot) {\r\n' +
'      toast("System rebooted", "NetCoop AI initialized successfully", "ok");\r\n' +
'    }\r\n' +
'  }, 2600);\r\n' +
'}\r\n\r\n';

  code = code.substring(0, si) + fn + code.substring(ei);
  fs.writeFileSync(jsPath, code, 'utf-8');
  console.log('Updated JS:', jsPath);
});

console.log('Done!');
