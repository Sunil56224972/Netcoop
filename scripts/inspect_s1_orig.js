const fs = require('fs');
const { execSync } = require('child_process');
const origDir = 'check_s1_orig';
if (fs.existsSync(origDir)) fs.rmSync(origDir, { recursive: true, force: true });
const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('Hallucination_Hunter222222.pptx', '${origDir}')`;
execSync(`powershell -NoProfile -Command "${ps}"`);

const xml = fs.readFileSync(`${origDir}/ppt/slides/slide1.xml`, 'utf8');
const texts = [...xml.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(m => m[1]);
console.log('Original slide 1 texts:');
console.log(texts.join('\n'));

