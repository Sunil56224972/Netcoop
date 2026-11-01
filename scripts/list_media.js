const fs = require('fs');
const path = require('path');

const mediaDir = 'audit_icons/ppt/media';
const files = fs.readdirSync(mediaDir);
console.log('All media files:');
files.forEach(f => {
  const stat = fs.statSync(path.join(mediaDir, f));
  console.log(`  ${f}: ${stat.size} bytes`);
});

