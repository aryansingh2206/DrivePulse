// frontend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// adjust path if your sdfs_log.csv is elsewhere
const LOG_PATH = process.env.LOG_PATH || path.join(__dirname, '..', 'sdfs_log.csv');

app.use(express.static(path.join(__dirname, 'public')));

// SSE clients
let clients = new Set();

function sendEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    // ignore
  }
}

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  // register
  clients.add(res);
  console.log('SSE client connected — total:', clients.size);

  // initial tail
  if (fs.existsSync(LOG_PATH)) {
    try {
      const raw = fs.readFileSync(LOG_PATH, 'utf8').trim();
      const lines = raw.length ? raw.split(/\r?\n/) : [];
      const tail = lines.slice(-400);
      sendEvent(res, 'init', tail);
    } catch (e) { console.error('init read error', e); sendEvent(res,'init',[]); }
  } else {
    sendEvent(res,'init',[]);
  }

  const ping = setInterval(() => sendEvent(res,'ping',''), 20000);

  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
    try { res.end(); } catch (_) {}
    console.log('SSE client disconnected — total:', clients.size);
  });
});

// Broadcast wrapper
function broadcast(obj) {
  const payload = obj;
  for (const client of clients) sendEvent(client, payload.event || 'line', payload.data);
}

// File polling: read appended bytes (efficient)
let lastSize = 0;
function pollFile() {
  try {
    if (!fs.existsSync(LOG_PATH)) return;
    const stats = fs.statSync(LOG_PATH);
    if (stats.size < lastSize) lastSize = 0; // rotated/truncated
    if (stats.size > lastSize) {
      const stream = fs.createReadStream(LOG_PATH, { start: lastSize, end: stats.size });
      let buf = '';
      stream.on('data', c => buf += c.toString());
      stream.on('end', () => {
        lastSize = stats.size;
        const newLines = buf.split(/\r?\n/).filter(Boolean);
        if (newLines.length) {
          // broadcast lines individually
          for (const l of newLines) broadcast({ event: 'line', data: l });
          // also feed server-side detector
          serverDetector.processLines(newLines);
          console.log(`Broadcasted ${newLines.length} new line(s) to ${clients.size} client(s).`);
        }
      });
      stream.on('error', e => console.error('stream read error', e));
    }
  } catch (e) {
    console.error('poll error', e);
  }
}

// Start polling
setInterval(pollFile, 1000);

// --------------------
// Server-side alert detector
// --------------------
const serverDetector = (function(){
  // rolling windows
  const WINDOW = 30; // samples
  const windows = {
    blink_duration_ms: [],
    blink_freq_hz: [],
    steering_corrections_per_minute: [],
    reaction_delay_ms: []
  };

  // thresholds (tunable)
  const THRESHOLDS = {
    blink_duration_ms: 300.0,
    blink_freq_hz: 0.25, // low freq implies long blinks / slow blinks
    steering_corrections_per_minute: 25.0,
    reaction_delay_ms: 600.0
  };

  // cooldown so we don't spam repeated alerts
  let lastAlertTs = 0;
  const COOLDOWN_MS = 60 * 1000; // 60 seconds

  function pushMetric(type, value) {
    if (!(type in windows)) return;
    windows[type].push(value);
    if (windows[type].length > WINDOW) windows[type].shift();
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  function detectAndEmit() {
    const bAvg = avg(windows.blink_duration_ms);
    const bf = avg(windows.blink_freq_hz);
    const sAvg = avg(windows.steering_corrections_per_minute);
    const rAvg = avg(windows.reaction_delay_ms);

    let fatigue = false;
    // rules: combination / individual
    if ((bAvg > THRESHOLDS.blink_duration_ms && bf < THRESHOLDS.blink_freq_hz) ||
         sAvg > THRESHOLDS.steering_corrections_per_minute ||
         rAvg > THRESHOLDS.reaction_delay_ms) {
      fatigue = true;
    }

    const now = Date.now();
    if (fatigue && (now - lastAlertTs) > COOLDOWN_MS) {
      lastAlertTs = now;
      const msg = `FATIGUE_DETECTED: blinkDurAvg=${Math.round(bAvg)}, blinkFreqAvg=${bf.toFixed(3)}, steeringCorrAvg=${Math.round(sAvg)}, reactionDelayAvg=${Math.round(rAvg)}`;
      // send an alert event to clients
      for (const client of clients) sendEvent(client,'alert', { ts: new Date().toISOString(), msg, stats: {blinkAvg: Math.round(bAvg), reactionAvg: Math.round(rAvg), steerAvg: Math.round(sAvg), blinkFreq: +bf.toFixed(3)} });
      console.log('SERVER ALERT ->', msg);
    }
  }

  // process lines: parse CSV-like lines
  function processLines(lines) {
    for (const l of lines) {
      // expected: timestamp,type,value,info...
      const parts = l.split(',');
      if (parts.length < 3) continue;
      const type = parts[1];
      const value = parseFloat(parts[2]);
      if (!Number.isNaN(value)) {
        if (type in windows) pushMetric(type, value);
      } else {
        // value might be non-numeric (e.g., ALERT line) — ignore
      }
    }
    // run detection after ingest
    detectAndEmit();
  }

  return { processLines };
})();

// Start express
app.listen(PORT, () => {
  console.log(`Frontend SSE server running at http://localhost:${PORT}`);
  console.log('LOG_PATH =', LOG_PATH);
});
