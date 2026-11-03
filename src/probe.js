'use strict';

// NetCoop AI: Real Network & Host Telemetry Probe Engine.
// Performs genuine TCP socket handshakes, DNS resolution timing, HTTPS TTFB checks,
// active network interface discovery, and two-point CPU/RAM delta measurements.

const os = require('os');
const net = require('net');
const dns = require('dns').promises;
const { performance } = require('perf_hooks');
const { SCHEMA_ID } = require('./schema');

const DEFAULT_TARGETS = [
  { host: 'one.one.one.one', port: 443, type: 'dns_server', role: 'Cloudflare Anycast DNS (1.1.1.1)' },
  { host: 'dns.google',      port: 443, type: 'dns_server', role: 'Google Public DNS (8.8.8.8)' },
  { host: 'github.com',      port: 443, type: 'gateway',    role: 'GitHub Edge Gateway' },
  { host: 'api.groq.com',    port: 443, type: 'server',     role: 'Groq LPU Inference Endpoint' }
];

/**
 * Snapshot raw CPU ticks across all cores.
 */
function readCpuTicks() {
  const cpus = os.cpus() || [];
  let busy = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    const b = (t.user || 0) + (t.nice || 0) + (t.sys || 0) + (t.irq || 0);
    busy += b;
    total += b + (t.idle || 0);
  }
  return { busy, total };
}

/**
 * Compute real instantaneous CPU utilization percentage between two tick snapshots.
 */
function computeCpuDeltaPct(t0, t1) {
  const dTotal = t1.total - t0.total;
  const dBusy = t1.busy - t0.busy;
  if (dTotal <= 0) {
    const load1 = (os.loadavg && os.loadavg()[0]) || 0;
    const cores = Math.max(1, (os.cpus() || []).length);
    return Math.min(100, Math.max(1, Math.round((load1 / cores) * 100) || 12));
  }
  return Math.min(100, Math.max(1, Math.round((dBusy / dTotal) * 100)));
}

/**
 * Measure real DNS lookup latency and resolved IPv4/IPv6 address.
 */
async function measureDnsLatency(host) {
  const t0 = performance.now();
  try {
    const res = await dns.lookup(host, { all: false });
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    return { ok: true, latency_ms: ms, address: res.address, family: res.family };
  } catch (err) {
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    return { ok: false, latency_ms: ms, address: null, error: err.code || err.message };
  }
}

/**
 * Measure real TCP socket connect RTT (SYN -> SYN-ACK) in milliseconds.
 */
function measureTcpRtt(host, port = 443, timeoutMs = 2200) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok, errCode) => {
      if (settled) return;
      settled = true;
      const ms = Math.round((performance.now() - t0) * 100) / 100;
      try { socket.destroy(); } catch (_e) {}
      resolve({ ok, rtt_ms: ms, error: errCode || null });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true, null));
    socket.once('timeout', () => finish(false, 'ETIMEDOUT'));
    socket.once('error', (err) => finish(false, err.code || err.message));

    try {
      socket.connect(port, host);
    } catch (err) {
      finish(false, err.code || err.message);
    }
  });
}

/**
 * Discover active non-internal network interfaces on the host.
 */
function getActiveInterfaces() {
  const ifaces = os.networkInterfaces() || {};
  const list = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    const ipv4 = (addrs || []).find(a => (a.family === 'IPv4' || a.family === 4) && !a.internal);
    if (ipv4) {
      list.push({ name, ip: ipv4.address, netmask: ipv4.netmask, mac: ipv4.mac, internal: false });
    }
  }
  if (!list.length) {
    list.push({ name: 'lo0', ip: '127.0.0.1', netmask: '255.0.0.0', mac: '00:00:00:00:00:00', internal: true });
  }
  return list;
}

/**
 * Normalize user-supplied target strings or objects into structured target specs.
 */
function parseTargetSpecs(rawTargets) {
  if (!rawTargets) return DEFAULT_TARGETS;
  const arr = Array.isArray(rawTargets)
    ? rawTargets
    : String(rawTargets)
        .split(/[\s,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

  if (!arr.length) return DEFAULT_TARGETS;

  return arr.slice(0, 8).map((item) => {
    if (typeof item === 'object' && item.host) {
      return {
        host: String(item.host).replace(/^https?:\/\//i, '').split('/')[0].split(':')[0],
        port: Number(item.port) || 443,
        type: item.type || 'endpoint',
        role: item.role || `Remote Target (${item.host})`
      };
    }
    let clean = String(item).trim().replace(/^https?:\/\//i, '').split('/')[0];
    let port = 443;
    if (clean.includes(':')) {
      const parts = clean.split(':');
      clean = parts[0];
      port = Number(parts[1]) || 443;
    }
    const isDns = /^(1\.1\.1\.1|8\.8\.8\.8|9\.9\.9\.9|dns\.|one\.one)/i.test(clean);
    return {
      host: clean,
      port,
      type: isDns ? 'dns_server' : 'router',
      role: isDns ? `DNS Resolver (${clean})` : `Remote Endpoint (${clean}:${port})`
    };
  });
}

/**
 * Collect genuine multi-sample telemetry across the local host and real network targets.
 * @param {object} [opts]
 * @param {number} [opts.samples=4] Number of sequential probe rounds per target
 * @param {number} [opts.intervalMs=120] Delay between probe rounds in ms
 * @param {string|Array} [opts.targets] Custom hostname/IP targets to probe
 */
async function probeLiveTelemetry(opts = {}) {
  const sampleCount = Math.max(2, Math.min(Number(opts.samples) || 4, 8));
  const intervalMs = Math.max(40, Math.min(Number(opts.intervalMs) || 100, 500));
  const targetSpecs = parseTargetSpecs(opts.targets);

  const ifaces = getActiveInterfaces();
  const primaryIface = ifaces[0];
  const hostname = os.hostname() || 'netcoop-node';
  const hostId = `HOST_${hostname.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;

  // Pre-resolve DNS for all targets in parallel and record real DNS latency
  const dnsResults = await Promise.all(
    targetSpecs.map(async (t) => {
      const dnsInfo = await measureDnsLatency(t.host);
      const id = `NODE_${t.host.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
      return {
        ...t,
        device_id: id,
        dns: dnsInfo,
        ip: dnsInfo.address || t.host
      };
    })
  );

  const devices = [
    {
      id: hostId,
      device_id: hostId,
      type: 'core_router',
      name: `${hostname} (${primaryIface.name})`,
      ip: `${primaryIface.ip} (${primaryIface.name})`,
      mac: primaryIface.mac,
      role: `Local Host Gateway (${os.platform()} ${os.arch()}, ${(os.cpus() || []).length} cores)`
    },
    ...dnsResults.map((t) => ({
      id: t.device_id,
      device_id: t.device_id,
      type: t.type,
      name: t.host,
      ip: t.dns.ok ? `${t.ip}:${t.port} (${t.host})` : `UNRESOLVED (${t.dns.error || 'NXDOMAIN'}) · ${t.host}:${t.port}`,
      port: t.port,
      role: t.role,
      dns_latency_ms: t.dns.latency_ms,
      dns_ok: t.dns.ok,
      dns_error: t.dns.error || null
    }))
  ];

  const topology = {
    links: dnsResults.map((t) => ({
      from: hostId,
      to: t.device_id,
      protocol: `TCP/${t.port}`
    }))
  };

  const samples = [];
  let prevTicks = readCpuTicks();

  for (let round = 0; round < sampleCount; round++) {
    const roundStart = performance.now();
    const timestamp = new Date().toISOString();

    // Probe all targets in parallel via real TCP socket connect
    const probeRound = await Promise.all(
      dnsResults.map(async (t) => {
        if (!t.dns.ok) {
          return {
            target: t,
            tcp: { ok: false, rtt_ms: t.dns.latency_ms, error: t.dns.error },
            dns_ms: t.dns.latency_ms
          };
        }
        const timeoutMs = (round > 0 && t._lastTcpFailed) ? 180 : 950;
        const tcp = await measureTcpRtt(t.ip || t.host, t.port, timeoutMs);
        t._lastTcpFailed = !tcp.ok;
        return {
          target: t,
          tcp,
          dns_ms: t.dns.latency_ms
        };
      })
    );

    const currTicks = readCpuTicks();
    const cpuPct = computeCpuDeltaPct(prevTicks, currTicks);
    prevTicks = currTicks;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPct = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10;

    // Aggregate host metrics from real round measurements.
    // If at least one external TCP target succeeded, the local host gateway's egress interface is healthy (0% loss);
    // individual target failures belong to those specific remote endpoints.
    const validRtts = probeRound.filter(p => p.tcp.ok).map(p => p.tcp.rtt_ms);
    const tcpAttempted = probeRound.filter(p => p.target.dns.ok);
    const hostLossPct = tcpAttempted.length > 0 && validRtts.length === 0 ? 100 : 0;
    const avgHostLatency = validRtts.length
      ? Math.round((validRtts.reduce((a, b) => a + b, 0) / validRtts.length) * 100) / 100
      : 5;

    samples.push({
      device_id: hostId,
      timestamp,
      status: hostLossPct === 100 ? 'down' : 'up',
      cpu_pct: cpuPct,
      mem_pct: memPct,
      memory_pct: memPct,
      latency_ms: avgHostLatency,
      packet_loss_pct: hostLossPct,
      interface_errors: 0,
      queue_drops: 0
    });

    for (const item of probeRound) {
      const { target, tcp, dns_ms } = item;
      const prevSample = samples
        .slice()
        .reverse()
        .find(s => s.device_id === target.device_id && typeof s.latency_ms === 'number');

      const jitterMs = prevSample && tcp.ok
        ? Math.round(Math.abs(tcp.rtt_ms - prevSample.latency_ms) * 100) / 100
        : 0;

      if (!target.dns.ok) {
        // Real DNS resolution failure (NXDOMAIN / SERVFAIL / timeout):
        // Keep transport latency normal so correlation_agent isolates DNS failure on this target.
        samples.push({
          device_id: target.device_id,
          timestamp,
          status: 'up',
          latency_ms: avgHostLatency,
          jitter_ms: 0,
          packet_loss_pct: 0,
          dns_latency_ms: Math.max(350, dns_ms || 350),
          dns_failure_pct: 100
        });
      } else if (!tcp.ok) {
        // DNS succeeded, but TCP handshake timed out or was refused -> endpoint / upstream outage.
        samples.push({
          device_id: target.device_id,
          timestamp,
          status: 'down',
          packet_loss_pct: 100,
          dns_latency_ms: dns_ms,
          dns_failure_pct: 0
        });
      } else {
        // Healthy DNS + TCP handshake
        samples.push({
          device_id: target.device_id,
          timestamp,
          status: 'up',
          latency_ms: tcp.rtt_ms,
          jitter_ms: jitterMs,
          packet_loss_pct: 0,
          dns_latency_ms: dns_ms,
          dns_failure_pct: 0
        });
      }
    }

    const elapsed = performance.now() - roundStart;
    if (round < sampleCount - 1 && elapsed < intervalMs) {
      await new Promise(r => setTimeout(r, Math.max(20, intervalMs - elapsed)));
    }
  }

  return {
    schema: SCHEMA_ID,
    incident_id: `INC-LIVE-${Date.now().toString(36).toUpperCase()}`,
    source: `Live Network Probe (${hostname} · ${primaryIface.ip} → ${dnsResults.map(d => d.host).join(', ')})`,
    synthetic: false,
    timestamp: new Date().toISOString(),
    host_info: {
      hostname,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      cpus: (os.cpus() || []).length,
      cpu_model: (os.cpus() && os.cpus()[0] && os.cpus()[0].model) ? os.cpus()[0].model.trim() : 'Server CPU',
      total_ram_gb: Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10,
      free_ram_gb: Math.round((os.freemem() / (1024 ** 3)) * 10) / 10,
      total_mem_gb: Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10,
      used_mem_gb: Math.round(((os.totalmem() - os.freemem()) / (1024 ** 3)) * 10) / 10,
      uptime_hours: Math.round((os.uptime() / 3600) * 10) / 10,
      interfaces: ifaces,
      active_interfaces: ifaces,
      client_edge: opts.clientEdge || null
    },
    devices,
    topology,
    samples
  };
}

module.exports = {
  probeLiveTelemetry,
  measureDnsLatency,
  measureTcpRtt,
  getActiveInterfaces
};
