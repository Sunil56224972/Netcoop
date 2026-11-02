const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const targetPptx = path.resolve('NetCoop_AI_Presentation_Updated.pptx');
const inspectDir = path.resolve('inspect_updated_deck');
if (fs.existsSync(inspectDir)) fs.rmSync(inspectDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${targetPptx.replace(/\\/g, '\\\\')}', '${inspectDir.replace(/\\/g, '\\\\')}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

const xml = fs.readFileSync(path.join(inspectDir, 'ppt', 'slides', 'slide1.xml'), 'utf8');
const sps = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(m => m[0]);
console.log(`Slide 1 has ${sps.length} shapes:`);
sps.forEach((s, idx) => {
  const name = (s.match(/name="([^"]+)"/) || [])[1];
  const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
  const t = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' ');
  const x = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
  const y = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
  const w = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
  const h = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
  console.log(`[${idx}] "${name}" @ (${x}", ${y}") size ${w}" x ${h}"`);
  if (t) console.log(`      -> "${t}"`);
});

