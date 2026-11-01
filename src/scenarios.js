'use strict';

// NetCoop AI: built-in test scenarios modeling the IIT Bhubaneswar Campus Infrastructure.
// Conforms directly to the Agentic AI Hackathon Round 2 Problem Statement.
// Each scenario produces realistic synthetic telemetry exercising the multi-agent diagnostic mesh.

const { SCHEMA_ID } = require('./schema');

// ── Helpers ──────────────────────────────────────────────────────────────
const ts = (offset = 0) => new Date(Date.now() - offset * 60000).toISOString();
const jitter = (base, pct = 0.1) => +(base * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2);

function makeSamples(devices, metrics, count, genFn) {
  const samples = [];
  for (const d of devices) {
    for (let i = 0; i < count; i++) {
      const row = { device_id: d, timestamp: ts(count - i) };
      for (const m of metrics) {
        const v = genFn(d, m, i, count);
        if (v !== undefined && v !== null) row[m] = v;
      }
      samples.push(row);
    }
  }
  return samples;
}

// ── Scenario definitions ────────────────────────────────────────────────
const SCENARIOS = [
  {
    key: 'normal',
    name: 'Normal Operation',
    description: 'IIT Bhubaneswar campus network running optimally — latency, jitter, and link utilization within nominal thresholds.',
    generate() {
      const devices = ['IITBBS_CORE_RTR_01', 'HOSTEL_CORE_SW_01', 'DEPT_CSE_SW_01', 'LHC_AP_101', 'LHC_AP_102', 'CAMPUS_WEB_SRV_01', 'CAMPUS_DB_SRV_01'];
      const topology = {
        'HOSTEL_CORE_SW_01': 'IITBBS_CORE_RTR_01',
        'DEPT_CSE_SW_01': 'IITBBS_CORE_RTR_01',
        'LHC_AP_101': 'DEPT_CSE_SW_01',
        'LHC_AP_102': 'DEPT_CSE_SW_01',
        'CAMPUS_WEB_SRV_01': 'HOSTEL_CORE_SW_01',
        'CAMPUS_DB_SRV_01': 'HOSTEL_CORE_SW_01'
      };
      const metrics = ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'link_utilization_pct', 'cpu_pct', 'memory_pct', 'interface_errors', 'queue_drops'];
      const samples = makeSamples(devices, metrics, 20, (d, m) => {
        const vals = {
          latency_ms: jitter(12, 0.25),
          jitter_ms: jitter(3, 0.25),
          packet_loss_pct: jitter(0.05, 0.5),
          link_utilization_pct: jitter(35, 0.2),
          cpu_pct: jitter(25, 0.2),
          memory_pct: jitter(40, 0.15),
          interface_errors: 0,
          queue_drops: 0
        };
        return vals[m];
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('AP') ? 'access_point' : id.includes('SRV') ? 'server' : id.includes('RTR') ? 'router' : 'switch',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'link_congestion',
    name: 'Link Congestion',
    description: 'Hostel Core Switch (HOSTEL_CORE_SW_01) uplink saturated — 94% utilization, 160 queue drops, 280ms latency cascading downstream.',
    generate() {
      const devices = ['CAMPUS_CORE_RTR_01', 'HOSTEL_CORE_SW_01', 'DEPT_CSE_SW_01', 'HOSTEL_ACC_SW_01', 'HOSTEL_ACC_SW_02', 'HOSTEL_APP_SRV_01', 'HOSTEL_APP_SRV_02'];
      const topology = {
        'HOSTEL_CORE_SW_01': 'CAMPUS_CORE_RTR_01',
        'DEPT_CSE_SW_01': 'CAMPUS_CORE_RTR_01',
        'HOSTEL_ACC_SW_01': 'HOSTEL_CORE_SW_01',
        'HOSTEL_ACC_SW_02': 'HOSTEL_CORE_SW_01',
        'HOSTEL_APP_SRV_01': 'HOSTEL_ACC_SW_01',
        'HOSTEL_APP_SRV_02': 'HOSTEL_ACC_SW_02'
      };
      const congestedLink = 'HOSTEL_CORE_SW_01';
      const downstream = ['HOSTEL_ACC_SW_01', 'HOSTEL_ACC_SW_02', 'HOSTEL_APP_SRV_01', 'HOSTEL_APP_SRV_02'];
      const metrics = ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'link_utilization_pct', 'throughput_mbps', 'bandwidth_mbps', 'cpu_pct', 'memory_pct', 'queue_drops', 'interface_errors'];
      const samples = makeSamples(devices, metrics, 25, (d, m, i, total) => {
        const ramp = Math.min(1, i / (total * 0.6));
        if (d === congestedLink) {
          if (m === 'link_utilization_pct') return +(45 + 49 * ramp + jitter(0, 1.5)).toFixed(2); // reaches ~94%
          if (m === 'queue_drops') return Math.round(ramp * jitter(160, 0.15)); // reaches ~160 drops
          if (m === 'latency_ms') return jitter(25 + 255 * ramp, 0.1); // reaches ~280ms
          if (m === 'jitter_ms') return jitter(5 + 55 * ramp, 0.15);
          if (m === 'packet_loss_pct') return +(0.1 + 4.2 * ramp).toFixed(2);
          if (m === 'throughput_mbps') return jitter(940, 0.05);
          if (m === 'bandwidth_mbps') return 1000;
          if (m === 'cpu_pct') return jitter(35, 0.2);
          if (m === 'memory_pct') return jitter(45, 0.15);
        }
        if (downstream.includes(d)) {
          if (m === 'latency_ms') return jitter(30 + 190 * ramp, 0.15);
          if (m === 'jitter_ms') return jitter(6 + 45 * ramp, 0.2);
          if (m === 'packet_loss_pct') return +(0.1 + 3.2 * ramp).toFixed(2);
          if (m === 'link_utilization_pct') return jitter(32, 0.2);
          if (m === 'queue_drops') return 0;
          if (m === 'cpu_pct') return jitter(22, 0.2);
          if (m === 'memory_pct') return jitter(35, 0.15);
        }
        // healthy devices
        const healthy = {
          latency_ms: jitter(10, 0.2),
          jitter_ms: jitter(2, 0.3),
          packet_loss_pct: 0,
          link_utilization_pct: jitter(25, 0.2),
          cpu_pct: jitter(20, 0.2),
          memory_pct: jitter(40, 0.15),
          queue_drops: 0,
          interface_errors: 0,
          throughput_mbps: jitter(500, 0.1),
          bandwidth_mbps: 1000
        };
        return healthy[m] !== undefined ? healthy[m] : undefined;
      });
      return {
        schema: SCHEMA_ID,
        incident_id: 'INC-8832',
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('SRV') ? 'server' : id.includes('RTR') ? 'router' : 'switch',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'weak_wifi',
    name: 'Weak Wi-Fi Signal',
    description: 'Hostel Brahmaputra Access Point (HOSTEL_BRAHMAPUTRA_AP_04) degraded RF signal (-82 dBm), 18% retransmissions and client packet loss.',
    generate() {
      const devices = ['IITBBS_CORE_RTR_01', 'HOSTEL_DIST_SW_01', 'HOSTEL_BRAHMAPUTRA_AP_04', 'HOSTEL_BRAHMAPUTRA_AP_05', 'STUDENT_LAPTOP_01', 'STUDENT_LAPTOP_02', 'STUDENT_PHONE_01'];
      const topology = {
        'HOSTEL_DIST_SW_01': 'IITBBS_CORE_RTR_01',
        'HOSTEL_BRAHMAPUTRA_AP_04': 'HOSTEL_DIST_SW_01',
        'HOSTEL_BRAHMAPUTRA_AP_05': 'HOSTEL_DIST_SW_01',
        'STUDENT_LAPTOP_01': 'HOSTEL_BRAHMAPUTRA_AP_04',
        'STUDENT_LAPTOP_02': 'HOSTEL_BRAHMAPUTRA_AP_04',
        'STUDENT_PHONE_01': 'HOSTEL_BRAHMAPUTRA_AP_04'
      };
      const weakAp = 'HOSTEL_BRAHMAPUTRA_AP_04';
      const wirelessClients = ['STUDENT_LAPTOP_01', 'STUDENT_LAPTOP_02', 'STUDENT_PHONE_01'];
      const metrics = ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'signal_dbm', 'retransmission_pct', 'cpu_pct', 'memory_pct', 'link_utilization_pct'];
      const samples = makeSamples(devices, metrics, 20, (d, m) => {
        if (d === weakAp || wirelessClients.includes(d)) {
          if (m === 'signal_dbm') return jitter(-82, 0.04);
          if (m === 'retransmission_pct') return jitter(19, 0.15);
          if (m === 'latency_ms') return jitter(185, 0.15);
          if (m === 'jitter_ms') return jitter(48, 0.2);
          if (m === 'packet_loss_pct') return jitter(3.8, 0.25);
          if (m === 'cpu_pct') return jitter(18, 0.2);
          if (m === 'memory_pct') return jitter(32, 0.15);
          if (m === 'link_utilization_pct') return jitter(22, 0.2);
        }
        const healthy = {
          latency_ms: jitter(8, 0.2),
          jitter_ms: jitter(2, 0.2),
          packet_loss_pct: 0,
          cpu_pct: jitter(20, 0.2),
          memory_pct: jitter(40, 0.15),
          link_utilization_pct: jitter(25, 0.2)
        };
        return healthy[m] !== undefined ? healthy[m] : undefined;
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('AP') ? 'access_point' : id.includes('STUDENT') ? 'endpoint' : id.includes('RTR') ? 'router' : 'switch',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'interface_fault',
    name: 'Interface Fault',
    description: 'Department switch (DEPT_CSE_SW_01) failing SFP interface — rising CRC errors, link flaps, and packet loss spikes.',
    generate() {
      const devices = ['CAMPUS_CORE_SW_01', 'DEPT_AGG_SW_01', 'DEPT_CSE_SW_01', 'DEPT_ECE_SW_01', 'LAB_WORKSTATION_01', 'LAB_WORKSTATION_02'];
      const topology = {
        'DEPT_AGG_SW_01': 'CAMPUS_CORE_SW_01',
        'DEPT_CSE_SW_01': 'DEPT_AGG_SW_01',
        'DEPT_ECE_SW_01': 'DEPT_AGG_SW_01',
        'LAB_WORKSTATION_01': 'DEPT_CSE_SW_01',
        'LAB_WORKSTATION_02': 'DEPT_CSE_SW_01'
      };
      const faultyDev = 'DEPT_CSE_SW_01';
      const metrics = ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'interface_errors', 'link_status', 'cpu_pct', 'memory_pct', 'link_utilization_pct'];
      const samples = makeSamples(devices, metrics, 25, (d, m, i) => {
        if (d === faultyDev) {
          if (m === 'interface_errors') return Math.round(jitter(60 + i * 9, 0.15));
          if (m === 'link_status') return i % 4 === 0 ? 0 : 1; // flapping
          if (m === 'packet_loss_pct') return jitter(6 + i * 0.35, 0.2);
          if (m === 'latency_ms') return jitter(50 + i * 9, 0.15);
          if (m === 'jitter_ms') return jitter(16 + i * 3, 0.2);
          if (m === 'cpu_pct') return jitter(30, 0.2);
          if (m === 'memory_pct') return jitter(45, 0.15);
          if (m === 'link_utilization_pct') return jitter(38, 0.2);
        }
        if (d === 'LAB_WORKSTATION_01' || d === 'LAB_WORKSTATION_02') {
          if (m === 'packet_loss_pct') return jitter(3 + i * 0.15, 0.3);
          if (m === 'latency_ms') return jitter(30 + i * 5, 0.2);
        }
        const healthy = {
          latency_ms: jitter(10, 0.2),
          jitter_ms: jitter(3, 0.2),
          packet_loss_pct: 0,
          interface_errors: 0,
          link_status: 1,
          cpu_pct: jitter(20, 0.2),
          memory_pct: jitter(40, 0.15),
          link_utilization_pct: jitter(30, 0.2)
        };
        return healthy[m] !== undefined ? healthy[m] : undefined;
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('WORKSTATION') ? 'server' : 'switch',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'dns_failure',
    name: 'DNS Failure',
    description: 'Central campus DNS resolver (CAMPUS_DNS_SRV_01) timeout — 4500ms query latency and 65% failure rate while general link ping is nominal.',
    generate() {
      const devices = ['CAMPUS_CORE_RTR_01', 'CAMPUS_DNS_SRV_01', 'CAMPUS_DNS_SRV_02', 'DEPT_APP_SRV_01', 'DEPT_APP_SRV_02', 'CAMPUS_DB_SRV_01'];
      const topology = {
        'CAMPUS_DNS_SRV_01': 'CAMPUS_CORE_RTR_01',
        'CAMPUS_DNS_SRV_02': 'CAMPUS_CORE_RTR_01',
        'DEPT_APP_SRV_01': 'CAMPUS_CORE_RTR_01',
        'DEPT_APP_SRV_02': 'CAMPUS_CORE_RTR_01',
        'CAMPUS_DB_SRV_01': 'CAMPUS_CORE_RTR_01'
      };
      const failDns = 'CAMPUS_DNS_SRV_01';
      const metrics = ['latency_ms', 'packet_loss_pct', 'dns_resolution_ms', 'dns_failure_pct', 'cpu_pct', 'memory_pct'];
      const samples = makeSamples(devices, metrics, 20, (d, m, i) => {
        if (d === failDns) {
          if (m === 'dns_resolution_ms') return jitter(4500 + i * 80, 0.1);
          if (m === 'dns_failure_pct') return jitter(65, 0.12);
          if (m === 'cpu_pct') return jitter(91, 0.04);
          if (m === 'memory_pct') return jitter(86, 0.04);
          if (m === 'latency_ms') return jitter(12, 0.2); // network path healthy
          if (m === 'packet_loss_pct') return 0;
        }
        if (d === 'CAMPUS_DNS_SRV_02') {
          if (m === 'dns_resolution_ms') return jitter(15, 0.3);
          if (m === 'dns_failure_pct') return 0;
          if (m === 'cpu_pct') return jitter(55, 0.1);
          if (m === 'memory_pct') return jitter(50, 0.1);
        }
        if (d === 'DEPT_APP_SRV_01' || d === 'DEPT_APP_SRV_02') {
          if (m === 'dns_resolution_ms') return jitter(3200 + i * 40, 0.15);
          if (m === 'dns_failure_pct') return jitter(42, 0.2);
        }
        const healthy = {
          latency_ms: jitter(8, 0.2),
          packet_loss_pct: 0,
          cpu_pct: jitter(25, 0.2),
          memory_pct: jitter(40, 0.15)
        };
        return healthy[m] !== undefined ? healthy[m] : undefined;
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('DNS') ? 'dns_server' : id.includes('RTR') ? 'router' : 'server',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'dhcp_failure',
    name: 'DHCP Failure',
    description: 'Central campus DHCP server (CAMPUS_DHCP_SRV_01) scope exhausted — 75% lease rejection rate and client IP allocation timeouts.',
    generate() {
      const devices = ['CAMPUS_CORE_SW_01', 'CAMPUS_DHCP_SRV_01', 'HOSTEL_ACC_SW_01', 'HOSTEL_CLIENT_01', 'HOSTEL_CLIENT_02', 'HOSTEL_CLIENT_03'];
      const topology = {
        'CAMPUS_DHCP_SRV_01': 'CAMPUS_CORE_SW_01',
        'HOSTEL_ACC_SW_01': 'CAMPUS_CORE_SW_01',
        'HOSTEL_CLIENT_01': 'HOSTEL_ACC_SW_01',
        'HOSTEL_CLIENT_02': 'HOSTEL_ACC_SW_01',
        'HOSTEL_CLIENT_03': 'HOSTEL_ACC_SW_01'
      };
      const metrics = ['latency_ms', 'packet_loss_pct', 'dhcp_failure_pct', 'dhcp_lease_time_ms', 'cpu_pct', 'memory_pct'];
      const samples = makeSamples(devices, metrics, 20, (d, m, i) => {
        if (d === 'CAMPUS_DHCP_SRV_01') {
          if (m === 'dhcp_failure_pct') return jitter(75, 0.1);
          if (m === 'dhcp_lease_time_ms') return jitter(30000, 0.1);
          if (m === 'cpu_pct') return jitter(86, 0.05);
          if (m === 'memory_pct') return jitter(92, 0.03);
        }
        if (d.startsWith('HOSTEL_CLIENT_')) {
          if (m === 'dhcp_failure_pct') return jitter(62, 0.15);
          if (m === 'dhcp_lease_time_ms') return jitter(26000, 0.15);
          if (m === 'latency_ms') return jitter(190, 0.25);
          if (m === 'packet_loss_pct') return jitter(4.8, 0.25);
        }
        const healthy = {
          latency_ms: jitter(10, 0.2),
          packet_loss_pct: 0,
          cpu_pct: jitter(20, 0.2),
          memory_pct: jitter(40, 0.15)
        };
        return healthy[m] !== undefined ? healthy[m] : undefined;
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('DHCP') ? 'dhcp_server' : id.includes('CLIENT') ? 'endpoint' : 'switch',
          name: id
        })),
        samples
      };
    }
  },
  {
    key: 'interop_failure',
    name: 'Interoperability Test',
    description: 'Telemetry with incompatible schema version, non-standard units (seconds instead of ms), and missing keys — exercises validation boundaries.',
    generate() {
      // Deliberately uses incompatible major schema version to test error reporting (Section 4 & 5)
      const data = {
        version: '2.0',
        device_list: [
          { id: 'IITBBS_BORDER_RTR_01', upstream: null, kind: 'router' },
          { id: 'DEPT_DIST_SW_01', upstream: 'IITBBS_BORDER_RTR_01', kind: 'switch' },
          { id: 'HOSTEL_ACCESS_NODE_01', upstream: 'DEPT_DIST_SW_01', kind: 'server' }
        ],
        records: []
      };
      for (let i = 0; i < 15; i++) {
        data.records.push(
          { device: 'IITBBS_BORDER_RTR_01', time: ts(15 - i), rtt_s: jitter(0.015, 0.2), jitter_us: jitter(3000, 0.2), loss_ratio: jitter(0.001, 0.3), utilization_ratio: jitter(0.25, 0.2), cpu_percent: jitter(20, 0.2) },
          { device: 'DEPT_DIST_SW_01', time: ts(15 - i), delay_ms: jitter(12, 0.2), pkt_loss: jitter(0.1, 0.3), util_pct: jitter(30, 0.2), cpu_percent: jitter(22, 0.2), mem_percent: jitter(45, 0.15) },
          { device: 'HOSTEL_ACCESS_NODE_01', time: ts(15 - i), latency_avg_ms: jitter(15, 0.2), throughput_kbps: jitter(500000, 0.1), capacity_mbps: 1000 }
        );
      }
      return data;
    }
  },
  {
    key: 'device_overload',
    name: 'Device Overload',
    description: 'Campus Core Switch (IITBBS_CORE_SW_01) resource starvation — 96% CPU, 94% memory, 220 queue drops cascading network-wide.',
    generate() {
      const devices = ['IITBBS_CORE_SW_01', 'HOSTEL_DIST_SW_01', 'DEPT_DIST_SW_01', 'CAMPUS_PORTAL_SRV', 'STUDENT_REG_SRV'];
      const topology = {
        'HOSTEL_DIST_SW_01': 'IITBBS_CORE_SW_01',
        'DEPT_DIST_SW_01': 'IITBBS_CORE_SW_01',
        'CAMPUS_PORTAL_SRV': 'HOSTEL_DIST_SW_01',
        'STUDENT_REG_SRV': 'DEPT_DIST_SW_01'
      };
      const metrics = ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'cpu_pct', 'memory_pct', 'queue_drops', 'link_utilization_pct'];
      const samples = makeSamples(devices, metrics, 20, (d, m, i) => {
        if (d === 'IITBBS_CORE_SW_01') {
          if (m === 'cpu_pct') return jitter(96, 0.02);
          if (m === 'memory_pct') return jitter(94, 0.02);
          if (m === 'queue_drops') return Math.round(jitter(220 + i * 12, 0.15));
          if (m === 'latency_ms') return jitter(310 + i * 10, 0.1);
          if (m === 'jitter_ms') return jitter(82, 0.15);
          if (m === 'packet_loss_pct') return jitter(7.2, 0.2);
          if (m === 'link_utilization_pct') return jitter(52, 0.15);
        }
        // downstream sees elevated latency and loss
        if (m === 'latency_ms') return jitter(110 + i * 5, 0.2);
        if (m === 'jitter_ms') return jitter(32, 0.2);
        if (m === 'packet_loss_pct') return jitter(3.2, 0.25);
        if (m === 'cpu_pct') return jitter(25, 0.2);
        if (m === 'memory_pct') return jitter(40, 0.15);
        if (m === 'queue_drops') return 0;
        if (m === 'link_utilization_pct') return jitter(30, 0.2);
      });
      return {
        schema: SCHEMA_ID,
        devices: devices.map(id => ({
          device_id: id,
          parent: topology[id] || null,
          type: id.includes('SRV') ? 'server' : 'switch',
          name: id
        })),
        samples
      };
    }
  }
];

function generate(key) {
  const s = SCENARIOS.find(sc => sc.key === key);
  if (!s) throw new Error(`Unknown scenario: ${key}. Available: ${SCENARIOS.map(sc => sc.key).join(', ')}`);
  return s.generate();
}

module.exports = { SCENARIOS, generate };
