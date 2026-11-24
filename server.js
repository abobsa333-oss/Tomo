// خادم الدردشة: HTTP للملفات + WebSocket للرسائل الفورية
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const rooms = new Map(); // code -> { clients:Set, history:[] }

const server = http.createServer((req, res) => {
  const file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const full = path.normalize(path.join(PUBLIC, file));
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const send = (ws, obj) => ws.readyState === 1 && ws.send(JSON.stringify(obj));
const broadcast = (room, obj) => room.clients.forEach(c => send(c, obj));

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  let stamps = []; // تحديد معدل الإرسال

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'join' && !ws.room) {
      const code = clean(m.code, 24).toUpperCase();
      const name = clean(m.name, 20) || 'مجهول';
      if (!/^[A-Z0-9\u0600-\u06FF-]{3,24}$/.test(code)) {
        return send(ws, { type: 'error', text: 'الكود يجب أن يكون 3 إلى 24 حرفاً أو رقماً' });
      }
      if (!rooms.has(code)) rooms.set(code, { clients: new Set(), history: [] });
      const room = rooms.get(code);
      if (room.clients.size >= 50) return send(ws, { type: 'error', text: 'الغرفة ممتلئة' });
      ws.room = room; ws.code = code; ws.name = name;
      room.clients.add(ws);
      send(ws, { type: 'joined', code, history: room.history });
      broadcast(room, { type: 'system', text: `${name} دخل الغرفة`, count: room.clients.size });
    }

    if (m.type === 'msg' && ws.room) {
      const now = Date.now();
      stamps = stamps.filter(t => now - t < 5000);
      if (stamps.length >= 8) return send(ws, { type: 'error', text: 'أبطئ قليلاً' });
      stamps.push(now);
      const text = clean(m.text, 1000);
      if (!text) return;
      const msg = { type: 'msg', name: ws.name, text, time: now };
      ws.room.history.push(msg);
      if (ws.room.history.length > 50) ws.room.history.shift();
      broadcast(ws.room, msg);
    }
  });

  ws.on('close', () => {
    const room = ws.room;
    if (!room) return;
    room.clients.delete(ws);
    if (room.clients.size === 0) rooms.delete(ws.code);
    else broadcast(room, { type: 'system', text: `${ws.name} غادر الغرفة`, count: room.clients.size });
  });
});

// إغلاق الاتصالات الميتة
setInterval(() => wss.clients.forEach(ws => {
  if (!ws.alive) return ws.terminate();
  ws.alive = false; ws.ping();
}), 30000);

server.listen(PORT, () => console.log(`الخادم يعمل على المنفذ ${PORT}`));
