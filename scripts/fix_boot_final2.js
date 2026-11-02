const fs = require('fs');
const path = 'c:\\Users\\sunil\\Downloads\\Netcoop-main\\public\\js\\app.js';
let content = fs.readFileSync(path, 'utf8');

const oldFn = `// ─── Boot Sequence Orchestrator ───────────────────────────────────────────────────\r
function runBootSequence(options) {\r
  if (!options) options = {};\r
  var bs = document.getElementById("netcoop-boot-screen");\r
  var st = document.getElementById("boot-status-text");\r
  var pc = document.getElementById("boot-percent");\r
  var pb = document.getElementById("boot-progress-bar");\r
  if (!bs) return;\r
  bs.style.opacity = "1";\r
  bs.style.visibility = "visible";\r
  bs.style.display = "flex";\r
  if (pb) pb.style.width = "0%";\r
  if (pc) pc.textContent = "0%";\r
  if (st) st.textContent = "Initializing system...";\r
  var steps = [\r
    [12, "Loading campus topology...", 250],\r
    [25, "Binding JSON-RPC bus...", 500],\r
    [38, "Starting performance agent...", 750],\r
    [50, "Starting infrastructure agent...", 1000],\r
    [62, "Starting connectivity agent...", 1200],\r
    [74, "Starting correlation agent...", 1400],\r
    [84, "Starting reporting agent...", 1600],\r
    [92, "Connecting Groq LPU...", 1800],\r
    [98, "Synchronizing agent mesh...", 2000],\r
    [100, "System ready", 2200]\r
  ];\r
  for (var i = 0; i < steps.length; i++) {\r
    (function(p, t, d) {\r
      setTimeout(function() {\r
        if (pb) pb.style.width = p + "%";\r
        if (pc) pc.textContent = p + "%";\r
        if (st) st.textContent = t;\r
      }, d);\r
    })(steps[i][0], steps[i][1], steps[i][2]);\r
  }\r
  setTimeout(function() {\r
    bs.style.transition = "opacity 0.6s ease";\r
    bs.style.opacity = "0";\r
    setTimeout(function() {\r
      bs.style.display = "none";\r
      bs.style.visibility = "hidden";\r
    }, 700);\r
    if (options.isReboot) {\r
      toast("System rebooted", "NetCoop AI initialized successfully", "ok");\r
    }\r
  }, 2600);\r
}`;

const newFn = `// ─── Boot Sequence Orchestrator ───────────────────────────────────────────────────\r
function runBootSequence(options) {\r
  if (!options) options = {};\r
  var bs = document.getElementById("netcoop-boot-screen");\r
  var logEl = document.getElementById("boot-post-log");\r
  var pc = document.getElementById("boot-percent");\r
  var pb = document.getElementById("boot-progress-bar");\r
  if (!bs) return;\r
\r
  // Show boot screen\r
  bs.classList.remove('is-loaded');\r
  bs.style.display = "";\r
  if (pb) pb.style.width = "0%";\r
  if (pc) pc.textContent = "0%";\r
  if (logEl) logEl.innerHTML = "";\r
\r
  var steps = [\r
    [10,  "Loading campus topology...",          "OK",    "ok"],\r
    [22,  "Binding JSON-RPC bus...",              "OK",    "ok"],\r
    [34,  "Starting performance agent...",        "SYNC",  "sync"],\r
    [44,  "Starting infrastructure agent...",     "SYNC",  "sync"],\r
    [54,  "Starting connectivity agent...",       "SYNC",  "sync"],\r
    [64,  "Starting correlation agent...",        "SYNC",  "sync"],\r
    [74,  "Starting reporting agent...",          "SYNC",  "sync"],\r
    [84,  "Connecting Groq LPU inference...",     "OK",    "ok"],\r
    [94,  "Synchronizing agent mesh...",          "OK",    "ok"],\r
    [100, "All systems operational",              "READY", "ready"]\r
  ];\r
\r
  var delay = 0;\r
  for (var i = 0; i < steps.length; i++) {\r
    delay += 200 + Math.floor(Math.random() * 120);\r
    (function(pct, msg, statusText, statusClass, d) {\r
      setTimeout(function() {\r
        if (pb) pb.style.width = pct + "%";\r
        if (pc) pc.textContent = pct + "%";\r
        if (logEl) {\r
          var line = document.createElement("div");\r
          line.className = "boot-post-line";\r
          line.innerHTML =\r
            '<span class="post-prefix">▸</span>' +\r
            '<span class="post-msg">' + msg + '</span>' +\r
            '<span class="post-status ' + statusClass + '">[' + statusText + ']</span>';\r
          logEl.appendChild(line);\r
          logEl.scrollTop = logEl.scrollHeight;\r
        }\r
      }, d);\r
    })(steps[i][0], steps[i][1], steps[i][2], steps[i][3], delay);\r
  }\r
\r
  setTimeout(function() {\r
    bs.classList.add('is-loaded');\r
    setTimeout(function() {\r
      bs.style.display = "none";\r
    }, 800);\r
    if (options.isReboot) {\r
      toast("System rebooted", "NetCoop AI initialized successfully", "ok");\r
    }\r
  }, delay + 400);\r
}`;

if (content.includes(oldFn)) {
  content = content.replace(oldFn, newFn);
  fs.writeFileSync(path, content, 'utf8');
  console.log('SUCCESS: Boot function replaced');
} else {
  console.log('ERROR: Could not find old boot function');
  // Try to find it by a smaller unique snippet
  const snippet = 'var st = document.getElementById("boot-status-text");';
  console.log('Snippet found:', content.includes(snippet));
}
