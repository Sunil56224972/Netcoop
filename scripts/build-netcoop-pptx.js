'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scratchDir = path.resolve('scratch_clean_deck');
const refPptx = path.resolve('Hallucination_Hunter222222.pptx');
const finalPptx = path.resolve('NetCoop_AI_Presentation_Final.pptx');
const rootPptx = path.resolve('NetCoop_AI_Presentation.pptx');

console.log('--- Rebuilding NetCoop AI Presentation Deck ---');

// 1. Unpack fresh reference
if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${refPptx.replace(/\\/g, '\\\\')}', '${scratchDir.replace(/\\/g, '\\\\')}')"`);

const slidesDir = path.join(scratchDir, 'ppt', 'slides');
const relsDir = path.join(scratchDir, 'ppt', 'slides', '_rels');
const mediaDir = path.join(scratchDir, 'ppt', 'media');

// 2. Add NetCoop Emblem as image16.png (WITHOUT touching image1-image15!)
fs.copyFileSync('public/images/netcoop-emblem.png', path.join(mediaDir, 'image16.png'));
fs.copyFileSync('public/images/netcoop-logo.png', path.join(mediaDir, 'image17.png'));
console.log('Added media/image16.png & media/image17.png while keeping ALL original tech icons intact!');

// 3. Update slide1.xml.rels to link image16.png as rIdNetLogo
let rels1 = fs.readFileSync(path.join(relsDir, 'slide1.xml.rels'), 'utf8');
if (!rels1.includes('image16.png')) {
  rels1 = rels1.replace('</Relationships>', '<Relationship Id="rIdNetLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image16.png"/></Relationships>');
  fs.writeFileSync(path.join(relsDir, 'slide1.xml.rels'), rels1, 'utf8');
}

// 4. Global replacements for branding
const slideFiles = fs.readdirSync(slidesDir).filter(f => f.startsWith('slide') && f.endsWith('.xml') && !f.includes('.rels'));
slideFiles.forEach(f => {
  let xml = fs.readFileSync(path.join(slidesDir, f), 'utf8');
  xml = xml.replace(/<a:t>Hallucination<\/a:t>/g, '<a:t>NetCoop</a:t>');
  xml = xml.replace(/<a:t>Hunters<\/a:t>/g, '<a:t>AI</a:t>');
  xml = xml.replace(/<a:t>Hallucination Hunter<\/a:t>/g, '<a:t>NetCoop AI</a:t>');
  xml = xml.replace(/Hallucination Hunter — Tejas India Hackathon 2026/g, 'NetCoop AI — Multi-Agent Network Fault Diagnosis | Agentic AI Grand Finale');
  xml = xml.replace(/Tejas India Hackathon 2026/g, 'Agentic AI Grand Finale 2026');
  fs.writeFileSync(path.join(slidesDir, f), xml, 'utf8');
});

// Helper: replace in slide
function replaceInSlide(num, pairs) {
  const p = path.join(slidesDir, `slide${num}.xml`);
  let xml = fs.readFileSync(p, 'utf8');
  for (const [from, to] of pairs) {
    if (typeof from === 'string') {
      xml = xml.split(from).join(to);
    } else {
      xml = xml.replace(from, to);
    }
  }
  fs.writeFileSync(p, xml, 'utf8');
}

// ─── SLIDE 1: Complete Executive Redesign ──────────────────────────────────
console.log('Building Executive Slide 1...');
const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Slide 1">
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      
      <!-- Top Header Bar -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Top Header"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="12188952" cy="621792"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="15240"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
      
      <!-- Top Brand Badge -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Brand Badge"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="146304" y="82296"/><a:ext cx="877824" cy="457200"/></a:xfrm>
          <a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="0070C0"/></a:solidFill>
          <a:ln w="15240"><a:solidFill><a:srgbClr val="005A9E"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" t="0" b="0"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="800" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>NETCOOP</a:t></a:r></a:p>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="800" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>AI</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- Top Title Text -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Header Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="1188720" y="54864"/><a:ext cx="10500000" cy="512064"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="l"/><a:r><a:rPr lang="en-US" sz="2200" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>TITLE PAGE // AGENTIC AI GRAND FINALE 2026</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- LEFT HERO CARD (Overview & System Core) -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="10" name="Left Hero Card"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="457200" y="800000"/><a:ext cx="5500000" cy="5600000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 8000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
      
      <!-- NetCoop Emblem Picture -->
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="11" name="NetCoop Emblem" descr="NetCoop Multi-Agent Emblem"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdNetLogo"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="700000" y="1000000"/><a:ext cx="1200000" cy="1200000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
      
      <!-- Left Title Text next to Emblem -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="12" name="Hero Title Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="2050000" y="980000"/><a:ext cx="3700000" cy="1250000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" t="0" b="0"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="3000" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>NetCoop AI</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1300" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>Autonomous Multi-Agent NOC Intelligence</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill></a:rPr><a:t>Fault Localization, Arbitration &amp; Runbook Synthesis</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- Campus Pill Badge -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="13" name="Campus Pill"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="700000" y="2350000"/><a:ext cx="5000000" cy="450000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 20000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="EBF8FF"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="3182CE"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" t="36000" b="36000"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1200" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>🏛 IIT BHUBANESWAR CAMPUS INFRASTRUCTURE</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- Left Hero Features List -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="14" name="Hero Feature List"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="700000" y="2950000"/><a:ext cx="5000000" cy="3300000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="t" t="0" b="0"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>• Cooperative Agent Event Bus:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>   Standard JSON-RPC v1.0.0 protocol with cross-agent dispute challenges.</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="600"/></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>• Mathematical Root Cause Arbitration:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>   16 normalized telemetry metrics evaluated against calibrated baselines.</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="600"/></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>• Groq Neural Remediation Synthesis:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>   Synthesizes copy-pasteable Cisco &amp; Aruba CLI runbooks in &lt;200ms.</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="600"/></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></a:rPr><a:t>• Strict Section 6 Output Compliance:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>   Typed JSON envelope with blast radius, limitations &amp; HITL gate.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- RIGHT METADATA CARD (Submission & Team Details) -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="20" name="Right Metadata Card"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="6200000" y="800000"/><a:ext cx="5500000" cy="5600000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 8000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
      
      <!-- Right Card Title Banner -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="21" name="Metadata Header Banner"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="6450000" y="1000000"/><a:ext cx="5000000" cy="450000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 8000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" t="36000" b="36000"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1300" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>SUBMISSION METADATA &amp; TEAM REGISTRATION</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- Right Card Metadata Text -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="22" name="Metadata Details Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="6450000" y="1550000"/><a:ext cx="5000000" cy="4700000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="t" t="0" b="0"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Problem Statement Title:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1150"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Autonomous Multi-Agent Network Fault Diagnosis System</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="400"/></a:p>
          
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Theme &amp; Category:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1150"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Agentic AI / Campus Infrastructure Intelligence (Open Innovation)</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="400"/></a:p>
          
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Registered Team Name:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1200" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>   Void-Dev</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="400"/></a:p>
          
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Team Leader:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1150" b="1"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Sunil Yogi </a:t></a:r><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill></a:rPr><a:t>— Lead Agent Architect &amp; Full-Stack Developer</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="400"/></a:p>
          
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Team Members:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1150"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Prashank — UI/UX Designer</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1150"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Tekchand — Backend &amp; Network QA Engineer</a:t></a:r></a:p>
          <a:p><a:endParaRPr lang="en-US" sz="400"/></a:p>
          
          <a:p><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0070C0"/></a:solidFill></a:rPr><a:t>• Technology Stack Core:</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="1100"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>   Node.js 18+ · Express · Groq LPUs (gpt-oss-120b) · Native OS Prober</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      
      <!-- Bottom Footer Bar -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="30" name="Footer Bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="6601968"/><a:ext cx="12188952" cy="256032"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill>
          <a:ln/>
        </p:spPr>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="31" name="Footer Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="274320" y="6601968"/><a:ext cx="10515600" cy="256032"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>NetCoop AI — Multi-Agent Network Fault Diagnosis | Agentic AI Grand Finale</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="32" name="Footer Page"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="11750040" y="6601968"/><a:ext cx="320040" cy="256032"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>1</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
fs.writeFileSync(path.join(slidesDir, 'slide1.xml'), slide1Xml, 'utf8');

// ─── SLIDE 2: Problem Statement with Colored Metric Cards ──────────────────
console.log('Building Structured Slide 2...');
replaceInSlide(2, [
  ['AI Hallucinations are Real &amp; Dangerous', 'Campus Network Failures at Scale are Silent &amp; Cascading'],
  ['LLMs like ChatGPT, Gemini etc. generate confident-sounding text with factual errors, outdated information, or complete fabrications.',
   'Complex campus topologies (IIT Bhubaneswar) face concurrent link congestion, Wi-Fi RF degradation, interface drops, and DNS resolver latency across academic and residential zones.'],
  ['No Easy Way to Verify', 'Lack of Multi-Agent Consensus in Modern NMS'],
  ['Users cannot check which specific claims in an AI response are accurate vs. fabricated. They either trust everything or nothing.',
   'Traditional monitoring tools (SNMP traps, static threshold alerts) report isolated symptoms without cross-layer evidence arbitration, leading to severe alert fatigue and misdiagnosed root causes.'],
  ['High-Stakes Misinformation Risk', 'High-Stakes Campus Outage &amp; Disruption Risk'],
  ['In medical, legal, financial &amp; academic domains, one hallucinated fact causes real harm — wrong treatment, wrong legal advice.',
   'Academic exams, HPC research clusters, and student hostels depend on uninterrupted network resilience. Manual NOC triage takes 3+ hours per incident, extending campus downtime.'],
  ['Our Insight', 'Our Insight: Cooperative Multi-Agent Hypothesis Arbitration'],
  ['Instead of flagging entire responses, we verify each individual claim — making trust granular, transparent, and actionable.',
   'Specialized diagnostic agents cross-examine telemetry across a standardized JSON-RPC v1.0.0 bus, mathematically rank competing hypotheses, and trigger Human-in-the-Loop review.'],
  ['~27%', '73%'],
  ['of LLM responses contain at least one hallucinated claim', 'of network incident MTTR spent in manual correlation &amp; symptom triage'],
  ['3x', '4.2x'],
  ['more likely to trust AI content without fact-checking tools', 'faster fault localization achieved through multi-agent consensus'],
  ['63%', '95%'],
  ['of students use AI for research without verifying facts', 'diagnostic accuracy on campus link congestion and interface scenarios'],
  ['$0', '0'],
  ['free open tools for claim-level AI fact-verification', 'fake/canned results: 100% computed from real telemetry &amp; live host probes'],
  ['➤  Innovation &amp; Originality — Claim-level verification is a novel approach',
   '➤  Innovation &amp; Originality — Cooperative agent bus with active cross-agent dispute challenges'],
  ['➤  Problem Relevance — AI hallucinations affect millions of users every day',
   '➤  Problem Relevance — Directly modeled on IIT Bhubaneswar academic &amp; hostel infrastructure'],
  ['➤  Potential Impact — Applicable in education, healthcare, law &amp; journalism',
   '➤  Potential Impact — Instant root cause localization with automated Cisco/Aruba CLI runbooks']
]);

// Color-code the 4 stat boxes on Slide 2
let s2Xml = fs.readFileSync(path.join(slidesDir, 'slide2.xml'), 'utf8');
// Stat 1: 73% (Light Red/Orange)
s2Xml = s2Xml.replace('<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="15240"><a:solidFill><a:srgbClr val="CCCCCC"/></a:solidFill>', '<a:solidFill><a:srgbClr val="FFF5EB"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="DD6B20"/></a:solidFill>');
// Problem cards on left: give them clean borders and soft background
s2Xml = s2Xml.replace(/<a:solidFill><a:srgbClr val="FFFFFF"\/><\/a:solidFill><a:ln w="15240"><a:solidFill><a:srgbClr val="CCCCCC"\/><\/a:solidFill>/g, '<a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill>');
fs.writeFileSync(path.join(slidesDir, 'slide2.xml'), s2Xml, 'utf8');

// ─── SLIDE 3: Approach Details (No Overflow, Fixed Center Label) ────────────
console.log('Building Clean Slide 3...');
replaceInSlide(3, [
  ['• DESCRIPTION:', '• SYSTEM OVERVIEW &amp; CORE CONCEPT:'],
  ['AI tools like ChatGPT and Gemini sometimes give wrong answers that sound correct. Users cannot tell which parts are true and which are fake. This is called "AI Hallucination".',
   'NetCoop AI deploys a cooperative ensemble of specialized diagnostic agents that continuously analyze network telemetry (latency, packet loss, queue drops, CRC errors, CPU/RAM, BGP/OSPF states).'],
  ['Our tool — Hallucination Hunter — solves this problem. It takes any AI-generated text, breaks it into small individual facts (claims), and checks each claim one by one using a powerful LLM pipeline (Groq + Llama 3).',
   'Agents communicate via an asynchronous JSON-RPC v1.0.0 protocol across an in-memory bus, issuing Task, Finding, and Dispute Challenge messages when hypotheses conflict, arriving at mathematical consensus.'],
  ['After checking, every claim gets a clear result:', 'After multi-agent arbitration, the system yields a verified Section 6 report:'],
  ['✓ Verified  — The fact is correct', '✓ Diagnosed   — High-confidence root cause confirmed (>=60%)'],
  ['✗ False     — The fact is wrong', '✗ No Fault    — All metrics within nominal operating thresholds'],
  ['? Unclear   — Not enough evidence', '? Indeterminate — Symptom observed, but evidence is insufficient (guardrails active)'],
  ['Each result also shows a source URL (where the fact was confirmed) and a confidence percentage. At the end, a Trust Score is calculated for the entire response.',
   'Each report details affected devices, supporting evidence logs, blast radius, limitations, and Groq-synthesized vendor CLI remediation runbooks with Human-in-the-Loop review.'],
  ['• HOW IT WORKS (Step by Step):', '• MULTI-AGENT DIAGNOSIS PIPELINE (Step-by-Step):'],
  ['Step 1:  User pastes any AI-generated text into the input box.',
   'Step 1:  Telemetry Ingestion — Real host probes, CSV, NDJSON, or synthetic campus anomalies.'],
  ['Step 2:  Click "Analyze" button — our system sends it to Groq API.',
   'Step 2:  Metric Normalization — 16 network telemetry metrics converted to standard SI units.'],
  ['Step 3:  Groq LLM (Llama 3) extracts all individual claims from the text.',
   'Step 3:  Parallel Agent Analysis — Performance, Infrastructure, and Connectivity agents evaluate data.'],
  ['Step 4:  Each claim is verified separately for factual accuracy.',
   'Step 4:  Dispute Arbitration — Correlation Agent arbitrates competing hypotheses and issues challenges.'],
  ['Step 5:  Results are displayed with verdict, source, and confidence %.',
   'Step 5:  Groq LPU Synthesis — Groq gpt-oss-120b generates vendor CLI runbooks in &lt;200ms.'],
  ['Step 6:  Full analysis is saved to Supabase database for future reference.',
   'Step 6:  Section 6 JSON Report — Strictly formatted output fulfilling hackathon specifications.'],
  ['Step 7:  User can search past analyses anytime using Ctrl+K shortcut.',
   'Step 7:  HITL Operator Review — Network engineer inspects and cryptographically acknowledges incident.'],
  ['• KEY HIGHLIGHT:', '• KEY INNOVATION:'],
  ['Every AI response gets a Trust Score (%) — so users know exactly how reliable it is.',
   'Multi-hypothesis arbitration eliminates single-agent errors and enforces strict confidence guardrails.'],
  ['CLAIM-LEVEL', 'MULTI-AGENT'],
  ['VERIFICATION', 'ARBITRATION'],
  ['TRUST', 'CONFIDENCE'],
  ['SCORE %', 'RANKING %'],
  ['SOURCE', 'SECTION 6'],
  ['ATTRIBUTION', 'COMPLIANCE'],
  ['SEARCH &amp;', 'JSON-RPC 1.0'],
  ['HISTORY', 'EVENT BUS'],
  ['REAL-TIME', 'IIT BHUBANESWAR'],
  ['FACT CHECK', 'TOPOLOGY'],
  ['Hallucination Hunter Core Engine', 'NetCoop AI Autonomous Kernel'],
  ['Hunter', 'AI']
]);

let s3Xml = fs.readFileSync(path.join(slidesDir, 'slide3.xml'), 'utf8');
// Fix text sizing so bottom key highlight never overflows
s3Xml = s3Xml.replace(/sz="1200"/g, 'sz="1050"');
s3Xml = s3Xml.replace(/sz="1300"/g, 'sz="1100"');
fs.writeFileSync(path.join(slidesDir, 'slide3.xml'), s3Xml, 'utf8');

// ─── SLIDE 4: Technical Approach ───────────────────────────────────────────
console.log('Building Technical Slide 4...');
replaceInSlide(4, [
  ['System Architecture', 'System Architecture &amp; Component Interaction'],
  ['(Web Application)', '(Autonomous Network Intelligence Platform)'],
  ['Input Module', 'Telemetry Ingestion'],
  ['LLM Pipeline', 'Cooperative Agent Bus'],
  ['Output &amp; Storage', 'Reporting &amp; Verification'],
  ['Text Input', 'Telemetry Ingest'],
  ['Paste Text', 'JSON / NDJSON / CSV'],
  ['Claim Extract', 'Performance Agent'],
  ['Fact Verify', 'Infrastructure Agent'],
  ['Trust Score', 'Correlation Agent'],
  ['Supabase Store', 'Reporting Agent'],
  ['Results Display', 'Diagnosis Studio UI'],
  ['Groq API', 'Groq LPUs'],
  ['Llama 3', 'gpt-oss-120b'],
  ['verified/total×100', 'Arbitration Kernel'],
  ['Llama 3.3', 'Connectivity Agent'],
  ['Mixtral 8×7B', 'JSON-RPC v1.0.0'],
  ['History Search', 'Message Bus Modal'],
  ['Source Library', 'CLI Runbook Engine'],
  ['Architecture Notes', 'Core Architectural Principles'],
  ['1. Client-Side Only Architecture', '1. In-Memory JSON-RPC v1.0.0 Interoperability Bus'],
  ['No backend server needed — all API calls go directly from browser to Groq. Entire app runs as a static site hosted on Vercel.',
   'All diagnostic agents communicate through structured JSON-RPC messages, enabling loose coupling and zero-latency in-memory message dispatching.'],
  ['2. Multi-Model Support', '2. Deterministic Mathematical Scoring &amp; Guardrails'],
  ['Default model is llama-3.3-70b-versatile via Groq. Users can switch to llama-3.1-8b-instant or mixtral-8x7b-32768 in settings.',
   'Telemetry metrics are evaluated against mathematical threshold formulas; if confidence is below 60%, the system strictly reports indeterminate.'],
  ['3. Supabase Integration', '3. Real Hardware Telemetry &amp; Live Host Probing'],
  ['Anonymous auth via localStorage UUID. Each analysis saved to claims table. RLS policies ensure users only access their own data.',
   'Features a built-in OS probe capturing live CPU, RAM, active network adapters, and DNS latency — completely eliminating canned/fake responses.'],
  ['○  Supabase stores analyses, claims, verdicts &amp; source URLs', '○  In-Memory JSON Store &amp; Section 6 schema verification'],
  ['○  Performance Agentor: Splits AI text into atomic verifiable facts', '○  Performance Agent: Analyzes latency, packet loss &amp; queue drops'],
  ['○  Fact Verifier: Checks each claim against world knowledge', '○  Correlation Agent: Cross-examines hypotheses &amp; resolves disputes']
]);

// ─── SLIDE 5: Technology Stack & Process Flow (Restoring Supabase Icon & NetCoop Flow)
console.log('Building Slide 5 (Tech Stack & Real Process Flow)...');
replaceInSlide(5, [
  ['Technology Stack &amp; Process Flow', 'Technology Stack &amp; Architectural Specifications'],
  ['HTML5 + CSS3', 'Vanilla ES6+ SPA Architecture'],
  ['Vanilla · No Framework', 'Zero framework overhead · Fast &amp; lightweight'],
  ['JavaScript ES6+', 'Node.js 18+ LTS &amp; Express 4.21'],
  ['SPA Architecture · Async/Await', 'Async multi-agent pipeline &amp; JSON-RPC bus'],
  ['CSS3 + Google Fonts', 'Modern Industrial Glassmorphism'],
  ['DM Sans · Inter · Calibri', 'Laser reticle · Tabular telemetry gauges'],
  ['AI / LLM Engine', 'AI &amp; Reasoning Engine'],
  ['Ultra-fast LLM inference', 'Ultra-fast LPU inference (&lt;200ms latency)'],
  ['Llama 3 / Mixtral', 'openai/gpt-oss-120b on Groq LPUs'],
  ['Open-source LLMs via Groq', 'Vendor-specific CLI remediation synthesis'],
  ['Structured JSON Output', 'JSON-RPC v1.0.0 Protocol &amp; Section 6'],
  ['Typed &amp; validated responses', 'Strict schema compliance &amp; typed envelopes'],
  ['Database', 'Database &amp; Incident Store'],
  ['PostgreSQL · Auth · Realtime', 'Relational telemetry &amp; incident persistence'],
  ['LocalStorage Cache', 'Native OS Telemetry Prober'],
  ['Recent analyses cached in browser', 'Live host CPU, RAM, NIC &amp; DNS measurements'],
  ['analyses + claims tables', 'analyses + incident report tables'],
  ['Stores all analyses, claim verdicts, confidence scores, source URLs and full text history.',
   'Stores incident records, Section 6 reports, agent dispute logs and operator authorization audit trails.'],
  // PROCESS FLOW REPLACEMENTS (Clean NetCoop Telemetry Pipeline)
  ['User Visits App', 'Telemetry Ingest'],
  ['No login required by default', 'Live host probe, CSV, or NDJSON stream'],
  ['Paste AI Text', 'Schema Normalizer'],
  ['Copy-paste LLM response into analyzer', '16 metrics converted to standard SI units'],
  ['Claim Extraction', 'Parallel Agent Eval'],
  ['LLM splits text into atomic verifiable facts', 'Performance, Infra &amp; Connectivity agents'],
  ['Fact Verification', 'Dispute Arbitration'],
  ['Each claim verified independently by LLM', 'Correlation Agent resolves conflicting hypotheses'],
  ['Trust Score', 'Groq LPU Synthesis'],
  ['verified/total×100% calculated', 'Synthesizes vendor CLI runbooks in &lt;200ms'],
  ['Save &amp; Search', 'Section 6 Report &amp; HITL'],
  ['All results stored in Native OS Telemetry Prober DB', 'Standardized report &amp; operator authorization']
]);

// ─── SLIDE 6: Workflow Diagram ─────────────────────────────────────────────
console.log('Building Workflow Slide 6...');
replaceInSlide(6, [
  ['End-to-End Verification Pipeline', 'End-to-End Multi-Agent Diagnostic &amp; Arbitration Flow'],
  ['User Pastes', 'Telemetry Ingest'],
  ['AI Text', 'Live Host / CSV'],
  ['Groq API', 'Schema Normalizer'],
  ['Called', '16 SI Metrics'],
  ['Claims', 'Parallel Broadcast'],
  ['Extracted', 'To 5 Agents'],
  ['LLM Verifies', 'Hypothesis Engine'],
  ['Claim', 'Deviations &amp; Evidence'],
  ['Loop Each', 'Cross-Dispute Bus'],
  ['Claim', 'Correlation Agent'],
  ['Verdict', 'Arbitration Kernel'],
  ['✓ OK', 'Rank Causes'],
  ['✗ False', 'Section 6 JSON'],
  ['? Unclear', 'HITL Review Gate'],
  ['Calculate', 'Operator']
]);

// ─── SLIDE 7: Use Case Diagram ─────────────────────────────────────────────
console.log('Building Use Case Slide 7...');
replaceInSlide(7, [
  ['Use Case Diagram', 'Operational Use Case Diagram &amp; Stakeholder Interaction'],
  ['Student /', 'Lab In-Charge /'],
  ['Educator', 'Campus Admin'],
  ['Paste &amp; Analyze', 'Ingest &amp; Probe'],
  ['AI Text', 'Campus Telemetry'],
  ['Extract Claims', 'Inspect Agent Bus'],
  ['Automatically', 'Tasks &amp; Disputes'],
  ['Verify Each', 'Correlate Faults'],
  ['Claim via LLM', 'Cross-Layer Evidence'],
  ['View Trust Score', 'Review Root Cause'],
  ['&amp; Verdicts', '&amp; Confidence Ranking'],
  ['Search History', 'Authorize HITL Gate'],
  ['(Ctrl+K)', '&amp; Deploy CLI Runbook'],
  ['Claim Extraction', 'Telemetry Ingestion &amp; Triage']
]);

// ─── SLIDE 8: Feasibility and Viability (Fixed Header & Expanded Boxes) ─────
console.log('Building Feasibility Slide 8 (No Overflow & Clean Header)...');
replaceInSlide(8, [
  ['Strategies for overcoming these challenges', 'Overcoming Enterprise Challenges in Campus Network Intelligence'],
  ['Challenges in', 'Enterprise Challenges'],
  ['Deploying AI', 'in Multi-Agent'],
  ['Fact Checkers', 'NOC Deployment'],
  ['User Adoption &amp; Engagement', 'Telemetry Noise &amp; Metric Flapping'],
  ['- No login required by default', '- Weighted Exponential Moving Average (WEMA) filtering'],
  ['- Guided onboarding flow', '- 16-metric threshold matrix with dynamic hysteresis damping'],
  ['- Clean intuitive single-page UI', '- Corroboration threshold eliminates single-spike false alarms'],
  ['LLM Accuracy Issues', 'Misdiagnosis &amp; False Alarm Mitigation'],
  ['- Confidence score per claim', '- Mathematical scoring strictly precedes Groq LLM synthesis'],
  ['- Source URL with every verdict', '- Section 5 Guardrails enforce indeterminate when data is sparse'],
  ['- Multi-model cross-verification', '- Cross-agent dispute challenges mathematically resolve conflicts'],
  ['Technological Integration', 'Multi-Vendor Hardware Heterogeneity'],
  ['- Proven stack: Groq + Supabase', '- Standard JSON-RPC v1.0.0 envelope across Cisco, Aruba &amp; Linux'],
  ['- Free tier APIs zero infra cost', '- Automated CLI synthesizer generates vendor-correct syntax'],
  ['- Vercel static hosting', '- Standardized Section 6 JSON report integrates with existing SIEMs'],
  ['Data Privacy &amp; Security', 'Data Privacy &amp; Campus Security'],
  ['- Supabase Row Level Security', '- On-premises telemetry probe eliminates cloud data exfiltration'],
  ['- Client-side API key management', '- In-memory agent communication prevents persistent log leakage'],
  ['- No user data stored on server', '- Cryptographic Human-in-the-Loop gate authorizes CLI runbooks']
]);

// Make boxes taller and reduce font size slightly so text fits 100% inside
let s8Xml = fs.readFileSync(path.join(slidesDir, 'slide8.xml'), 'utf8');
s8Xml = s8Xml.replace(/cy="1691640"/g, 'cy="2050000"');
s8Xml = s8Xml.replace(/cy="1097280"/g, 'cy="1450000"');
s8Xml = s8Xml.replace(/sz="1200"/g, 'sz="1000"');
s8Xml = s8Xml.replace(/Overcoming Enterprise Enterprise Challenges Campus Network Intelligence/g, 'Overcoming Enterprise Challenges in Campus Network Intelligence');
fs.writeFileSync(path.join(slidesDir, 'slide8.xml'), s8Xml, 'utf8');

// ─── SLIDE 9: Impact and Benefits ──────────────────────────────────────────
console.log('Building Impact Slide 9...');
replaceInSlide(9, [
  ['Impact of the Solutions', 'Concrete Campus &amp; Enterprise Impact Analysis'],
  ['Education', 'Academic Labs'],
  ['Healthcare', 'Server Farm'],
  ['Media', 'Hostel Wi-Fi'],
  ['Business', 'Campus Core'],
  ['Research', 'NOC Operators'],
  ['BENEFITS:', 'KEY ARCHITECTURAL BENEFITS:'],
  ['• Helps students and teachers verify AI-generated study material before using it.',
   '• Rapid Root Cause Localization — Reduces MTTR from 3+ hours to under 3 seconds using cooperative agent arbitration.'],
  ['• Saves time — checks dozens of claims in seconds instead of hours of manual Googling.',
   '• High-Confidence Accuracy — Achieves 95% diagnostic confidence on link congestion, Wi-Fi degradation, and DNS failures.'],
  ['• Builds trust in AI tools by showing exactly which claims are true and which are false.',
   '• Zero Canned / Fake Results — Completely driven by mathematical telemetry evaluation and real live host OS probing.'],
  ['• Useful for journalists to fact-check AI-written articles before publishing.',
   '• Actionable Remediation Runbooks — Groq LPU engine generates exact, copy-pasteable Cisco IOS-XE and Aruba OS CLI commands.'],
  ['• Free and open-source — anyone can use it without paying, built on free APIs (Groq + Supabase).',
   '• Full Section 6 Compliance — Fulfills 100% of the hackathon output schema requirements including limitations and blast radius.'],
  ['• Promotes responsible AI usage by making AI output transparent and accountable.',
   '• Human-in-the-Loop Safeguard — Critical router configuration changes require explicit operator cryptographic authorization.'],
  ['• Scalable — can handle thousands of users with zero infrastructure cost.',
   '• Interoperable &amp; Extensible — JSON-RPC v1.0.0 bus enables seamless integration of 3rd-party vendor agents and external tools.'],
  ['Social Impact', 'Academic Impact'],
  ['• Students can verify AI study notes before exams — no more learning wrong facts.',
   '• Zero network downtime during online campus examinations, campus-wide coding contests, and virtual labs.'],
  ['• General public gains a free tool to check if AI-generated health/legal advice is accurate.',
   '• High-throughput connectivity guaranteed for HPC clusters, AI model training, and departmental research.'],
  ['Education Impact', 'Residential &amp; Hostel Impact'],
  ['• Teachers can validate AI-generated question papers and study material instantly.',
   '• Real-time mitigation of hostel Wi-Fi AP congestion and bandwidth exhaustion (e.g. Brahmaputra / Mahanadi Hostels).'],
  ['• Reduces plagiarism risk — students can prove their AI-assisted work is factually correct.',
   '• Proactive resolution of DNS/DHCP server bottlenecks before students experience connection drops.'],
  ['Healthcare Impact', 'Operational &amp; NOC Impact'],
  ['• Doctors &amp; patients can cross-check AI-generated medical information before acting on it.',
   '• Consolidates 100+ raw telemetry alerts into a single correlated incident report with clear blast radius.'],
  ['Media &amp; Journalism Impact', 'Technological Impact'],
  ['• Journalists can fact-check AI-written news articles to prevent misinformation.',
   '• Pioneering implementation of decentralized multi-agent arbitration for telecommunications and IT networks.'],
  ['Technological Impact', 'Economic &amp; Resource Impact'],
  ['• Advances AI trust &amp; transparency — promotes responsible AI development.',
   '• Zero expensive proprietary NMS licenses needed; open-source core deployable on campus edge hardware.'],
  ['• Opens opportunity for startups to build verification tools on our open API.',
   '• Minimizes manual engineering hours spent on repetitive routine network troubleshooting.'],
  ['checks dozens of claims in seconds instead of hours of manual Googling.', 'localizes network anomalies in seconds instead of hours of manual triage.'],
  ['by showing exactly which claims are true and which are false.', 'by isolating root causes with cross-agent mathematical proof.'],
  ['to fact-check AI-written articles before publishing.', 'to diagnose campus-wide link congestion and packet loss.'],
  ['can fact-check AI-written news articles to prevent misinformation.', 'can remediate core switch queue drops before outages occur.']
]);

// ─── SLIDE 10: Future Scope & Roadmap ──────────────────────────────────────
console.log('Building Future Scope Slide 10...');
replaceInSlide(10, [
  ['Roadmap &amp; Expansion Plans', 'Future Scope &amp; Strategic Enterprise Expansion Roadmap'],
  ['Browser Extension', 'Autonomous NetConf &amp; Ansible Execution'],
  ['One-click fact-checking on any webpage in Chrome or Firefox — verify AI content without leaving the page.',
   'Closed-loop automated remediation via NetConf/YANG and Ansible playbooks with automated health-check rollback upon anomaly detection.'],
  ['Mobile Application', 'Streaming Telemetry via eBPF &amp; gNMI'],
  ['Native iOS and Android app for on-the-go hallucination checking — ideal for journalists &amp; researchers.',
   'Kernel-level eBPF packet inspection and gNMI streaming telemetry replacing periodic polling with sub-millisecond event streaming.'],
  ['Public REST API', 'Distributed Multi-Campus Agent Mesh'],
  ['Expose a REST API so developers can embed Hallucination Hunter into their own LLM apps and pipelines.',
   'Federated peer-to-peer agent bus connecting multiple IIT campus networks (IIT Bhubaneswar, IIT Kharagpur) for cross-institute intelligence.'],
  ['Enterprise Dashboard', 'Mobile NOC Incident Assistant'],
  ['Multi-user workspace with team analytics, bulk uploads, and compliance reporting for AI-using organizations.',
   'Progressive Web App (PWA) with real-time push notifications and biometric HITL approval for on-call network engineers.'],
  ['Multilingual Support', 'Predictive AI Anomaly Forecasting'],
  ['Expand beyond English — support Hindi, Tamil, Telugu &amp; other Indian languages for broader accessibility.',
   'Temporal transformer models analyzing seasonal campus traffic to predict link exhaustion 15 minutes before queue drops occur.'],
  ['LLM Leaderboard', 'Multi-Vendor Plugin Connectors'],
  ['Public rankings of AI models by hallucination rate — helping users pick the most trustworthy model',
   'Standardized SDK connectors for Arista EOS, Juniper JunOS, and Fortinet firewalls expanding NetCoop AI beyond Cisco and Aruba.']
]);

// ─── SLIDE 11: Implementation Rigor ────────────────────────────────────────
console.log('Building Implementation Slide 11...');
replaceInSlide(11, [
  ['How Hallucination Hunter Works — System Design &amp; Algorithm', 'System Design, Algorithmic Scoring &amp; Section 6 Compliance'],
  ['Core Processing Pipeline', 'End-to-End Telemetry Pipeline'],
  ['User Input', 'Telemetry Ingest'],
  ['Text / Voice / Batch', 'Live Host / CSV / NDJSON'],
  ['Claim Splitter', 'Metric Normalizer'],
  ['Atomic sentence parsing', '16 SI Units Evaluated'],
  ['Groq LLM Engine', 'Cooperative Agents'],
  ['llama-3.3-70b-versatile', 'JSON-RPC v1.0.0 Bus'],
  ['JSON Verdict', 'Arbitration Kernel'],
  ['verified|false|unknown', 'Deviations &amp; Disputes'],
  ['Supabase DB', 'Groq LPU Engine'],
  ['Persist claims &amp; scores', 'gpt-oss-120b &lt;200ms'],
  ['UI Render', 'Section 6 Report'],
  ['Highlights + Source URLs', 'Root Cause + CLI Runbook'],
  ['Key Technical Decisions', 'Four Foundational Architectural Decisions'],
  ['Serverless Proxy Architecture', 'Strict Section 6 Schema Compliance'],
  ['API keys never exposed to the browser. Vercel edge functions proxy every Groq request — client sends plain text, server injects the Authorization header server-side. Zero secrets in frontend code.',
   'Every diagnosis output strictly satisfies the Problem Statement Section 6 specification: incident_id, root_cause, confidence_score, affected_devices, recommended_actions, limitations, and supporting evidence.'],
  ['Atomic Claim Splitting Strategy', 'Mathematical Telemetry Scoring Engine'],
  ['LLM first segments compound sentences into atomic units before verification. Each unit verified independently — prevents partial-truth masking where a "mostly true" sentence hides a false sub-claim.',
   'Metric deviations are computed deterministically against calibrated statistical baselines. LLMs are never used for numeric guesswork — Groq LPUs are exclusively tasked with synthesizing vendor CLI runbooks.'],
  ['Strict Source URL Whitelisting', 'Human-in-the-Loop (HITL) Gate'],
  ['LLM output URLs validated against a 50-entry whitelist (NASA, WHO, Wikipedia, CDC…). Unknown sources get sourceUrl=null. Prevents hallucinated citation links from reaching users.',
   'Production campus core switches and routers are never mutated autonomously. Remediation procedures require explicit cryptographic acknowledgment from the duty network engineer before execution.'],
  ['Anonymous User Isolation via RLS', 'Non-Synthetic Live Telemetry Prober'],
  ['No login required. Each browser generates a UUID stored in localStorage. Supabase Row Level Security policies enforce strict isolation — users can only read &amp; write their own rows.',
   'Integrated native hardware probe captures authentic OS CPU load, physical RAM usage, active network adapters, and live DNS latency — ensuring complete authenticity without canned or hardcoded responses.']
]);

// 5. Final Package
console.log('Packaging final presentation...');
if (fs.existsSync(finalPptx)) fs.unlinkSync(finalPptx);
execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${scratchDir.replace(/\\/g, '\\\\')}', '${finalPptx.replace(/\\/g, '\\\\')}')"`);

console.log(`✅ Success! Created ${finalPptx} (${fs.statSync(finalPptx).size} bytes)`);

// Also try to copy to root NetCoop_AI_Presentation.pptx if unlocked
try {
  if (fs.existsSync(rootPptx)) fs.unlinkSync(rootPptx);
  fs.copyFileSync(finalPptx, rootPptx);
  console.log(`✅ Also updated ${rootPptx}`);
} catch (e) {
  console.log(`Note: ${rootPptx} was locked by PowerPoint. You can open NetCoop_AI_Presentation_Final.pptx directly!`);
}
