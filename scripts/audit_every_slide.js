const fs = require('fs');
const path = require('path');

const deckDir = 'audit_master/ppt/slides';

for (let s = 1; s <= 11; s++) {
  const p = path.join(deckDir, `slide${s}.xml`);
  const xml = fs.readFileSync(p, 'utf8');
  
  // Find all text
  const texts = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map(m => m[1]);
  
  // Check for hallucination hunter remnants
  const hhKeywords = ['hallucin', 'claim', 'fact-check', 'fact check', 'hunter', 'plagiar', 'medical', 'journalist', 'teacher', 'student', 'study notes', 'vibeathon'];
  const remnants = texts.filter(t => hhKeywords.some(k => {
    // Exclude our intentional campus mentions like "student hostels" or "hallucinations" in Slide 8 mitigation
    const low = t.toLowerCase();
    if (low.includes('student hostels') || low.includes('misdiagnosis &amp; false alarm mitigation')) return false;
    return low.includes(k);
  }));
  
  console.log(`\n=================== SLIDE ${s} ===================`);
  console.log(`Total text nodes: ${texts.length}`);
  if (remnants.length > 0) {
    console.log(`🚨 POTENTIAL REMNANTS FOUND in Slide ${s}:`);
    remnants.forEach(r => console.log(`   - "${r}"`));
  } else {
    console.log(`✅ Clean! No Hallucination Hunter remnants.`);
  }
}
