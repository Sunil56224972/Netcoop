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

let activeOpSeq = 0;

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

// ─── Enterprise CSV / TSV / JSON Normalization & Export Workbench ───────────
const CSV_METRIC_ALIASES = {
  latency_ms: 'latency_ms', latency: 'latency_ms', rtt_ms: 'latency_ms', rtt: 'latency_ms', ping: 'latency_ms', ping_ms: 'latency_ms', avg_rtt: 'latency_ms', avg_rtt_ms: 'latency_ms', response_time: 'latency_ms', response_time_ms: 'latency_ms', tcp_rtt: 'latency_ms', tcp_rtt_ms: 'latency_ms',
  jitter_ms: 'jitter_ms', jitter: 'jitter_ms', avg_jitter: 'jitter_ms', pdv_ms: 'jitter_ms',
  packet_loss_pct: 'packet_loss_pct', packet_loss: 'packet_loss_pct', loss_pct: 'packet_loss_pct', loss: 'packet_loss_pct', pkt_loss: 'packet_loss_pct', ploss: 'packet_loss_pct', drop_pct: 'packet_loss_pct', loss_percent: 'packet_loss_pct',
  link_utilization_pct: 'link_utilization_pct', link_utilization: 'link_utilization_pct', utilization_pct: 'link_utilization_pct', utilization: 'link_utilization_pct', util_pct: 'link_utilization_pct', util: 'link_utilization_pct', bw_util: 'link_utilization_pct', if_util: 'link_utilization_pct', port_util: 'link_utilization_pct',
  signal_dbm: 'signal_dbm', rssi: 'signal_dbm', rssi_dbm: 'signal_dbm', wifi_rssi_dbm: 'signal_dbm', wifi_signal_dbm: 'signal_dbm', wifi_rssi: 'signal_dbm', signal: 'signal_dbm', dbm: 'signal_dbm',
  retransmission_pct: 'retransmission_pct', retry_pct: 'retransmission_pct', wifi_retry_pct: 'retransmission_pct', retries_pct: 'retransmission_pct', retransmit_pct: 'retransmission_pct',
  dns_latency_ms: 'dns_latency_ms', dns_lookup_ms: 'dns_latency_ms', dns_resolution_ms: 'dns_latency_ms', dns_ms: 'dns_latency_ms', dns_time_ms: 'dns_latency_ms',
  dns_failure_pct: 'dns_failure_pct', dns_fail_pct: 'dns_failure_pct', dns_err_pct: 'dns_failure_pct', nxdomain_pct: 'dns_failure_pct', dns_fail: 'dns_failure_pct',
  dhcp_latency_ms: 'dhcp_latency_ms', dhcp_offer_ms: 'dhcp_latency_ms', dhcp_ms: 'dhcp_latency_ms',
  dhcp_failure_pct: 'dhcp_failure_pct', dhcp_fail_pct: 'dhcp_failure_pct', dhcp_err_pct: 'dhcp_failure_pct',
  cpu_pct: 'cpu_pct', cpu: 'cpu_pct', cpu_usage: 'cpu_pct', cpu_utilization: 'cpu_pct', cpu_load: 'cpu_pct', avg_cpu: 'cpu_pct',
  memory_pct: 'memory_pct', mem_pct: 'memory_pct', memory: 'memory_pct', ram_pct: 'memory_pct', ram: 'memory_pct', mem_usage: 'memory_pct',
  queue_drops: 'queue_drops', tx_drops: 'queue_drops', output_drops: 'queue_drops', egress_drops: 'queue_drops', drops: 'queue_drops', buffer_drops: 'queue_drops',
  interface_errors: 'interface_errors', crc_errors: 'interface_errors', if_errors: 'interface_errors', rx_errors: 'interface_errors', input_errors: 'interface_errors', crc: 'interface_errors', errors: 'interface_errors',
  throughput_mbps: 'throughput_mbps', throughput: 'throughput_mbps', tput_mbps: 'throughput_mbps',
  bandwidth_mbps: 'bandwidth_mbps', bandwidth: 'bandwidth_mbps', capacity_mbps: 'bandwidth_mbps'
};

const CSV_PRESETS = {
  congestion: [
    '# Enterprise Multi-Tier Switch Telemetry (CSV with Topology Uplinks & Unit Suffixes)',
    'timestamp,device_id,ip_address,device_type,uplink,link_utilization_pct,queue_drops,latency_ms,jitter_ms,packet_loss_pct,cpu_pct,memory_pct',
    '2026-11-05T01:10:00Z,IITBBS_CORE_RTR_01,10.10.0.1,core_router,,34.2%,0,4.1ms,0.8ms,0.0%,28%,44%',
    '2026-11-05T01:10:15Z,IITBBS_CORE_RTR_01,10.10.0.1,core_router,,36.5%,0,4.4ms,0.9ms,0.0%,30%,44%',
    '2026-11-05T01:10:30Z,IITBBS_CORE_RTR_01,10.10.0.1,core_router,,35.8%,0,4.2ms,0.7ms,0.0%,29%,45%',
    '2026-11-05T01:10:00Z,HOSTEL_DIST_SW_01,10.10.12.1,distribution_switch,IITBBS_CORE_RTR_01,95.4%,188,164ms,38ms,4.8%,46%,52%',
    '2026-11-05T01:10:15Z,HOSTEL_DIST_SW_01,10.10.12.1,distribution_switch,IITBBS_CORE_RTR_01,97.2%,234,189ms,44ms,5.6%,48%,53%',
    '2026-11-05T01:10:30Z,HOSTEL_DIST_SW_01,10.10.12.1,distribution_switch,IITBBS_CORE_RTR_01,98.1%,265,212ms,49ms,6.2%,49%,53%',
    '2026-11-05T01:10:00Z,MAHANADI_ACCESS_SW_03,10.10.12.33,access_switch,HOSTEL_DIST_SW_01,42.0%,2,171ms,40ms,4.9%,22%,39%',
    '2026-11-05T01:10:15Z,MAHANADI_ACCESS_SW_03,10.10.12.33,access_switch,HOSTEL_DIST_SW_01,44.1%,3,195ms,45ms,5.5%,23%,39%',
    '2026-11-05T01:10:30Z,MAHANADI_ACCESS_SW_03,10.10.12.33,access_switch,HOSTEL_DIST_SW_01,43.5%,2,218ms,51ms,6.1%,24%,40%'
  ].join('\n'),

  wifi: [
    '# Wireless RF Access Point & Roaming Client Telemetry (CSV)',
    'timestamp,device_id,ip_address,device_type,uplink,rssi_dbm,retry_pct,latency_ms,jitter_ms,packet_loss_pct,link_utilization_pct',
    '2026-11-05T01:12:00Z,ACADEMIC_DIST_SW_02,10.20.0.2,distribution_switch,,,0.2,8.1,1.0,0.0,31.5',
    '2026-11-05T01:12:15Z,ACADEMIC_DIST_SW_02,10.20.0.2,distribution_switch,,,0.3,8.4,1.1,0.0,32.2',
    '2026-11-05T01:12:30Z,ACADEMIC_DIST_SW_02,10.20.0.2,distribution_switch,,,0.2,8.2,1.0,0.0,30.8',
    '2026-11-05T01:12:00Z,LIBRARY_ARUBA_AP_07,10.20.4.17,wireless_ap,ACADEMIC_DIST_SW_02,-71.0,8.4,14.2,2.8,0.4,28.0',
    '2026-11-05T01:12:15Z,LIBRARY_ARUBA_AP_07,10.20.4.17,wireless_ap,ACADEMIC_DIST_SW_02,-72.0,9.1,15.0,3.1,0.5,29.5',
    '2026-11-05T01:12:30Z,LIBRARY_ARUBA_AP_07,10.20.4.17,wireless_ap,ACADEMIC_DIST_SW_02,-71.5,8.8,14.6,2.9,0.4,27.4',
    '2026-11-05T01:12:00Z,STUDENT_LAPTOP_WIFI_12,10.20.44.118,wireless_client,LIBRARY_ARUBA_AP_07,-84.5,33.2,154.0,43.5,6.8,14.0',
    '2026-11-05T01:12:15Z,STUDENT_LAPTOP_WIFI_12,10.20.44.118,wireless_client,LIBRARY_ARUBA_AP_07,-85.8,36.4,168.0,47.0,7.4,15.2',
    '2026-11-05T01:12:30Z,STUDENT_LAPTOP_WIFI_12,10.20.44.118,wireless_client,LIBRARY_ARUBA_AP_07,-86.2,38.1,179.5,49.8,8.1,13.8'
  ].join('\n'),

  crc: [
    '# Physical Layer Fiber Transceiver CRC Fault Telemetry (CSV)',
    'timestamp,device_id,ip_address,device_type,uplink,status,crc_errors,packet_loss_pct,jitter_ms,link_utilization_pct,queue_drops,cpu_pct',
    '2026-11-05T01:14:00Z,CAMPUS_CORE_SW_01,10.0.0.1,core_router,,up,0,0.0,1.1,26.4,0,24.0',
    '2026-11-05T01:14:15Z,CAMPUS_CORE_SW_01,10.0.0.1,core_router,,up,0,0.0,1.2,27.1,0,25.0',
    '2026-11-05T01:14:30Z,CAMPUS_CORE_SW_01,10.0.0.1,core_router,,up,0,0.0,1.0,26.8,0,24.5',
    '2026-11-05T01:14:00Z,CSE_LAB_SW_04,10.0.14.4,access_switch,CAMPUS_CORE_SW_01,up,148,5.8,36.0,18.2,0,19.0',
    '2026-11-05T01:14:15Z,CSE_LAB_SW_04,10.0.14.4,access_switch,CAMPUS_CORE_SW_01,down,215,9.4,52.0,14.5,0,20.0',
    '2026-11-05T01:14:30Z,CSE_LAB_SW_04,10.0.14.4,access_switch,CAMPUS_CORE_SW_01,up,264,8.2,47.5,16.9,0,19.5',
    '2026-11-05T01:14:45Z,CSE_LAB_SW_04,10.0.14.4,access_switch,CAMPUS_CORE_SW_01,down,310,11.6,58.0,12.1,0,21.0'
  ].join('\n'),

  dns: [
    '# Campus Core BIND DNS Resolver Timeout Telemetry (CSV)',
    'timestamp,device_id,ip_address,device_type,uplink,dns_latency_ms,dns_failure_pct,latency_ms,packet_loss_pct,cpu_pct,memory_pct',
    '2026-11-05T01:16:00Z,CAMPUS_EDGE_GW_01,10.0.0.254,core_router,,14.0,0.0,5.2,0.0,31.0,48.0',
    '2026-11-05T01:16:15Z,CAMPUS_EDGE_GW_01,10.0.0.254,core_router,,15.2,0.0,5.4,0.0,32.0,48.5',
    '2026-11-05T01:16:30Z,CAMPUS_EDGE_GW_01,10.0.0.254,core_router,,14.8,0.0,5.1,0.0,31.5,48.2',
    '2026-11-05T01:16:00Z,CAMPUS_DNS_RESOLVER_01,10.0.53.10,dns_server,CAMPUS_EDGE_GW_01,890.0,38.5,6.1,0.0,42.0,61.0',
    '2026-11-05T01:16:15Z,CAMPUS_DNS_RESOLVER_01,10.0.53.10,dns_server,CAMPUS_EDGE_GW_01,965.0,46.0,6.4,0.0,44.0,62.0',
    '2026-11-05T01:16:30Z,CAMPUS_DNS_RESOLVER_01,10.0.53.10,dns_server,CAMPUS_EDGE_GW_01,1120.0,54.2,6.2,0.0,45.0,62.5'
  ].join('\n')
};

function normKeyClient(k) {
  return String(k || '').toLowerCase().replace(/[^a-z0-9@]+/g, '_').replace(/^_+|_+$/g, '');
}

function detectDelimiterClient(headerLine) {
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let q = false;
  for (let i = 0; i < headerLine.length; i++) {
    const c = headerLine[i];
    if (c === '"') q = !q;
    else if (!q && counts[c] !== undefined) counts[c] += 1;
  }
  let best = ',';
  let bestN = counts[','];
  [';', '\t', '|'].forEach((d) => {
    if (counts[d] > bestN) { best = d; bestN = counts[d]; }
  });
  return best;
}

function parseCsvClient(text) {
  const cleaned = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'));
  const first = cleaned.find((l) => l.trim() !== '');
  if (!first) return { headers: [], rows: [], delimiter: ',' };
  const delimiter = detectDelimiterClient(first);
  const src = cleaned.join('\n');

  const rawRows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rawRows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rawRows.push(row); }

  const nonEmpty = rawRows.filter((r) => r.some((x) => x.trim() !== ''));
  if (!nonEmpty.length) return { headers: [], rows: [], delimiter };
  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] === undefined ? '' : r[idx].trim();
    });
    return obj;
  });
  return { headers, rows, delimiter };
}

function parseNumericMetricCell(rawVal) {
  if (typeof rawVal === 'number' && Number.isFinite(rawVal)) return rawVal;
  if (typeof rawVal !== 'string') return null;
  const s = rawVal.trim();
  if (!s) return null;
  const m = s.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([a-zµ%/]*)$/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const u = (m[2] || '').toLowerCase();
  if (u === 's' || u === 'sec' || u === 'secs' || u === 'seconds') n *= 1000;
  else if (u === 'us' || u === 'µs') n *= 0.001;
  else if (u === 'gbps' || u === 'gb/s') n *= 1000;
  else if (u === 'kbps' || u === 'kb/s') n *= 0.001;
  return n;
}

function parseRawTelemetryToObject(input) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  const text = String(input).replace(/^\uFEFF/, '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    if (!lines.length) return null;
    if (lines[0].startsWith('{')) {
      const samples = [];
      lines.forEach((l) => { try { samples.push(JSON.parse(l)); } catch (_err) {} });
      return { format: 'ndjson', samples };
    }
    const { headers, rows, delimiter } = parseCsvClient(text);
    if (headers.length < 2 || !rows.length) return null;
    const samples = rows.map((r) => {
      const out = {};
      Object.entries(r).forEach(([k, v]) => {
        const nk = normKeyClient(k);
        const canonicalMetric = CSV_METRIC_ALIASES[nk];
        if (canonicalMetric) {
          const parsedNum = parseNumericMetricCell(v);
          if (parsedNum !== null) out[canonicalMetric] = parsedNum;
        } else if (['device_id', 'device', 'node', 'node_id', 'host', 'hostname', 'switch_id', 'ap_id', 'router_id', 'target', 'endpoint', 'name', 'id'].includes(nk)) {
          if (!out.device_id && v) out.device_id = v;
        } else if (['uplink', 'uplink_device', 'parent', 'parent_id', 'upstream', 'upstream_device', 'connected_to'].includes(nk)) {
          if (v) out.parent = v;
        } else if (['ip', 'ip_address', 'ipv4', 'mgmt_ip', 'host_ip', 'address', 'target_ip'].includes(nk)) {
          if (v) out.ip = v;
          if (!out.device_id && v) out.device_id = v;
        } else if (['device_type', 'type', 'role', 'kind', 'device_role'].includes(nk)) {
          if (v) out.device_type = v;
        } else if (['site', 'location', 'building', 'zone', 'segment'].includes(nk)) {
          if (v) out.location = v;
        } else if (['timestamp', 'ts', 'time', 'datetime', 'collected_at'].includes(nk)) {
          if (v) out.timestamp = v;
        } else if (['status', 'device_status', 'state', 'oper_status'].includes(nk)) {
          if (v) out.status = v.toLowerCase();
        } else {
          const parsedNum = parseNumericMetricCell(v);
          out[k] = parsedNum !== null ? parsedNum : v;
        }
      });
      return out;
    });
    return { format: 'csv', delimiter, headers, samples };
  }
}

function summarizeTelemetryDataset(telemetryInput, reportObj = null) {
  const telemetryObj = parseRawTelemetryToObject(telemetryInput);
  if (!telemetryObj || typeof telemetryObj !== 'object') return { devices: [], links: [], sampleCount: 0 };

  const rawSamples = Array.isArray(telemetryObj.samples) ? telemetryObj.samples : (Array.isArray(telemetryObj) ? telemetryObj : []);
  const declaredDevices = Array.isArray(telemetryObj.devices) ? telemetryObj.devices : [];
  const rawLinks = (telemetryObj.topology && Array.isArray(telemetryObj.topology.links)) ? [...telemetryObj.topology.links] : [];
  const linkKeySet = new Set(rawLinks.map((l) => `${l.from || l.upstream || l.parent}->${l.to || l.downstream || l.child}`));

  const addParentLink = (parentId, childId) => {
    if (!parentId || !childId || parentId === childId) return;
    const k = `${parentId}->${childId}`;
    if (!linkKeySet.has(k)) {
      linkKeySet.add(k);
      rawLinks.push({ from: parentId, to: childId });
    }
  };

  const devMap = new Map();
  declaredDevices.forEach((d) => {
    const did = d && (d.id || d.device_id);
    if (!did) return;
    const parentId = d.parent || d.uplink || d.upstream || null;
    if (parentId) addParentLink(parentId, did);
    devMap.set(did, {
      id: did,
      type: d.type || 'network_node',
      name: d.name || did,
      role: d.role || d.type || 'Monitored Node',
      ip: d.ip || d.target_host || '-',
      dns_latency_ms: d.dns_latency_ms ?? null,
      dns_ok: d.dns_ok ?? true,
      dns_error: d.dns_error || null,
      location: d.location || '',
      samples: [],
      metrics: {}
    });
  });

  rawSamples.forEach((s) => {
    const id = s.device_id || s.device || s.host || s.node;
    if (!id) return;
    const sampleParent = s.parent || s.uplink || s.upstream || null;
    if (sampleParent) {
      addParentLink(sampleParent, id);
      if (!devMap.has(sampleParent)) {
        devMap.set(sampleParent, {
          id: sampleParent,
          type: 'core_router',
          name: sampleParent,
          role: 'Upstream Node',
          ip: '-',
          dns_latency_ms: null,
          dns_ok: true,
          dns_error: null,
          location: '',
          samples: [],
          metrics: {}
        });
      }
    }
    if (!devMap.has(id)) {
      devMap.set(id, {
        id,
        type: s.device_type || 'network_node',
        name: id,
        role: s.role || s.device_type || 'Monitored Node',
        ip: s.ip || '-',
        dns_latency_ms: null,
        dns_ok: true,
        dns_error: null,
        location: s.location || '',
        samples: [],
        metrics: {}
      });
    }
    const entry = devMap.get(id);
    if ((entry.ip === '-' || !entry.ip) && s.ip) entry.ip = s.ip;
    if (entry.type === 'network_node' && s.device_type) {
      entry.type = s.device_type;
      entry.role = s.device_type;
    }
    entry.samples.push(s);
    const m = s.metrics || s;
    Object.entries(m).forEach(([k, v]) => {
      if (['device_id', 'device', 'timestamp', 'ts', 'status', 'parent', 'uplink', 'upstream', 'ip', 'device_type', 'role', 'location'].includes(k)) return;
      const canonical = CSV_METRIC_ALIASES[normKeyClient(k)] || k;
      const numVal = typeof v === 'number' ? v : parseNumericMetricCell(v);
      if (typeof numVal === 'number' && Number.isFinite(numVal)) {
        if (!entry.metrics[canonical]) entry.metrics[canonical] = [];
        entry.metrics[canonical].push(numVal);
      }
    });
  });

  const links = rawLinks;
  const impairedSet = new Set((reportObj && reportObj.affected_devices) || []);
  const topRank = reportObj && Array.isArray(reportObj.ranking) && reportObj.ranking[0] ? reportObj.ranking[0] : null;
  const rootDeviceId = (reportObj && reportObj.status === 'diagnosed' && topRank) ? topRank.device_id : null;

  const avg = (arr) => (arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const peak = (arr, lowerWorse = false) => (arr && arr.length ? (lowerWorse ? Math.min(...arr) : Math.max(...arr)) : null);

  const devices = [...devMap.values()].map((d) => {
    const lastSample = d.samples[d.samples.length - 1] || {};
    const rawStatus = lastSample.status || (lastSample.metrics && lastSample.metrics.status) || 'up';
    const avgLossVal = avg(d.metrics.packet_loss_pct);
    const avgDnsFailVal = avg(d.metrics.dns_failure_pct);
    const dnsFailed = d.dns_ok === false || (avgDnsFailVal != null && avgDnsFailVal >= 50);
    const tcpDown = rawStatus === 'down' || (!dnsFailed && avgLossVal != null && avgLossVal >= 100);
    const isRoot = rootDeviceId === d.id;
    const isImpaired = impairedSet.has(d.id) || rawStatus === 'down' || rawStatus === 'degraded' || dnsFailed || tcpDown;

    const parentLink = links.find((l) => (l.to || l.downstream || l.child) === d.id);
    const upstream = parentLink ? (parentLink.from || parentLink.upstream || parentLink.parent) : null;

    return {
      ...d,
      upstream,
      sampleCount: d.samples.length,
      rawStatus,
      dnsFailed,
      tcpDown,
      isRoot,
      isImpaired,
      avgLatency: avg(d.metrics.latency_ms),
      peakLatency: peak(d.metrics.latency_ms),
      avgJitter: avg(d.metrics.jitter_ms),
      avgLoss: avgLossVal,
      avgDns: avg(d.metrics.dns_latency_ms) ?? d.dns_latency_ms ?? null,
      avgDnsFail: avgDnsFailVal,
      avgCpu: avg(d.metrics.cpu_pct),
      avgMem: avg(d.metrics.mem_pct || d.metrics.memory_pct),
      avgUtil: avg(d.metrics.link_utilization_pct || d.metrics.utilization_pct),
      avgRssi: avg(d.metrics.signal_dbm || d.metrics.wifi_rssi_dbm),
      avgRetry: avg(d.metrics.retransmission_pct),
      avgDrops: avg(d.metrics.queue_drops),
      avgErrors: avg(d.metrics.interface_errors)
    };
  });

  return { devices, links, sampleCount: rawSamples.length };
}

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\r\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvFile(filename, headers, rows) {
  const csvBody = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(','))
  ].join('\r\n');
  // Prepend UTF-8 BOM so Microsoft Excel / Google Sheets / Numbers open symbols cleanly
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV Exported', `Saved ${filename} (${rows.length} rows)`, 'ok');
}

function convertTelemetryObjectToCsv(telemetryInput) {
  const obj = parseRawTelemetryToObject(telemetryInput);
  if (!obj) return '';
  const rawSamples = Array.isArray(obj.samples) ? obj.samples : (Array.isArray(obj) ? obj : []);
  if (!rawSamples.length) return '';

  const devLookup = new Map();
  (obj.devices || []).forEach((d) => {
    const id = d.id || d.device_id;
    if (id) devLookup.set(id, d);
  });
  const parentLookup = new Map();
  if (obj.topology && Array.isArray(obj.topology.links)) {
    obj.topology.links.forEach((l) => {
      const p = l.from || l.upstream || l.parent;
      const c = l.to || l.downstream || l.child;
      if (p && c && !parentLookup.has(c)) parentLookup.set(c, p);
    });
  }
  (obj.devices || []).forEach((d) => {
    const id = d.id || d.device_id;
    const p = d.parent || d.uplink || d.upstream;
    if (id && p && !parentLookup.has(id)) parentLookup.set(id, p);
  });

  const metricColSet = new Set();
  rawSamples.forEach((s) => {
    const m = s.metrics || s;
    Object.keys(m).forEach((k) => {
      if (['device_id', 'device', 'timestamp', 'ts', 'status', 'parent', 'uplink', 'upstream', 'ip', 'device_type', 'role', 'location', 'mem_pct'].includes(k)) return;
      metricColSet.add(k);
    });
  });

  const metricCols = [...metricColSet];
  const headers = ['timestamp', 'device_id', 'ip_address', 'device_type', 'uplink', 'status', ...metricCols];
  const rows = rawSamples.map((s) => {
    const id = s.device_id || s.device || '';
    const dMeta = devLookup.get(id) || {};
    const m = s.metrics || s;
    return [
      s.timestamp || s.ts || '',
      id,
      s.ip || dMeta.ip || '',
      s.device_type || dMeta.type || '',
      s.parent || s.uplink || parentLookup.get(id) || '',
      s.status || 'up',
      ...metricCols.map((mc) => (m[mc] !== undefined && m[mc] !== null ? m[mc] : ''))
    ];
  });

  return [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(','))
  ].join('\n');
}

function renderCsvGridPreview() {
  const wrap = $('#nc-csv-grid-wrap');
  const rawEl = $('#nc-raw');
  if (!wrap || !rawEl) return;
  const text = rawEl.value.trim();
  if (!text) {
    wrap.innerHTML = `<div class="panel__body"><p class="small muted" style="margin:0">Paste or load CSV/JSON telemetry to preview tabular columns.</p></div>`;
    return;
  }

  let csvSource = text;
  if (/^[{[]/.test(text)) {
    csvSource = convertTelemetryObjectToCsv(text);
  }
  const { headers, rows, delimiter } = parseCsvClient(csvSource);
  if (!headers.length || !rows.length) {
    wrap.innerHTML = `<div class="panel__body"><p class="small muted" style="margin:0">Unable to render table preview — verify CSV columns or JSON samples.</p></div>`;
    return;
  }

  const delimLabel = delimiter === '\t' ? 'TSV (Tab)' : delimiter === ';' ? 'CSV (Semicolon)' : delimiter === '|' ? 'Pipe-delimited' : 'CSV (Comma)';
  const previewRows = rows.slice(0, 60);

  wrap.innerHTML = `
    <div style="padding:7px 10px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);font-size:11.5px">
      <span class="mono"><b>${esc(delimLabel)}</b> &middot; ${rows.length} data rows &times; ${headers.length} columns</span>
      <span class="muted">${rows.length > 60 ? 'Showing first 60 rows' : 'All rows shown'} &middot; Auto-mapped to canonical schema</span>
    </div>
    <div class="table-wrap">
      <table class="table" style="font-size:11.5px">
        <thead>
          <tr>
            <th class="num">#</th>
            ${headers.map((h) => {
              const nk = normKeyClient(h);
              const mapped = CSV_METRIC_ALIASES[nk] || (['uplink', 'parent', 'upstream'].includes(nk) ? 'topology.parent' : '');
              return `<th><div>${esc(h)}</div>${mapped && mapped !== h ? `<div class="mono" style="font-size:10px;color:var(--accent);font-weight:400">&rarr; ${esc(mapped)}</div>` : ''}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${previewRows.map((r, idx) => `
            <tr>
              <td class="num muted mono">${idx + 1}</td>
              ${headers.map((h) => `<td class="mono">${esc(r[h] !== '' ? r[h] : '-')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Update Payload Metadata Badge ──────────────────────────────────────────
function updatePayloadMeta() {
  const metaEl = $('#nc-payload-meta');
  const rawEl = $('#nc-raw');
  const gridWrap = $('#nc-csv-grid-wrap');
  if (!metaEl || !rawEl) return;
  const text = rawEl.value.trim();
  if (!text) {
    metaEl.textContent = '0 samples';
    if (gridWrap && gridWrap.style.display !== 'none') renderCsvGridPreview();
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
    const parsedObj = parseRawTelemetryToObject(text);
    if (parsedObj && Array.isArray(parsedObj.samples) && parsedObj.samples.length) {
      const devs = new Set(parsedObj.samples.map((s) => s.device_id).filter(Boolean)).size;
      const fmtName = parsedObj.format === 'ndjson' ? 'NDJSON' : (parsedObj.delimiter === '\t' ? 'TSV' : 'CSV');
      metaEl.textContent = `${parsedObj.samples.length} rows · ${devs} nodes · ${fmtName}`;
      appState.currentTelemetry = parsedObj;
      const topoCount = $('#tab-topo-count');
      if (topoCount && devs) topoCount.textContent = String(devs);
    } else {
      const lines = text.split('\n').filter((l) => l.trim()).length;
      metaEl.textContent = `${lines} lines`;
    }
  }
  if (gridWrap && gridWrap.style.display !== 'none') renderCsvGridPreview();
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
      <button class="btn" id="modal-csv-dev">${icon('download')} Export Node (.csv)</button>
      <button class="btn" id="modal-copy-dev">${icon('copy')} Copy Node JSON</button>
      <button class="btn btn--primary" id="modal-cancel-btn">Close</button>
    `
  });

  const copyBtn = $('#modal-copy-dev');
  if (copyBtn) copyBtn.onclick = () => copyText(JSON.stringify(dev.samples, null, 2), copyBtn);

  const csvNodeBtn = $('#modal-csv-dev');
  if (csvNodeBtn) {
    csvNodeBtn.onclick = () => {
      const csvStr = convertTelemetryObjectToCsv({
        devices: [{ id: dev.id, type: dev.type, ip: dev.ip !== '-' ? dev.ip : '', parent: dev.upstream || '' }],
        samples: dev.samples
      });
      if (!csvStr) {
        toast('Export notice', 'No tabular samples available for this node', 'error');
        return;
      }
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dev.id.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}-samples.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Node CSV Exported', `Saved ${dev.id} time-series samples`, 'ok');
    };
  }
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
  const ce = hostInfo.client_edge || null;

  if (rttEl) rttEl.textContent = avgRtt != null ? `${fmtDec(avgRtt, 1)} ms avg RTT` : 'Measured live';
  if (dnsEl) {
    const ceNote = ce && ce.http_rtt_ms != null ? ` · Browser RTT ${fmtDec(ce.http_rtt_ms, 1)} ms` : '';
    dnsEl.textContent = (avgDns != null ? `${fmtDec(avgDns, 1)} ms avg DNS` : `${targetDevs.length} live endpoints`) + ceNote;
  }

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

  const clientRowHtml = (ce && (ce.client_ip || ce.http_rtt_ms != null)) ? `
    <tr style="--i:0;background:rgba(37,99,235,0.03)">
      <td class="mono"><b>CLIENT_BROWSER_EDGE</b></td>
      <td class="small muted">Your Browser Edge Session${ce.effective_type ? ` (${esc(String(ce.effective_type).toUpperCase())})` : ''}</td>
      <td class="mono small">${esc(ce.client_ip || 'Client')}${ce.location ? ` · ${esc(ce.location)}` : ''}${ce.edge_region ? ` → ${esc(ce.edge_region)}` : ''}</td>
      <td class="num">-</td>
      <td class="num">${ce.http_rtt_ms != null ? fmtDec(ce.http_rtt_ms, 1) + ' ms (HTTPS)' : '-'}</td>
      <td class="num">${ce.http_jitter_ms != null ? fmtDec(ce.http_jitter_ms, 2) + ' ms' : '-'}</td>
      <td class="num">0.0%</td>
      <td class="num">${ce.downlink_mbps != null ? fmtDec(ce.downlink_mbps, 1) + ' Mbps' : '-'}</td>
      <td>${pill('CONTAINED', 'Connected')}</td>
      <td style="text-align:right"><span class="small muted mono">Browser API</span></td>
    </tr>
  ` : '';

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
          ${clientRowHtml}
          ${summary.devices.map((d, i) => {
            const dnsCell = d.dnsFailed
              ? `<span style="color:var(--high);font-weight:600">FAIL (${d.avgDns != null ? fmtDec(d.avgDns, 0) + ' ms' : 'NXDOMAIN'})</span>`
              : (d.avgDns != null ? fmtDec(d.avgDns, 2) + ' ms' : '-');
            const tcpCell = d.tcpDown
              ? `<span style="color:var(--high);font-weight:600">TIMEOUT / DOWN</span>`
              : (d.avgLatency != null ? fmtDec(d.avgLatency, 2) + ' ms' : '-');
            const statusLabel = d.dnsFailed
              ? 'DNS Fail'
              : d.tcpDown
                ? 'TCP Down'
                : d.isRoot
                  ? 'Root Cause'
                  : d.isImpaired
                    ? 'Degraded'
                    : 'Online';
            const statusTone = (d.isRoot || d.dnsFailed || d.tcpDown) ? 'CONFIRMED' : d.isImpaired ? 'INVESTIGATING' : 'CONTAINED';
            return `
            <tr class="is-clickable nc-rt-dev-row" data-dev="${esc(d.id)}" style="--i:${i + 1}">
              <td class="mono"><b>${esc(d.id)}</b></td>
              <td class="small muted">${esc(d.role)}</td>
              <td class="mono small">${esc(d.ip || '-')}</td>
              <td class="num">${dnsCell}</td>
              <td class="num">${tcpCell}</td>
              <td class="num">${d.avgJitter != null ? fmtDec(d.avgJitter, 2) + ' ms' : '-'}</td>
              <td class="num">${d.avgLoss != null ? fmtDec(d.avgLoss, 1) + '%' : '0.0%'}</td>
              <td class="num">${d.avgCpu != null ? `${fmtDec(d.avgCpu, 1)}% / ${fmtDec(d.avgMem, 1)}%` : '-'}</td>
              <td>${pill(statusTone, statusLabel)}</td>
              <td style="text-align:right">
                <button class="btn btn--sm nc-inspect-dev-btn" data-dev="${esc(d.id)}">${icon('search')} Samples</button>
              </td>
            </tr>
            `;
          }).join('')}
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
  const opSeq = ++activeOpSeq;
  const statusEl = $('#nc-status');
  appState.activeScenarioKey = key;
  $$('.nc-sc').forEach((b) => {
    b.style.background = b.dataset.key === key ? 'var(--accent-soft)' : '';
  });
  if (statusEl) statusEl.textContent = `Loading scenario "${key}"…`;
  try {
    const res = await fetch(`/api/netcoop/scenarios/${encodeURIComponent(key)}`, { method: 'POST' });
    const data = await res.json();
    if (opSeq !== activeOpSeq) return;
    if (!data.telemetry) throw new Error(data.error || 'No telemetry returned');
    appState.currentTelemetry = data.telemetry;
    $('#nc-raw').value = JSON.stringify(data.telemetry, null, 2);
    updatePayloadMeta();
    appendRuntimeLog('SCENARIO', `Loaded IIT Bhubaneswar scenario "${key}" (${(data.telemetry.samples || []).length} samples)`, 'sync');

    if (autoRun) {
      await runDiagnosis({ opSeq });
    } else if (statusEl) {
      statusEl.textContent = `Scenario "${key}" loaded — click Run 6-Agent Diagnosis`;
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = '';
    toast('Scenario load failed', e.message, 'error');
  }
}

// ─── Diagnosis Execution ────────────────────────────────────────────────────
async function runDiagnosis(opts = {}) {
  const opSeq = opts.opSeq || ++activeOpSeq;
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
      appState.currentTelemetry = parseRawTelemetryToObject(raw);
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
    if (opSeq !== activeOpSeq) return;
    applyDiagnosisResult(result);
    toast('Diagnosis complete', result.report.suspected_root_cause || 'Report ready', 'ok');
  } catch (err) {
    if (opSeq !== activeOpSeq) return;
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

function exportLiveProbeCsv() {
  const tele = appState.liveProbeTelemetry || appState.currentTelemetry;
  const diag = appState.liveProbeDiagnosis || appState.result;
  if (!tele) {
    toast('No live telemetry', 'Run Probe Live Network first', 'error');
    return;
  }
  const hostInfo = tele.host_info || {};
  const ce = hostInfo.client_edge || null;
  const r = (diag && diag.report) || {};
  const summary = summarizeTelemetryDataset(tele, r);

  const headers = [
    'timestamp_utc', 'node_id', 'role_tier', 'resolved_ip_endpoint', 'upstream_parent',
    'samples_count', 'dns_lookup_ms', 'tcp_rtt_avg_ms', 'tcp_rtt_peak_ms', 'jitter_ms',
    'packet_loss_pct', 'cpu_pct', 'memory_pct', 'status'
  ];
  const nowIso = new Date().toISOString();
  const rows = [];

  if (ce && (ce.client_ip || ce.http_rtt_ms != null)) {
    rows.push([
      nowIso,
      'CLIENT_BROWSER_EDGE',
      `Client Browser Session${ce.effective_type ? ` (${String(ce.effective_type).toUpperCase()})` : ''}`,
      [ce.client_ip, ce.location, ce.edge_region].filter(Boolean).join(' · '),
      '',
      2,
      '',
      ce.http_rtt_ms != null ? fmtDec(ce.http_rtt_ms, 2) : '',
      ce.http_rtt_ms != null ? fmtDec(ce.http_rtt_ms, 2) : '',
      ce.http_jitter_ms != null ? fmtDec(ce.http_jitter_ms, 2) : '',
      0,
      '',
      ce.downlink_mbps != null ? `${fmtDec(ce.downlink_mbps, 1)} Mbps` : '',
      'Connected'
    ]);
  }

  summary.devices.forEach((d) => {
    const statusLabel = d.dnsFailed ? 'DNS_FAIL' : d.tcpDown ? 'TCP_DOWN' : d.isRoot ? 'ROOT_CAUSE' : d.isImpaired ? 'DEGRADED' : 'ONLINE';
    rows.push([
      nowIso,
      d.id,
      d.role,
      d.ip || '',
      d.upstream || '',
      d.sampleCount,
      d.avgDns != null ? fmtDec(d.avgDns, 2) : '',
      d.avgLatency != null ? fmtDec(d.avgLatency, 2) : '',
      d.peakLatency != null ? fmtDec(d.peakLatency, 2) : '',
      d.avgJitter != null ? fmtDec(d.avgJitter, 2) : '',
      d.avgLoss != null ? fmtDec(d.avgLoss, 1) : '0.0',
      d.avgCpu != null ? fmtDec(d.avgCpu, 1) : '',
      d.avgMem != null ? fmtDec(d.avgMem, 1) : '',
      statusLabel
    ]);
  });

  const stamp = nowIso.slice(0, 19).replace(/[:T]/g, '-');
  downloadCsvFile(`netcoop-live-probe-${stamp}.csv`, headers, rows);
}

function exportDiagnosisResultCsv() {
  const { result } = appState;
  if (!result || !result.report) {
    toast('No diagnostic report', 'Run a diagnosis first to export CSV results', 'error');
    return;
  }
  const r = result.report;
  const groq = r.llm_synthesis || result.groq || null;
  const cliLine = groq && Array.isArray(groq.cli_commands)
    ? groq.cli_commands.filter((c) => !String(c).trim().startsWith('#')).join(' ; ')
    : '';
  const summary = summarizeTelemetryDataset(result.normalized_telemetry || appState.currentTelemetry, r);
  const evList = r.supporting_evidence || [];
  const actions = r.recommended_actions || [];
  const primaryAction = actions[0] ? (typeof actions[0] === 'string' ? actions[0] : JSON.stringify(actions[0])) : '';

  const headers = [
    'incident_id', 'run_id', 'timestamp_utc', 'verdict_status', 'suspected_root_cause',
    'confidence_pct', 'confidence_band', 'device_id', 'role_type', 'ip_endpoint',
    'upstream_parent', 'node_diagnostic_state', 'samples_count', 'avg_latency_ms',
    'peak_latency_ms', 'avg_jitter_ms', 'packet_loss_pct', 'dns_latency_ms',
    'dns_failure_pct', 'link_utilization_pct', 'queue_drops', 'interface_errors',
    'wifi_signal_dbm', 'wifi_retry_pct', 'cpu_pct', 'memory_pct',
    'node_anomalous_evidence', 'primary_recommended_action', 'cli_remediation_sequence'
  ];

  const confPct = Math.round((r.confidence || 0) * 100);
  const rows = summary.devices.map((d) => {
    const devEv = evList
      .filter((e) => e.device_id === d.id)
      .map((e) => `${e.metric}=${e.value}${e.unit ? e.unit : ''} (${e.level})`)
      .join(' | ');
    const stateLabel = d.isRoot ? 'SUSPECTED_ROOT_CAUSE' : d.isImpaired ? 'IMPAIRED_DOWNSTREAM' : 'HEALTHY';
    return [
      r.incident_id || '',
      r.run_id || '',
      r.timestamp || new Date().toISOString(),
      r.status || '',
      r.suspected_root_cause || '',
      confPct,
      r.confidence_category || '',
      d.id,
      d.role || '',
      d.ip && d.ip !== '-' ? d.ip : '',
      d.upstream || '',
      stateLabel,
      d.sampleCount,
      d.avgLatency != null ? fmtDec(d.avgLatency, 2) : '',
      d.peakLatency != null ? fmtDec(d.peakLatency, 2) : '',
      d.avgJitter != null ? fmtDec(d.avgJitter, 2) : '',
      d.avgLoss != null ? fmtDec(d.avgLoss, 2) : '',
      d.avgDns != null ? fmtDec(d.avgDns, 2) : '',
      d.avgDnsFail != null ? fmtDec(d.avgDnsFail, 2) : '',
      d.avgUtil != null ? fmtDec(d.avgUtil, 2) : '',
      d.avgDrops != null ? fmtDec(d.avgDrops, 1) : '',
      d.avgErrors != null ? fmtDec(d.avgErrors, 1) : '',
      d.avgRssi != null ? fmtDec(d.avgRssi, 1) : '',
      d.avgRetry != null ? fmtDec(d.avgRetry, 1) : '',
      d.avgCpu != null ? fmtDec(d.avgCpu, 1) : '',
      d.avgMem != null ? fmtDec(d.avgMem, 1) : '',
      devEv,
      d.isRoot || d.isImpaired ? primaryAction : 'Nominal — continue baseline monitoring',
      d.isRoot ? cliLine : ''
    ];
  });

  const inc = (r.incident_id || 'netcoop-report').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  downloadCsvFile(`${inc}-diagnostic-result.csv`, headers, rows);
}

function applyDiagnosisResult(result) {
  appState.result = result;
  if (result.normalized_telemetry) {
    // Preserve host_info from liveProbeTelemetry when present while adopting normalized samples/links
    const prevHostInfo = appState.currentTelemetry && appState.currentTelemetry.host_info;
    appState.currentTelemetry = prevHostInfo
      ? { ...result.normalized_telemetry, host_info: prevHostInfo, source: appState.currentTelemetry.source || result.normalized_telemetry.source }
      : result.normalized_telemetry;
    const topoCount = $('#tab-topo-count');
    if (topoCount && result.normalized_telemetry.devices) {
      topoCount.textContent = String(result.normalized_telemetry.devices.length);
    }
  }
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
    const fmtTag = meta.format ? ` · ${String(meta.format).toUpperCase()}` : '';
    statusEl.textContent = `Completed in ${meta.elapsed_ms ?? '-'} ms · ${msgs.length} JSON-RPC messages${fmtTag}`;
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
  const summary = summarizeTelemetryDataset(result.normalized_telemetry || appState.currentTelemetry, r);
  const srcFormat = (meta.format || (dq && dq.format) || 'telemetry').toUpperCase();

  let html = '';

  // ── 1. Verdict Banner ────────────────────────────────────────────────────
  html += `
  <div class="verdict verdict--${esc(outcomeClass)}" style="background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--c, var(--accent));border-radius:var(--r-lg)">
    <div class="verdict__top">
      <span class="verdict__label">${esc(outcomeText)}</span>
      <span class="verdict__conf">Confidence ${confidence}% (${esc(r.confidence_category || 'calibrated')})</span>
      <span class="verdict__id">Incident ${esc(r.incident_id || '-')} &middot; ${esc(srcFormat)} &middot; ${meta.elapsed_ms ?? '-'} ms &middot; ${meta.messages || msgs.length} bus msgs</span>
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
        <button class="btn btn--sm btn--primary" id="res-export-csv-btn">${icon('download')} Export Result (.csv)</button>
        <button class="btn btn--sm" id="res-export-json-btn">${icon('download')} Export JSON</button>
      </div>
    </div>
  </div>`;

  // ── 2. Per-Device Telemetry & Health Breakdown (Real Computed Metrics) ───
  if (summary.devices.length) {
    html += `
    <section class="panel">
      <div class="panel__head">
        <h2 class="panel__title"><i data-icon="server"></i> Per-Node Telemetry Summary (${summary.devices.length} Nodes)</h2>
        <div class="panel__head-actions">
          <span class="panel__meta">Click any node to inspect raw samples</span>
          <button class="panel__link" id="res-table-csv-btn">${icon('download')} Download Node CSV</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Role / Upstream</th>
              <th class="num">Samples</th>
              <th class="num">Avg Latency</th>
              <th class="num">Packet Loss</th>
              <th class="num">DNS Latency</th>
              <th class="num">Util / RF / Errors</th>
              <th class="num">CPU / Mem</th>
              <th>Diagnostic Status</th>
            </tr>
          </thead>
          <tbody class="rows-in">
            ${summary.devices.map((d, i) => {
              const extraParts = [];
              if (d.avgUtil != null) extraParts.push(`${fmtDec(d.avgUtil, 1)}% util`);
              if (d.avgDrops != null && d.avgDrops > 0) extraParts.push(`${fmtDec(d.avgDrops, 0)} drops`);
              if (d.avgErrors != null && d.avgErrors > 0) extraParts.push(`${fmtDec(d.avgErrors, 0)} CRC`);
              if (d.avgRssi != null) extraParts.push(`${fmtDec(d.avgRssi, 1)} dBm`);
              if (d.avgRetry != null && d.avgRetry > 0) extraParts.push(`${fmtDec(d.avgRetry, 1)}% retry`);
              const extraCell = extraParts.length ? extraParts.join(' · ') : '-';
              const roleUp = d.upstream ? `${d.role} → ${d.upstream}` : d.role;
              return `
              <tr class="is-clickable nc-dev-summary-row" data-dev="${esc(d.id)}" style="--i:${i}">
                <td class="mono"><b>${esc(d.id)}</b></td>
                <td class="small muted">${esc(roleUp)}</td>
                <td class="num">${d.sampleCount}</td>
                <td class="num">${d.avgLatency != null ? fmtDec(d.avgLatency, 1) + ' ms' : '-'}</td>
                <td class="num">${d.avgLoss != null ? fmtDec(d.avgLoss, 1) + '%' : '-'}</td>
                <td class="num">${d.avgDns != null ? fmtDec(d.avgDns, 1) + ' ms' : '-'}</td>
                <td class="num small mono">${esc(extraCell)}</td>
                <td class="num">${d.avgCpu != null ? `${fmtDec(d.avgCpu, 0)}% / ${fmtDec(d.avgMem, 0)}%` : '-'}</td>
                <td>${pill(d.isRoot ? 'CONFIRMED' : d.isImpaired ? 'INVESTIGATING' : 'CONTAINED', d.isRoot ? 'Suspected Root Cause' : d.isImpaired ? 'Impaired' : 'Normal')}</td>
              </tr>`;
            }).join('')}
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
      <div class="panel__head-actions">
        <span class="panel__meta mono">${esc(r.schema || 'netcoop.report/1.0')}</span>
        <button class="panel__link" id="nc-copy-json">${icon('copy')} Copy JSON</button>
        <button class="panel__link" id="nc-toggle-json">Show Raw JSON</button>
      </div>
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

  const exportCsvBtn = $('#res-export-csv-btn', wrap);
  if (exportCsvBtn) exportCsvBtn.onclick = () => exportDiagnosisResultCsv();

  const tableCsvBtn = $('#res-table-csv-btn', wrap);
  if (tableCsvBtn) tableCsvBtn.onclick = () => exportDiagnosisResultCsv();

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

  // Compute true tree depth (tier 0, 1, 2, 3...) from upstream->downstream links
  const parentOf = new Map();
  links.forEach((l) => {
    const from = l.from || l.upstream || l.parent;
    const to = l.to || l.downstream || l.child;
    if (from && to && from !== to) parentOf.set(to, from);
  });

  const depthOf = (id, visited = new Set()) => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const p = parentOf.get(id);
    return p ? 1 + depthOf(p, visited) : 0;
  };

  const tiers = new Map();
  let maxDepth = 0;
  devices.forEach((d) => {
    const depth = depthOf(d.id);
    if (depth > maxDepth) maxDepth = depth;
    if (!tiers.has(depth)) tiers.set(depth, []);
    tiers.get(depth).push(d);
  });

  const maxNodesInTier = Math.max(...[...tiers.values()].map((arr) => arr.length), 1);
  const boxW = 164;
  const boxH = 42;
  const width = Math.max(920, maxNodesInTier * (boxW + 28) + 40);
  const rowGap = 78;
  const height = Math.max(120, (maxDepth + 1) * rowGap + 24);
  const pos = new Map();

  for (let depth = 0; depth <= maxDepth; depth++) {
    const rowNodes = tiers.get(depth) || [];
    const y = 42 + depth * rowGap;
    rowNodes.forEach((d, idx) => {
      const x = Math.round(((idx + 1) / (rowNodes.length + 1)) * width);
      pos.set(d.id, { x, y, d });
    });
  }

  const linkLines = links.map((l) => {
    const fromId = l.from || l.upstream || l.parent;
    const toId = l.to || l.downstream || l.child;
    const p1 = pos.get(fromId);
    const p2 = pos.get(toId);
    if (!p1 || !p2) return '';
    const isImp = p1.d.isImpaired || p2.d.isImpaired;
    const midY = Math.round((p1.y + boxH / 2 + (p2.y - boxH / 2)) / 2);
    return `<path d="M ${p1.x} ${p1.y + boxH / 2} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y - boxH / 2}" fill="none" stroke="${isImp ? 'var(--crit)' : 'var(--line-strong)'}" stroke-width="${isImp ? '2' : '1.5'}" stroke-dasharray="${isImp ? '4 3' : 'none'}" />`;
  }).join('');

  const nodeBoxes = [...pos.values()].map(({ x, y, d }) => {
    const stroke = d.isRoot ? 'var(--crit)' : d.isImpaired ? 'var(--high)' : 'var(--ok)';
    const fill = 'var(--surface)';
    const labelStr = d.id.length > 21 ? d.id.slice(0, 20) + '…' : d.id;
    const subStr = d.avgLatency != null ? `${fmtDec(d.avgLatency, 1)} ms RTT · ${fmtDec(d.avgLoss || 0, 1)}% loss` : (d.ip !== '-' ? d.ip : d.role.slice(0, 18));
    return `
      <g class="nc-svg-node" data-dev="${esc(d.id)}" style="cursor:pointer" transform="translate(${x - boxW / 2}, ${y - boxH / 2})">
        <rect width="${boxW}" height="${boxH}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.75" />
        <circle cx="12" cy="15" r="3.5" fill="${stroke}" />
        <text x="22" y="18" fill="var(--ink)" font-family="var(--font-mono)" font-size="10.5" font-weight="600">${esc(labelStr)}</text>
        <text x="12" y="32" fill="var(--ink-3)" font-family="var(--font-mono)" font-size="9.5">${esc(subStr)}</text>
      </g>
    `;
  }).join('');

  return `
    <div class="nc-topo-svg-wrap">
      <svg class="nc-topo-svg" style="max-height:${height}px" viewBox="0 0 ${width} ${height}" aria-label="Network Topology Dependency Graph">
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
        <div class="panel__head">
          <h2 class="panel__title"><i data-icon="network"></i> Live Topology &amp; Dependency Graph (${summary.devices.length} Nodes, ${summary.links.length} Links)</h2>
          <div class="panel__head-actions">
            <span class="panel__meta mono">${esc(sourceTitle)}</span>
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
    { group: 'Live Actions', icon: 'download', label: 'Export Diagnostic Result (.csv)', sub: 'Download multi-column Excel/Sheets CSV of nodes, metrics, evidence & CLI', run: () => exportDiagnosisResultCsv() },
    { group: 'Live Actions', icon: 'download', label: 'Export Live Network Probe (.csv)', sub: 'Download live DNS + TCP socket probe table as CSV', run: () => exportLiveProbeCsv() },
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

// ─── Boot Sequence Orchestrator (3-Column Minimalist White-Theme Boot) ──────
let bootTimers = [];
let bootIntervals = [];
let bootRafId = null;

const BOOT_TICKER_LINES = [
  'PROBING LIVE DNS & TCP SOCKETS...',
  'MOUNTING JSON-RPC V1.0.0 BUS...',
  'SYNCHRONIZING 6 COOPERATIVE AGENTS...',
  'INITIALIZING CAMPUS TOPOLOGY GRAPH...',
  'DECRYPTING TELEMETRY DATA STREAMS...',
  'CALIBRATING SECTION 6 GUARDRAILS...'
];

const BOOT_RIGHT_MESSAGE = [
  '// HANG TIGHT, OPERATOR. LIVE DATA PROBE',
  'IS IN PROGRESS. CORRELATING TELEMETRY, SO',
  'ACCURATE ROOT CAUSE IS WORTH THE WAIT...'
].join('\n');

const BOOT_SCRAMBLE_GLYPHS = '▓▒░/<>[]{}#*+=~';

function clearBootTimers() {
  while (bootTimers.length) {
    clearTimeout(bootTimers.pop());
  }
  while (bootIntervals.length) {
    clearInterval(bootIntervals.pop());
  }
  if (bootRafId !== null) {
    cancelAnimationFrame(bootRafId);
    bootRafId = null;
  }
}

function renderBootTickerTrack(trackEl, offset, activeSlot = 2) {
  if (!trackEl) return;
  let html = '';
  for (let i = 0; i < 7; i++) {
    const text = BOOT_TICKER_LINES[(offset + i) % BOOT_TICKER_LINES.length];
    if (i === activeSlot) {
      html += `<div class="nc-cine-ticker__line is-active"><span>${esc(text)}</span></div>`;
    } else {
      html += `<div class="nc-cine-ticker__line">// ${esc(text)}</div>`;
    }
  }
  trackEl.innerHTML = html;
}

function ensureHandcraftedBootDOM() {
  const el = document.getElementById('netcoop-boot-screen');
  if (el && !el.querySelector('.nc-cine-boot')) {
    el.className = 'boot-screen';
    el.removeAttribute('style');
    el.innerHTML = `
      <div class="nc-cine-boot">
        <div class="nc-cine-left" aria-hidden="true">
          <div class="nc-cine-ticker">
            <div class="nc-cine-ticker__track" id="boot-ticker-track"></div>
          </div>
        </div>
        <div class="nc-cine-center">
          <img src="images/netcoop-logo-light.png" alt="NetCoop — Multi-Agent Network Intelligence" class="nc-cine-logo" width="168" />
          <button type="button" class="nc-cine-counter" id="boot-percent" title="Boot progress">[ 00% ]</button>
        </div>
        <div class="nc-cine-right">
          <div class="nc-cine-typewriter" id="boot-typewriter">
            <span id="boot-typewriter-text"></span><span class="nc-cine-cursor" aria-hidden="true">&#9608;</span>
          </div>
        </div>
      </div>
      <button type="button" class="nc-cine-skip" id="boot-skip-btn">[ SKIP ]</button>
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
  }, 450);
}

function runBootSequence(options = {}) {
  ensureHandcraftedBootDOM();
  clearBootTimers();

  const el = document.getElementById('netcoop-boot-screen');
  const trackEl = document.getElementById('boot-ticker-track');
  const pctEl = document.getElementById('boot-percent');
  const twTextEl = document.getElementById('boot-typewriter-text');
  const skipBtn = document.getElementById('boot-skip-btn');
  if (!el) return;

  if (skipBtn) {
    skipBtn.onclick = () => dismissBootScreen();
  }
  if (pctEl) {
    pctEl.onclick = () => dismissBootScreen();
  }

  // Re-trigger logo entrance cleanly on replay
  const logoEl = el.querySelector('.nc-cine-logo');
  if (logoEl) {
    logoEl.style.animation = 'none';
    void logoEl.offsetWidth;
    logoEl.style.animation = '';
  }

  el.style.display = 'flex';
  el.classList.remove('is-loaded', 'out');

  let tickerOffset = 0;
  if (trackEl) {
    trackEl.style.transition = 'none';
    trackEl.style.transform = 'translateY(0)';
    renderBootTickerTrack(trackEl, tickerOffset, 2);
  }
  if (pctEl) {
    pctEl.classList.remove('is-done');
    pctEl.textContent = '[ 00% ]';
  }
  if (twTextEl) {
    twTextEl.textContent = '// ';
  }

  // 1. Continuous 6-row upward scrolling ticker with Slot #3 inverted highlight bar
  const tickerInterval = setInterval(() => {
    if (!trackEl) return;
    trackEl.style.transition = 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)';
    trackEl.style.transform = 'translateY(-22px)';

    const midTid = setTimeout(() => {
      renderBootTickerTrack(trackEl, tickerOffset, 3);
    }, 125);
    bootTimers.push(midTid);

    const snapTid = setTimeout(() => {
      tickerOffset = (tickerOffset + 1) % BOOT_TICKER_LINES.length;
      trackEl.style.transition = 'none';
      trackEl.style.transform = 'translateY(0)';
      renderBootTickerTrack(trackEl, tickerOffset, 2);
    }, 265);
    bootTimers.push(snapTid);
  }, 470);
  bootIntervals.push(tickerInterval);

  // 2. Center [ XX% ] -> ( DONE ) counter + Right scramble-decode typewriter
  const startTs = performance.now();
  const COUNT_MS = 2500;
  const DECODE_MS = 1480;

  const tickFrame = (now) => {
    const elapsed = now - startTs;

    // Right column scramble-decode
    if (twTextEl) {
      if (elapsed < DECODE_MS) {
        const pDecode = Math.max(0, elapsed / DECODE_MS);
        const lockedLen = Math.max(3, Math.floor(pDecode * BOOT_RIGHT_MESSAGE.length));
        const locked = BOOT_RIGHT_MESSAGE.slice(0, lockedLen);
        const remSlice = BOOT_RIGHT_MESSAGE.slice(lockedLen, lockedLen + 5);
        let tail = '';
        for (let i = 0; i < remSlice.length; i++) {
          tail += remSlice[i] === '\n'
            ? '\n'
            : BOOT_SCRAMBLE_GLYPHS[Math.floor(Math.random() * BOOT_SCRAMBLE_GLYPHS.length)];
        }
        twTextEl.textContent = locked + tail;
      } else {
        twTextEl.textContent = BOOT_RIGHT_MESSAGE;
      }
    }

    // Center [ XX% ] -> ( DONE )
    if (pctEl) {
      if (elapsed < COUNT_MS) {
        const p = Math.max(0, Math.min(1, elapsed / COUNT_MS));
        const eased = 1 - Math.pow(1 - p, 2.85);
        const numPct = Math.min(99, Math.floor(eased * 100));
        const label = numPct < 10 ? `0${numPct}` : String(numPct);
        pctEl.textContent = `[ ${label}% ]`;
      } else {
        pctEl.textContent = '( DONE )';
        pctEl.classList.add('is-done');
      }
    }

    if (elapsed < COUNT_MS + 100) {
      bootRafId = requestAnimationFrame(tickFrame);
    } else {
      bootRafId = null;
    }
  };
  bootRafId = requestAnimationFrame(tickFrame);

  // Hold ( DONE ) cleanly while ticker cycles once more, then dismiss into white-themed console
  const endTid = setTimeout(() => {
    dismissBootScreen();
    if (options.isReboot) {
      toast('Runtime verified', 'All 6 cooperative agents online', 'ok');
    }
  }, 3350);
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
  const opSeq = ++activeOpSeq;
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
    // Measure real client browser-to-server HTTP round-trip latency & link parameters
    const pingStart1 = performance.now();
    await fetch('/api/netcoop/protocol', { method: 'GET', cache: 'no-store' }).catch(() => null);
    const rtt1 = performance.now() - pingStart1;
    const pingStart2 = performance.now();
    await fetch('/api/netcoop/protocol', { method: 'GET', cache: 'no-store' }).catch(() => null);
    const rtt2 = performance.now() - pingStart2;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    const clientEdgePayload = {
      http_rtt_ms: Math.round(((rtt1 + rtt2) / 2) * 10) / 10,
      http_jitter_ms: Math.round(Math.abs(rtt2 - rtt1) * 100) / 100,
      downlink_mbps: conn && typeof conn.downlink === 'number' ? conn.downlink : null,
      effective_type: conn && conn.effectiveType ? conn.effectiveType : null
    };

    const res = await fetch('/api/netcoop/probe-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targets,
        diagnose: runDiag,
        samples: 5,
        interval: 45,
        client_edge: clientEdgePayload
      })
    });
    const data = await res.json();
    if (!data.ok || !data.telemetry) throw new Error(data.error || 'Failed to capture live metrics');

    appState.liveProbeTelemetry = data.telemetry;
    if (data.diagnosis) {
      appState.liveProbeDiagnosis = data.diagnosis;
    }

    appendRuntimeLog(
      'PROBE',
      `Captured ${data.telemetry.samples.length} real measurements across ${data.telemetry.devices.length} nodes (${data.telemetry.source})`,
      'ok'
    );

    const tabBootTxt = $('#tab-boot-status-text');
    if (tabBootTxt) {
      tabBootTxt.textContent = `Live telemetry captured: ${data.telemetry.samples.length} samples from ${data.telemetry.devices.length} nodes (${data.telemetry.source})`;
    }

    // Only overwrite active studio editor/results if no newer user action superseded this probe
    if (opSeq === activeOpSeq) {
      appState.currentTelemetry = data.telemetry;
      appState.activeScenarioKey = null;
      $$('.nc-sc').forEach((b) => { b.style.background = ''; });

      const rawEl = $('#nc-raw');
      if (rawEl) rawEl.value = JSON.stringify(data.telemetry, null, 2);
      updatePayloadMeta();

      if (data.diagnosis) {
        applyDiagnosisResult(data.diagnosis);
      } else {
        paintRuntimeOverview();
        if (appState.activeTab === 'topology') paintTopology();
        setTopStatus(`Probed ${data.telemetry.devices.length} live nodes`, 'ok');
      }
    } else {
      paintRuntimeOverview();
    }

    if (!silent) {
      toast('Live Network Probed', `${data.telemetry.samples.length} real TCP/DNS samples captured`, 'ok');
    }
  } catch (err) {
    if (opSeq === activeOpSeq) {
      if (statusEl) statusEl.textContent = '';
      setTopStatus('Live probe error', 'warn');
    }
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

  const rtExportCsv = $('#rt-export-csv-btn');
  if (rtExportCsv) rtExportCsv.onclick = () => exportLiveProbeCsv();

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

  // Live Target Preset chips (excluding CSV preset chips)
  $$('.nc-preset-chip:not(.nc-csv-preset)').forEach((chip) => {
    chip.onclick = () => {
      if (targetsInput) targetsInput.value = chip.dataset.targets || '';
      probeLiveSystem({ runDiag: true, customTargets: chip.dataset.targets });
    };
  });

  // CSV Template Preset chips
  $$('.nc-csv-preset').forEach((chip) => {
    chip.onclick = () => {
      const key = chip.dataset.csvPreset;
      const csvText = CSV_PRESETS[key];
      if (!csvText) return;
      const rawEl = $('#nc-raw');
      if (rawEl) rawEl.value = csvText;
      appState.activeScenarioKey = null;
      $$('.nc-sc').forEach((b) => { b.style.background = ''; });
      updatePayloadMeta();
      toast('CSV Telemetry Loaded', `Loaded ${chip.textContent} — running 6-agent diagnosis`, 'ok');
      runDiagnosis();
    };
  });

  // JSON <-> CSV Bidirectional Converter
  const convertCsvBtn = $('#nc-convert-csv-btn');
  if (convertCsvBtn) {
    convertCsvBtn.onclick = () => {
      const rawEl = $('#nc-raw');
      if (!rawEl || !rawEl.value.trim()) {
        toast('Empty payload', 'Load or paste telemetry first', 'error');
        return;
      }
      const trimmed = rawEl.value.trim();
      if (/^[{[]/.test(trimmed)) {
        const csvOut = convertTelemetryObjectToCsv(trimmed);
        if (!csvOut) {
          toast('Conversion notice', 'JSON object contains no sample rows to convert', 'error');
          return;
        }
        rawEl.value = csvOut;
        updatePayloadMeta();
        toast('Converted to CSV', 'Telemetry converted from JSON to RFC-4180 CSV', 'ok');
      } else {
        const parsedObj = parseRawTelemetryToObject(trimmed);
        if (!parsedObj || !Array.isArray(parsedObj.samples) || !parsedObj.samples.length) {
          toast('Conversion notice', 'Could not parse CSV rows into JSON', 'error');
          return;
        }
        const summary = summarizeTelemetryDataset(parsedObj);
        const canonicalJson = {
          schema: 'netcoop.telemetry/1.0',
          source: 'Converted from CSV Telemetry',
          devices: summary.devices.map((d) => ({
            id: d.id,
            device_id: d.id,
            type: d.type,
            role: d.role,
            ...(d.ip && d.ip !== '-' ? { ip: d.ip } : {}),
            ...(d.upstream ? { parent: d.upstream } : {})
          })),
          topology: { links: summary.links },
          samples: parsedObj.samples
        };
        rawEl.value = JSON.stringify(canonicalJson, null, 2);
        updatePayloadMeta();
        toast('Converted to JSON', 'CSV normalized to netcoop.telemetry/1.0 JSON', 'ok');
      }
    };
  }

  // Interactive CSV Spreadsheet Grid Preview Toggle
  const gridToggleBtn = $('#nc-csv-grid-toggle');
  if (gridToggleBtn) {
    gridToggleBtn.onclick = () => {
      const gridWrap = $('#nc-csv-grid-wrap');
      const rawEl = $('#nc-raw');
      if (!gridWrap || !rawEl) return;
      const isHidden = gridWrap.style.display === 'none';
      if (isHidden) {
        renderCsvGridPreview();
        gridWrap.style.display = 'block';
        rawEl.style.display = 'none';
        gridToggleBtn.textContent = 'Raw Editor';
      } else {
        gridWrap.style.display = 'none';
        rawEl.style.display = '';
        gridToggleBtn.textContent = 'Grid Preview';
      }
    };
  }

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
        const csvClean = convertTelemetryObjectToCsv(rawEl.value);
        if (csvClean) {
          rawEl.value = csvClean;
          updatePayloadMeta();
          toast('Normalized CSV', 'Cleaned columns & canonical metric headers', 'ok');
        } else {
          toast('Format notice', 'Input is NDJSON or custom text', 'info');
        }
      }
    };
  }

  const dlCsvBtn = $('#nc-download-csv-btn');
  if (dlCsvBtn) {
    dlCsvBtn.onclick = () => {
      const raw = $('#nc-raw') ? $('#nc-raw').value.trim() : '';
      if (!raw) {
        toast('Empty input', 'Nothing to download', 'error');
        return;
      }
      const csvText = /^[{[]/.test(raw) ? convertTelemetryObjectToCsv(raw) : raw;
      if (!csvText) {
        toast('CSV export failed', 'No telemetry rows available', 'error');
        return;
      }
      const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'netcoop-telemetry-dataset.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('CSV Downloaded', 'Saved netcoop-telemetry-dataset.csv', 'ok');
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
      const isJson = /^[{[]/.test(raw);
      if (isJson) {
        downloadJsonFile('netcoop-telemetry-input.json', raw);
      } else {
        const blob = new Blob(['\uFEFF' + raw], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'netcoop-telemetry-input.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Downloaded', 'Saved netcoop-telemetry-input.csv', 'ok');
      }
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
  loadAndPaintProtocol();
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
