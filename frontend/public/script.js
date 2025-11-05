const statusEl = document.getElementById('status');
const metricsTbody = document.querySelector('#metricsTable tbody');
const alertBadge = document.getElementById('alertBadge');

const avgBlinkEl = document.getElementById('avgBlink');
const avgReactionEl = document.getElementById('avgReaction');
const avgSteerEl = document.getElementById('avgSteer');

// Rolling windows for averages
const WINDOW_MAX = 30;
const windows = {
  blink_duration_ms: [],
  reaction_delay_ms: [],
  steering_corrections_per_minute: []
};

// helper: push number into window (trim)
function pushWindow(metric, num) {
  if (!(metric in windows)) return;
  windows[metric].push(num);
  if (windows[metric].length > WINDOW_MAX) windows[metric].shift();
}

// helper: compute average (rounded)
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = arr.reduce((a,b)=>a+b,0);
  return Math.round(s / arr.length);
}

// update stat tiles (call after windows change)
function updateStatsUI() {
  avgBlinkEl.textContent = windows.blink_duration_ms.length ? avg(windows.blink_duration_ms) : '—';
  avgReactionEl.textContent = windows.reaction_delay_ms.length ? avg(windows.reaction_delay_ms) : '—';
  avgSteerEl.textContent = windows.steering_corrections_per_minute.length ? avg(windows.steering_corrections_per_minute) : '—';
}

// CSV parsing helper: expects `timestamp,type,value,info...`
function parseCsvLine(line) {
  // naive split by comma but preserves trailing info as joined
  const parts = line.split(',');
  const ts = parts[0] || '';
  const type = parts[1] || '';
  const value = parts[2] || '';
  const info = parts.slice(3).join(',') || '';
  return { ts, type, value, info, raw: line };
}

// append row to metrics table
function appendMetricRow(ts, type, value, info) {
  if (!metricsTbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="ts">${ts}</td><td class="type">${type}</td><td>${value}</td><td class="info">${escapeHtml(info)}</td>`;
  metricsTbody.prepend(tr);
  // clamp table size
  while (metricsTbody.children.length > 200) metricsTbody.removeChild(metricsTbody.lastChild);
}

// escape for safety
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// alert badge management
function incAlertBadge() {
  if (!alertBadge) return;
  let cur = parseInt(alertBadge.textContent || '0', 10) || 0;
  cur += 1;
  alertBadge.textContent = cur;
  alertBadge.style.display = 'inline-block';
}

// main line handler for both init lines and live lines
function handleLine(line) {
  const p = parseCsvLine(line);
  // Update last seen timestamp somewhere if needed
  // push into windows for known metrics
  const numeric = parseFloat(p.value);
  if (!Number.isNaN(numeric)) {
    if (p.type === 'blink_duration_ms') pushWindow('blink_duration_ms', numeric);
    else if (p.type === 'reaction_delay_ms') pushWindow('reaction_delay_ms', numeric);
    else if (p.type === 'steering_corrections_per_minute') pushWindow('steering_corrections_per_minute', numeric);
  }

  // Update UI
  appendMetricRow(p.ts, p.type, p.value, p.info);
  updateStatsUI();

  // If ALERT line, increment badge (we assume alerts use "ALERT" in type)
  if (p.type === 'ALERT' || p.type.toUpperCase().includes('ALERT') || p.raw.includes('FATIGUE_DETECTED')) {
    incAlertBadge();
  }
}

// SSE setup
try {
  const evtSource = new EventSource('/events');

  evtSource.addEventListener('open', () => {
    if (statusEl) statusEl.textContent = 'Connected';
  });

  evtSource.addEventListener('init', (e) => {
    // e.data = JSON array of CSV lines
    try {
      const lines = JSON.parse(e.data || '[]');
      // process older lines in chronological order (optional)
      for (const l of lines) {
        handleLine(l);
      }
    } catch (err) {
      console.warn('Failed to parse init data', err);
    }
  });

  evtSource.addEventListener('line', (e) => {
    try {
      const line = JSON.parse(e.data);
      handleLine(line);
    } catch (err) {
      // fallback: if server sends raw string without JSON quoting
      handleLine(e.data);
    }
  });

  evtSource.addEventListener('ping', () => {
    // keep-alive
  });

  evtSource.onerror = (err) => {
    if (statusEl) statusEl.textContent = 'Disconnected — retrying...';
    console.error('SSE error', err);
  };
} catch (e) {
  if (statusEl) statusEl.textContent = 'SSE not supported';
  console.error('EventSource creation failed', e);
}
