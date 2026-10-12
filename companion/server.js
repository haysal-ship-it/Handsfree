/**
 * PocketPad Desktop Companion
 * Plain JavaScript (ESM) Node.js server.
 */

import http from 'http';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import qrcode from 'qrcode-terminal';
import { mouse, keyboard, Key, Button, Point } from '@nut-tree-fork/nut-js';

// Configure nut.js for zero latency
try {
  mouse.config.autoDelayMs = 0;
  mouse.config.mouseSpeed = 10000;
  keyboard.config.autoDelayMs = 0;
} catch {
  // Graceful fallback if display environment is headless
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

// 1. Generate session token and 6-digit code
const sessionToken = crypto.randomBytes(16).toString('hex');
const numericCode = Math.floor(100000 + Math.random() * 900000).toString();
const PORT = parseInt(process.env.PORT || '4455', 10);

// 2. Discover local IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }

  // Prefer 192.168.x.x, then 10.x.x.x, then any private, fallback 127.0.0.1
  const prefer192 = candidates.find((ip) => ip.startsWith('192.168.'));
  if (prefer192) return prefer192;

  const prefer10 = candidates.find((ip) => ip.startsWith('10.'));
  if (prefer10) return prefer10;

  return candidates[0] || '127.0.0.1';
}

const localIp = getLocalIpAddress();
const appUrl = `http://${localIp}:${PORT}/?token=${sessionToken}`;

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 3. HTTP Static File Server
const server = http.createServer((req, res) => {
  const safeUrlPath = req.url ? req.url.split('?')[0] : '/';
  let targetPath = safeUrlPath === '/' ? '/index.html' : safeUrlPath;

  const normalizedPath = path.normalize(targetPath);
  const resolvedPath = path.join(PUBLIC_DIR, normalizedPath);

  // Guard against directory traversal
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  });
});

// 4. WebSocket Server
const wss = new WebSocketServer({ server });

function isPrivateIp(rawIp) {
  if (!rawIp) return false;
  const ip = rawIp.replace(/^::ffff:/, '');
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const match = ip.match(/^172\.(\d+)\./);
  if (match) {
    const octet = parseInt(match[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }
  return false;
}

let activeClient = null;

// Move coalescing state (same event-loop tick)
let pendingDx = 0;
let pendingDy = 0;
let moveScheduled = false;

function scheduleCoalescedMove(dx, dy) {
  pendingDx += dx;
  pendingDy += dy;

  if (!moveScheduled) {
    moveScheduled = true;
    setImmediate(async () => {
      const mx = pendingDx;
      const my = pendingDy;
      pendingDx = 0;
      pendingDy = 0;
      moveScheduled = false;

      if (mx === 0 && my === 0) return;

      try {
        const currentPos = await mouse.getPosition();
        // Move relative to current coordinates
        await mouse.setPosition(new Point(currentPos.x + mx, currentPos.y + my));
      } catch (err) {
        // Suppress cursor movement errors in restricted environments
      }
    });
  }
}

// Nut.js key mapping helper
function resolveNutKey(keyName) {
  const map = {
    Enter: Key.Return,
    Return: Key.Return,
    Backspace: Key.Backspace,
    Tab: Key.Tab,
    Escape: Key.Escape,
    Esc: Key.Escape,
    ArrowLeft: Key.Left,
    Left: Key.Left,
    ArrowRight: Key.Right,
    Right: Key.Right,
    ArrowUp: Key.Up,
    Up: Key.Up,
    ArrowDown: Key.Down,
    Down: Key.Down,
    Space: Key.Space,
    ' ': Key.Space,
  };

  if (map[keyName]) return map[keyName];

  // Letters A-Z
  if (keyName.length === 1) {
    const upper = keyName.toUpperCase();
    if (Key[upper] !== undefined) {
      return Key[upper];
    }
    // Numbers 0-9
    if (/^[0-9]$/.test(keyName) && Key[`Num${keyName}`] !== undefined) {
      return Key[`Num${keyName}`];
    }
  }

  return null;
}

function resolveModifierKeys(mods = []) {
  const result = [];
  for (const mod of mods) {
    if (mod === 'ctrl') result.push(Key.LeftControl);
    else if (mod === 'alt') result.push(Key.LeftAlt);
    else if (mod === 'shift') result.push(Key.LeftShift);
    else if (mod === 'meta') {
      result.push(process.platform === 'darwin' ? Key.LeftCmd : Key.LeftWin);
    }
  }
  return result;
}

wss.on('connection', (ws, req) => {
  const remoteIp = req.socket.remoteAddress;

  // 6. Security: Reject non-private IP addresses
  if (!isPrivateIp(remoteIp)) {
    try {
      ws.send(JSON.stringify({ t: 'error', reason: 'bad_token' }));
    } catch {}
    ws.close();
    return;
  }

  let authenticated = false;

  ws.on('message', async (data) => {
    // Ignore frames larger than 1 KB
    if (data.length > 1024) return;

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    try {
      // 6. First message must be hello
      if (!authenticated) {
        if (msg.t === 'hello' && (msg.token === sessionToken || msg.token === numericCode)) {
          authenticated = true;

          // Single active client: replace old client if connected
          if (activeClient && activeClient !== ws && activeClient.readyState === WebSocket.OPEN) {
            try {
              activeClient.close();
            } catch {}
          }
          activeClient = ws;

          ws.send(
            JSON.stringify({
              t: 'hello_ok',
              name: os.hostname(),
              os: process.platform,
            })
          );
        } else {
          ws.send(JSON.stringify({ t: 'error', reason: 'bad_token' }));
          ws.close();
        }
        return;
      }

      // Handle Ping
      if (msg.t === 'ping') {
        ws.send(JSON.stringify({ t: 'pong', ts: msg.ts }));
        return;
      }

      // 7. Input Event Handling

      // MOVE (Coalesced in event loop)
      if (msg.t === 'move' && typeof msg.dx === 'number' && typeof msg.dy === 'number') {
        scheduleCoalescedMove(msg.dx, msg.dy);
        return;
      }

      // CLICK
      if (msg.t === 'click') {
        const button =
          msg.b === 'right'
            ? Button.RIGHT
            : msg.b === 'middle'
            ? Button.MIDDLE
            : Button.LEFT;

        if (msg.a === 'tap') {
          await mouse.click(button);
        } else if (msg.a === 'down') {
          await mouse.pressButton(button);
        } else if (msg.a === 'up') {
          await mouse.releaseButton(button);
        }
        return;
      }

      // SCROLL
      if (msg.t === 'scroll') {
        if (msg.dy) {
          const steps = Math.max(1, Math.round(Math.abs(msg.dy) / 10));
          if (msg.dy > 0) {
            await mouse.scrollDown(steps);
          } else {
            await mouse.scrollUp(steps);
          }
        }
        if (msg.dx) {
          const steps = Math.max(1, Math.round(Math.abs(msg.dx) / 10));
          if (msg.dx > 0) {
            await mouse.scrollRight(steps);
          } else {
            await mouse.scrollLeft(steps);
          }
        }
        return;
      }

      // KEY
      if (msg.t === 'key' && typeof msg.key === 'string') {
        const nutKey = resolveNutKey(msg.key);
        const nutMods = resolveModifierKeys(msg.mods);

        if (nutKey !== null) {
          for (const m of nutMods) await keyboard.pressKey(m);
          await keyboard.pressKey(nutKey);
          await keyboard.releaseKey(nutKey);
          for (const m of nutMods) await keyboard.releaseKey(m);
        }
        return;
      }

      // TEXT
      if (msg.t === 'text' && typeof msg.s === 'string') {
        await keyboard.type(msg.s);
        return;
      }

      // SHORTCUT
      if (msg.t === 'shortcut') {
        const isMac = process.platform === 'darwin';
        const isWin = process.platform === 'win32';

        switch (msg.name) {
          case 'copy': {
            const mod = isMac ? Key.LeftCmd : Key.LeftControl;
            await keyboard.pressKey(mod);
            await keyboard.pressKey(Key.C);
            await keyboard.releaseKey(Key.C);
            await keyboard.releaseKey(mod);
            break;
          }
          case 'paste': {
            const mod = isMac ? Key.LeftCmd : Key.LeftControl;
            await keyboard.pressKey(mod);
            await keyboard.pressKey(Key.V);
            await keyboard.releaseKey(Key.V);
            await keyboard.releaseKey(mod);
            break;
          }
          case 'back': {
            if (isMac) {
              await keyboard.pressKey(Key.LeftCmd);
              await keyboard.pressKey(Key.LeftBracket);
              await keyboard.releaseKey(Key.LeftBracket);
              await keyboard.releaseKey(Key.LeftCmd);
            } else {
              await keyboard.pressKey(Key.LeftAlt);
              await keyboard.pressKey(Key.Left);
              await keyboard.releaseKey(Key.Left);
              await keyboard.releaseKey(Key.LeftAlt);
            }
            break;
          }
          case 'forward': {
            if (isMac) {
              await keyboard.pressKey(Key.LeftCmd);
              await keyboard.pressKey(Key.RightBracket);
              await keyboard.releaseKey(Key.RightBracket);
              await keyboard.releaseKey(Key.LeftCmd);
            } else {
              await keyboard.pressKey(Key.LeftAlt);
              await keyboard.pressKey(Key.Right);
              await keyboard.releaseKey(Key.Right);
              await keyboard.releaseKey(Key.LeftAlt);
            }
            break;
          }
          case 'missionControl': {
            if (isMac) {
              await keyboard.pressKey(Key.LeftControl);
              await keyboard.pressKey(Key.Up);
              await keyboard.releaseKey(Key.Up);
              await keyboard.releaseKey(Key.LeftControl);
            } else if (isWin) {
              await keyboard.pressKey(Key.LeftWin);
              await keyboard.pressKey(Key.Tab);
              await keyboard.releaseKey(Key.Tab);
              await keyboard.releaseKey(Key.LeftWin);
            } else {
              await keyboard.pressKey(Key.LeftSuper);
              await keyboard.releaseKey(Key.LeftSuper);
            }
            break;
          }
          case 'volumeUp': {
            if (Key.AudioVolUp !== undefined) {
              await keyboard.pressKey(Key.AudioVolUp);
              await keyboard.releaseKey(Key.AudioVolUp);
            }
            break;
          }
          case 'volumeDown': {
            if (Key.AudioVolDown !== undefined) {
              await keyboard.pressKey(Key.AudioVolDown);
              await keyboard.releaseKey(Key.AudioVolDown);
            }
            break;
          }
          case 'mute': {
            if (Key.AudioMute !== undefined) {
              await keyboard.pressKey(Key.AudioMute);
              await keyboard.releaseKey(Key.AudioMute);
            }
            break;
          }
          case 'playPause': {
            if (Key.AudioPlay !== undefined) {
              await keyboard.pressKey(Key.AudioPlay);
              await keyboard.releaseKey(Key.AudioPlay);
            }
            break;
          }
          case 'nextSlide': {
            await keyboard.pressKey(Key.Right);
            await keyboard.releaseKey(Key.Right);
            break;
          }
          case 'prevSlide': {
            await keyboard.pressKey(Key.Left);
            await keyboard.releaseKey(Key.Left);
            break;
          }
        }
      }
    } catch (err) {
      // Catch any individual event execution errors so server never crashes
    }
  });

  ws.on('close', () => {
    if (activeClient === ws) {
      activeClient = null;
    }
  });
});

// 5. Print Server Banner & QR code
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('       PocketPad is running             ');
  console.log('========================================\n');
  console.log(`URL:         ${appUrl}`);
  console.log(`6-digit code: ${numericCode}\n`);
  console.log('Scan this QR code with your phone camera:');

  try {
    qrcode.generate(appUrl, { small: true });
  } catch {
    console.log(`(Open ${appUrl} in your mobile browser)`);
  }
  console.log('----------------------------------------\n');
});

// 9. Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  console.log('\nPocketPad stopped');
  try {
    wss.clients.forEach((client) => client.close());
    server.close();
  } catch {}
  process.exit(0);
});
