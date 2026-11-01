'use strict';
const path = require('path');
const fs = require('fs');
const app = require('../server');
const { chromium } = require('playwright');

const PORT = 4025;
const OUT_DIR = path.join(__dirname, '..', 'ppt_images');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  const server = app.listen(PORT, '127.0.0.1', async () => {
    console.log('Capturing presentation screenshots...');
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // 1. Boot Card
    await page.goto(`http://127.0.0.1:${PORT}`);
    await page.waitForTimeout(500);
    const bootCard = await page.$('.boot-card');
    if (bootCard) {
      await bootCard.screenshot({ path: path.join(OUT_DIR, 'screen_boot_card.png') });
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_boot_full.png') });

    // Wait for boot to finish and main view to open
    await page.waitForTimeout(1800);

    // 2. Diagnosis Studio with Link Congestion Diagnosed
    await page.click('.tab[data-tab="studio"]');
    await page.waitForTimeout(500);
    await page.click('.nc-sc[data-key="link_congestion"]');
    await page.waitForTimeout(300);
    await page.click('#nc-run');
    await page.waitForTimeout(2200);
    // Expand json report
    await page.click('#nc-toggle-json');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_diagnosis_studio.png') });

    // 3. Campus Topology
    await page.click('.tab[data-tab="topology"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_campus_topology.png') });

    // 4. Agent Message Bus
    await page.click('.tab[data-tab="bus"]');
    await page.waitForTimeout(800);
    // Click inspect on message 0
    await page.click('.nc-inspect-msg[data-idx="0"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_message_bus_modal.png') });

    console.log('Screenshots captured successfully to:', OUT_DIR);
    await browser.close();
    server.close();
    process.exit(0);
  });
}

capture();
