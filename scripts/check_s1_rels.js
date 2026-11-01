const fs = require('fs');
const rels = fs.readFileSync('check_s1_orig/ppt/slides/_rels/slide1.xml.rels', 'utf8');
console.log('Original slide1.xml.rels:');
console.log(rels);
