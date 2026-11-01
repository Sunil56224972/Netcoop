const fs = require('fs');

const xml = fs.readFileSync('audit_icons/ppt/slides/slide10.xml', 'utf8');
const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
console.log('Slide 10 total pictures:', pics.length);
pics.forEach((p, idx) => {
  const name = (p.match(/name="([^"]+)"/) || [])[1];
  const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
  const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
  const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
  const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
  const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
  console.log(`Pic ${idx} [${name}]: @ (${xIn}", ${yIn}") size ${wIn}" x ${hIn}"`);
});

