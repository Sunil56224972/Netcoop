const fs = require('fs');
const xml = fs.readFileSync('check_s1_orig/ppt/slides/slide1.xml', 'utf8');

// Let's inspect each sp in slide1.xml
const sps = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(m => m[0]);
console.log(`Found ${sps.length} shapes in original slide 1:`);
sps.forEach((s, idx) => {
  const name = (s.match(/name="([^"]+)"/) || [])[1];
  const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
  const t = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' ');
  console.log(`[${idx}] name="${name}" @ (${off?off[1]:'?'}, ${off?off[2]:'?'}) size=(${ext?ext[1]:'?'}, ${ext?ext[2]:'?'})`);
  if (t) console.log(`     text: "${t}"`);
});

