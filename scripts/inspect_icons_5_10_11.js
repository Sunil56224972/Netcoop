const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Unpack NetCoop_AI_Presentation_Master.pptx to audit_master
const targetDeck = path.resolve('NetCoop_AI_Presentation_Master.pptx');
const auditDir = path.resolve('audit_icons');
if (fs.existsSync(auditDir)) fs.rmSync(auditDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${targetDeck.replace(/\\/g, '\\\\')}', '${auditDir.replace(/\\/g, '\\\\')}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

[5, 10, 11].forEach(slideNum => {
  console.log(`\n=================== SLIDE ${slideNum} ICONS & PICTURES ===================`);
  const relsPath = path.join(auditDir, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);
  const xmlPath = path.join(auditDir, 'ppt', 'slides', `slide${slideNum}.xml`);
  
  let rels = {};
  if (fs.existsSync(relsPath)) {
    const relsXml = fs.readFileSync(relsPath, 'utf8');
    const matches = [...relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)];
    matches.forEach(m => rels[m[1]] = m[2]);
    console.log('Relationships:', rels);
  }
  
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
  console.log(`Total pictures found: ${pics.length}`);
  
  pics.forEach((p, idx) => {
    const name = (p.match(/name="([^"]+)"/) || [])[1];
    const embed = (p.match(/r:embed="([^"]+)"/) || [])[1];
    const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    const target = rels[embed] || 'unknown';
    
    const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
    const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
    const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
    const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
    
    console.log(`  Pic ${idx} [${name}]: embed=${embed} (${target}) @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}"`);
  });

  // Also check all shapes with text and their proximity
  const shapes = [...xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].map(m => m[0]);
  console.log(`Total text shapes: ${shapes.length}`);
  shapes.forEach((s, idx) => {
    const name = (s.match(/name="([^"]+)"/) || [])[1];
    const text = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' // ');
    const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
    const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
    const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
    const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
    if (text) {
      console.log(`  Sp ${idx} [${name}] @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}": "${text.substring(0, 60)}"`);
    }
  });
});

