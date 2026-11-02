const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync('check_s1_orig/ppt/slides/slide1.xml', 'utf8');
console.log('--- Slide 1 XML structure ---');
// Let's print the shapes and their properties
const sps = [...xml.matchAll(/<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>/g)].map(m => m[0]);
sps.forEach((s, idx) => {
  const name = (s.match(/name="([^"]+)"/) || [])[1];
  const off = s.match(/<a:off x="([^"]+)" y="([^"]+)"/);
  const ext = s.match(/<a:ext cx="([^"]+)" cy="([^"]+)"/);
  const text = [...s.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]).join(' ');
  console.log(`Shape ${idx} [${name}] @ (${off ? off[1] : '?'}, ${off ? off[2] : '?'}) ext=(${ext ? ext[1] : '?'}, ${ext ? ext[2] : '?'}) text: "${text.trim()}"`);
});

