const fs = require('fs');
const path = require('path');

// Fix BOTH directories
const dirs = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', 'Netcoop-main', 'public')
];

dirs.forEach(dir => {
  const htmlPath = path.join(dir, 'index.html');
  if (!fs.existsSync(htmlPath)) return;
  
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  const bootStart = '  <!-- NetCoop AI';
  const shellStart = '  <div class="shell"';
  
  const startIdx = html.indexOf(bootStart);
  const endIdx = html.indexOf(shellStart);
  
  if (startIdx === -1 || endIdx === -1) {
    console.log('Skipping', dir, '- markers not found');
    return;
  }

  // Completely self-contained boot screen with EVERYTHING inline
  // No external CSS, no external JS dependency for showing content
  const newBoot = `  <!-- NetCoop AI Boot Screen (Self-Contained) -->
  <div id="netcoop-boot-screen" style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#070b14 0%,#0f1729 50%,#0b1120 100%);opacity:1;visibility:visible;">

    <!-- BIG Logo on White Frame -->
    <div style="width:130px;height:130px;display:flex;align-items:center;justify-content:center;border-radius:28px;background:#ffffff;box-shadow:0 0 0 1px rgba(255,255,255,0.15),0 8px 40px rgba(0,0,0,0.5),0 0 80px rgba(59,130,246,0.08);margin-bottom:28px;">
      <img src="images/netcoop-emblem.png" alt="NetCoop AI" style="width:96px;height:96px;object-fit:contain;" />
    </div>

    <!-- Brand Name -->
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:32px;font-weight:800;color:#f1f5f9;letter-spacing:-0.03em;margin:0 0 6px;text-align:center;">NETCOOP AI</div>

    <!-- Subtitle -->
    <div style="font-family:monospace;font-size:12px;font-weight:400;color:#64748b;margin:0 0 36px;text-align:center;letter-spacing:0.04em;">AUTONOMOUS MULTI-AGENT NETWORK DIAGNOSTICS</div>

    <!-- Progress Bar -->
    <div style="width:280px;margin-bottom:16px;">
      <div style="width:100%;height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div id="boot-progress-bar" style="width:0%;height:100%;border-radius:2px;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width 0.35s ease;"></div>
      </div>
    </div>

    <!-- Status Text -->
    <div id="boot-status-text" style="font-family:monospace;font-size:11px;font-weight:500;color:#475569;margin:0 0 8px;text-align:center;min-height:16px;">Initializing system...</div>

    <!-- Percentage -->
    <div id="boot-percent" style="font-family:monospace;font-size:11px;font-weight:700;color:#3b82f6;">0%</div>

    <!-- Bottom Spec -->
    <div style="position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:center;gap:24px;font-family:monospace;font-size:10px;font-weight:500;color:#334155;letter-spacing:0.06em;">
      <span>JSON-RPC 1.0</span>
      <span style="color:#1e293b;">&#8226;</span>
      <span>GROQ LPU 120B</span>
      <span style="color:#1e293b;">&#8226;</span>
      <span>6 AGENTS</span>
    </div>
  </div>

`;

  const newHtml = html.substring(0, startIdx) + newBoot + html.substring(endIdx);
  fs.writeFileSync(htmlPath, newHtml, 'utf-8');
  console.log('Updated:', htmlPath);
});

// Also update app.js in BOTH directories
const jsDirs = [
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  path.join(__dirname, '..', 'Netcoop-main', 'public', 'js', 'app.js')
];

jsDirs.forEach(jsPath => {
  if (!fs.existsSync(jsPath)) return;
  
  let code = fs.readFileSync(jsPath, 'utf-8');
  
  const marker1 = '// \u2500\u2500\u2500 Boot Sequence Orchestrator';
  const marker2 = 'window.netcoopReboot';
  
  const startIdx = code.indexOf(marker1);
  const endIdx = code.indexOf(marker2);
  
  if (startIdx === -1 || endIdx === -1) {
    console.log('Skipping JS:', jsPath);
    return;
  }

  // Use basic JS - no arrow functions, no template literals, no const/let
  const newFn = '// \u2500\u2500\u2500 Boot Sequence Orchestrator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n' +
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
'    [10, "Loading campus topology...", 200],\r\n' +
'    [22, "Binding JSON-RPC message bus...", 450],\r\n' +
'    [35, "Starting performance agent...", 700],\r\n' +
'    [45, "Starting infrastructure agent...", 920],\r\n' +
'    [55, "Starting connectivity agent...", 1120],\r\n' +
'    [65, "Starting correlation agent...", 1320],\r\n' +
'    [75, "Starting reporting agent...", 1500],\r\n' +
'    [85, "Connecting Groq LPU inference...", 1680],\r\n' +
'    [95, "Synchronizing agent mesh (6/6)...", 1860],\r\n' +
'    [100, "System ready", 2050]\r\n' +
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
'    bs.style.transition = "opacity 0.8s ease";\r\n' +
'    bs.style.opacity = "0";\r\n' +
'    setTimeout(function() {\r\n' +
'      bs.style.visibility = "hidden";\r\n' +
'      bs.style.display = "none";\r\n' +
'    }, 900);\r\n' +
'    if (options.isReboot) {\r\n' +
'      toast("System rebooted", "NetCoop AI initialized successfully", "ok");\r\n' +
'    }\r\n' +
'  }, 2500);\r\n' +
'}\r\n\r\n';

  const newCode = code.substring(0, startIdx) + newFn + code.substring(endIdx);
  fs.writeFileSync(jsPath, newCode, 'utf-8');
  console.log('Updated JS:', jsPath);
});

console.log('\\nDone! Both directories updated.');

