const fs = require('fs');

[5, 10, 11].forEach(slideNum => {
  console.log(`\n=================== SLIDE ${slideNum} PIC DETAILS ===================`);
  const xml = fs.readFileSync(`orig_hh_inspect/ppt/slides/slide${slideNum}.xml`, 'utf8');
  const pics = [...xml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g)].map(m => m[0]);
  pics.forEach((p, idx) => {
    const name = (p.match(/name="([^"]+)"/) || [])[1];
    const off = p.match(/<a:off[^>]+>/);
    const ext = p.match(/<a:ext[^>]+>/);
    console.log(`Pic ${idx} [${name}]: ${off ? off[0] : ''} ${ext ? ext[0] : ''}`);
  });
});

