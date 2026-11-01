const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const origDir = path.resolve('orig_hh_inspect');
if (fs.existsSync(origDir)) fs.rmSync(origDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('Hallucination_Hunter222222.pptx', '${origDir.replace(/\\/g, '\\\\')}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

[5, 10, 11].forEach(slideNum => {
  console.log(`\n=================== ORIGINAL SLIDE ${slideNum} ===================`);
  const xmlPath = path.join(origDir, 'ppt', 'slides', `slide${slideNum}.xml`);
  const xml = fs.readFileSync(xmlPath, 'utf8');
  
  const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
  pics.forEach((p, idx) => {
    const name = (p.match(/name="([^"]+)"/) || [])[1];
    const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
    const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
    const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
    const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
    const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
    const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
    console.log(`  Pic ${idx} [${name}]: @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}"`);
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
    if (text && (text.includes('HTML') || text.includes('Groq') || text.includes('Browser') || text.includes('Serverless') || text.includes('01') || text.includes('Roadmap') || text.includes('Pipeline'))) {
      console.log(`  Sp ${idx} [${name}] @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}": "${text}"`);
    }
  });
});

