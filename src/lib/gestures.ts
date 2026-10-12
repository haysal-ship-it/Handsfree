/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PocketPadMessage, protocol } from './protocol';
import { PocketPadSettings } from '../store/settings';

export const GESTURE_THRESHOLDS = {
  ONE_FINGER_MOVE_DEADZONE: 3, // px
  ONE_FINGER_TAP_MAX_TIME: 220, // ms
  ONE_FINGER_TAP_MAX_DISTANCE: 6, // px
  TWO_FINGER_TAP_MAX_TIME: 250, // ms
  TWO_FINGER_TAP_MAX_DISTANCE: 8, // px
  TAP_AND_DRAG_WINDOW: 300, // ms
  LONG_PRESS_TIME: 500, // ms
  VELOCITY_MAX_CAP: 3, // px/ms
  ACCELERATION_FACTOR: 0.6,
  HINT_IDLE_TIMEOUT: 5000, // ms
} as const;

export interface PointerPoint {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  previousX: number;
  previousY: number;
  startTime: number;
  lastTime: number;
  hasMovedPastDeadzone: boolean;
  totalDistance: number;
}

export interface GestureCallbacks {
  onSendMessage: (msg: PocketPadMessage) => void;
  onPointerStateChange?: (pointers: PointerPoint[]) => void;
  onTapRipple?: (x: number, y: number) => void;
  onActivity?: () => void;
}

export class GestureEngine {
  private activePointers = new Map<number, PointerPoint>();
  private settings: PocketPadSettings;
  private callbacks: GestureCallbacks;

  // Sub-pixel movement accumulators
  private subpixelRemainderX = 0;
  private subpixelRemainderY = 0;
  private subpixelScrollRemainderX = 0;
  private subpixelScrollRemainderY = 0;

  // Batching via requestAnimationFrame
  private batchedMoveX = 0;
  private batchedMoveY = 0;
  private batchedScrollX = 0;
  private batchedScrollY = 0;
  private rafId: number | null = null;

  // Tap-and-drag state
  private lastSingleTapTime = 0;
  private lastSingleTapPosition: { x: number; y: number } | null = null;
  private isTapAndDragging = false;
  private isTapAndDragCandidate = false;

  // Two-finger tap state
  private twoFingerStartTime = 0;
  private twoFingerMaxDistance = 0;
  private twoFingerActive = false;

  // Long press timer
  private longPressTimer: number | null = null;
  private longPressFired = false;

  constructor(settings: PocketPadSettings, callbacks: GestureCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  updateSettings(settings: PocketPadSettings) {
    this.settings = settings;
  }

  private triggerHaptic() {
    if (this.settings.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }

  private scheduleFlush() {
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;

      if (this.batchedMoveX !== 0 || this.batchedMoveY !== 0) {
        this.callbacks.onSendMessage(protocol.move(this.batchedMoveX, this.batchedMoveY));
        this.batchedMoveX = 0;
        this.batchedMoveY = 0;
      }

      if (this.batchedScrollX !== 0 || this.batchedScrollY !== 0) {
        this.callbacks.onSendMessage(protocol.scroll(this.batchedScrollX, this.batchedScrollY));
        this.batchedScrollX = 0;
        this.batchedScrollY = 0;
      }
    });
  }

  private cancelLongPress() {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onPointerDown(e: React.PointerEvent<HTMLElement> | PointerEvent) {
    e.preventDefault();
    this.callbacks.onActivity?.();

    const now = Date.now();
    const point: PointerPoint = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      previousX: e.clientX,
      previousY: e.clientY,
      startTime: now,
      lastTime: now,
      hasMovedPastDeadzone: false,
      totalDistance: 0,
    };

    this.activePointers.set(e.pointerId, point);
    this.callbacks.onPointerStateChange?.(Array.from(this.activePointers.values()));

    const count = this.activePointers.size;

    if (count === 1) {
      this.longPressFired = false;
      this.cancelLongPress();

      // Check for tap-and-drag candidacy
      const timeSinceLastTap = now - this.lastSingleTapTime;
      if (
        this.lastSingleTapPosition &&
        timeSinceLastTap <= GESTURE_THRESHOLDS.TAP_AND_DRAG_WINDOW &&
        Math.hypot(
          e.clientX - this.lastSingleTapPosition.x,
          e.clientY - this.lastSingleTapPosition.y
        ) < 40
      ) {
        this.isTapAndDragCandidate = true;
      } else {
        this.isTapAndDragCandidate = false;
      }

      // Schedule long press if enabled
      if (this.settings.longPressRightClick) {
        this.longPressTimer = window.setTimeout(() => {
          this.longPressFired = true;
          this.triggerHaptic();
          this.callbacks.onSendMessage(protocol.click('right', 'tap'));
          this.callbacks.onTapRipple?.(e.clientX, e.clientY);
        }, GESTURE_THRESHOLDS.LONG_PRESS_TIME);
      }
    } else if (count === 2) {
      // 2 fingers down: initiate two-finger tap tracking
      this.cancelLongPress();
      this.isTapAndDragCandidate = false;
      this.twoFingerStartTime = now;
      this.twoFingerMaxDistance = 0;
      this.twoFingerActive = true;
    } else {
      // 3+ fingers down
      this.cancelLongPress();
      this.twoFingerActive = false;
    }
  }

  onPointerMove(e: React.PointerEvent<HTMLElement> | PointerEvent) {
    e.preventDefault();
    this.callbacks.onActivity?.();

    const point = this.activePointers.get(e.pointerId);
    if (!point) return;

    const now = Date.now();
    const dx = e.clientX - point.previousX;
    const dy = e.clientY - point.previousY;
    const dt = Math.max(1, now - point.lastTime);

    point.previousX = point.currentX;
    point.previousY = point.currentY;
    point.currentX = e.clientX;
    point.currentY = e.clientY;
    point.lastTime = now;
    point.totalDistance += Math.hypot(dx, dy);

    this.callbacks.onPointerStateChange?.(Array.from(this.activePointers.values()));

    const distanceFromStart = Math.hypot(point.currentX - point.startX, point.currentY - point.startY);
    if (distanceFromStart > GESTURE_THRESHOLDS.ONE_FINGER_MOVE_DEADZONE) {
      point.hasMovedPastDeadzone = true;
      this.cancelLongPress();
    }

    const count = this.activePointers.size;

    // ONE-FINGER MOVE OR TAP-AND-DRAG
    if (count === 1 && !this.longPressFired) {
      if (point.hasMovedPastDeadzone) {
        // If tap-and-drag candidate, send click down on initial drag start
        if (this.isTapAndDragCandidate && !this.isTapAndDragging) {
          this.isTapAndDragging = true;
          this.isTapAndDragCandidate = false;
          this.triggerHaptic();
          this.callbacks.onSendMessage(protocol.click('left', 'down'));
        }

        // Apply pointer speed and gentle acceleration curve
        const speed = Math.hypot(dx, dy) / dt; // px/ms
        const velocityCapped = Math.min(speed, GESTURE_THRESHOLDS.VELOCITY_MAX_CAP);
        const accelerationMultiplier = 1 + velocityCapped * GESTURE_THRESHOLDS.ACCELERATION_FACTOR;
        const totalMultiplier = this.settings.pointerSpeed * accelerationMultiplier;

        const scaledDx = dx * totalMultiplier + this.subpixelRemainderX;
        const scaledDy = dy * totalMultiplier + this.subpixelRemainderY;

        const intDx = Math.trunc(scaledDx);
        const intDy = Math.trunc(scaledDy);

        this.subpixelRemainderX = scaledDx - intDx;
        this.subpixelRemainderY = scaledDy - intDy;

        if (intDx !== 0 || intDy !== 0) {
          this.batchedMoveX += intDx;
          this.batchedMoveY += intDy;
          this.scheduleFlush();
        }
      }
    } else if (count === 2) {
      // TWO-FINGER SCROLL
      const points = Array.from(this.activePointers.values());
      const p1 = points[0];
      const p2 = points[1];

      // Track max distance for two-finger tap detection
      this.twoFingerMaxDistance = Math.max(
        this.twoFingerMaxDistance,
        p1.totalDistance,
        p2.totalDistance
      );

      // Average delta between the two fingers
      const p1Dx = p1.currentX - p1.previousX;
      const p1Dy = p1.currentY - p1.previousY;
      const p2Dx = p2.currentX - p2.previousX;
      const p2Dy = p2.currentY - p2.previousY;

      const avgDx = (p1Dx + p2Dx) / 2;
      const avgDy = (p1Dy + p2Dy) / 2;

      // Natural scroll: dragging fingers up (avgDy < 0) scrolls page down (+dy)
      const scrollDirection = this.settings.naturalScroll ? -1 : 1;
      const scrollDx = avgDx * scrollDirection * this.settings.scrollSpeed + this.subpixelScrollRemainderX;
      const scrollDy = avgDy * scrollDirection * this.settings.scrollSpeed + this.subpixelScrollRemainderY;

      const intScrollX = Math.trunc(scrollDx);
      const intScrollY = Math.trunc(scrollDy);

      this.subpixelScrollRemainderX = scrollDx - intScrollX;
      this.subpixelScrollRemainderY = scrollDy - intScrollY;

      if (intScrollX !== 0 || intScrollY !== 0) {
        this.batchedScrollX += intScrollX;
        this.batchedScrollY += intScrollY;
        this.scheduleFlush();
      }
    }
  }

  onPointerUp(e: React.PointerEvent<HTMLElement> | PointerEvent) {
    e.preventDefault();
    this.callbacks.onActivity?.();

    const point = this.activePointers.get(e.pointerId);
    const now = Date.now();
    const countBeforeRemoval = this.activePointers.size;

    this.cancelLongPress();

    // Check tap-and-drag release
    if (this.isTapAndDragging) {
      this.isTapAndDragging = false;
      this.isTapAndDragCandidate = false;
      this.triggerHaptic();
      this.callbacks.onSendMessage(protocol.click('left', 'up'));
      this.callbacks.onTapRipple?.(e.clientX, e.clientY);
    } else if (countBeforeRemoval === 2 && this.twoFingerActive) {
      // TWO-FINGER TAP CHECK
      const elapsed = now - this.twoFingerStartTime;
      if (
        elapsed <= GESTURE_THRESHOLDS.TWO_FINGER_TAP_MAX_TIME &&
        this.twoFingerMaxDistance < GESTURE_THRESHOLDS.TWO_FINGER_TAP_MAX_DISTANCE
      ) {
        this.triggerHaptic();
        this.callbacks.onSendMessage(protocol.click('right', 'tap'));
        this.callbacks.onTapRipple?.(e.clientX, e.clientY);
      }
      this.twoFingerActive = false;
    } else if (countBeforeRemoval === 1 && point && !this.longPressFired) {
      // ONE-FINGER TAP CHECK
      const duration = now - point.startTime;
      const dist = Math.hypot(point.currentX - point.startX, point.currentY - point.startY);

      if (
        duration <= GESTURE_THRESHOLDS.ONE_FINGER_TAP_MAX_TIME &&
        dist < GESTURE_THRESHOLDS.ONE_FINGER_TAP_MAX_DISTANCE
      ) {
        this.lastSingleTapTime = now;
        this.lastSingleTapPosition = { x: point.currentX, y: point.currentY };

        if (this.settings.tapToClick) {
          this.triggerHaptic();
          this.callbacks.onSendMessage(protocol.click('left', 'tap'));
          this.callbacks.onTapRipple?.(point.currentX, point.currentY);
        }
      } else {
        this.lastSingleTapTime = 0;
        this.lastSingleTapPosition = null;
      }
    }

    this.activePointers.delete(e.pointerId);
    this.callbacks.onPointerStateChange?.(Array.from(this.activePointers.values()));

    if (this.activePointers.size === 0) {
      this.isTapAndDragCandidate = false;
      this.twoFingerActive = false;
      this.longPressFired = false;
      this.subpixelRemainderX = 0;
      this.subpixelRemainderY = 0;
      this.subpixelScrollRemainderX = 0;
      this.subpixelScrollRemainderY = 0;
    }
  }

  onPointerCancel(e: React.PointerEvent<HTMLElement> | PointerEvent) {
    e.preventDefault();
    this.cancelLongPress();

    if (this.isTapAndDragging) {
      this.isTapAndDragging = false;
      this.triggerHaptic();
      this.callbacks.onSendMessage(protocol.click('left', 'up'));
    }

    this.isTapAndDragCandidate = false;
    this.twoFingerActive = false;
    this.longPressFired = false;
    this.activePointers.delete(e.pointerId);
    this.callbacks.onPointerStateChange?.(Array.from(this.activePointers.values()));

    if (this.activePointers.size === 0) {
      this.subpixelRemainderX = 0;
      this.subpixelRemainderY = 0;
      this.subpixelScrollRemainderX = 0;
      this.subpixelScrollRemainderY = 0;
    }
  }

  destroy() {
    this.cancelLongPress();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.activePointers.clear();
  }
}
