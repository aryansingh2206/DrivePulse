const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const PORT = 3000;

// Path to CSV produced by the C++ simulator (assumes server run in project root)
const LOG_PATH = path.join(__dirname, '..', 'sdfs_log.csv');

app.use(express.static(path.join(__dirname, 'public')));

// Simple SSE endpoint to stream new lines
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  // Send a ping every 20s to keep client alive
  const ping = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: \n\n');
  }, 20000);

  // On connect, send existing last 200 lines (if file exists)
  if (fs.existsSync(LOG_PATH)) {
    const data = fs.readFileSync(LOG_PATH, 'utf8').trim().split(/\r?\n/);
    const tail = data.slice(-200);
    res.write(`event: init\n`);
    res.write(`data: ${JSON.stringify(tail)}\n\n`);
  }

  // Watch file for appended lines
  const watcher = chokidar.watch(LOG_PATH, {persistent: true, usePolling: true, interval: 1000});
  let lastSize = 0;
  if (fs.existsSync(LOG_PATH)) lastSize = fs.statSync(LOG_PATH).size;

  watcher.on('change', (filePath) => {
    try {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(LOG_PATH, {start: lastSize, end: stats.size});
        let buf=''; 
        stream.on('data', chunk => buf += chunk.toString());
        stream.on('end', () => {
          lastSize = stats.size;
          const lines = buf.trim().split(/\r?\n/).filter(Boolean);
          for (const l of lines) {
            res.write('event: line\n');
            res.write('data: ' + JSON.stringify(l) + '\n\n');
          }
        });
      } else {
        lastSize = stats.size;
      }
    } catch (err) {
      console.error('Read error', err);
    }
  });

  req.on('close', () => {
    clearInterval(ping);
    watcher.close();
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
  console.log('Make sure the C++ simulator is running and writing sdfs_log.csv in project root.');
});
