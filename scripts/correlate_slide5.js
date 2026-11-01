const fs = require('fs');
const path = require('path');
const origDir = 'orig_hh_inspect';

// Let's check slide 5 in orig_hh_inspect to see which text corresponded to which image
const slide5Xml = fs.readFileSync(path.join(origDir, 'ppt', 'slides', 'slide5.xml'), 'utf8');
const slide10Xml = fs.readFileSync(path.join(origDir, 'ppt', 'slides', 'slide10.xml'), 'utf8');
const slide11Xml = fs.readFileSync(path.join(origDir, 'ppt', 'slides', 'slide11.xml'), 'utf8');

console.log('--- SLIDE 5 ORIGINAL TEXT & IMAGES ---');
// Let's print each shape and pic with their y coordinates
const items = [];
[...slide5Xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].forEach(m => {
  const p = m[0];
  const name = (p.match(/name="([^"]+)"/) || [])[1];
  const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
  const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const x = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
  const y = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
  items.push({ type: 'PIC', name, rId, x, y });
});

[...slide5Xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].forEach(m => {
  const s = m[0];
  const name = (s.match(/name="([^"]+)"/) || [])[1];
  const text = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(t => t[1]).join(' ');
  const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const x = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
  const y = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
  if (text.trim()) items.push({ type: 'SP', name, text: text.trim(), x, y });
});

items.sort((a, b) => parseFloat(a.y) - parseFloat(b.y) || parseFloat(a.x) - parseFloat(b.x));
items.forEach(it => {
  if (it.type === 'PIC') console.log(`  [@ y=${it.y}", x=${it.x}"] PIC ${it.name} (rId=${it.rId})`);
  else console.log(`  [@ y=${it.y}", x=${it.x}"] TEXT [${it.name}]: "${it.text}"`);
});

