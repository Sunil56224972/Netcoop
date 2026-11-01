const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const deckPath = path.resolve('NetCoop_AI_Presentation_Perfect.pptx');
const inspectDir = path.resolve('audit_master_inspect');
if (fs.existsSync(inspectDir)) fs.rmSync(inspectDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${deckPath.replace(/\\/g, '\\\\')}', '${inspectDir.replace(/\\/g, '\\\\')}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

[5, 10, 11].forEach(slideNum => {
  console.log(`\n=================== MASTER SLIDE ${slideNum} ===================`);
  const xmlPath = path.join(inspectDir, 'ppt', 'slides', `slide${slideNum}.xml`);
  const relsPath = path.join(inspectDir, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const relsXml = fs.existsSync(relsPath) ? fs.readFileSync(relsPath, 'utf8') : '';
  
  const relMap = {};
  [...relsXml.matchAll(/Id="([^"]+)"[\s\S]*?Target="([^"]+)"/g)].forEach(m => {
    relMap[m[1]] = path.basename(m[2]);
  });
  
  const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
  pics.forEach((p, idx) => {
    const name = (p.match(/name="([^"]+)"/) || [])[1];
    const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
    const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
    const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
    const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
    const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
    console.log(`  Pic ${idx} [${name}]: rId=${rId} (${relMap[rId]}) @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}"`);
  });

  const shapes = [...xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].map(m => m[0]);
  shapes.forEach((s, idx) => {
    const name = (s.match(/name="([^"]+)"/) || [])[1];
    const text = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' // ');
    const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
    const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
    const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
    const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
    if (text && text.trim().length > 0 && !text.includes('NetCoop AI') && !text.includes('11') && !text.includes('10') && !text.includes('5')) {
      // console.log first 40 chars
      const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
      console.log(`  Sp ${idx} [${name}] @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}": "${shortText}"`);
    }
  });
});

