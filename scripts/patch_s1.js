const fs = require('fs');
const filePath = 'scripts/build-perfect-master-deck.js';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "// ===========================================================================\n// SLIDE 1: Executive Title Slide\n// ===========================================================================";
const endMarker = "fs.writeFileSync(path.join(slidesDir, 'slide1.xml'), slide1Xml, 'utf8');";

const startIndex = content.indexOf("// ===========================================================================\r\n// SLIDE 1: Executive Title Slide") !== -1 
  ? content.indexOf("// ===========================================================================\r\n// SLIDE 1: Executive Title Slide")
  : content.indexOf("// ===========================================================================\n// SLIDE 1: Executive Title Slide");

const endIndex = content.indexOf("fs.writeFileSync(path.join(slidesDir, 'slide1.xml'), slide1Xml, 'utf8');");

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find markers! startIndex:", startIndex, "endIndex:", endIndex);
  process.exit(1);
}

const replacement = `// ===========================================================================
// SLIDE 1: Title Page (Exact Hackathon Submission Registration Format)
// ===========================================================================
console.log('Building Slide 1...');
modifySlide(1, xml => {
  // Remove Rectangle 20 (stray Vibeathon box) so slide is completely clean and matches exact template
  xml = xml.replace(/<p:sp><p:nvSpPr><p:cNvPr id="21" name="Rectangle 20"[\\s\\S]*?<\\/p:sp>/, '');
  return xml;
});`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + endMarker.length);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully updated Slide 1 in scripts/build-perfect-master-deck.js!");

