/**
 * PocketPad Test Client
 * Sends a square cursor movement path and a left click.
 * Usage: node scripts/test-client.js <token-or-6-digit-code> [port]
 */

import { WebSocket } from 'ws';

const token = process.argv[2];
const port = process.argv[3] || process.env.PORT || '4455';

if (!token) {
  console.error('Error: Please provide session token or 6-digit code as argument.');
  console.error('Usage: node scripts/test-client.js <token>');
  process.exit(1);
}

const wsUrl = `ws://127.0.0.1:${port}`;
console.log(`Connecting to PocketPad companion at ${wsUrl}...`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('Connected! Sending hello with token...');
  ws.send(JSON.stringify({ t: 'hello', token }));
});

ws.on('message', async (data) => {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.error('Failed to parse message:', err);
    return;
  }

  if (msg.t === 'hello_ok') {
    console.log(`Successfully authenticated with host: ${msg.name} (${msg.os})`);
    console.log('Sending square move trajectory...');

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Move in a square: Right -> Down -> Left -> Up
    ws.send(JSON.stringify({ t: 'move', dx: 40, dy: 0 }));
    await delay(100);
    ws.send(JSON.stringify({ t: 'move', dx: 0, dy: 40 }));
    await delay(100);
    ws.send(JSON.stringify({ t: 'move', dx: -40, dy: 0 }));
    await delay(100);
    ws.send(JSON.stringify({ t: 'move', dx: 0, dy: -40 }));
    await delay(100);

    console.log('Sending left click tap...');
    ws.send(JSON.stringify({ t: 'click', b: 'left', a: 'tap' }));
    await delay(150);

    console.log('Test client completed successfully.');
    ws.close();
    process.exit(0);
  } else if (msg.t === 'error') {
    console.error(`Host rejected connection: ${msg.reason}`);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket connection error:', err.message);
  process.exit(1);
});
