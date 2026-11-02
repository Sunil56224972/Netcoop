const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Find the boot screen section and replace it entirely with inline-styled version
const bootStart = '  <!-- NetCoop AI';
const shellStart = '  <div class="shell"';

const startIdx = html.indexOf(bootStart);
const endIdx = html.indexOf(shellStart);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const newBootHTML = `  <!-- NetCoop AI Professional Boot Screen -->
  <div id="netcoop-boot-screen" style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0b0f1a;opacity:1;visibility:visible;transition:opacity 0.7s ease,visibility 0.7s ease;" class="boot-screen">
    <div style="display:flex;flex-direction:column;max-width:560px;width:92%;border-radius:12px;background:#111827;border:1px solid #2d3748;box-shadow:0 25px 80px -12px rgba(0,0,0,0.8);overflow:hidden;">

      <!-- Title Bar -->
      <div style="display:flex;align-items:center;padding:10px 16px;background:#0f172a;border-bottom:1px solid #2d3748;gap:10px;">
        <div style="display:flex;gap:6px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#eab308;display:block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:block;"></span>
        </div>
        <span style="flex:1;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#64748b;">netcoop-ai@iit-bbs:~</span>
      </div>

      <!-- Body -->
      <div style="padding:24px 24px 20px;">

        <!-- Logo + Name -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #2d3748;">
          <div style="width:64px;height:64px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.3);">
            <img src="images/netcoop-emblem.png" alt="NetCoop AI" style="width:48px;height:48px;object-fit:contain;" />
          </div>
          <div style="flex:1;">
            <div style="font-family:'IBM Plex Sans',sans-serif;font-size:20px;font-weight:700;color:#f1f5f9;margin:0 0 3px;">NetCoop AI v1.0.0</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#64748b;">Autonomous Multi-Agent Network Fault Diagnosis</div>
          </div>
        </div>

        <!-- POST Log -->
        <div id="boot-post-log" style="display:flex;flex-direction:column;gap:1px;margin-bottom:18px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;line-height:1.8;min-height:100px;"></div>

        <!-- Progress -->
        <div style="margin-bottom:0;">
          <div style="display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
            <span id="boot-status-text">INITIALIZING</span>
            <span id="boot-percent" style="color:#3b82f6;font-weight:700;font-size:12px;">0%</span>
          </div>
          <div style="width:100%;height:4px;border-radius:2px;background:#1e293b;overflow:hidden;">
            <div id="boot-progress-bar" style="width:0%;height:100%;border-radius:2px;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width 0.3s ease;"></div>
          </div>
        </div>
      </div>

      <!-- Spec Footer -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #2d3748;background:#0c1322;">
        <div style="padding:10px 14px;text-align:center;border-right:1px solid #2d3748;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.12em;color:#475569;text-transform:uppercase;">PROTOCOL</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#cbd5e1;">JSON-RPC 1.0</div>
        </div>
        <div style="padding:10px 14px;text-align:center;border-right:1px solid #2d3748;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.12em;color:#475569;text-transform:uppercase;">INFERENCE</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#cbd5e1;">GROQ LPU 120B</div>
        </div>
        <div style="padding:10px 14px;text-align:center;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.12em;color:#475569;text-transform:uppercase;">AGENTS</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#cbd5e1;">6 ONLINE</div>
        </div>
      </div>
    </div>
  </div>

`;

const newHtml = html.substring(0, startIdx) + newBootHTML + html.substring(endIdx);
fs.writeFileSync(htmlPath, newHtml, 'utf-8');
console.log('Boot HTML replaced with inline-styled version');
