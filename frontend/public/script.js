// frontend/public/script.js
const statusEl = document.getElementById('status');
const metricsTbody = document.querySelector('#metricsTable tbody');
const alertList = document.getElementById('alertList');
const alertBadge = document.getElementById('alertBadge');

const avgBlinkEl = document.getElementById('avgBlink');
const avgReactionEl = document.getElementById('avgReaction');
const avgSteerEl = document.getElementById('avgSteer');

const WINDOW_MAX = 30;
const windows = {
  blink_duration_ms: [],
  reaction_delay_ms: [],
  steering_corrections_per_minute: []
};

function pushWindow(metric, num) {
  if (!(metric in windows)) return;
  windows[metric].push(num);
  if (windows[metric].length > WINDOW_MAX) windows[metric].shift();
}

function avg(arr){ if(!arr||arr.length===0) return 0; return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }

function updateStatsUI() {
  avgBlinkEl.textContent = windows.blink_duration_ms.length ? avg(windows.blink_duration_ms) : '—';
  avgReactionEl.textContent = windows.reaction_delay_ms.length ? avg(windows.reaction_delay_ms) : '—';
  avgSteerEl.textContent = windows.steering_corrections_per_minute.length ? avg(windows.steering_corrections_per_minute) : '—';
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function appendMetricRow(ts,type,value,info) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="ts">${ts}</td><td class="type">${type}</td><td>${value}</td><td class="info">${escapeHtml(info)}</td>`;
  metricsTbody.prepend(tr);
  while (metricsTbody.children.length > 200) metricsTbody.removeChild(metricsTbody.lastChild);
}

// adds alert to alert panel and increments badge
function pushAlert(ts, msg, stats) {
  if (alertList && alertList.children.length === 1 && alertList.children[0].classList.contains('alert-empty')) alertList.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'alert-item';
  div.innerHTML = `<div style="font-weight:700;color:#fff">${escapeHtml(msg)}</div><div class="small" style="color:var(--muted);font-size:12px">${ts}</div>`;
  if (stats) {
    const s = document.createElement('div');
    s.className = 'small';
    s.style.color = 'var(--muted)';
    s.style.marginTop = '6px';
    s.textContent = `blinkAvg=${stats.blinkAvg}ms, reactionAvg=${stats.reactionAvg}ms, steerAvg=${stats.steerAvg}/min`;
    div.appendChild(s);
  }
  alertList.prepend(div);
  // increment header badge
  if (alertBadge) {
    let cur = parseInt(alertBadge.textContent || '0',10) || 0;
    alertBadge.textContent = cur + 1;
    alertBadge.style.display = 'inline-block';
  }
}

function parseCsvLine(line) {
  const parts = line.split(',');
  const ts = parts[0] || new Date().toISOString();
  const type = parts[1] || '';
  const value = parts[2] || '';
  const info = parts.slice(3).join(',') || '';
  return {ts,type,value,info,raw:line};
}

function handleLine(line) {
  const p = parseCsvLine(line);
  // numeric metrics update windows
  const numeric = parseFloat(p.value);
  if (!Number.isNaN(numeric)) {
    if (p.type === 'blink_duration_ms') pushWindow('blink_duration_ms', numeric);
    else if (p.type === 'reaction_delay_ms') pushWindow('reaction_delay_ms', numeric);
    else if (p.type === 'steering_corrections_per_minute') pushWindow('steering_corrections_per_minute', numeric);
  }
  appendMetricRow(p.ts, p.type, p.value, p.info);
  updateStatsUI();
  // if server logged an ALERT line as CSV, also handle it
  if (p.type === 'ALERT' || p.raw.includes('FATIGUE_DETECTED')) {
    pushAlert(p.ts, p.raw, null);
  }
}

// SSE
try {
  const es = new EventSource('/events');
  es.addEventListener('open', () => { if (statusEl) statusEl.textContent = 'Connected'; });
  es.addEventListener('init', (e) => {
    try {
      const lines = JSON.parse(e.data || '[]');
      for (const l of lines) handleLine(l);
    } catch(e){ console.warn('init parse', e); }
  });
  es.addEventListener('line', (e) => {
    // server sends each line as JSON string
    try {
      const l = JSON.parse(e.data);
      handleLine(l);
    } catch (err) {
      handleLine(e.data);
    }
  });
  // explicit alert event emitted by server detector
  es.addEventListener('alert', (e) => {
    try {
      const obj = JSON.parse(e.data);
      pushAlert(obj.ts, obj.msg, obj.stats || null);
    } catch (err) {
      console.warn('alert parse err', err);
      pushAlert(new Date().toISOString(), e.data, null);
    }
  });
  es.addEventListener('ping', ()=>{});
  es.onerror = (err) => {
    if (statusEl) statusEl.textContent = 'Disconnected — retrying...';
    console.error('SSE error', err);
  };
} catch (err) {
  if (statusEl) statusEl.textContent = 'SSE not supported';
  console.error('EventSource creation failed', err);
}
