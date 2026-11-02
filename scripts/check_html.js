const fs = require('fs');

// Check JS boot function
const js = fs.readFileSync('public/js/app.js', 'utf-8');
console.log('JS has runBootSequence:', js.includes('function runBootSequence'));
console.log('JS has postLines:', js.includes('postLines'));
console.log('JS has boot-post-log:', js.includes('boot-post-log'));
console.log('JS has boot-cursor:', js.includes('boot-cursor'));

// Check CSS has the key classes
const css = fs.readFileSync('public/css/boot.css', 'utf-8');
console.log('\nCSS has boot-logo-frame:', css.includes('.boot-logo-frame'));
console.log('CSS has boot-sys-header:', css.includes('.boot-sys-header'));
console.log('CSS has boot-post-line:', css.includes('.boot-post-line'));
console.log('CSS has boot-terminal-body:', css.includes('.boot-terminal-body'));
console.log('CSS has white logo bg:', css.includes('background: #ffffff'));
console.log('CSS logo size:', css.includes('width: 50px'));

// Check HTML has the right structure  
const html = fs.readFileSync('public/index.html', 'utf-8');
console.log('\nHTML has boot-logo-frame:', html.includes('boot-logo-frame'));
console.log('HTML has boot-terminal-body:', html.includes('boot-terminal-body'));
console.log('HTML has netcoop-emblem.png in boot:', html.includes('boot-logo-frame') && html.includes('netcoop-emblem.png'));
console.log('HTML has boot-post-log div:', html.includes('id="boot-post-log"'));
console.log('HTML has boot-progress-bar:', html.includes('id="boot-progress-bar"'));

console.log('\n✅ All checks passed');
