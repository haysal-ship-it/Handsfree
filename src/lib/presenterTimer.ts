/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Singleton state for presenter timer so it survives leaving and returning to the screen
interface PresenterTimerState {
  isRunning: boolean;
  baseSeconds: number;
  lastStartedTimestamp: number | null;
}

let timerState: PresenterTimerState = {
  isRunning: false,
  baseSeconds: 0,
  lastStartedTimestamp: null,
};

type TimerListener = (seconds: number, isRunning: boolean) => void;
const listeners = new Set<TimerListener>();

function notify() {
  const currentSeconds = getElapsedSeconds();
  listeners.forEach((cb) => cb(currentSeconds, timerState.isRunning));
}

let intervalId: number | null = null;

function ensureInterval() {
  if (timerState.isRunning && intervalId === null) {
    intervalId = window.setInterval(() => {
      notify();
    }, 250);
  } else if (!timerState.isRunning && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function getElapsedSeconds(): number {
  if (!timerState.isRunning || timerState.lastStartedTimestamp === null) {
    return timerState.baseSeconds;
  }
  const delta = Math.floor((Date.now() - timerState.lastStartedTimestamp) / 1000);
  return timerState.baseSeconds + delta;
}

export function isTimerRunning(): boolean {
  return timerState.isRunning;
}

export function startTimer(): void {
  if (!timerState.isRunning) {
    timerState.isRunning = true;
    timerState.lastStartedTimestamp = Date.now();
    ensureInterval();
    notify();
  }
}

export function pauseTimer(): void {
  if (timerState.isRunning) {
    timerState.baseSeconds = getElapsedSeconds();
    timerState.isRunning = false;
    timerState.lastStartedTimestamp = null;
    ensureInterval();
    notify();
  }
}

export function resetTimer(): void {
  timerState.isRunning = false;
  timerState.baseSeconds = 0;
  timerState.lastStartedTimestamp = null;
  ensureInterval();
  notify();
}

export function subscribeTimer(listener: TimerListener): () => void {
  listeners.add(listener);
  listener(getElapsedSeconds(), timerState.isRunning);
  ensureInterval();
  return () => {
    listeners.delete(listener);
  };
}
