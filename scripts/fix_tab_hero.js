const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Replace the old boot-logo-wrap block in the tab hero with a simple, clean logo
const oldLogoWrap = `          <div class="boot-logo-wrap" style="margin-bottom:18px">
            <div class="boot-reticle-outer"></div>
            <div class="boot-reticle-sweep"></div>
            <div class="boot-reticle-ticks">
              <span class="tick tick-n"></span>
              <span class="tick tick-e"></span>
              <span class="tick tick-s"></span>
              <span class="tick tick-w"></span>
            </div>
            <div class="boot-lens-glow"></div>
            <img src="images/netcoop-emblem.png" alt="NetCoop AI Logo" class="boot-tab-logo" id="boot-tab-interactive-logo" title="NetCoop AI — Click to reboot diagnostic agents" />
          </div>`;

const newLogoWrap = `          <div style="margin-bottom:18px">
            <img src="images/netcoop-emblem.png" alt="NetCoop AI Logo" class="boot-tab-logo" id="boot-tab-interactive-logo" title="NetCoop AI — Click to reboot diagnostic agents" />
          </div>`;

if (html.includes(oldLogoWrap)) {
  html = html.replace(oldLogoWrap, newLogoWrap);
  console.log('Tab hero logo cleaned up');
} else {
  console.log('Could not find old logo wrap in tab hero - may already be updated');
}

// Also remove the corner registration marks from the tab hero
const oldCorners = `          <span class="boot-corner boot-corner--tl" aria-hidden="true">+</span>
          <span class="boot-corner boot-corner--tr" aria-hidden="true">+</span>
          <span class="boot-corner boot-corner--bl" aria-hidden="true">+</span>
          <span class="boot-corner boot-corner--br" aria-hidden="true">+</span>`;

html = html.replace(oldCorners, '');

// Remove the old boot-overline from the tab hero
html = html.replace('          <div class="boot-overline" style="margin-bottom:2px">IIT BHUBANESWAR CAMPUS INFRASTRUCTURE</div>', '');

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('Tab hero cleanup complete');

