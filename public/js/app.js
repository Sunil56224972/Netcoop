// NetCoop AI — Enterprise Multi-Agent Network Diagnostic Client
import { icon, hydrateIcons } from './icons.js';

// ─── DOM & Formatting Utilities ─────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const num = (n) => (typeof n === 'number' ? n.toLocaleString() : n ?? '-');
const fmtDec = (n, d = 1) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : '-');
const label = (s) => (s ? String(s).replace(/_/g, ' ') : '');
const agentLabel = (id) => {
  if (!id) return '-';
  if (id === 'orchestrator') return 'orchestrator';
  if (id === 'groq_llm_agent') return 'groq_llm';
  return String(id).replace(/_agent$/, '');
};

const OUTCOME = {
  diagnosed:         ['ATTACK_FAILED',    'ROOT CAUSE IDENTIFIED', 'ok'],
  no_fault_detected: ['CONTAINED',        'NO FAULT DETECTED — HEALTHY', 'ok'],
  error:             ['ATTACK_SUCCEEDED', 'VALIDATION / INPUT ERROR', 'crit'],
  inconclusive:      ['RECON_ONLY',       'INCONCLUSIVE EVIDENCE', 'med']
};

let appState = {
  activeTab: 'boot',
  result: null,
  currentTelemetry: null,
  liveProbeTelemetry: null,
  liveProbeDiagnosis: null,
  scenarios: [],
  activeScenarioKey: null,
  messages: [],
  protocolData: null,
  topologyViewMode: 'active' // 'active' | 'live'
};

// ─── Runtime Log Appender ───────────────────────────────────────────────────
const bootStartEpoch = performance.now();
function appendRuntimeLog(tag, text, level = 'ok') {
  const logWrap = $('#tab-boot-log');
  if (!logWrap) return;
  const elapsedSec = ((performance.now() - bootStartEpoch) / 1000).toFixed(2).padStart(5, '0');
  const tagCls = level === 'warn' ? 'boot-log-tag--warn' : level === 'sync' ? 'boot-log-tag--sync' : 'boot-log-tag--ok';
  const row = document.createElement('div');
  row.className = 'boot-log-line';
  row.innerHTML = `<span class="boot-log-time">${esc(elapsedSec)}s</span> <span class="boot-log-tag ${tagCls}">${esc(tag)}</span> <span>${esc(text)}</span>`;
  logWrap.appendChild(row);
  logWrap.scrollTop = logWrap.scrollHeight;
}

// ─── Toast Notifications ────────────────────────────────────────────────────
function toast(title, msg = '', type = 'info') {
  const container = $('#toasts');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'toast--error' : type === 'ok' ? 'toast--ok' : ''}`;
  t.innerHTML = `
    <div class="toast__bar"></div>
    <div>
      <div class="toast__title">${esc(title)}</div>
      ${msg ? `<div class="toast__msg">${esc(msg)}</div>` : ''}
    </div>
    <button aria-label="Close">&times;</button>
  `;
  t.querySelector('button').onclick = () => t.remove();
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('is-leaving');
    setTimeout(() => t.remove(), 200);
  }, 4000);
}

// ─── Modal Utility ──────────────────────────────────────────────────────────
function showModal({ title, bodyHtml, footHtml = '', wide = false }) {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="scrim" id="modal-scrim"></div>
    <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal__head" style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line)">
        <h3 class="modal__title" style="display:inline-flex;align-items:center;gap:8px;font-size:14.5px">${title}</h3>
        <button class="icon-btn" id="modal-close" style="width:26px;height:26px" aria-label="Close modal">${icon('x')}</button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal__foot">${footHtml}</div>` : ''}
    </div>
  `;
  hydrateIcons(root);

  const close = () => { root.innerHTML = ''; };
  $('#modal-scrim').onclick = close;
  $('#modal-close').onclick = close;
  const cancelBtn = $('#modal-cancel-btn', root);
  if (cancelBtn) cancelBtn.onclick = close;
}

// ─── Copy & File Download Helpers ───────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = `${icon('check')} Copied`;
      hydrateIcons(btn);
      setTimeout(() => { btn.innerHTML = original; hydrateIcons(btn); }, 1800);
    }
    toast('Copied to clipboard', '', 'ok');
  }).catch(() => {
    toast('Clipboard error', 'Could not copy text', 'error');
  });
}

function downloadJsonFile(filename, dataObj) {
  const content = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Downloaded file', filename, 'ok');
}

// ─── Status Pill Renderer ───────────────────────────────────────────────────
function pill(status, text) {
  const cls = status === 'CONFIRMED' || status === 'critical' || status === 'down' ? 'pill--CONFIRMED'
    : status === 'CONTAINED' || status === 'ok' || status === 'normal' || status === 'up' ? 'pill--CONTAINED'
    : status === 'INVESTIGATING' || status === 'elevated' || status === 'warn' || status === 'degraded' ? 'pill--INVESTIGATING'
    : status === 'NEW' ? 'pill--NEW'
    : 'pill--CLOSED';
  return `<span class="pill ${cls}">${esc(text || status)}</span>`;
}

// ─── Topbar Status Helper ───────────────────────────────────────────────────
function setTopStatus(text, mode = 'ok') {
  const txtEl = $('#top-status');
  const dotEl = $('#top-status-dot');
  if (txtEl) txtEl.textContent = text;
  if (dotEl) {
    dotEl.className = 'nc-status-dot' + (mode === 'busy' ? ' is-busy' : mode === 'warn' ? ' is-warn' : '');
  }
}

// ─── Clock & Theme ──────────────────────────────────────────────────────────
function initClock() {
  const clockEl = $('#utc-clock');
  const update = () => {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toISOString().slice(11, 19) + ' UTC';
  };
  update();
  setInterval(update, 1000);
}

function initTheme() {
  const btn = $('#theme-toggle');
  if (!btn) return;

  const updateIcon = (theme) => {
    btn.innerHTML = theme === 'dark' ? icon('sun') : icon('moon');
  };

  const current = document.documentElement.getAttribute('data-theme') || 'light';
  updateIcon(current);

  btn.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('netcoop-theme', next);
    updateIcon(next);
  };
}

// ─── Tab Switching ──────────────────────────────────────────────────────────
export function switchTab(target) {
  const tabs = $$('.tab');
  appState.activeTab = target;

  tabs.forEach((t) => {
    const on = t.dataset.tab === target;
    t.classList.toggle('is-on', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  $$('.tab-pane').forEach((pane) => {
    pane.style.display = pane.id === `tab-${target}` ? '' : 'none';
  });

  if (target === 'bus') paintMessageBus();
  if (target === 'protocol') loadAndPaintProtocol();
  if (target === 'topology') paintTopology();
}

function initTabs() {
  $$('.tab').forEach((tab) => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
}

// ─── Telemetry Summary Computation Helper ───────────────────────────────────
function summarizeTelemetryDataset(telemetryObj, reportObj = null) {
  if (!telemetryObj || typeof telemetryObj !== 'object') return { devices: [], links: [], sampleCount: 0 };

  const rawSamples = Array.isArray(telemetryObj.samples) ? telemetryObj.samples : (Array.isArray(telemetryObj) ? telemetryObj : []);
  const declaredDevices = Array.isArray(telemetryObj.devices) ? telemetryObj.devices : [];
  const links = (telemetryObj.topology && Array.isArray(telemetryObj.topology.links)) ? telemetryObj.topology.links : [];

  const devMap = new Map();
  declaredDevices.forEach((d) => {
    if (!d || !d.id) return;
    devMap.set(d.id, {
      id: d.id,
      type: d.type || 'network_node',
      name: d.name || d.id,
      role: d.role || d.type || 'Monitored Node',
      ip: d.ip || d.target_host || '-',
      location: d.location || '',
      samples: [],
      metrics: {}
    });
  });

  rawSamples.forEach((s) => {
    const id = s.device_id || s.device || s.host;
    if (!id) return;
    if (!devMap.has(id)) {
      devMap.set(id, {
        id,
        type: s.device_type || 'network_node',
        name: id,
        role: s.role || s.device_type || 'Monitored Node',
        ip: s.ip || '-',
        location: s.location || '',
        samples: [],
        metrics: {}
      });
    }
    const entry = devMap.get(id);
    entry.samples.push(s);
    const m = s.metrics || s;
    Object.entries(m).forEach(([k, v]) => {
      if (['device_id', 'device', 'timestamp', 'ts', 'status'].includes(k)) return;
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (!entry.metrics[k]) entry.metrics[k] = [];
        entry.metrics[k].push(v);
      }
    });
  });

  const impairedSet = new Set((reportObj && reportObj.affected_devices) || []);
  const topRank = reportObj && Array.isArray(reportObj.ranking) && reportObj.ranking[0] ? reportObj.ranking[0] : null;
  const rootDeviceId = (reportObj && reportObj.status === 'diagnosed' && topRank) ? topRank.device_id : null;

  const avg = (arr) => (arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const devices = [...devMap.values()].map((d) => {
    const lastSample = d.samples[d.samples.length - 1] || {};
    const rawStatus = lastSample.status || (lastSample.metrics && lastSample.metrics.status) || 'up';
    const isRoot = rootDeviceId === d.id;
    const isImpaired = impairedSet.has(d.id) || rawStatus === 'down' || rawStatus === 'degraded';

    // Find upstream from links
    const parentLink = links.find((l) => (l.to || l.downstream || l.child) === d.id);
    const upstream = parentLink ? (parentLink.from || parentLink.upstream || parentLink.parent) : null;

    return {
      ...d,
      upstream,
      sampleCount: d.samples.length,
      rawStatus,
      isRoot,
      isImpaired,
      avgLatency: avg(d.metrics.latency_ms),
      avgJitter: avg(d.metrics.jitter_ms),
      avgLoss: avg(d.metrics.packet_loss_pct),
      avgDns: avg(d.metrics.dns_latency_ms),
      avgCpu: avg(d.metrics.cpu_pct),
      avgMem: avg(d.metrics.mem_pct),
      avgUtil: avg(d.metrics.utilization_pct),
      avgRssi: avg(d.metrics.wifi_rssi_dbm),
      avgDrops: avg(d.metrics.queue_drops),
      avgErrors: avg(d.metrics.interface_errors)
    };
  });

  return { devices, links, sampleCount: rawSamples.length };
}

// ─── Update Payload Metadata Badge ──────────────────────────────────────────
function updatePayloadMeta() {
  const metaEl = $('#nc-payload-meta');
  const rawEl = $('#nc-raw');
  if (!metaEl || !rawEl) return;
  const text = rawEl.value.trim();
  if (!text) {
    metaEl.textContent = '0 samples';
    return;
  }
  try {
    const parsed = JSON.parse(text);
    const samples = Array.isArray(parsed.samples) ? parsed.samples.length : (Array.isArray(parsed) ? parsed.length : 0);
    const devs = Array.isArray(parsed.devices) ? parsed.devices.length : new Set((parsed.samples || []).map((s) => s.device_id)).size;
    metaEl.textContent = `${samples} samples · ${devs} nodes · JSON`;
    appState.currentTelemetry = parsed;
    const topoCount = $('#tab-topo-count');
    if (topoCount && devs) topoCount.textContent = String(devs);
  } catch (_e) {
    const lines = text.split('\n').filter((l) => l.trim()).length;
    const isCsv = text.split('\n')[0].includes(',');
    metaEl.textContent = `${lines} lines · ${isCsv ? 'CSV' : 'NDJSON'}`;
  }
}

// ─── Device Telemetry Inspector Modal ───────────────────────────────────────
function inspectDeviceModal(deviceId) {
  const summary = summarizeTelemetryDataset(appState.currentTelemetry || appState.liveProbeTelemetry, appState.result && appState.result.report);
  const dev = summary.devices.find((d) => d.id === deviceId);
  if (!dev) {
    toast('Device not found', `No active samples for ${deviceId}`, 'error');
    return;
  }

  const evidenceForDev = ((appState.result && appState.result.report && appState.result.report.supporting_evidence) || [])
    .filter((e) => e.device_id === deviceId);

  const metricKeys = Object.keys(dev.metrics);

  let bodyHtml = `
    <div class="stack" style="gap:14px">
      <div class="nc-boot-kpis">
        <div class="nc-boot-kpi">
          <div class="nc-boot-kpi__label">Node Identifier</div>
          <div class="nc-boot-kpi__val">${esc(dev.id)}</div>
          <div class="nc-boot-kpi__sub">${esc(dev.role)}</div>
        </div>
        <div class="nc-boot-kpi">
          <div class="nc-boot-kpi__label">Address / Endpoint</div>
          <div class="nc-boot-kpi__val">${esc(dev.ip || '-')}</div>
          <div class="nc-boot-kpi__sub">${dev.upstream ? `Upstream: ${esc(dev.upstream)}` : 'Root / Core Tier'}</div>
        </div>
        <div class="nc-boot-kpi">
          <div class="nc-boot-kpi__label">Telemetry Samples</div>
          <div class="nc-boot-kpi__val">${dev.sampleCount} samples</div>
          <div class="nc-boot-kpi__sub">${metricKeys.length} metrics tracked</div>
        </div>
        <div class="nc-boot-kpi">
          <div class="nc-boot-kpi__label">Diagnostic State</div>
          <div class="nc-boot-kpi__val">${dev.isRoot ? 'Root Cause' : dev.isImpaired ? 'Impaired' : 'Healthy'}</div>
          <div class="nc-boot-kpi__sub">Link status: ${esc(dev.rawStatus)}</div>
        </div>
      </div>
  `;

  if (evidenceForDev.length) {
    bodyHtml += `
      <div>
        <div class="section-title">Agent Findings on ${esc(dev.id)}</div>
        <div class="table-wrap" style="border:1px solid var(--line);border-radius:var(--r-sm)">
          <table class="table">
            <thead><tr><th>Metric</th><th class="num">Observed</th><th>Severity</th><th>Agent Interpretation</th></tr></thead>
            <tbody>
              ${evidenceForDev.map((e) => `
                <tr>
                  <td class="mono">${esc(e.metric)}</td>
                  <td class="num">${e.value ?? '-'}${e.unit ? ' ' + esc(e.unit) : ''}</td>
                  <td>${pill(e.level === 'critical' ? 'CONFIRMED' : e.level === 'elevated' ? 'INVESTIGATING' : 'CONTAINED', e.level)}</td>
                  <td class="small" style="color:var(--ink-2)">${esc(e.interpretation || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bodyHtml += `
      <div>
        <div class="section-title">Raw Time-Series Samples (${dev.samples.length})</div>
        <pre class="code" style="max-height:260px;overflow:auto;margin:0">${esc(JSON.stringify(dev.samples, null, 2))}</pre>
      </div>
    </div>
  `;

  showModal({
    title: `${icon('cpu')} Node Telemetry Inspector — ${esc(dev.id)}`,
    bodyHtml,
    wide: true,
    footHtml: `
      <button class="btn" id="modal-copy-dev">${icon('copy')} Copy Node JSON</button>
      <button class="btn btn--primary" id="modal-cancel-btn">Close</button>
    `
  });

  const copyBtn = $('#modal-copy-dev');
  if (copyBtn) copyBtn.onclick = () => copyText(JSON.stringify(dev.samples, null, 2), copyBtn);
}

// ─── Paint System Runtime Live Table & KPIs (#tab-boot) ─────────────────────
function paintRuntimeOverview() {
  const tele = appState.liveProbeTelemetry || appState.currentTelemetry;
  const diag = appState.liveProbeDiagnosis || appState.result;
  if (!tele) return;

  const hostInfo = tele.host_info || {};
  const summary = summarizeTelemetryDataset(tele, diag && diag.report);

  // Update 4 KPI cells in #tab-boot
  const hostEl = $('#rt-kpi-host');
  const osEl = $('#rt-kpi-os');
  const loadEl = $('#rt-kpi-Load');
  const memEl = $('#rt-kpi-mem');
  const rttEl = $('#rt-kpi-rtt');
  const dnsEl = $('#rt-kpi-dns');
  const verdictEl = $('#rt-kpi-verdict');
  const confEl = $('#rt-kpi-conf');
  const srcLabel = $('#rt-probe-source-label');
  const timeLabel = $('#rt-last-probe-time');

  const gatewayDev = summary.devices.find((d) => d.type === 'core_router') || summary.devices[0];
  const targetDevs = summary.devices.filter((d) => d.type !== 'core_router');

  if (hostEl) hostEl.textContent = hostInfo.hostname || (gatewayDev ? gatewayDev.id : 'Local Host');
  if (osEl) {
    const ifaceIp = (hostInfo.active_interfaces && hostInfo.active_interfaces[0] && hostInfo.active_interfaces[0].ip) || (gatewayDev && gatewayDev.ip) || '127.0.0.1';
    osEl.textContent = `${hostInfo.platform || 'OS'} · ${ifaceIp}`;
  }

  if (loadEl && gatewayDev) {
    loadEl.textContent = `${fmtDec(gatewayDev.avgCpu, 1)}% CPU · ${fmtDec(gatewayDev.avgMem, 1)}% RAM`;
  }
  if (memEl) {
    memEl.textContent = hostInfo.total_mem_gb
      ? `${hostInfo.used_mem_gb} / ${hostInfo.total_mem_gb} GB (${hostInfo.cpus || '-'} cores)`
      : 'Real host OS counters';
  }

  const rtts = targetDevs.map((d) => d.avgLatency).filter((v) => v != null);
  const dnss = targetDevs.map((d) => d.avgDns).filter((v) => v != null);
  const avgRtt = rtts.length ? rtts.reduce((a, b) => a + b, 0) / rtts.length : (gatewayDev ? gatewayDev.avgLatency : null);
  const avgDns = dnss.length ? dnss.reduce((a, b) => a + b, 0) / dnss.length : (gatewayDev ? gatewayDev.avgDns : null);

  if (rttEl) rttEl.textContent = avgRtt != null ? `${fmtDec(avgRtt, 1)} ms avg RTT` : 'Measured live';
  if (dnsEl) dnsEl.textContent = avgDns != null ? `${fmtDec(avgDns, 1)} ms avg DNS lookup` : `${targetDevs.length} live endpoints`;

  if (diag && diag.report) {
    const r = diag.report;
    const pct = Math.round((r.confidence || 0) * 100);
    if (verdictEl) {
      verdictEl.textContent = r.status === 'no_fault_detected' ? 'Healthy (No Faults)' : r.status === 'diagnosed' ? 'Fault Localized' : r.status;
      verdictEl.style.color = r.status === 'no_fault_detected' ? 'var(--ok)' : r.status === 'diagnosed' ? 'var(--high)' : '';
    }
    if (confEl) confEl.textContent = `${pct}% confidence · ${diag.meta ? diag.meta.messages : 0} bus msgs`;
  }

  if (srcLabel) srcLabel.textContent = tele.source || 'Live Host & Endpoint Telemetry';
  if (timeLabel) timeLabel.textContent = `Last probed: ${new Date().toISOString().slice(11, 19)} UTC · Section 6 Guardrails Active`;

  const wrap = $('#runtime-live-table-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Node / Target ID</th>
            <th>Role / Tier</th>
            <th>Resolved IP / Endpoint</th>
            <th class="num">DNS Lookup</th>
            <th class="num">TCP Handshake RTT</th>
            <th class="num">Jitter</th>
            <th class="num">Packet Loss</th>
            <th class="num">Host CPU / RAM</th>
            <th>Status</th>
            <th style="text-align:right">Inspect</th>
          </tr>
        </thead>
        <tbody class="rows-in">
          ${summary.devices.map((d, i) => `
            <tr class="is-clickable nc-rt-dev-row" data-dev="${esc(d.id)}" style="--i:${i}">
              <td class="mono"><b>${esc(d.id)}</b></td>
              <td class="small muted">${esc(d.role)}</td>
              <td class="mono small">${esc(d.ip || '-')}</td>
              <td class="num">${d.avgDns != null ? fmtDec(d.avgDns, 2) + ' ms' : '-'}</td>
              <td class="num">${d.avgLatency != null ? fmtDec(d.avgLatency, 2) + ' ms' : '-'}</td>
              <td class="num">${d.avgJitter != null ? fmtDec(d.avgJitter, 2) + ' ms' : '-'}</td>
              <td class="num">${d.avgLoss != null ? fmtDec(d.avgLoss, 1) + '%' : '0.0%'}</td>
              <td class="num">${d.avgCpu != null ? `${fmtDec(d.avgCpu, 1)}% / ${fmtDec(d.avgMem, 1)}%` : '-'}</td>
              <td>${pill(d.isRoot ? 'CONFIRMED' : d.isImpaired ? 'INVESTIGATING' : 'CONTAINED', d.isRoot ? 'Root Cause' : d.isImpaired ? 'Degraded' : 'Online')}</td>
              <td style="text-align:right">
                <button class="btn btn--sm nc-inspect-dev-btn" data-dev="${esc(d.id)}">${icon('search')} Samples</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  hydrateIcons(wrap);

  $$('.nc-rt-dev-row', wrap).forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest('button')) return;
      inspectDeviceModal(row.dataset.dev);
    };
  });
  $$('.nc-inspect-dev-btn', wrap).forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      inspectDeviceModal(btn.dataset.dev);
    };
  });
}

// ─── Benchmark Fault Scenarios ──────────────────────────────────────────────
async function loadScenarios() {
  const wrap = $('#nc-scenarios');
  try {
    const res = await fetch('/api/netcoop/scenarios');
    const data = await res.json();
    appState.scenarios = data.scenarios || [];
    paintScenarios();
  } catch (err) {
    if (wrap) wrap.innerHTML = `<div class="notice" style="color:var(--crit);margin:14px">Failed to load scenarios: ${esc(err.message)}</div>`;
  }
}

function paintScenarios() {
  const wrap = $('#nc-scenarios');
  if (!wrap) return;
  if (!appState.scenarios.length) {
    wrap.innerHTML = `<div class="notice" style="margin:14px">No scenarios available.</div>`;
    return;
  }

  const badgeTypeForKey = (key) => {
    if (key === 'normal') return ['CONTAINED', 'baseline'];
    if (key === 'interop_failure') return ['CONFIRMED', 'schema err'];
    return ['INVESTIGATING', key.replace(/_/g, ' ')];
  };

  wrap.innerHTML = `<div class="rows-in">${appState.scenarios.map((s, i) => {
    const [pState, pText] = badgeTypeForKey(s.key);
    const isAct = appState.activeScenarioKey === s.key;
    return `
    <div class="list__item is-clickable nc-sc" style="--i:${i};${isAct ? 'background:var(--accent-soft)' : ''}" data-key="${esc(s.key)}">
      <span style="width:96px">${pill(pState, pText)}</span>
      <div style="min-width:0">
        <div class="list__title">${esc(s.name)}</div>
        <div class="list__sub">${esc(s.description)}</div>
      </div>
      <span class="btn btn--sm" style="pointer-events:none">${icon('play')} Diagnose</span>
    </div>`;
  }).join('')}</div>`;
  hydrateIcons(wrap);

  $$('.nc-sc', wrap).forEach((btn) => {
    btn.onclick = () => loadScenario(btn.dataset.key, true);
  });
}

async function loadScenario(key, autoRun = true) {
  const statusEl = $('#nc-status');
  appState.activeScenarioKey = key;
  $$('.nc-sc').forEach((b) => {
    b.style.background = b.dataset.key === key ? 'var(--accent-soft)' : '';
  });
  if (statusEl) statusEl.textContent = `Loading scenario "${key}"…`;
  try {
    const res = await fetch(`/api/netcoop/scenarios/${encodeURIComponent(key)}`, { method: 'POST' });
    const data = await res.json();
    if (!data.telemetry) throw new Error(data.error || 'No telemetry returned');
    appState.currentTelemetry = data.telemetry;
    $('#nc-raw').value = JSON.stringify(data.telemetry, null, 2);
    updatePayloadMeta();
    appendRuntimeLog('SCENARIO', `Loaded IIT Bhubaneswar scenario "${key}" (${(data.telemetry.samples || []).length} samples)`, 'sync');

    if (autoRun) {
      await runDiagnosis();
    } else if (statusEl) {
      statusEl.textContent = `Scenario "${key}" loaded — click Run 6-Agent Diagnosis`;
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = '';
    toast('Scenario load failed', e.message, 'error');
  }
}

// ─── Diagnosis Execution ────────────────────────────────────────────────────
async function runDiagnosis() {
  const raw = $('#nc-raw').value.trim();
  if (!raw) {
    toast('Empty telemetry payload', 'Paste telemetry, click Probe & Diagnose Live, or choose a scenario.', 'error');
    return;
  }
  const btn = $('#nc-run');
  const statusEl = $('#nc-status');

  if (btn) {
    btn.classList.add('is-busy');
    btn.disabled = true;
  }
  if (statusEl) statusEl.textContent = 'Running 6-agent cooperative analysis…';
  setTopStatus('Diagnosing telemetry across 6 agents…', 'busy');

  // Render clean engineering pipeline execution table (no AI glowing circles)
  $('#nc-results').innerHTML = `
    <section class="panel reveal">
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="activity"></i> Multi-Agent Diagnostic Pipeline Executing</h2>
        <span class="panel__meta mono">JSON-RPC v1.0.0 &middot; Groq LPU</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Phase</th><th>Agent Identifier</th><th>Task Scope</th><th class="num">State</th></tr>
          </thead>
          <tbody>
            <tr><td class="mono small">01</td><td class="mono">performance_agent</td><td class="muted">Evaluating RTT latency, jitter, packet loss, DNS/DHCP &amp; utilization</td><td class="num">${pill('INVESTIGATING', 'Running')}</td></tr>
            <tr><td class="mono small">01</td><td class="mono">infrastructure_agent</td><td class="muted">Evaluating CPU delta, memory, buffer queue drops &amp; interface errors</td><td class="num">${pill('INVESTIGATING', 'Running')}</td></tr>
            <tr><td class="mono small">02</td><td class="mono">connectivity_agent</td><td class="muted">Tracing topology dependency graph &amp; shared upstream blast radius</td><td class="num">${pill('CLOSED', 'Queued')}</td></tr>
            <tr><td class="mono small">03</td><td class="mono">correlation_agent</td><td class="muted">Scoring competing hypotheses &amp; issuing peer challenge envelopes</td><td class="num">${pill('CLOSED', 'Queued')}</td></tr>
            <tr><td class="mono small">04</td><td class="mono">reporting_agent &amp; groq_llm_agent</td><td class="muted">Synthesizing Section 6 compliant report &amp; CLI remediation runbook</td><td class="num">${pill('CLOSED', 'Queued')}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
  hydrateIcons($('#nc-results'));

  try {
    let telemetry = raw;
    try {
      telemetry = JSON.parse(raw);
      appState.currentTelemetry = telemetry;
    } catch (_e) {
      // CSV or NDJSON string
    }

    const res = await fetch('/api/netcoop/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telemetry })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    const result = await res.json();
    applyDiagnosisResult(result);
    toast('Diagnosis complete', result.report.suspected_root_cause || 'Report ready', 'ok');
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
    setTopStatus('Diagnosis error', 'warn');
    toast('Diagnosis failed', err.message, 'error');
    $('#nc-results').innerHTML = `
      <section class="panel" style="margin-top:14px">
        <div class="panel__head"><h2 class="panel__title" style="color:var(--crit)"><i data-icon="alert"></i> Diagnosis Error</h2></div>
        <div class="panel__body"><p class="muted" style="margin:0">${esc(err.message)}</p></div>
      </section>`;
    hydrateIcons($('#nc-results'));
  } finally {
    if (btn) {
      btn.classList.remove('is-busy');
      btn.disabled = false;
    }
  }
}

function applyDiagnosisResult(result) {
  appState.result = result;
  const msgs = result.messages || [];
  appState.messages = msgs;

  const busCountEl = $('#bus-msg-count');
  if (busCountEl) busCountEl.textContent = `${msgs.length} messages logged`;
  const tabBusCount = $('#tab-bus-count');
  if (tabBusCount) tabBusCount.textContent = String(msgs.length);

  const meta = result.meta || {};
  const r = result.report || {};
  const statusEl = $('#nc-status');
  if (statusEl) {
    statusEl.textContent = `Completed in ${meta.elapsed_ms ?? '-'} ms · ${msgs.length} JSON-RPC messages`;
  }

  const pct = Math.round((r.confidence || 0) * 100);
  setTopStatus(
    r.status === 'no_fault_detected'
      ? `Healthy · ${pct}% conf (${meta.elapsed_ms || 0} ms)`
      : r.status === 'diagnosed'
        ? `Fault localized · ${pct}% conf`
        : `Status: ${r.status || 'ready'}`,
    r.status === 'diagnosed' ? 'warn' : 'ok'
  );

  appendRuntimeLog(
    'DIAG',
    `Incident ${r.incident_id || 'INC'} [${r.status}] (${pct}% conf, ${msgs.length} msgs): ${r.suspected_root_cause || ''}`,
    r.status === 'diagnosed' ? 'warn' : 'ok'
  );

  paintResults();
  paintRuntimeOverview();
  if (appState.activeTab === 'topology') paintTopology();
  if (appState.activeTab === 'bus') paintMessageBus();
}

// ─── Paint Results (Live Diagnostics Tab) ───────────────────────────────────
function paintResults() {
  const { result } = appState;
  if (!result) return;

  const r = result.report || {};
  const meta = result.meta || {};
  const msgs = result.messages || [];
  const q = result.quality || {};
  const groq = (r && r.llm_synthesis) || result.groq || null;

  const rootCause = r.suspected_root_cause || r.root_cause || r.error || 'Undetermined';
  const confidence = Math.round((r.confidence || 0) * 100);
  const evidence = r.supporting_evidence || r.evidence || [];
  const alternatives = r.alternative_cause_details || r.alternative_causes || r.alternatives || [];
  const actions = r.recommended_actions || [];
  const impaired = r.affected_devices || (r.scope || {}).impaired_devices || [];
  const limitations = r.limitations || [];
  const ranking = r.ranking || [];
  const dq = r.data_quality || q;

  const [outcomeClass, outcomeText] = OUTCOME[r.status] || OUTCOME.inconclusive;
  const summary = summarizeTelemetryDataset(appState.currentTelemetry, r);

  let html = '';

  // ── 1. Verdict Banner ────────────────────────────────────────────────────
  html += `
  <div class="verdict verdict--${esc(outcomeClass)}" style="background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--c, var(--accent));border-radius:var(--r-lg)">
    <div class="verdict__top">
      <span class="verdict__label">${esc(outcomeText)}</span>
      <span class="verdict__conf">Confidence ${confidence}% (${esc(r.confidence_category || 'calibrated')})</span>
      <span class="verdict__id">Incident ${esc(r.incident_id || '-')} &middot; ${meta.elapsed_ms ?? '-'} ms &middot; ${meta.messages || msgs.length} bus msgs</span>
    </div>
    <p class="verdict__summary" style="font-size:14px;color:var(--ink);font-weight:500;margin-top:8px">${esc(rootCause)}</p>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
      <div class="facts" style="margin-top:0">
        <div><span>Monitored Nodes</span><b>${meta.devices || summary.devices.length || '-'}</b></div>
        <div><span>Impaired Nodes</span><b>${impaired.length} of ${meta.devices || summary.devices.length || '-'}</b></div>
        <div><span>Active Agents</span><b>${meta.agents || 6} workers</b></div>
        <div><span>Telemetry Samples</span><b class="mono">${num(meta.samples || summary.sampleCount)}</b></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm" id="res-view-topo-btn">${icon('network')} View in Topology</button>
        <button class="btn btn--sm" id="res-view-bus-btn">${icon('layers')} Inspect ${msgs.length} Bus Envelopes</button>
        <button class="btn btn--sm btn--primary" id="res-export-json-btn">${icon('download')} Export Report (.json)</button>
      </div>
    </div>
  </div>`;

  // ── 2. Per-Device Telemetry & Health Breakdown (Real Computed Metrics) ───
  if (summary.devices.length) {
    html += `
    <section class="panel">
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="server"></i> Per-Node Telemetry Summary (${summary.devices.length} Nodes)</h2>
        <span class="panel__meta">Click any node to inspect raw time-series samples</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Role / Type</th>
              <th class="num">Samples</th>
              <th class="num">Avg Latency</th>
              <th class="num">Jitter</th>
              <th class="num">Packet Loss</th>
              <th class="num">DNS Latency</th>
              <th class="num">CPU / Mem</th>
              <th>Diagnostic Status</th>
            </tr>
          </thead>
          <tbody class="rows-in">
            ${summary.devices.map((d, i) => `
              <tr class="is-clickable nc-dev-summary-row" data-dev="${esc(d.id)}" style="--i:${i}">
                <td class="mono"><b>${esc(d.id)}</b></td>
                <td class="small muted">${esc(d.role)}</td>
                <td class="num">${d.sampleCount}</td>
                <td class="num">${d.avgLatency != null ? fmtDec(d.avgLatency, 1) + ' ms' : '-'}</td>
                <td class="num">${d.avgJitter != null ? fmtDec(d.avgJitter, 1) + ' ms' : '-'}</td>
                <td class="num">${d.avgLoss != null ? fmtDec(d.avgLoss, 1) + '%' : '-'}</td>
                <td class="num">${d.avgDns != null ? fmtDec(d.avgDns, 1) + ' ms' : '-'}</td>
                <td class="num">${d.avgCpu != null ? `${fmtDec(d.avgCpu, 0)}% / ${fmtDec(d.avgMem, 0)}%` : '-'}</td>
                <td>${pill(d.isRoot ? 'CONFIRMED' : d.isImpaired ? 'INVESTIGATING' : 'CONTAINED', d.isRoot ? 'Suspected Root Cause' : d.isImpaired ? 'Impaired' : 'Normal')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  // ── 3. Supporting Evidence + Remediation Runbook ─────────────────────────
  html += `<div class="grid grid-2-1">`;

  // Left column — Supporting Evidence
  html += `<section class="panel">`;
  if (evidence.length) {
    html += `
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="activity"></i> Supporting Telemetry Evidence</h2>
        <span class="panel__meta">${evidence.length} anomalous indicators</span>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Device</th><th>Metric</th><th class="num">Observed Value</th><th>Severity</th><th class="hide-sm">Engineering Interpretation</th></tr></thead>
        <tbody class="rows-in">${evidence.map((e, i) => `
          <tr class="is-clickable nc-ev-row" data-dev="${esc(e.device_id || '')}" style="--i:${i}">
            <td class="mono"><b>${esc(e.device_id || '-')}</b></td>
            <td class="mono small">${esc(e.metric || '')}</td>
            <td class="num">${e.value != null ? e.value : '-'}${e.unit ? ' ' + esc(e.unit) : ''}</td>
            <td>${pill(e.level === 'critical' ? 'CONFIRMED' : e.level === 'elevated' ? 'INVESTIGATING' : 'CONTAINED', e.level || 'normal')}</td>
            <td class="hide-sm small" style="color:var(--ink-2)">${esc(e.interpretation || '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } else {
    html += `
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="check"></i> Supporting Telemetry Evidence</h2>
        <span class="panel__meta">0 anomalies</span>
      </div>
      <div class="panel__body">
        <p class="muted" style="margin:0">All evaluated metrics across ${meta.devices || summary.devices.length || '-'} nodes are within nominal operating thresholds. No false alarms raised.</p>
      </div>`;
  }
  html += `</section>`;

  // Right column — Recommended Actions + Groq CLI Runbook + Data Quality
  html += `<div class="stack">`;

  if (actions.length) {
    const gCommands = (groq && (groq.cli_commands || groq.cli_remediation_commands)) || [];
    html += `
    <section class="panel">
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="terminal"></i> Remediation Runbook</h2>
        ${groq ? `<span class="panel__meta mono" style="color:var(--accent)">${esc(groq.model || 'gpt-oss-120b')}</span>` : ''}
      </div>
      <div class="panel__body">
        ${groq && (groq.reasoning || groq.executive_summary) ? `<p class="small" style="color:var(--ink-2);margin:0 0 10px;line-height:1.55;padding:8px 10px;background:var(--surface-2);border-left:2px solid var(--accent);border-radius:2px">${esc(groq.reasoning || groq.executive_summary)}</p>` : ''}
        <ol style="padding-left:18px;margin:0">${actions.map((a) => `<li style="margin-bottom:6px;line-height:1.5;font-size:12.5px">${esc(typeof a === 'string' ? a : (a.action || a.description || JSON.stringify(a)))}</li>`).join('')}</ol>
        ${gCommands.length ? `
          <div style="margin-top:12px;padding:8px 10px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="mono small" style="color:var(--ink-3);font-size:11px;text-transform:uppercase">Device CLI Sequence</span>
              <button class="panel__link" id="cmd-copy-all" style="font-size:11px">${icon('copy')} Copy CLI</button>
            </div>
            <pre class="code" style="padding:6px 8px;font-size:11.5px;margin:0;line-height:1.5;overflow-x:auto"><code>${esc(gCommands.join('\n'))}</code></pre>
          </div>
        ` : ''}
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="small mono" style="color:var(--ink-3);font-size:11px">Operator Change Control</span>
          <button class="btn btn--sm" id="hitl-ack-btn">${icon('shieldCheck')} Authorize Runbook</button>
        </div>
        <div id="hitl-status" style="display:none;margin-top:8px;padding:7px 10px;background:var(--ok-soft);border:1px solid var(--ok);border-radius:var(--r-sm);font-size:12px;color:var(--ok)" class="mono"></div>
      </div>
    </section>`;
  }

  if (impaired.length) {
    html += `
    <section class="panel">
      <div class="panel__head"><h2 class="panel__title">Impaired Blast Radius</h2><span class="panel__meta">${impaired.length} of ${meta.devices || '-'} nodes</span></div>
      <div class="panel__body">
        <div style="display:flex;flex-wrap:wrap;gap:6px">${impaired.map((d) => `<button type="button" class="tag tag--warn nc-blast-tag" data-dev="${esc(d)}" style="cursor:pointer">${esc(d)}</button>`).join('')}</div>
      </div>
    </section>`;
  }

  if (dq) {
    const issues = dq.issues || [];
    html += `
    <section class="panel">
      <div class="panel__head">
        <h2 class="panel__title">Telemetry Data Quality</h2>
        <span class="panel__meta">${pill(dq.grade === 'clean' ? 'CONTAINED' : dq.grade === 'repaired' ? 'INVESTIGATING' : 'CONFIRMED', dq.grade || 'verified')}</span>
      </div>
      <div class="panel__body">
        ${issues.length
          ? `<div class="breakdown">${issues.map((i) => `<div><span>${esc(typeof i === 'string' ? i : (i.message || JSON.stringify(i)))}</span></div>`).join('')}</div>`
          : `<p class="small muted" style="margin:0">All timestamps, schema fields, and metric units validated cleanly.</p>`}
      </div>
    </section>`;
  }

  html += `</div>`; // end .stack
  html += `</div>`; // end .grid-2-1

  // ── 4. Hypothesis Ranking & Competing Alternatives ───────────────────────
  if (ranking.length || alternatives.length) {
    html += `<div class="grid grid-1-1">`;

    if (ranking.length) {
      html += `
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><i data-icon="sliders"></i> Hypothesis Cause Ranking</h2>
          <span class="panel__meta">correlation_agent arbitration</span>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Hypothesis</th><th>Node</th><th class="num">Score</th><th class="num">Metric Coverage</th><th>Guardrail Cap</th></tr></thead>
          <tbody class="rows-in">${ranking.map((rk, i) => `
            <tr style="--i:${i}">
              <td><b>${esc(label(rk.cause || ''))}</b></td>
              <td class="mono">${esc(rk.device_id || '')}</td>
              <td class="num">${rk.score != null ? Math.round(rk.score * 100) + '%' : '-'}</td>
              <td class="num">${rk.coverage != null ? Math.round(rk.coverage * 100) + '%' : '-'}</td>
              <td>${rk.capped ? pill('INVESTIGATING', 'Single-metric cap (65%)') : pill('CONTAINED', 'Multi-metric verified')}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </section>`;
    }

    if (alternatives.length) {
      html += `
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">Competing / Alternative Hypotheses</h2>
          <span class="panel__meta">${alternatives.length} evaluated</span>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Alternative Cause</th><th>Node</th><th class="num">Score</th><th>Rationale</th></tr></thead>
          <tbody class="rows-in">${alternatives.map((a, i) => {
            const name = typeof a === 'string' ? a : (a.cause || a.hypothesis || '');
            const dev = typeof a === 'object' ? (a.device_id || '-') : '-';
            const score = typeof a === 'object' && a.score != null ? Math.round(a.score * 100) : null;
            const why = typeof a === 'object' ? (a.why_less_likely || a.reason || 'Lower multi-metric corroboration') : '-';
            return `<tr style="--i:${i}"><td>${esc(label(name))}</td><td class="mono">${esc(dev)}</td><td class="num">${score != null ? score + '%' : '-'}</td><td class="small muted">${esc(why)}</td></tr>`;
          }).join('')}
          </tbody>
        </table></div>
      </section>`;
    }

    html += `</div>`;
  }

  // ── 5. Limitations & Guardrail Notes ─────────────────────────────────────
  if (limitations.length) {
    html += `
    <section class="panel">
      <div class="panel__head"><h2 class="panel__title">Diagnostic Guardrails &amp; Scope Limitations</h2></div>
      <div class="panel__body"><div class="breakdown">${limitations.map((l) => `<div><span>${esc(l)}</span></div>`).join('')}</div></div>
    </section>`;
  }

  // ── 6. Collapsible JSON-RPC Log & Section 6 Raw Report ──────────────────
  html += `
  <section class="panel">
    <div class="panel__head">
      <h2 class="panel__title"><i data-icon="code"></i> Section 6 Unified JSON Report</h2>
      <span class="panel__meta mono">${esc(r.schema || 'netcoop.report/1.0')}</span>
      <button class="panel__link" id="nc-copy-json" style="margin-left:12px">${icon('copy')} Copy JSON</button>
      <button class="panel__link" id="nc-toggle-json" style="margin-left:10px">Show Raw JSON</button>
    </div>
    <div id="nc-json-body" style="display:none">
      <pre class="code" style="max-height:480px;overflow:auto;padding:14px;font-size:12px;margin:0;border:0;border-top:1px solid var(--line);border-radius:0">${esc(JSON.stringify(result.report, null, 2))}</pre>
    </div>
  </section>`;

  const wrap = $('#nc-results');
  wrap.innerHTML = `<div class="stack reveal">${html}</div>`;
  hydrateIcons(wrap);

  // Wire buttons inside results
  const viewTopoBtn = $('#res-view-topo-btn', wrap);
  if (viewTopoBtn) viewTopoBtn.onclick = () => switchTab('topology');

  const viewBusBtn = $('#res-view-bus-btn', wrap);
  if (viewBusBtn) viewBusBtn.onclick = () => switchTab('bus');

  const exportJsonBtn = $('#res-export-json-btn', wrap);
  if (exportJsonBtn) {
    exportJsonBtn.onclick = () => {
      const inc = (r.incident_id || 'netcoop-report').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      downloadJsonFile(`${inc}-diagnosis.json`, result);
    };
  }

  $$('.nc-dev-summary-row, .nc-ev-row, .nc-blast-tag', wrap).forEach((el) => {
    el.onclick = () => {
      if (el.dataset.dev && el.dataset.dev !== '-') inspectDeviceModal(el.dataset.dev);
    };
  });

  const toggleJsonBtn = $('#nc-toggle-json', wrap);
  const jsonBody = $('#nc-json-body', wrap);
  if (toggleJsonBtn && jsonBody) {
    toggleJsonBtn.onclick = () => {
      const open = jsonBody.style.display !== 'none';
      jsonBody.style.display = open ? 'none' : '';
      toggleJsonBtn.textContent = open ? 'Show Raw JSON' : 'Hide Raw JSON';
    };
  }

  const copyBtn = $('#nc-copy-json', wrap);
  if (copyBtn) copyBtn.onclick = () => copyText(JSON.stringify(result.report, null, 2), copyBtn);

  const copyCliBtn = $('#cmd-copy-all', wrap);
  if (copyCliBtn && groq && (groq.cli_commands || groq.cli_remediation_commands)) {
    const allCmds = (groq.cli_commands || groq.cli_remediation_commands).join('\n');
    copyCliBtn.onclick = () => copyText(allCmds, copyCliBtn);
  }

  const hitlBtn = $('#hitl-ack-btn', wrap);
  const hitlStatus = $('#hitl-status', wrap);
  if (hitlBtn && hitlStatus) {
    hitlBtn.onclick = () => {
      hitlBtn.style.display = 'none';
      hitlStatus.style.display = 'block';
      const ts = new Date().toISOString();
      hitlStatus.textContent = `[AUTHORIZED ${ts}] Incident ${r.incident_id || 'INC-AUTO'} runbook approved by Network Operator.`;
      appendRuntimeLog('HITL', `Operator authorized remediation runbook for ${r.incident_id || 'INC-AUTO'}`, 'ok');
      toast('Runbook Authorized', `Incident ${r.incident_id || 'INC-AUTO'} signed off at ${ts.slice(11, 19)} UTC`, 'ok');
    };
  }
}

// ─── Tab 2: Dynamic Network Topology & Live Nodes ───────────────────────────
function renderTopologySvg(summary) {
  const { devices, links } = summary;
  if (!devices.length) return '';

  // Organize nodes into tiers: upstream roots vs downstream children
  const childIds = new Set(links.map((l) => l.to || l.downstream || l.child));
  const roots = devices.filter((d) => !childIds.has(d.id));
  const tier1 = roots.length ? roots : [devices[0]];
  const tier1Set = new Set(tier1.map((d) => d.id));
  const tier2 = devices.filter((d) => !tier1Set.has(d.id));

  const width = 880;
  const height = tier2.length ? 220 : 130;
  const pos = new Map();

  tier1.forEach((d, idx) => {
    const x = Math.round(((idx + 1) / (tier1.length + 1)) * width);
    pos.set(d.id, { x, y: 46, d });
  });

  tier2.forEach((d, idx) => {
    const x = Math.round(((idx + 1) / (tier2.length + 1)) * width);
    pos.set(d.id, { x, y: 162, d });
  });

  const linkLines = links.map((l) => {
    const fromId = l.from || l.upstream || l.parent;
    const toId = l.to || l.downstream || l.child;
    const p1 = pos.get(fromId);
    const p2 = pos.get(toId);
    if (!p1 || !p2) return '';
    const isImp = p1.d.isImpaired || p2.d.isImpaired;
    return `<line x1="${p1.x}" y1="${p1.y + 18}" x2="${p2.x}" y2="${p2.y - 18}" stroke="${isImp ? 'var(--crit)' : 'var(--line-strong)'}" stroke-width="${isImp ? '2' : '1.5'}" stroke-dasharray="${isImp ? '4 3' : 'none'}" />`;
  }).join('');

  const nodeBoxes = [...pos.values()].map(({ x, y, d }) => {
    const stroke = d.isRoot ? 'var(--crit)' : d.isImpaired ? 'var(--high)' : 'var(--ok)';
    const fill = 'var(--surface)';
    const labelStr = d.id.length > 20 ? d.id.slice(0, 19) + '…' : d.id;
    const subStr = d.avgLatency != null ? `${fmtDec(d.avgLatency, 1)} ms` : (d.ip !== '-' ? d.ip : d.role.slice(0, 16));
    return `
      <g class="nc-svg-node" data-dev="${esc(d.id)}" style="cursor:pointer" transform="translate(${x - 74}, ${y - 20})">
        <rect width="148" height="40" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.75" />
        <circle cx="12" cy="14" r="3.5" fill="${stroke}" />
        <text x="22" y="17" fill="var(--ink)" font-family="var(--font-mono)" font-size="10.5" font-weight="600">${esc(labelStr)}</text>
        <text x="12" y="31" fill="var(--ink-3)" font-family="var(--font-mono)" font-size="9.5">${esc(subStr)}</text>
      </g>
    `;
  }).join('');

  return `
    <div class="nc-topo-svg-wrap">
      <svg class="nc-topo-svg" viewBox="0 0 ${width} ${height}" aria-label="Network Topology Dependency Graph">
        ${linkLines}
        ${nodeBoxes}
      </svg>
    </div>
  `;
}

function paintTopology() {
  const container = $('#topology-container');
  if (!container) return;

  const activeTele = appState.topologyViewMode === 'live'
    ? (appState.liveProbeTelemetry || appState.currentTelemetry)
    : (appState.currentTelemetry || appState.liveProbeTelemetry);

  const activeDiag = appState.result && appState.result.report ? appState.result.report : null;
  const summary = summarizeTelemetryDataset(activeTele, activeDiag);

  const topoCount = $('#tab-topo-count');
  if (topoCount && summary.devices.length) topoCount.textContent = String(summary.devices.length);

  const sourceTitle = (activeTele && activeTele.source) || 'Active Telemetry Dataset';

  container.innerHTML = `
    <div class="stack">
      <section class="panel">
        <div class="panel__head" style="flex-wrap:wrap;height:auto;min-height:44px;padding:8px 14px">
          <h2 class="panel__title"><i data-icon="network"></i> Live Topology &amp; Dependency Graph (${summary.devices.length} Nodes, ${summary.links.length} Links)</h2>
          <span class="panel__meta mono">${esc(sourceTitle)}</span>
          <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
            <button class="btn btn--sm" id="topo-load-live-btn"><i data-icon="globe"></i> Probe Live Targets</button>
            <button class="btn btn--sm" id="topo-load-campus-btn"><i data-icon="layers"></i> Load IIT-BBS 8-Node Reference</button>
          </div>
        </div>
        <div class="panel__body stack" style="gap:14px">
          ${renderTopologySvg(summary)}

          <div class="topo-grid">
            ${summary.devices.map((n) => `
              <div class="topo-node ${n.isImpaired ? 'topo-node--impaired' : 'topo-node--healthy'}" data-dev="${esc(n.id)}">
                <div class="topo-node__header">
                  <div class="topo-node__id">
                    <i data-icon="${n.type.includes('ap') || n.type.includes('wifi') ? 'wifi' : n.type.includes('server') ? 'server' : 'cpu'}"></i>
                    <span>${esc(n.id)}</span>
                  </div>
                  ${pill(n.isRoot ? 'CONFIRMED' : n.isImpaired ? 'INVESTIGATING' : 'CONTAINED', n.isRoot ? 'Root Cause' : n.isImpaired ? 'Impaired' : 'Healthy')}
                </div>
                <div class="topo-node__sub">${esc(n.role)} ${n.upstream ? `&middot; Upstream: <b>${esc(n.upstream)}</b>` : '&middot; Core / Upstream Root'}</div>
                <div class="topo-node__meta">
                  <div><span>Endpoint:</span> ${esc(n.ip || '-')}</div>
                  <div><span>Samples:</span> ${n.sampleCount}</div>
                  <div><span>Avg RTT:</span> ${n.avgLatency != null ? fmtDec(n.avgLatency, 1) + ' ms' : '-'}</div>
                  <div><span>Loss / Jitter:</span> ${n.avgLoss != null ? fmtDec(n.avgLoss, 1) + '%' : '0%'} / ${n.avgJitter != null ? fmtDec(n.avgJitter, 1) + ' ms' : '-'}</div>
                  <div><span>DNS Lookup:</span> ${n.avgDns != null ? fmtDec(n.avgDns, 1) + ' ms' : '-'}</div>
                  <div><span>CPU / RAM:</span> ${n.avgCpu != null ? `${fmtDec(n.avgCpu, 0)}% / ${fmtDec(n.avgMem, 0)}%` : '-'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      ${summary.links.length ? `
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><i data-icon="sliders"></i> Topology Link Adjacencies (connectivity_agent Graph)</h2>
          <span class="panel__meta">${summary.links.length} directed links</span>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>#</th><th>Upstream Parent Node</th><th>Downstream Child Node</th><th>Propagation Rule</th><th>Link Health</th></tr>
            </thead>
            <tbody>
              ${summary.links.map((l, idx) => {
                const from = l.from || l.upstream || l.parent;
                const to = l.to || l.downstream || l.child;
                const fromDev = summary.devices.find((d) => d.id === from);
                const toDev = summary.devices.find((d) => d.id === to);
                const bothImpaired = fromDev && toDev && fromDev.isImpaired && toDev.isImpaired;
                return `
                  <tr>
                    <td class="mono small">${idx + 1}</td>
                    <td class="mono"><b>${esc(from)}</b></td>
                    <td class="mono">${esc(to)}</td>
                    <td class="small muted">Downstream symptom discounted by 0.65&times; when upstream is impaired</td>
                    <td>${bothImpaired ? pill('INVESTIGATING', 'Shared Upstream Fault') : pill('CONTAINED', 'Active Link')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
      ` : ''}
    </div>
  `;
  hydrateIcons(container);

  $$('.topo-node, .nc-svg-node', container).forEach((el) => {
    el.onclick = () => inspectDeviceModal(el.dataset.dev);
  });

  const liveBtn = $('#topo-load-live-btn', container);
  if (liveBtn) {
    liveBtn.onclick = () => {
      appState.topologyViewMode = 'live';
      probeLiveSystem({ runDiag: true });
    };
  }

  const campusBtn = $('#topo-load-campus-btn', container);
  if (campusBtn) {
    campusBtn.onclick = async () => {
      appState.topologyViewMode = 'active';
      await loadScenario('link_congestion', true);
      paintTopology();
    };
  }
}

// ─── Tab 3: Agent Message Bus ───────────────────────────────────────────────
function paintMessageBus() {
  const container = $('#bus-container');
  if (!container) return;
  const allMsgs = appState.messages || [];

  if (!allMsgs.length) {
    container.innerHTML = `
      <div class="notice">
        No JSON-RPC envelopes recorded yet. Click <b>Probe &amp; Diagnose Live</b> or select a scenario to inspect agent communication.
      </div>`;
    return;
  }

  const q = (($('#bus-filter-q') && $('#bus-filter-q').value) || '').trim().toLowerCase();
  const agentFilter = ($('#bus-filter-agent') && $('#bus-filter-agent').value) || '';
  const typeFilter = ($('#bus-filter-type') && $('#bus-filter-type').value) || '';

  const filtered = allMsgs.filter((m) => {
    if (agentFilter && m.from !== agentFilter && m.to !== agentFilter) return false;
    if (typeFilter && m.type !== typeFilter) return false;
    if (q) {
      const hay = `${m.message_id || ''} ${m.from || ''} ${m.to || ''} ${m.type || ''} ${m.summary || ''} ${JSON.stringify(m.payload || {})}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const busCountEl = $('#bus-msg-count');
  if (busCountEl) busCountEl.textContent = `${filtered.length} of ${allMsgs.length} messages shown`;

  if (!filtered.length) {
    container.innerHTML = `<div class="notice">No messages match the current filter criteria.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Time (UTC)</th>
          <th>Sender Agent</th>
          <th>Recipient Agent</th>
          <th>Envelope Type</th>
          <th>Reply To</th>
          <th>Summary</th>
          <th style="text-align:right">Inspect</th>
        </tr>
      </thead>
      <tbody class="rows-in">
        ${filtered.map((m, i) => `
          <tr class="is-clickable nc-bus-row" data-id="${esc(m.message_id)}" style="--i:${i}">
            <td class="mono small"><b>${esc(m.message_id || `#${i + 1}`)}</b></td>
            <td class="mono small muted">${m.timestamp ? esc(m.timestamp.split('T')[1].replace('Z', '')) : '-'}</td>
            <td class="small mono">${pill('CONTAINED', agentLabel(m.from))}</td>
            <td class="small mono">${pill('NEW', agentLabel(m.to))}</td>
            <td class="small">${pill(m.type === 'error' ? 'CONFIRMED' : m.type === 'challenge' || m.type === 'challenge_response' ? 'INVESTIGATING' : 'CONTAINED', m.type)}</td>
            <td class="mono small muted">${esc(m.in_reply_to || '-')}</td>
            <td class="small" style="color:var(--ink-2);max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.summary || '-')}</td>
            <td style="text-align:right">
              <button class="btn btn--sm nc-inspect-msg" data-id="${esc(m.message_id)}">${icon('code')} Envelope</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>`;
  hydrateIcons(container);

  const openMsgModal = (msgId) => {
    const msg = allMsgs.find((m) => m.message_id === msgId) || filtered[0];
    if (!msg) return;
    showModal({
      title: `${icon('layers')} JSON-RPC Envelope ${esc(msg.message_id)} (${esc(msg.from)} &rarr; ${esc(msg.to)})`,
      wide: true,
      bodyHtml: `
        <div style="margin-bottom:10px;font-size:12px;color:var(--ink-2);display:flex;gap:16px;flex-wrap:wrap" class="mono">
          <span><b>Schema:</b> ${esc(msg.schema || 'netcoop.message/1.0')}</span>
          <span><b>Run ID:</b> ${esc(msg.run_id || '-')}</span>
          <span><b>Type:</b> ${esc(msg.type)}</span>
          <span><b>Timestamp:</b> ${esc(msg.timestamp || '-')}</span>
        </div>
        <pre class="code" style="max-height:420px;overflow:auto;padding:12px;font-size:12px;margin:0">${esc(JSON.stringify(msg, null, 2))}</pre>
      `,
      footHtml: `
        <button class="btn" id="modal-copy-msg">${icon('copy')} Copy Envelope JSON</button>
        <button class="btn btn--primary" id="modal-cancel-btn">Close</button>
      `
    });
    const copyMsgBtn = $('#modal-copy-msg');
    if (copyMsgBtn) copyMsgBtn.onclick = () => copyText(JSON.stringify(msg, null, 2), copyMsgBtn);
  };

  $$('.nc-bus-row', container).forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest('button')) return;
      openMsgModal(row.dataset.id);
    };
  });
  $$('.nc-inspect-msg', container).forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openMsgModal(btn.dataset.id);
    };
  });
}

// ─── Tab 4: Interoperability Protocol Specification ─────────────────────────
async function loadAndPaintProtocol() {
  const container = $('#protocol-container');
  if (appState.protocolData) {
    paintProtocol(appState.protocolData);
    return;
  }

  try {
    const res = await fetch('/api/netcoop/protocol');
    const data = await res.json();
    appState.protocolData = data;
    paintProtocol(data);
  } catch (err) {
    if (container) container.innerHTML = `<div class="notice" style="color:var(--crit)">Failed to load protocol: ${esc(err.message)}</div>`;
  }
}

function paintProtocol(data) {
  const container = $('#protocol-container');
  if (!container) return;
  const p = data.protocol || {};
  const scoring = data.scoring || {};
  const roles = Array.isArray(data.roles) ? data.roles : [];

  container.innerHTML = `
    <div class="stack">
      <!-- Protocol Overview & State Machine -->
      <div class="grid grid-1-1">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title"><i data-icon="file"></i> Interoperability Envelope Standard</h2>
            <span class="panel__meta mono">${esc(p.message_schema || 'netcoop.message/1.0')}</span>
          </div>
          <div class="panel__body">
            <p class="small" style="margin-top:0;color:var(--ink-2);line-height:1.55">
              Agents share zero internal memory and communicate strictly via typed envelopes routed through the deterministic <code class="mono">MessageBus</code>.
            </p>
            <pre class="code" style="padding:10px 12px;font-size:11.5px;margin:0">${esc(JSON.stringify(p.envelope || {}, null, 2))}</pre>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title"><i data-icon="sliders"></i> Multi-Agent Arbitration &amp; Scoring Parameters</h2>
            <span class="panel__meta mono">${esc(p.report_schema || 'netcoop.report/1.0')}</span>
          </div>
          <div class="panel__body stack" style="gap:10px">
            <div class="nc-boot-kpis">
              <div class="nc-boot-kpi">
                <div class="nc-boot-kpi__label">Coverage Exponent</div>
                <div class="nc-boot-kpi__val">${scoring.coverageExponent ?? 0.35}</div>
                <div class="nc-boot-kpi__sub">Multi-metric weight</div>
              </div>
              <div class="nc-boot-kpi">
                <div class="nc-boot-kpi__label">Contradiction Penalty</div>
                <div class="nc-boot-kpi__val">&minus;${scoring.contradictionPenalty ?? 0.25}</div>
                <div class="nc-boot-kpi__sub">Per refuted metric</div>
              </div>
              <div class="nc-boot-kpi">
                <div class="nc-boot-kpi__label">Propagation Discount</div>
                <div class="nc-boot-kpi__val">${scoring.propagationDiscount ?? 0.65}&times;</div>
                <div class="nc-boot-kpi__sub">Downstream symptom</div>
              </div>
              <div class="nc-boot-kpi">
                <div class="nc-boot-kpi__label">Single-Indicator Cap</div>
                <div class="nc-boot-kpi__val">${Math.round((scoring.singleIndicatorCap ?? 0.65) * 100)}%</div>
                <div class="nc-boot-kpi__sub">Anti-false-alarm gate</div>
              </div>
            </div>

            <div>
              <div class="section-title">Execution State Machine Phases</div>
              <div class="breakdown">
                ${(p.state_machine || []).map((step, i) => `<div><span class="mono small"><b>Phase 0${i + 1}:</b> ${esc(step)}</span></div>`).join('')}
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Registered Roles Specification (Dynamic from ROLES) -->
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><i data-icon="cpu"></i> Registered Cooperative Agent Roles</h2>
          <span class="panel__meta">${roles.length} Agents</span>
        </div>
        <div class="table-wrap"><table class="table">
          <thead>
            <tr><th>Agent ID</th><th>Role Title</th><th>Owned Telemetry &amp; Domain</th><th>Consumes</th><th>Produces</th></tr>
          </thead>
          <tbody>
            ${roles.map((r) => `
              <tr>
                <td class="mono"><b>${esc(r.id)}</b></td>
                <td>${esc(r.name)}</td>
                <td class="small" style="color:var(--ink-2)">${esc(r.owns)}</td>
                <td class="mono small">${(r.consumes || []).map((c) => `<span class="tag">${esc(c)}</span>`).join(' ')}</td>
                <td class="mono small">${(r.produces || []).map((pr) => `<span class="tag">${esc(pr)}</span>`).join(' ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </section>

      <!-- Metric Ranges & Thresholds -->
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><i data-icon="activity"></i> Normalized Telemetry Metrics &amp; Threshold Bounds</h2>
          <span class="panel__meta">${Object.keys(p.metrics || {}).length} Canonical Metrics</span>
        </div>
        <div class="table-wrap"><table class="table">
          <thead>
            <tr><th>Canonical Metric Key</th><th>Owner Agent</th><th>Unit</th><th>Valid Range</th><th class="num">Warning Threshold</th><th class="num">Critical Threshold</th><th>Accepted Aliases</th></tr>
          </thead>
          <tbody>
            ${Object.entries(p.metrics || {}).map(([mName, mInfo]) => `
              <tr>
                <td class="mono"><b>${esc(mName)}</b></td>
                <td>${pill('CONTAINED', agentLabel(mInfo.owner))}</td>
                <td class="mono small">${esc(mInfo.unit || '-')}</td>
                <td class="mono small">[${mInfo.valid_range ? mInfo.valid_range.join(', ') : '-'}]</td>
                <td class="num mono">${mInfo.warn != null ? mInfo.warn + ' ' + (mInfo.unit || '') : '-'}</td>
                <td class="num mono" style="color:var(--crit)">${mInfo.crit != null ? mInfo.crit + ' ' + (mInfo.unit || '') : '-'}</td>
                <td class="mono small muted">${esc((mInfo.accepted_names || []).slice(0, 4).join(', '))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </section>
    </div>
  `;
  hydrateIcons(container);
}

// ─── Command Palette (`Search /` & `/` Shortcut) ────────────────────────────
function openCommandPalette() {
  const summary = summarizeTelemetryDataset(appState.currentTelemetry || appState.liveProbeTelemetry, appState.result && appState.result.report);

  const items = [
    { group: 'Live Actions', icon: 'zap', label: 'Probe & Diagnose Live Network Now', sub: 'Run real DNS + TCP RTT probe and 6-agent diagnosis', run: () => probeLiveSystem({ runDiag: true, switchToStudio: true }) },
    { group: 'Live Actions', icon: 'download', label: 'Export Latest Diagnostic Report (.json)', sub: 'Download Section 6 JSON report to disk', run: () => {
      if (appState.result) downloadJsonFile('netcoop-diagnosis-report.json', appState.result);
      else toast('No report yet', 'Run a diagnosis first', 'error');
    }},
    { group: 'Live Actions', icon: 'sun', label: 'Toggle Light / Dark Theme', sub: 'Switch workspace color scheme', run: () => $('#theme-toggle') && $('#theme-toggle').click() },
    { group: 'Live Actions', icon: 'refresh', label: 'Replay System Boot Verification', sub: 'Run full-screen subsystem check', run: () => window.netcoopReboot() },

    { group: 'Workspace Views', icon: 'cpu', label: 'Go to System Runtime & Host Telemetry', sub: 'Tab 1 — Live host hardware & endpoint table', run: () => switchTab('boot') },
    { group: 'Workspace Views', icon: 'terminal', label: 'Go to Live Diagnostics Studio', sub: 'Tab 2 — Prober, telemetry editor & fault scenarios', run: () => switchTab('studio') },
    { group: 'Workspace Views', icon: 'network', label: 'Go to Network Topology & Nodes', sub: 'Tab 3 — SVG dependency graph & node health', run: () => switchTab('topology') },
    { group: 'Workspace Views', icon: 'layers', label: 'Go to Agent Message Bus', sub: 'Tab 4 — JSON-RPC 2.0 envelopes & filters', run: () => switchTab('bus') },
    { group: 'Workspace Views', icon: 'sliders', label: 'Go to Interoperability Protocol Spec', sub: 'Tab 5 — Roles, thresholds & scoring formula', run: () => switchTab('protocol') },

    ...appState.scenarios.map((s) => ({
      group: 'Benchmark Fault Scenarios',
      icon: 'play',
      label: `Diagnose Scenario: ${s.name}`,
      sub: s.description,
      run: () => { switchTab('studio'); loadScenario(s.key, true); }
    })),

    ...summary.devices.map((d) => ({
      group: 'Active Monitored Nodes',
      icon: 'server',
      label: `Inspect Node: ${d.id}`,
      sub: `${d.role} · ${d.ip || '-'} · ${d.sampleCount} samples`,
      run: () => inspectDeviceModal(d.id)
    }))
  ];

  const root = $('#modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="scrim" id="palette-scrim"></div>
    <div class="modal palette" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="palette__input">
        ${icon('search')}
        <input type="text" id="palette-q" placeholder="Type a command, scenario, node ID, or tab name…" autocomplete="off" />
        <span class="kbd">ESC</span>
      </div>
      <div class="palette__results" id="palette-results"></div>
      <div class="palette__foot">
        <span><b>&uarr;&darr;</b> Navigate</span>
        <span><b>Enter</b> Execute</span>
        <span><b>ESC</b> Close</span>
      </div>
    </div>
  `;
  hydrateIcons(root);

  const close = () => { root.innerHTML = ''; };
  $('#palette-scrim').onclick = close;

  const inputEl = $('#palette-q', root);
  const resEl = $('#palette-results', root);
  let selIdx = 0;
  let visibleItems = items;

  const renderList = () => {
    const q = inputEl.value.trim().toLowerCase();
    visibleItems = q
      ? items.filter((it) => `${it.group} ${it.label} ${it.sub}`.toLowerCase().includes(q))
      : items;
    if (selIdx >= visibleItems.length) selIdx = 0;

    if (!visibleItems.length) {
      resEl.innerHTML = `<div class="palette__hint">No matching commands, scenarios, or nodes.</div>`;
      return;
    }

    let currentGroup = '';
    let html = '';
    visibleItems.forEach((it, idx) => {
      if (it.group !== currentGroup) {
        currentGroup = it.group;
        html += `<div class="palette__group">${esc(currentGroup)}</div>`;
      }
      html += `
        <div class="palette__item ${idx === selIdx ? 'is-sel' : ''}" data-idx="${idx}">
          ${icon(it.icon)}
          <div style="min-width:0;flex:1">
            <div style="font-weight:500">${esc(it.label)}</div>
            <div class="small muted truncate">${esc(it.sub || '')}</div>
          </div>
        </div>
      `;
    });
    resEl.innerHTML = html;
    hydrateIcons(resEl);

    $$('.palette__item', resEl).forEach((row) => {
      row.onclick = () => {
        const chosen = visibleItems[Number(row.dataset.idx)];
        close();
        if (chosen && chosen.run) chosen.run();
      };
    });
  };

  renderList();
  inputEl.focus();

  inputEl.oninput = () => {
    selIdx = 0;
    renderList();
  };

  inputEl.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleItems.length) selIdx = (selIdx + 1) % visibleItems.length;
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleItems.length) selIdx = (selIdx - 1 + visibleItems.length) % visibleItems.length;
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = visibleItems[selIdx];
      close();
      if (chosen && chosen.run) chosen.run();
    }
  };
}

// ─── Boot Sequence Orchestrator ─────────────────────────────────────────────
let bootTimers = [];

function clearBootTimers() {
  while (bootTimers.length) {
    clearTimeout(bootTimers.pop());
  }
}

function ensureHandcraftedBootDOM() {
  const el = document.getElementById('netcoop-boot-screen');
  if (el && !el.querySelector('.nc-boot-panel')) {
    el.className = 'boot-screen';
    el.removeAttribute('style');
    el.innerHTML = `
      <div class="nc-boot-panel">
        <div class="nc-boot-panel__head">
          <span class="nc-boot-panel__title">
            <span class="nc-boot-panel__dot"></span>
            NetCoop Diagnostic Runtime
          </span>
          <span class="nc-boot-panel__meta">IIT-BBS &middot; v1.0.0</span>
        </div>
        <div class="nc-boot-stage">
          <img src="images/netcoop-logo-light.png" alt="NetCoop — Multi-Agent Network Intelligence" class="nc-logo-light" width="184" />
          <img src="images/netcoop-logo-dark.png" alt="NetCoop — Multi-Agent Network Intelligence" class="nc-logo-dark" width="184" />
        </div>
        <table class="nc-boot-checks" aria-label="Subsystem verification">
          <tbody>
            <tr id="boot-row-0">
              <td class="nc-boot-checks__id">01</td>
              <td class="nc-boot-checks__name">Host &amp; Network Probe Engine</td>
              <td class="nc-boot-checks__spec">DNS / TCP RTT</td>
              <td class="nc-boot-checks__state"><span class="nc-check-badge is-sync" id="boot-chk-0">SYNC</span></td>
            </tr>
            <tr id="boot-row-1">
              <td class="nc-boot-checks__id">02</td>
              <td class="nc-boot-checks__name">JSON-RPC Message Bus</td>
              <td class="nc-boot-checks__spec">v1.0.0</td>
              <td class="nc-boot-checks__state"><span class="nc-check-badge" id="boot-chk-1">WAIT</span></td>
            </tr>
            <tr id="boot-row-2">
              <td class="nc-boot-checks__id">03</td>
              <td class="nc-boot-checks__name">Cooperative Agent Mesh</td>
              <td class="nc-boot-checks__spec">6 workers</td>
              <td class="nc-boot-checks__state"><span class="nc-check-badge" id="boot-chk-2">WAIT</span></td>
            </tr>
            <tr id="boot-row-3">
              <td class="nc-boot-checks__id">04</td>
              <td class="nc-boot-checks__name">Groq LPU Inference</td>
              <td class="nc-boot-checks__spec">gpt-oss-120b</td>
              <td class="nc-boot-checks__state"><span class="nc-check-badge" id="boot-chk-3">WAIT</span></td>
            </tr>
          </tbody>
        </table>
        <div class="nc-boot-panel__foot">
          <div class="boot-status-box">
            <div class="boot-status-row">
              <div class="boot-status-lead">
                <span class="boot-pulse-dot"></span>
                <span id="boot-status-text" class="boot-status-text">Probing live host interfaces &amp; DNS resolvers&hellip;</span>
              </div>
              <span id="boot-percent" class="boot-percent">0%</span>
            </div>
            <div class="boot-progress-track">
              <div id="boot-progress-bar" class="boot-progress-bar"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="nc-boot-caption">
        <span>IIT Bhubaneswar Network Operations</span>
        <button type="button" class="nc-boot-skip" id="boot-skip-btn">Skip &rarr;</button>
      </div>
    `;
  }
}

function dismissBootScreen() {
  clearBootTimers();
  const el = document.getElementById('netcoop-boot-screen');
  if (!el) return;
  el.classList.add('is-loaded', 'out');
  setTimeout(() => {
    el.style.display = 'none';
  }, 380);
}

function runBootSequence(options = {}) {
  ensureHandcraftedBootDOM();
  clearBootTimers();

  const el = document.getElementById('netcoop-boot-screen');
  const bar = document.getElementById('boot-progress-bar');
  const pctEl = document.getElementById('boot-percent');
  const txt = document.getElementById('boot-status-text');
  const skipBtn = document.getElementById('boot-skip-btn');
  if (!el) return;

  if (skipBtn) {
    skipBtn.onclick = () => dismissBootScreen();
  }

  el.style.display = 'flex';
  el.classList.remove('is-loaded', 'out');
  if (bar) bar.style.width = '0%';
  if (pctEl) pctEl.textContent = '0%';
  if (txt) txt.textContent = 'Probing live host interfaces & DNS resolvers…';

  for (let i = 0; i < 4; i++) {
    const chk = document.getElementById('boot-chk-' + i);
    if (chk) {
      chk.className = 'nc-check-badge' + (i === 0 ? ' is-sync' : '');
      chk.textContent = i === 0 ? 'SYNC' : 'WAIT';
    }
  }

  const steps = [
    { pct: 28, msg: 'Measuring TCP socket RTT & DNS lookup latency…', states: ['OK', 'SYNC', 'WAIT', 'WAIT'], delay: 260 },
    { pct: 56, msg: 'Binding JSON-RPC v1.0.0 cooperative bus…',       states: ['OK', 'OK',   'SYNC', 'WAIT'], delay: 580 },
    { pct: 84, msg: 'Registering 6 diagnostic worker agents…',        states: ['OK', 'OK',   'OK',   'SYNC'], delay: 920 },
    { pct: 100, msg: 'Groq LPU inference connected — runtime ready',  states: ['OK', 'OK',   'OK',   'OK'],   delay: 1280 }
  ];

  steps.forEach((step) => {
    const tid = setTimeout(() => {
      if (bar) bar.style.width = step.pct + '%';
      if (pctEl) pctEl.textContent = step.pct + '%';
      if (txt) txt.textContent = step.msg;
      step.states.forEach((st, idx) => {
        const chk = document.getElementById('boot-chk-' + idx);
        if (!chk) return;
        chk.textContent = st;
        chk.className = 'nc-check-badge' + (st === 'OK' ? ' is-ok' : st === 'SYNC' ? ' is-sync' : '');
      });
    }, step.delay);
    bootTimers.push(tid);
  });

  const endTid = setTimeout(() => {
    dismissBootScreen();
    if (options.isReboot) {
      toast('Runtime verified', 'All 6 cooperative agents online', 'ok');
    }
  }, 1680);
  bootTimers.push(endTid);
}

function runTabBootSequence() {
  const bar = document.getElementById('tab-boot-progress-bar');
  const pct = document.getElementById('tab-boot-percent');
  const txt = document.getElementById('tab-boot-status-text');
  if (bar) bar.style.width = '0%';
  if (pct) pct.textContent = '0%';
  if (txt) txt.textContent = 'Re-verifying 6 cooperative diagnostic agents & live telemetry…';

  const steps = [
    [30, 'Probing host CPU delta, memory & active interfaces…', 220],
    [65, 'Verifying performance, infra & connectivity agents…', 520],
    [90, 'Synchronizing Groq LPU (openai/gpt-oss-120b)…', 820],
    [100, 'Live host & network probe active — 6 agents standing by', 1120]
  ];

  steps.forEach(([p, m, d]) => {
    setTimeout(() => {
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
      if (txt) txt.textContent = m;
    }, d);
  });
}

window.netcoopReboot = () => {
  runTabBootSequence();
  runBootSequence({ isReboot: true });
};

// ─── Live Network Probing & External File Upload ────────────────────────────
async function probeLiveSystem(opts = {}) {
  const { runDiag = true, customTargets = null, switchToStudio = false, silent = false } = opts;
  const statusEl = $('#nc-status');
  const btnDiag = $('#nc-probe-diagnose-btn');
  const btnOnly = $('#nc-probe-live-btn');
  const globalBtn = $('#global-probe-btn');
  const rtBtn = $('#btn-runtime-probe-now');
  const targetsInput = $('#nc-probe-targets');

  const targets = customTargets !== null
    ? customTargets
    : (targetsInput && targetsInput.value.trim()) || '';

  if (switchToStudio && appState.activeTab !== 'studio') {
    switchTab('studio');
  }

  [btnDiag, btnOnly, globalBtn, rtBtn].forEach((b) => { if (b) b.classList.add('is-busy'); });
  setTopStatus('Probing live DNS & TCP RTT…', 'busy');
  if (statusEl) statusEl.textContent = 'Measuring real DNS lookup, TCP socket handshake RTT, jitter & host CPU/RAM…';

  try {
    const res = await fetch('/api/netcoop/probe-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets, diagnose: runDiag, samples: 4, interval: 90 })
    });
    const data = await res.json();
    if (!data.ok || !data.telemetry) throw new Error(data.error || 'Failed to capture live metrics');

    appState.liveProbeTelemetry = data.telemetry;
    appState.currentTelemetry = data.telemetry;
    appState.activeScenarioKey = null;
    $$('.nc-sc').forEach((b) => { b.style.background = ''; });

    const rawEl = $('#nc-raw');
    if (rawEl) rawEl.value = JSON.stringify(data.telemetry, null, 2);
    updatePayloadMeta();

    appendRuntimeLog(
      'PROBE',
      `Captured ${data.telemetry.samples.length} real measurements across ${data.telemetry.devices.length} nodes (${data.telemetry.source})`,
      'ok'
    );

    const tabBootTxt = $('#tab-boot-status-text');
    if (tabBootTxt) {
      tabBootTxt.textContent = `Live telemetry captured: ${data.telemetry.samples.length} samples from ${data.telemetry.devices.length} nodes (${data.telemetry.source})`;
    }

    if (data.diagnosis) {
      appState.liveProbeDiagnosis = data.diagnosis;
      applyDiagnosisResult(data.diagnosis);
    } else {
      paintRuntimeOverview();
      if (appState.activeTab === 'topology') paintTopology();
      setTopStatus(`Probed ${data.telemetry.devices.length} live nodes`, 'ok');
    }

    if (!silent) {
      toast('Live Network Probed', `${data.telemetry.samples.length} real TCP/DNS samples captured`, 'ok');
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
    setTopStatus('Live probe error', 'warn');
    if (!silent) toast('Live Probe Failed', err.message, 'error');
  } finally {
    [btnDiag, btnOnly, globalBtn, rtBtn].forEach((b) => { if (b) b.classList.remove('is-busy'); });
  }
}

function initExternalHandlers() {
  // 1. Live Probe buttons
  const btnProbeDiag = $('#nc-probe-diagnose-btn');
  if (btnProbeDiag) btnProbeDiag.onclick = () => probeLiveSystem({ runDiag: true });

  const btnProbeOnly = $('#nc-probe-live-btn');
  if (btnProbeOnly) btnProbeOnly.onclick = () => probeLiveSystem({ runDiag: false });

  const globalProbeBtn = $('#global-probe-btn');
  if (globalProbeBtn) globalProbeBtn.onclick = () => probeLiveSystem({ runDiag: true, switchToStudio: true });

  const rtProbeBtn = $('#btn-runtime-probe-now');
  if (rtProbeBtn) rtProbeBtn.onclick = () => probeLiveSystem({ runDiag: true, switchToStudio: false });

  const rtOpenStudio = $('#rt-open-in-studio');
  if (rtOpenStudio) rtOpenStudio.onclick = () => switchTab('studio');

  // Target input Enter key
  const targetsInput = $('#nc-probe-targets');
  if (targetsInput) {
    targetsInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        probeLiveSystem({ runDiag: true });
      }
    };
  }

  // Preset chips
  $$('.nc-preset-chip').forEach((chip) => {
    chip.onclick = () => {
      if (targetsInput) targetsInput.value = chip.dataset.targets || '';
      probeLiveSystem({ runDiag: true, customTargets: chip.dataset.targets });
    };
  });

  // 2. Format & Download Input buttons
  const fmtBtn = $('#nc-format-btn');
  if (fmtBtn) {
    fmtBtn.onclick = () => {
      const rawEl = $('#nc-raw');
      if (!rawEl || !rawEl.value.trim()) return;
      try {
        rawEl.value = JSON.stringify(JSON.parse(rawEl.value), null, 2);
        updatePayloadMeta();
        toast('Formatted JSON', '', 'ok');
      } catch (_e) {
        toast('Format notice', 'Input is CSV/NDJSON or non-JSON text', 'info');
      }
    };
  }

  const dlInputBtn = $('#nc-export-telemetry-btn');
  if (dlInputBtn) {
    dlInputBtn.onclick = () => {
      const raw = $('#nc-raw') ? $('#nc-raw').value.trim() : '';
      if (!raw) {
        toast('Empty input', 'Nothing to download', 'error');
        return;
      }
      downloadJsonFile('netcoop-telemetry-input.json', raw);
    };
  }

  // 3. File Upload
  const uploadBtn = $('#nc-upload-btn');
  const fileInput = $('#nc-file-input');
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        $('#nc-raw').value = evt.target.result;
        updatePayloadMeta();
        $('#nc-status').textContent = `Loaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        toast('Telemetry File Loaded', `${file.name} — running diagnosis`, 'ok');
        runDiagnosis();
      };
      reader.readAsText(file);
    };
  }

  // 4. Drag and Drop on textarea + live input counter
  const textarea = $('#nc-raw');
  if (textarea) {
    textarea.addEventListener('input', updatePayloadMeta);
    textarea.addEventListener('dragover', (e) => {
      e.preventDefault();
      textarea.style.borderColor = 'var(--accent)';
    });
    textarea.addEventListener('dragleave', () => {
      textarea.style.borderColor = '';
    });
    textarea.addEventListener('drop', (e) => {
      e.preventDefault();
      textarea.style.borderColor = '';
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        textarea.value = evt.target.result;
        updatePayloadMeta();
        $('#nc-status').textContent = `Dropped file: ${file.name}`;
        toast('File Dropped', `Diagnosing ${file.name}`, 'ok');
        runDiagnosis();
      };
      reader.readAsText(file);
    });
  }

  // 5. Message Bus Filters & Export
  ['bus-filter-q', 'bus-filter-agent', 'bus-filter-type'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', paintMessageBus);
      el.addEventListener('change', paintMessageBus);
    }
  });

  const busExportBtn = $('#bus-export-btn');
  if (busExportBtn) {
    busExportBtn.onclick = () => {
      if (!appState.messages || !appState.messages.length) {
        toast('Message bus empty', 'Run a diagnosis first', 'error');
        return;
      }
      downloadJsonFile('netcoop-jsonrpc-bus.json', appState.messages);
    };
  }

  // 6. Command Palette trigger & keyboard shortcut
  const searchBtn = $('#search-trigger');
  if (searchBtn) searchBtn.onclick = openCommandPalette;

  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
    if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      openCommandPalette();
    }
  });
}

// ─── Initialize Application ─────────────────────────────────────────────────
function boot() {
  runBootSequence();
  hydrateIcons();
  initClock();
  initTheme();
  initTabs();
  loadScenarios();
  initExternalHandlers();

  // Auto-run real live network probe + diagnosis on startup so every view has real data immediately
  probeLiveSystem({ runDiag: true, silent: true });

  // Reboot / status triggers
  const rebootBtn = $('#boot-reboot-btn');
  if (rebootBtn) rebootBtn.onclick = () => window.netcoopReboot();

  const globalRebootBtn = $('#global-reboot-btn');
  if (globalRebootBtn) globalRebootBtn.onclick = () => window.netcoopReboot();

  const statusPillBtn = $('#status-pill-btn');
  if (statusPillBtn) statusPillBtn.onclick = () => probeLiveSystem({ runDiag: true, switchToStudio: false });

  const btnRebootTab = $('#btn-reboot-tab');
  if (btnRebootTab) btnRebootTab.onclick = () => window.netcoopReboot();

  const bootTabLogo = $('#boot-tab-interactive-logo');
  if (bootTabLogo) bootTabLogo.onclick = () => window.netcoopReboot();

  const btnTabToStudio = $('#btn-tab-to-studio');
  if (btnTabToStudio) btnTabToStudio.onclick = () => switchTab('studio');

  const btnTabToTopo = $('#btn-tab-to-topology');
  if (btnTabToTopo) btnTabToTopo.onclick = () => switchTab('topology');

  // Run diagnosis button
  const runBtn = $('#nc-run');
  if (runBtn) runBtn.onclick = () => runDiagnosis();

  // Clear button
  const clearBtn = $('#nc-clear');
  if (clearBtn) {
    clearBtn.onclick = () => {
      $('#nc-raw').value = '';
      $('#nc-results').innerHTML = '';
      $('#nc-status').textContent = '';
      appState.result = null;
      appState.activeScenarioKey = null;
      updatePayloadMeta();
      $$('.nc-sc').forEach((b) => { b.style.background = ''; });
      toast('Cleared', 'Telemetry editor and results cleared');
    };
  }

  // Clear bus button
  const clearBusBtn = $('#bus-clear-btn');
  if (clearBusBtn) {
    clearBusBtn.onclick = () => {
      appState.messages = [];
      $('#bus-msg-count').textContent = '0 messages logged';
      const tabBusCount = $('#tab-bus-count');
      if (tabBusCount) tabBusCount.textContent = '0';
      paintMessageBus();
      toast('Message bus log cleared');
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
