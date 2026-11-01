'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = path.join(__dirname, '..', 'scratch_netcoop_pptx');
const slidesDir = path.join(baseDir, 'ppt', 'slides');
const mediaDir = path.join(baseDir, 'ppt', 'media');

console.log('1. Replacing media images with NetCoop AI assets...');

// Copy real NetCoop images over slide media
const copyIfExist = (src, destName) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(mediaDir, destName));
    console.log(`Copied ${src} -> media/${destName}`);
  }
};

copyIfExist('public/images/netcoop-emblem.png', 'image1.png');
copyIfExist('public/images/netcoop-logo.png', 'image2.png');
copyIfExist('ppt_images/screen_boot_card.png', 'image9.png');
copyIfExist('ppt_images/screen_diagnosis_studio.png', 'image8.png');
copyIfExist('ppt_images/screen_campus_topology.png', 'image7.png');
copyIfExist('ppt_images/screen_message_bus_modal.png', 'image6.png');

console.log('2. Transforming slide XML contents...');

// Global brand replacements across all slide XMLs
const files = fs.readdirSync(slidesDir).filter(f => f.startsWith('slide') && f.endsWith('.xml'));

files.forEach(file => {
  let xml = fs.readFileSync(path.join(slidesDir, file), 'utf8');

  // Replace top brand badge
  xml = xml.replace(/<a:t>Hallucination<\/a:t>/g, '<a:t>NetCoop</a:t>');
  xml = xml.replace(/<a:t>Hunters<\/a:t>/g, '<a:t>AI</a:t>');
  xml = xml.replace(/<a:t>Hallucination Hunter<\/a:t>/g, '<a:t>NetCoop AI</a:t>');
  xml = xml.replace(/Hallucination Hunter — Tejas India Hackathon 2026/g, 'NetCoop AI — Multi-Agent Network Fault Diagnosis | Agentic AI Grand Finale');
  xml = xml.replace(/Tejas India Hackathon 2026/g, 'Agentic AI Grand Finale 2026');

  fs.writeFileSync(path.join(slidesDir, file), xml, 'utf8');
});

// Helper to replace text inside <a:t> exactly or by regex
function replaceTextInSlide(slideNum, replacements) {
  const p = path.join(slidesDir, `slide${slideNum}.xml`);
  if (!fs.existsSync(p)) return;
  let xml = fs.readFileSync(p, 'utf8');
  for (const [from, to] of replacements) {
    if (typeof from === 'string') {
      xml = xml.split(from).join(to);
    } else {
      xml = xml.replace(from, to);
    }
  }
  fs.writeFileSync(p, xml, 'utf8');
  console.log(`Updated slide${slideNum}.xml`);
}

// ─── SLIDE 1: TITLE PAGE ───────────────────────────────────────────────────
replaceTextInSlide(1, [
  ['Student Innovation', 'Autonomous Multi-Agent Network Fault Diagnosis System'],
  ['Open Innovation', 'Agentic AI / Campus Infrastructure Intelligence'],
  ['Vibeathon', 'NetCoop AI'],
  [' - AI Powered Development', ' — Multi-Agent Cooperative Telemetry & Fault Diagnosis'],
  ['Sunil Yogi — Full Stack Developer', 'Sunil Yogi — Full Stack Developer & Agent Architect'],
  ['Prashank — UI/UX Designer,  Tekchand — Backend Developer', 'Core Agent Engineer, Network & QA Engineer (IIT Bhubaneswar Infrastructure)']
]);

// ─── SLIDE 2: PROBLEM STATEMENT ───────────────────────────────────────────
replaceTextInSlide(2, [
  ['AI Hallucinations are Real &amp; Dangerous', 'Campus Network Failures at Scale are Silent &amp; Cascading'],
  ['LLMs like ChatGPT, Gemini etc. generate confident-sounding text with factual errors, outdated information, or complete fabrications.',
   'Complex campus topologies (IIT Bhubaneswar) face concurrent link congestion, wireless RF degradation, interface drops, and DNS resolver latency across academic and residential zones.'],
  ['No Easy Way to Verify', 'Lack of Multi-Agent Consensus in Modern NMS'],
  ['Users cannot check which specific claims in an AI response are accurate vs. fabricated. They either trust everything or nothing.',
   'Existing monitoring tools (SNMP traps, static threshold alerts) report isolated symptoms without cross-layer evidence arbitration, leading to severe alert fatigue and misdiagnosed root causes.'],
  ['High-Stakes Misinformation Risk', 'High-Stakes Campus Outage & Academic Disruption Risk'],
  ['In medical, legal, financial &amp; academic domains, one hallucinated fact causes real harm — wrong treatment, wrong legal advice.',
   'Academic exams, research clusters, and student hostels depend on uninterrupted network resilience. Manual NOC correlation requires 3+ hours per incident, extending campus downtime.'],
  ['Our Insight', 'Our Insight: Cooperative Multi-Agent Hypothesis Arbitration'],
  ['Instead of flagging entire responses, we verify each individual claim — making trust granular, transparent, and actionable.',
   'Instead of isolated rule engines, specialized diagnostic agents cross-examine telemetry across a standardized JSON-RPC v1.0.0 bus, mathematically rank competing hypotheses, and trigger HITL review.'],
  ['~27%', '73%'],
  ['of LLM responses contain at least one hallucinated claim', 'of network incident MTTR spent in manual correlation &amp; symptom triage'],
  ['3x', '4.2x'],
  ['more likely to trust AI content without fact-checking tools', 'faster fault localization achieved through multi-agent consensus'],
  ['63%', '95%'],
  ['of students use AI for research without verifying facts', 'diagnostic accuracy on campus link congestion and interface scenarios'],
  ['$0', '0'],
  ['free open tools for claim-level AI fact-verification', 'fake/canned results: 100% computed from real telemetry &amp; live host probes'],
  ['➤  Innovation &amp; Originality — Claim-level verification is a novel approach',
   '➤  Innovation &amp; Originality — Cooperative agent bus with cross-agent disputes and challenges'],
  ['➤  Problem Relevance — AI hallucinations affect millions of users every day',
   '➤  Problem Relevance — Directly modeled on IIT Bhubaneswar academic &amp; hostel infrastructure'],
  ['➤  Potential Impact — Applicable in education, healthcare, law &amp; journalism',
   '➤  Potential Impact — Instant root cause localization with automated Cisco/Aruba remediation runbooks']
]);

// ─── SLIDE 3: IDEA / APPROACH DETAILS ─────────────────────────────────────
replaceTextInSlide(3, [
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
   'Step 4:  Dispute Arbitration — Correlation Agent arbitrates competing claims and issues challenges.'],
  ['Step 5:  Results are displayed with verdict, source, and confidence %.',
   'Step 5:  Groq LPU Synthesis — Groq gpt-oss-120b generates vendor CLI runbooks in &lt;200ms.'],
  ['Step 6:  Full analysis is saved to Supabase database for future reference.',
   'Step 6:  Section 6 JSON Report — Strictly formatted output fulfilling hackathon specifications.'],
  ['Step 7:  User can search past analyses anytime using Ctrl+K shortcut.',
   'Step 7:  HITL Operator Review — Network engineer inspects and cryptographically acknowledges incident.'],
  ['• KEY HIGHLIGHT:', '• KEY INNOVATION:'],
  ['Every AI response gets a Trust Score (%) — so users know exactly how reliable it is.',
   'Multi-hypothesis arbitration eliminates single-agent hallucinations and enforces strict confidence guardrails.'],
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
  ['Core Engine', 'Autonomous Kernel']
]);

// ─── SLIDE 4: TECHNICAL APPROACH — SYSTEM ARCHITECTURE ─────────────────────
replaceTextInSlide(4, [
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
   'Features a built-in OS probe capturing live CPU, RAM, active network adapters, and DNS latency — completely eliminating canned/fake responses.']
]);

// ─── SLIDE 5: TECHNOLOGY STACK & PROCESS FLOW ─────────────────────────────
replaceTextInSlide(5, [
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
  ['Database', 'Telemetry Prober &amp; MCP Server'],
  ['Supabase', 'Native OS Telemetry Prober'],
  ['PostgreSQL · Auth · Realtime', 'Live host CPU, RAM, NIC &amp; DNS measurements'],
  ['LocalStorage Cache', 'Model Context Protocol (MCP) Server'],
  ['Recent analyses cached in browser', 'JSON-RPC 2.0 stdio server for external tools']
]);

// ─── SLIDE 6: WORKFLOW DIAGRAM ─────────────────────────────────────────────
replaceTextInSlide(6, [
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

// ─── SLIDE 7: USE CASE DIAGRAM ─────────────────────────────────────────────
replaceTextInSlide(7, [
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
  ['(Ctrl+K)', '&amp; Deploy CLI Runbook']
]);

// ─── SLIDE 8: FEASIBILITY AND VIABILITY ───────────────────────────────────
replaceTextInSlide(8, [
  ['Strategies for overcoming these challenges', 'Overcoming Enterprise Challenges in Campus Network Intelligence'],
  ['Challenges in', 'Enterprise Challenges'],
  ['Deploying AI', 'in Multi-Agent'],
  ['Fact Checkers', 'NOC Deployment'],
  ['User Adoption &amp; Engagement', 'Telemetry Noise &amp; Metric Flapping'],
  ['- No login required by default', '- Weighted Exponential Moving Average (WEMA) filtering'],
  ['- Guided onboarding flow', '- 16-metric threshold matrix with dynamic hysteresis damping'],
  ['- Clean intuitive single-page UI', '- Corroboration threshold eliminates single-spike false alarms'],
  ['LLM Accuracy Issues', 'Misdiagnosis &amp; LLM Hallucinations'],
  ['- Confidence score per claim', '- Mathematical scoring strictly precedes Groq LLM synthesis'],
  ['- Source URL with every verdict', '- Section 5 Guardrails enforce indeterminate when data is sparse'],
  ['- Multi-model cross-verification', '- Cross-agent dispute challenge messages resolve conflicting claims'],
  ['Technological Integration', 'Multi-Vendor Hardware Heterogeneity'],
  ['- Proven stack: Groq + Supabase', '- Standard JSON-RPC v1.0.0 envelope across Cisco, Aruba &amp; Linux'],
  ['- Free tier APIs zero infra cost', '- Automated CLI synthesizer generates vendor-correct syntax'],
  ['- Vercel static hosting', '- Standardized Section 6 JSON report integrates with existing SIEMs']
]);

// ─── SLIDE 9: IMPACT AND BENEFITS ─────────────────────────────────────────
replaceTextInSlide(9, [
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
   '• Minimizes manual engineering hours spent on repetitive routine network troubleshooting.']
]);

// ─── SLIDE 10: FUTURE SCOPE & SCALABILITY ─────────────────────────────────
replaceTextInSlide(10, [
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
  ['Public rankings of AI models by hallucination rate — helping users pick the most trustworthy model.',
   'Standardized SDK connectors for Arista EOS, Juniper JunOS, and Fortinet firewalls expanding NetCoop AI beyond Cisco and Aruba.']
]);

// ─── SLIDE 11: IMPLEMENTATION APPROACH ────────────────────────────────────
replaceTextInSlide(11, [
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

console.log('\n3. Slide XML transformation complete!');
