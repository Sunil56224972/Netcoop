const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync('audit_master_inspect/ppt/slides/slide4.xml', 'utf8');
const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
pics.forEach(p => {
  const name = (p.match(/name="([^"]+)"/) || [])[1];
  const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
  const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
  const x = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
  const y = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
  const w = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
  const h = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
  console.log(`Slide 4 ${name} (${rId}) @ (${x}", ${y}") size ${w}" x ${h}"`);
});

