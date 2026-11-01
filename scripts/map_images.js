const fs = require('fs');
const path = require('path');
const origDir = 'orig_hh_inspect';

for (let i = 1; i <= 11; i++) {
  const slidePath = path.join(origDir, 'ppt', 'slides', `slide${i}.xml`);
  const relsPath = path.join(origDir, 'ppt', 'slides', '_rels', `slide${i}.xml.rels`);
  if (!fs.existsSync(slidePath)) continue;
  const slideXml = fs.readFileSync(slidePath, 'utf8');
  const relsXml = fs.existsSync(relsPath) ? fs.readFileSync(relsPath, 'utf8') : '';
  
  const relMap = {};
  [...relsXml.matchAll(/Id="([^"]+)"[\s\S]*?Target="([^"]+)"/g)].forEach(m => {
    relMap[m[1]] = path.basename(m[2]);
  });
  
  const pics = [...slideXml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
  if (pics.length > 0) {
    console.log(`Slide ${i}:`);
    pics.forEach(p => {
      const name = (p.match(/name="([^"]+)"/) || [])[1];
      const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
      const off = p.match(/<a:off x="([^"]+)" y="([^"]+)"/);
      const ext = p.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
      const xIn = off ? (parseInt(off[1])/914400).toFixed(2) : '?';
      const yIn = off ? (parseInt(off[2])/914400).toFixed(2) : '?';
      const wIn = ext ? (parseInt(ext[1])/914400).toFixed(2) : '?';
      const hIn = ext ? (parseInt(ext[2])/914400).toFixed(2) : '?';
      console.log(`  ${name}: rId=${rId} -> ${relMap[rId]} at (${xIn}", ${yIn}") size ${wIn}" x ${hIn}"`);
    });
  }
}

