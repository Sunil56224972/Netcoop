const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDeck = path.resolve('NetCoop_AI_Presentation_Master.pptx');
const auditDir = path.resolve('audit_master');
if (fs.existsSync(auditDir)) fs.rmSync(auditDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${targetDeck.replace(/\\/g, '\\\\')}', '${auditDir.replace(/\\/g, '\\\\')}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

const slidesDir = path.join(auditDir, 'ppt', 'slides');

function checkSlideFit(num) {
  const xml = fs.readFileSync(path.join(slidesDir, `slide${num}.xml`), 'utf8');
  console.log(`\n=================== SLIDE ${num} DETAILED INSPECTION ===================`);
  
  // Strictly match <p:sp> shapes, NOT <p:spPr>
  const shapes = xml.match(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g) || [];
  let overflows = 0;
  
  shapes.forEach((s, idx) => {
    const name = (s.match(/name="([^"]+)"/) || [])[1];
    const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    
    const textRuns = (s.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
    
    if (textRuns.length > 0) {
      const totalChars = textRuns.join(' ').length;
      const wInches = ext ? (parseInt(ext[1]) / 914400).toFixed(2) : '?';
      const hInches = ext ? (parseInt(ext[2]) / 914400).toFixed(2) : '?';
      const xInches = off ? (parseInt(off[1]) / 914400).toFixed(2) : '?';
      const yInches = off ? (parseInt(off[2]) / 914400).toFixed(2) : '?';
      
      const sizes = (s.match(/sz="(\d+)"/g) || []).map(sz => parseInt(sz.match(/\d+/)[0]) / 100);
      const avgSz = sizes.length ? (sizes.reduce((a,b)=>a+b,0)/sizes.length).toFixed(1) : '18';
      
      const charsPerLine = Math.max(10, Math.floor((parseFloat(wInches) * 72) / (parseFloat(avgSz) * 0.55)));
      const estimatedLines = textRuns.reduce((acc, t) => acc + Math.ceil(t.length / charsPerLine), 0);
      const neededHeightInches = (estimatedLines * (parseFloat(avgSz) * 1.3) / 72).toFixed(2);
      
      const isOverflowing = parseFloat(neededHeightInches) > parseFloat(hInches);
      if (isOverflowing) {
        overflows++;
        console.log(`  ⚠️ OVERFLOW in [#${idx}] ${name} @ (${xInches}", ${yInches}") size: ${wInches}" x ${hInches}" | needed: ${neededHeightInches}"`);
        console.log(`     Text: "${textRuns.join(' // ').substring(0, 90)}"`);
      }
    }
  });
  
  if (overflows === 0) {
    console.log(`  ✅ All shapes in Slide ${num} fit perfectly!`);
  }
}

for (let i = 1; i <= 11; i++) {
  checkSlideFit(i);
}
