const fs = require('fs');
const path = require('path');
const origDir = 'orig_hh_inspect';

const slide4Xml = fs.readFileSync(path.join(origDir, 'ppt', 'slides', 'slide4.xml'), 'utf8');

const items = [];
[...slide4Xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].forEach(m => {
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
  console.log(`  [@ y=${it.y}", x=${it.x}"] TEXT [${it.name}]: "${it.text}"`);
});

