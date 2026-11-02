const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

const bootStart = '  <!-- NetCoop AI';
const shellStart = '  <div class="shell"';

const startIdx = html.indexOf(bootStart);
const endIdx = html.indexOf(shellStart);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found:', startIdx, endIdx);
  process.exit(1);
}

const newBoot = `  <!-- NetCoop AI Boot Screen -->
  <div id="netcoop-boot-screen" style="
    position:fixed; inset:0; z-index:99999;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:linear-gradient(180deg, #070b14 0%, #0f1729 50%, #0b1120 100%);
    opacity:1; visibility:visible;
    transition: opacity 0.8s ease, visibility 0.8s ease;
  " class="boot-screen">

    <!-- Big Centered Logo -->
    <div style="
      width:130px; height:130px;
      display:flex; align-items:center; justify-content:center;
      border-radius:28px;
      background:#ffffff;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08);
      margin-bottom:28px;
    ">
      <img src="images/netcoop-emblem.png" alt="NetCoop AI" style="width:96px;height:96px;object-fit:contain;" />
    </div>

    <!-- Brand Name -->
    <h1 style="
      font-family:'IBM Plex Sans',system-ui,sans-serif;
      font-size:32px; font-weight:800;
      color:#f1f5f9;
      letter-spacing:-0.03em;
      margin:0 0 6px;
      text-align:center;
    ">NETCOOP AI</h1>

    <!-- Subtitle -->
    <p style="
      font-family:'IBM Plex Mono',monospace;
      font-size:12px; font-weight:400;
      color:#64748b;
      margin:0 0 36px;
      text-align:center;
      letter-spacing:0.04em;
    ">AUTONOMOUS MULTI-AGENT NETWORK DIAGNOSTICS</p>

    <!-- Progress Bar -->
    <div style="width:280px;margin-bottom:16px;">
      <div style="width:100%;height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div id="boot-progress-bar" style="width:0%;height:100%;border-radius:2px;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width 0.35s ease;"></div>
      </div>
    </div>

    <!-- Status Text -->
    <p id="boot-status-text" style="
      font-family:'IBM Plex Mono',monospace;
      font-size:11px; font-weight:500;
      color:#475569;
      margin:0 0 8px;
      text-align:center;
      min-height:16px;
      letter-spacing:0.02em;
    ">Initializing system&hellip;</p>

    <!-- Percentage -->
    <span id="boot-percent" style="
      font-family:'IBM Plex Mono',monospace;
      font-size:11px; font-weight:700;
      color:#3b82f6;
      letter-spacing:0.04em;
    ">0%</span>

    <!-- Bottom Spec Line -->
    <div style="
      position:absolute; bottom:28px; left:0; right:0;
      display:flex; justify-content:center; gap:24px;
      font-family:'IBM Plex Mono',monospace;
      font-size:10px; font-weight:500;
      color:#334155;
      letter-spacing:0.06em;
    ">
      <span>JSON-RPC 1.0</span>
      <span style="color:#1e293b;">&bull;</span>
      <span>GROQ LPU 120B</span>
      <span style="color:#1e293b;">&bull;</span>
      <span>6 AGENTS</span>
    </div>

  </div>

`;

const newHtml = html.substring(0, startIdx) + newBoot + html.substring(endIdx);
fs.writeFileSync(htmlPath, newHtml, 'utf-8');
console.log('Boot screen replaced with logo-centered design');
console.log('File size:', newHtml.length);
