/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PocketPadMessage, protocol } from './protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
export type ErrorReason = 'bad_token' | 'expired';

export type StatusCallback = (status: ConnectionStatus, errorReason?: ErrorReason) => void;
export type MessageCallback = (msg: PocketPadMessage) => void;
export type LatencyCallback = (latencyMs: number) => void;

export interface Transport {
  connect(token: string): void;
  send(msg: PocketPadMessage): void;
  close(): void;
  onStatus(cb: StatusCallback): () => void;
  onMessage(cb: MessageCallback): () => void;
  onLatency?(cb: LatencyCallback): () => void;
  getLatency?(): number;
}

export class WebSocketTransport implements Transport {
  private ws: WebSocket | null = null;
  private token: string = '';
  private isClosedIntentionally: boolean = false;
  private statusListeners: Set<StatusCallback> = new Set();
  private messageListeners: Set<MessageCallback> = new Set();
  private latencyListeners: Set<LatencyCallback> = new Set();
  private status: ConnectionStatus = 'idle';
  private errorReason?: ErrorReason;
  private pingIntervalId: number | null = null;
  private reconnectTimerId: number | null = null;
  private backoffDelayMs: number = 500;
  private currentLatencyMs: number = 0;

  connect(token: string): void {
    this.token = token;
    this.isClosedIntentionally = false;
    this.backoffDelayMs = 500;
    this.clearTimers();
    this.initSocket();
  }

  private initSocket(): void {
    if (this.isClosedIntentionally) return;

    this.setStatus('connecting');

    try {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
      const url = `${wsProtocol}//${host}`;

      this.ws = new WebSocket(url);
    } catch {
      this.handleSocketFailure();
      return;
    }

    this.ws.onopen = () => {
      this.backoffDelayMs = 500;
      // Send hello with the token first
      this.sendRaw(protocol.hello(this.token));
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as PocketPadMessage;

        if (msg.t === 'hello_ok') {
          this.setStatus('connected');
        } else if (msg.t === 'error') {
          this.errorReason = msg.reason;
          this.setStatus('error', msg.reason);
          // Bad token or expired token should stop reconnection loop
          this.isClosedIntentionally = true;
          this.clearTimers();
        } else if (msg.t === 'pong') {
          if (typeof msg.ts === 'number') {
            const rtt = Math.max(0, Date.now() - msg.ts);
            this.currentLatencyMs = rtt;
            this.latencyListeners.forEach((cb) => cb(rtt));
          }
        }

        this.messageListeners.forEach((cb) => cb(msg));
      } catch {
        // Ignore unparseable frames
      }
    };

    this.ws.onerror = () => {
      // WebSocket error handler will be followed by onclose
    };

    this.ws.onclose = () => {
      this.stopPingInterval();
      if (!this.isClosedIntentionally && this.status !== 'error') {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }
    };
  }

  private handleSocketFailure(): void {
    this.stopPingInterval();
    if (!this.isClosedIntentionally && this.status !== 'error') {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimerId !== null || this.isClosedIntentionally) return;

    // Exponential backoff with jitter: 500ms doubling up to 8000ms
    const jitter = Math.random() * 250;
    const delay = this.backoffDelayMs + jitter;
    this.backoffDelayMs = Math.min(8000, this.backoffDelayMs * 2);

    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      if (!this.isClosedIntentionally) {
        this.initSocket();
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingIntervalId = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRaw(protocol.ping(Date.now()));
      }
    }, 2000);
  }

  private stopPingInterval(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private clearTimers(): void {
    this.stopPingInterval();
    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private sendRaw(msg: PocketPadMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  send(msg: PocketPadMessage): void {
    this.sendRaw(msg);
  }

  close(): void {
    this.isClosedIntentionally = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private setStatus(status: ConnectionStatus, errorReason?: ErrorReason): void {
    this.status = status;
    this.errorReason = errorReason;
    this.statusListeners.forEach((cb) => cb(status, errorReason));
  }

  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.status, this.errorReason);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb: MessageCallback): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onLatency(cb: LatencyCallback): () => void {
    this.latencyListeners.add(cb);
    cb(this.currentLatencyMs);
    return () => this.latencyListeners.delete(cb);
  }

  getLatency(): number {
    return this.currentLatencyMs;
  }
}

export class MockTransport implements Transport {
  private statusListeners: Set<StatusCallback> = new Set();
  private messageListeners: Set<MessageCallback> = new Set();
  private latencyListeners: Set<LatencyCallback> = new Set();
  private status: ConnectionStatus = 'idle';
  private connectTimeoutId: number | null = null;
  private pingIntervalId: number | null = null;
  private errorReason?: ErrorReason;

  connect(token: string): void {
    this.close();
    this.setStatus('connecting');

    // Simulate connection after ~600ms
    this.connectTimeoutId = window.setTimeout(() => {
      // If code is specifically designated invalid code (e.g. '000000') simulate error
      if (token === '000000') {
        this.errorReason = 'bad_token';
        this.setStatus('error', 'bad_token');
        const errMsg = protocol.error('bad_token');
        this.messageListeners.forEach((cb) => cb(errMsg));
        return;
      }

      this.setStatus('connected');
      const okMsg = protocol.helloOk('Demo MacBook', 'darwin');
      this.messageListeners.forEach((cb) => cb(okMsg));

      // Periodic simulated mock ping latency (1-3ms)
      this.pingIntervalId = window.setInterval(() => {
        const mockLatency = Math.floor(Math.random() * 3) + 1;
        this.latencyListeners.forEach((cb) => cb(mockLatency));
      }, 2000);
      this.latencyListeners.forEach((cb) => cb(2));
    }, 600);
  }

  send(msg: PocketPadMessage): void {
    // In MockTransport, echo or record sent messages
    // If client sends ping, simulate pong response
    if (msg.t === 'ping') {
      window.setTimeout(() => {
        const pong = protocol.pong(msg.ts);
        this.messageListeners.forEach((cb) => cb(pong));
        const latency = Math.max(1, Date.now() - msg.ts);
        this.latencyListeners.forEach((cb) => cb(latency));
      }, 5);
    }
  }

  close(): void {
    if (this.connectTimeoutId !== null) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.setStatus('disconnected');
  }

  private setStatus(status: ConnectionStatus, errorReason?: ErrorReason): void {
    this.status = status;
    this.errorReason = errorReason;
    this.statusListeners.forEach((cb) => cb(status, errorReason));
  }

  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.status, this.errorReason);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb: MessageCallback): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onLatency(cb: LatencyCallback): () => void {
    this.latencyListeners.add(cb);
    cb(2);
    return () => this.latencyListeners.delete(cb);
  }

  getLatency(): number {
    return 2;
  }
}
