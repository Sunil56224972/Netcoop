const fs = require('fs');
const path = require('path');

const mediaDir = 'audit_icons/ppt/media';
const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.png'));

files.forEach(f => {
  const buf = fs.readFileSync(path.join(mediaDir, f));
  if (buf.length >= 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    console.log(`${f}: ${width}x${height} (${buf.length} bytes)`);
  }
});

