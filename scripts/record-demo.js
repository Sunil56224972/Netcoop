'use strict';

// NetCoop AI: Automated 4-Minute High-Fidelity Demo Video Recorder.
// Conforms directly to Round 2 Problem Statement Deliverable #4:
// "A three-to-five-minute recording demonstrating an end-to-end diagnosis,
// inter-agent communication, and the final report."

const path = require('path');
const fs = require('fs');
const app = require('../server');
const { chromium } = require('playwright');

const PORT = 4015;
const VIDEO_DIR = path.join(__dirname, '..', 'demo_video');

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// Helpers
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function setHud(page, title, desc, stepNum, totalSteps = 7) {
  await page.evaluate(({ title, desc, stepNum, totalSteps }) => {
    let hud = document.getElementById('demo-video-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'demo-video-hud';
      hud.style.position = 'fixed';
      hud.style.bottom = '24px';
      hud.style.left = '50%';
      hud.style.transform = 'translateX(-50%)';
      hud.style.zIndex = '999999';
      hud.style.background = 'rgba(15, 23, 42, 0.94)';
      hud.style.color = '#ffffff';
      hud.style.border = '1px solid rgba(56, 189, 248, 0.5)';
      hud.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.25)';
      hud.style.borderRadius = '12px';
      hud.style.padding = '12px 24px';
      hud.style.display = 'flex';
      hud.style.alignItems = 'center';
      hud.style.gap = '16px';
      hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      hud.style.pointerEvents = 'none';
      hud.style.transition = 'all 0.3s ease';
      hud.style.backdropFilter = 'blur(10px)';
      hud.style.maxWidth = '90%';
      document.body.appendChild(hud);
    }
    hud.innerHTML = `
      <div style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 700; font-size: 11px; padding: 5px 12px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
        PART ${stepNum}/${totalSteps}
      </div>
      <div>
        <div style="font-weight: 600; font-size: 15px; color: #f8fafc; letter-spacing: -0.2px;">${title}</div>
        <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">${desc}</div>
      </div>
    `;
  }, { title, desc, stepNum, totalSteps });
}

async function moveAndClick(page, selector, waitAfter = 1500) {
  const el = await page.$(selector);
  if (!el) {
    console.warn('Selector not found:', selector);
    return;
  }
  const box = await el.boundingBox();
  if (box) {
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    await page.mouse.move(targetX, targetY, { steps: 18 });
    await sleep(250);
    // Visual ripple effect
    await page.evaluate(({ x, y }) => {
      const dot = document.createElement('div');
      dot.style.position = 'fixed';
      dot.style.left = `${x - 12}px`;
      dot.style.top = `${y - 12}px`;
      dot.style.width = '24px';
      dot.style.height = '24px';
      dot.style.borderRadius = '50%';
      dot.style.background = 'rgba(56, 189, 248, 0.85)';
      dot.style.zIndex = '999998';
      dot.style.pointerEvents = 'none';
      dot.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
      document.body.appendChild(dot);
      setTimeout(() => {
        dot.style.transform = 'scale(2.5)';
        dot.style.opacity = '0';
      }, 20);
      setTimeout(() => dot.remove(), 480);
    }, { x: targetX, y: targetY });
    await el.click();
    await sleep(waitAfter);
  } else {
    await el.click();
    await sleep(waitAfter);
  }
}

async function smoothScroll(page, distance, durationMs = 2000) {
  const steps = 30;
  const stepDist = distance / steps;
  const stepTime = durationMs / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), stepDist);
    await sleep(stepTime);
  }
}

async function runDemo() {
  console.log('\n======================================================');
  console.log('   Starting NetCoop AI 4-Minute Demo Video Recording');
  console.log('======================================================\n');

  const server = app.listen(PORT, '127.0.0.1', async () => {
    console.log(`[Demo] Server listening on http://127.0.0.1:${PORT}`);
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });

    const context = await browser.newContext({
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: 1440, height: 900 }
      },
      viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    const t0 = Date.now();

    try {
      console.log('[Demo] Loading Web Application...');
      await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle' });

      // ─── PART 1: System Boot & Agent Architecture (0:00 - 0:35) ─────────────────
      console.log('[Demo] Part 1: System Boot & Architecture Inspection');
      await setHud(
        page,
        'System Boot & Multi-Agent Architecture',
        'IIT Bhubaneswar Campus Infrastructure • Initializing 6 Functional AI Agents',
        1
      );
      await sleep(3500); // Watch initial boot animation

      // Inspect Tab 0 (System Boot Tab)
      await sleep(2000);
      // Trigger interactive boot to show live multi-agent log
      await moveAndClick(page, '#btn-reboot-tab', 3000);
      
      // Scroll down to inspect the 6 Functional Agents
      await smoothScroll(page, 320, 2500);
      await sleep(8000);
      await smoothScroll(page, -320, 2000);
      await sleep(4000);

      // ─── PART 2: Campus Topology & Monitored Nodes (0:35 - 1:10) ────────────────
      console.log('[Demo] Part 2: Campus Topology & Nodes');
      await setHud(
        page,
        'Campus Topology & Monitored Nodes',
        'Navigating Core Routers, Hostel Distribution Switches, Wi-Fi APs & Server Farm',
        2
      );
      await moveAndClick(page, '.tab[data-tab="topology"]', 2500);
      await sleep(2500);

      // Hover over and examine monitored nodes
      const topoNodes = await page.$$('.topo-node');
      for (let i = 0; i < Math.min(topoNodes.length, 5); i++) {
        const box = await topoNodes[i].boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
          await sleep(2200);
        }
      }
      await smoothScroll(page, 320, 2500);
      await sleep(6000);
      await smoothScroll(page, -320, 2000);
      await sleep(3500);

      // ─── PART 3: Interoperability Protocol Specification (1:10 - 1:45) ──────────
      console.log('[Demo] Part 3: Interoperability Protocol Specification');
      await setHud(
        page,
        'JSON-RPC v1.0.0 Interoperability Protocol',
        'Reviewing Standard Message Envelopes, Agent Contracts & 16 Metrics Threshold Matrix',
        3
      );
      await moveAndClick(page, '.tab[data-tab="protocol"]', 2500);
      await sleep(3500);

      // Scroll through protocol roles and metric thresholds
      await smoothScroll(page, 450, 3000);
      await sleep(7000);
      await smoothScroll(page, 450, 3000);
      await sleep(7000);
      await smoothScroll(page, -900, 2500);
      await sleep(3000);

      // ─── PART 4: Scenario 1 - Normal Operation Baseline (1:45 - 2:20) ───────────
      console.log('[Demo] Part 4: Scenario 1 - Normal Operation');
      await setHud(
        page,
        'Scenario 1: Normal Network Operation',
        'Testing nominal campus baseline telemetry across routers, switches, and APs',
        4
      );
      await moveAndClick(page, '.tab[data-tab="studio"]', 2500);
      await sleep(2000);

      // Click Normal Operation scenario
      await moveAndClick(page, '.nc-sc[data-key="normal"]', 2000);
      await sleep(2000);

      // Run diagnosis
      await moveAndClick(page, '#nc-run', 2000);
      // Wait for diagnosis animation
      await sleep(4000);

      // Inspect green "NO FAULT DETECTED" verdict
      await smoothScroll(page, 380, 2500);
      await sleep(8000);
      await smoothScroll(page, -380, 2000);
      await sleep(3000);

      // ─── PART 5: Scenario 2 - Problem Statement Link Congestion (2:20 - 3:00) ────
      console.log('[Demo] Part 5: Scenario 2 - Link Congestion (Section 6 Spec)');
      await setHud(
        page,
        'Problem Statement Scenario: Hostel Link Congestion',
        'Hostel Core Switch (HOSTEL_CORE_SW_01) 94% utilization, 160 queue drops, 280ms latency',
        5
      );

      // Click Link Congestion scenario
      await moveAndClick(page, '.nc-sc[data-key="link_congestion"]', 2000);
      await sleep(2000);

      // Run diagnosis
      await moveAndClick(page, '#nc-run', 2000);
      // Wait for multi-agent pulse screen
      await sleep(4000);

      // Inspect Root Cause Diagnosed banner and evidence table
      await smoothScroll(page, 480, 2500);
      await sleep(6000);

      // Acknowledge HITL Operator Review
      await moveAndClick(page, '#hitl-ack-btn', 2500);
      await sleep(3000);

      // Toggle Cause Ranking and Full Section 6 JSON report
      await moveAndClick(page, '#nc-toggle-json', 2000);
      await smoothScroll(page, 350, 2000);
      await sleep(7000);
      await moveAndClick(page, '#nc-toggle-json', 1500);
      await smoothScroll(page, -830, 2500);
      await sleep(3000);

      // ─── PART 6: Agent Message Bus Deep Inspection (3:00 - 3:35) ────────────────
      console.log('[Demo] Part 6: Agent Message Bus Deep Inspection');
      await setHud(
        page,
        'Live JSON-RPC v1.0.0 Agent Message Bus',
        'Deep-inspecting async Task, Finding, Dispute Challenge, and Result envelopes',
        6
      );
      await moveAndClick(page, '.tab[data-tab="bus"]', 2500);
      await sleep(3000);

      // Inspect message 1 (finding)
      await moveAndClick(page, '.nc-inspect-msg[data-idx="0"]', 2000);
      await sleep(5000);
      await moveAndClick(page, '#modal-cancel-btn', 1500);

      // Inspect message 4 (challenge or correlation finding)
      const inspectBtns = await page.$$('.nc-inspect-msg');
      if (inspectBtns.length >= 4) {
        await moveAndClick(page, '.nc-inspect-msg[data-idx="3"]', 2000);
        await sleep(5000);
        await moveAndClick(page, '#modal-cancel-btn', 1500);
      }

      await smoothScroll(page, 320, 2000);
      await sleep(6000);
      await smoothScroll(page, -320, 2000);

      // ─── PART 7: Live Real Host Network Probing (Zero Fake Data) (3:35 - 4:00) ───
      console.log('[Demo] Part 7: Live Real Host Network Probing');
      await setHud(
        page,
        'Real-Time Live Host & Network Telemetry Prober',
        'Measuring actual host CPU, RAM, active Wi-Fi/Ethernet adapters, and DNS lookup latency',
        7
      );
      await moveAndClick(page, '.tab[data-tab="studio"]', 2000);
      await sleep(2000);

      // Clear previous inputs
      await moveAndClick(page, '#nc-clear', 1500);
      await sleep(1500);

      // Click Probe Live Network button
      await moveAndClick(page, '#nc-probe-live-btn', 3000);
      await sleep(3500);

      // Run diagnosis on genuine host measurements
      await moveAndClick(page, '#nc-run', 2000);
      await sleep(4500);

      // Theme toggle (Dark <-> Light Mode)
      await moveAndClick(page, '#theme-toggle', 2000);
      await sleep(3000);
      await moveAndClick(page, '#theme-toggle', 2000);
      await sleep(2500);

      // Return to System Boot tab for final polish
      await moveAndClick(page, '.tab[data-tab="boot"]', 2000);
      await setHud(
        page,
        'NetCoop AI: Fully Autonomous & Verified',
        '100% Problem Statement Compliant • JSON-RPC Bus • Guardrails • IIT Bhubaneswar Infrastructure',
        7
      );
      await sleep(6000);

    } catch (err) {
      console.error('[Demo Error]:', err);
    } finally {
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      console.log(`[Demo] Recorded ${elapsedSec} seconds of video walkthrough.`);
      await context.close();
      await browser.close();
      server.close();

      const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
      if (files.length) {
        const latest = files[files.length - 1];
        const finalPath = path.join(VIDEO_DIR, 'NetCoop_AI_4min_Demo_Testing_Walkthrough.webm');
        fs.copyFileSync(path.join(VIDEO_DIR, latest), finalPath);
        const stats = fs.statSync(finalPath);
        console.log(`[Demo] Video saved successfully to: ${finalPath}`);
        console.log(`[Demo] Video file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      }
    }
  });
}

runDemo();
