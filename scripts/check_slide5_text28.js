const fs = require('fs');
const xml = fs.readFileSync('orig_hh_inspect/ppt/slides/slide5.xml', 'utf8');
const sps = [...xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].map(m => m[0]);
sps.forEach(s => {
  const name = (s.match(/name="([^"]+)"/) || [])[1];
  const t = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' ');
  if (name && (name.includes('Text 28') || name.includes('Text 29') || name.includes('Text 30') || name.includes('Text 31') || name.includes('Text 32') || name.includes('Text 33'))) {
    console.log(`${name}: "${t}"`);
  }
});

