const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// The old boot screen HTML spans from the comment to the closing </div> before the shell
const oldBootStart = '  <!-- NetCoop AI Booting Screen Overlay';
const shellStart = '  <div class="shell"';

const startIdx = html.indexOf(oldBootStart);
const endIdx = html.indexOf(shellStart);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find boot screen markers');
  process.exit(1);
}

const newBootHTML = `  <!-- NetCoop AI — Professional Terminal Boot Screen -->
  <div id="netcoop-boot-screen" class="boot-screen" aria-label="NetCoop AI System Booting">
    <div class="boot-card">
      <!-- Terminal Title Bar -->
      <div class="boot-card__header">
        <div class="boot-hdr-dots">
          <span class="boot-hdr-dot-r"></span>
          <span class="boot-hdr-dot-y"></span>
          <span class="boot-hdr-dot-g"></span>
        </div>
        <span class="boot-hdr-title">netcoop-ai@iit-bbs:~</span>
      </div>

      <!-- Terminal Body -->
      <div class="boot-terminal-body">
        <!-- System Header -->
        <div class="boot-sys-header">
          <div class="boot-logo-frame">
            <img src="images/netcoop-emblem.png" alt="NetCoop AI" class="boot-logo" />
          </div>
          <div class="boot-sys-info">
            <p class="boot-sys-name">NetCoop AI v1.0.0</p>
            <p class="boot-sys-ver">Autonomous Multi-Agent Network Fault Diagnosis System</p>
          </div>
        </div>

        <!-- POST Log (populated by JS) -->
        <div id="boot-post-log" class="boot-post-log"></div>

        <!-- Progress Section -->
        <div class="boot-progress-section">
          <div class="boot-progress-label">
            <span id="boot-status-text">INITIALIZING SYSTEM</span>
            <span id="boot-percent" class="boot-percent">0%</span>
          </div>
          <div class="boot-progress-track">
            <div id="boot-progress-bar" class="boot-progress-bar"></div>
          </div>
        </div>
      </div>

      <!-- System Spec Footer -->
      <div class="boot-spec-matrix">
        <div class="boot-spec-cell">
          <span class="boot-spec-label">PROTOCOL</span>
          <span class="boot-spec-val">JSON-RPC 1.0</span>
        </div>
        <div class="boot-spec-cell">
          <span class="boot-spec-label">INFERENCE</span>
          <span class="boot-spec-val">GROQ LPU 120B</span>
        </div>
        <div class="boot-spec-cell">
          <span class="boot-spec-label">AGENTS</span>
          <span class="boot-spec-val">6 ONLINE</span>
        </div>
      </div>
    </div>
  </div>

`;

const newHtml = html.substring(0, startIdx) + newBootHTML + html.substring(endIdx);
fs.writeFileSync(htmlPath, newHtml, 'utf-8');
console.log('Boot HTML replaced successfully');
console.log(`Old region: chars ${startIdx}-${endIdx}`);
console.log(`New HTML length: ${newBootHTML.length}`);

