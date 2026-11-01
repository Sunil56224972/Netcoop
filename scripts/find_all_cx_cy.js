const fs = require('fs');
const content = fs.readFileSync('scripts/build-perfect-master-deck.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('replace') && (line.includes('cx=') || line.includes('cy=') || line.includes('ext '))) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});

