const fs = require('fs');
const xml = fs.readFileSync('check_s1_orig/ppt/slides/slide2.xml', 'utf8');
const texts = [...xml.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]);
console.log('Original slide 2 texts:');
console.log(texts.join('\n'));

