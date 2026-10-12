/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Protocol message types strictly matching the PocketPad spec
export type HelloMessage = {
  t: 'hello';
  token: string;
};

export type HelloOkMessage = {
  t: 'hello_ok';
  name: string;
  os: 'darwin' | 'win32' | 'linux';
};

export type ErrorMessage = {
  t: 'error';
  reason: 'bad_token' | 'expired';
};

export type MoveMessage = {
  t: 'move';
  dx: number;
  dy: number;
};

export type ClickMessage = {
  t: 'click';
  b: 'left' | 'right' | 'middle';
  a: 'tap' | 'down' | 'up';
};

export type ScrollMessage = {
  t: 'scroll';
  dx: number;
  dy: number;
};

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

export type KeyMessage = {
  t: 'key';
  key: string;
  mods: KeyModifier[];
};

export type TextMessage = {
  t: 'text';
  s: string;
};

export type ShortcutName =
  | 'copy'
  | 'paste'
  | 'back'
  | 'forward'
  | 'missionControl'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute'
  | 'playPause'
  | 'nextSlide'
  | 'prevSlide';

export type ShortcutMessage = {
  t: 'shortcut';
  name: ShortcutName;
};

export type PingMessage = {
  t: 'ping';
  ts: number;
};

export type PongMessage = {
  t: 'pong';
  ts: number;
};

export type PocketPadMessage =
  | HelloMessage
  | HelloOkMessage
  | ErrorMessage
  | MoveMessage
  | ClickMessage
  | ScrollMessage
  | KeyMessage
  | TextMessage
  | ShortcutMessage
  | PingMessage
  | PongMessage;

// Message builder functions
export const protocol = {
  hello: (token: string): HelloMessage => ({ t: 'hello', token }),
  helloOk: (name: string, os: 'darwin' | 'win32' | 'linux'): HelloOkMessage => ({
    t: 'hello_ok',
    name,
    os,
  }),
  error: (reason: 'bad_token' | 'expired'): ErrorMessage => ({ t: 'error', reason }),
  move: (dx: number, dy: number): MoveMessage => ({ t: 'move', dx, dy }),
  click: (
    b: 'left' | 'right' | 'middle',
    a: 'tap' | 'down' | 'up'
  ): ClickMessage => ({ t: 'click', b, a }),
  scroll: (dx: number, dy: number): ScrollMessage => ({ t: 'scroll', dx, dy }),
  key: (key: string, mods: KeyModifier[] = []): KeyMessage => ({
    t: 'key',
    key,
    mods,
  }),
  text: (s: string): TextMessage => ({ t: 'text', s }),
  shortcut: (name: ShortcutName): ShortcutMessage => ({ t: 'shortcut', name }),
  ping: (ts = Date.now()): PingMessage => ({ t: 'ping', ts }),
  pong: (ts: number): PongMessage => ({ t: 'pong', ts }),
};
