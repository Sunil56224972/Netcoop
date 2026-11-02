const fs = require('fs');
const xml = fs.readFileSync('check_s1_orig/ppt/slides/slide1.xml', 'utf8');
fs.writeFileSync('scripts/s1_orig_pretty.xml', xml, 'utf8');
console.log('Saved original slide 1 XML length:', xml.length);

