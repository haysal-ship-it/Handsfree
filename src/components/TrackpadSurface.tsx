/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useConnection } from '../store/connection';
import { useSettings } from '../store/settings';
import { GestureEngine, PointerPoint, GESTURE_THRESHOLDS } from '../lib/gestures';
import { PocketPadMessage } from '../lib/protocol';
import { Activity } from 'lucide-react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function TrackpadSurfaceComponent() {
  const { send, demoMode, recentMessages } = useConnection();
  const { settings } = useSettings();

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const hintTimerRef = useRef<number | null>(null);

  // Soft accent border glow for 150ms on click
  const [clickGlow, setClickGlow] = useState(false);
  const clickGlowTimerRef = useRef<number | null>(null);

  // Active finger positions for visual accent glow
  const [activePoints, setActivePoints] = useState<PointerPoint[]>([]);

  // Ripples on tap
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Messages-per-second (MPS) calculation for debug overlay
  const [mps, setMps] = useState(0);
  const sentTimestampsRef = useRef<number[]>([]);

  const triggerClickGlow = useCallback(() => {
    setClickGlow(true);
    if (clickGlowTimerRef.current !== null) {
      clearTimeout(clickGlowTimerRef.current);
    }
    clickGlowTimerRef.current = window.setTimeout(() => {
      setClickGlow(false);
    }, 150);
  }, []);

  // Activity handler to manage the 5-second hint timer
  const handleActivity = useCallback(() => {
    setHintVisible(false);
    if (hintTimerRef.current !== null) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setHintVisible(true);
    }, GESTURE_THRESHOLDS.HINT_IDLE_TIMEOUT);
  }, []);

  const handleSendMessage = useCallback(
    (msg: PocketPadMessage) => {
      send(msg);

      if (msg.t === 'click') {
        triggerClickGlow();
      }

      // Record timestamp for MPS calculation in demo mode
      if (demoMode) {
        const now = Date.now();
        sentTimestampsRef.current.push(now);
      }
    },
    [send, demoMode, triggerClickGlow]
  );

  const handleTapRipple = useCallback(
    (clientX: number, clientY: number) => {
      triggerClickGlow();
      if (!surfaceRef.current) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const newRipple: Ripple = { id: Date.now() + Math.random(), x, y };

      setRipples((prev) => [...prev.slice(-4), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 320);
    },
    [triggerClickGlow]
  );

  // Update MPS rolling rate every 500ms
  useEffect(() => {
    if (!demoMode) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      sentTimestampsRef.current = sentTimestampsRef.current.filter((ts) => now - ts < 1000);
      setMps(sentTimestampsRef.current.length);
    }, 500);

    return () => clearInterval(interval);
  }, [demoMode]);

  // Instantiate Gesture Engine
  const gestureEngine = useMemo(() => {
    return new GestureEngine(settings, {
      onSendMessage: handleSendMessage,
      onPointerStateChange: (pointers) => {
        if (!surfaceRef.current) return;
        const rect = surfaceRef.current.getBoundingClientRect();
        const relativePoints = pointers.map((p) => ({
          ...p,
          currentX: p.currentX - rect.left,
          currentY: p.currentY - rect.top,
        }));
        setActivePoints(relativePoints);
      },
      onTapRipple: handleTapRipple,
      onActivity: handleActivity,
    });
  }, [handleSendMessage, handleTapRipple, handleActivity]);

  // Keep settings synced in engine
  useEffect(() => {
    gestureEngine.updateSettings(settings);
  }, [gestureEngine, settings]);

  useEffect(() => {
    return () => {
      gestureEngine.destroy();
      if (hintTimerRef.current !== null) {
        clearTimeout(hintTimerRef.current);
      }
      if (clickGlowTimerRef.current !== null) {
        clearTimeout(clickGlowTimerRef.current);
      }
    };
  }, [gestureEngine]);

  // Format message for debug overlay
  const formatDebugMsg = (msg: PocketPadMessage) => {
    switch (msg.t) {
      case 'move':
        return `move dx:${msg.dx} dy:${msg.dy}`;
      case 'click':
        return `click ${msg.b} ${msg.a}`;
      case 'scroll':
        return `scroll dy:${msg.dy}`;
      case 'key':
        return `key ${msg.key}`;
      case 'shortcut':
        return `shortcut ${msg.name}`;
      case 'ping':
        return 'ping';
      case 'pong':
        return 'pong';
      default:
        return msg.t;
    }
  };

  const last6Messages = recentMessages.slice(-6).reverse();

  return (
    <div
      ref={surfaceRef}
      role="application"
      aria-label="Trackpad"
      tabIndex={0}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // setPointerCapture error fallback
        }
        gestureEngine.onPointerDown(e);
      }}
      onPointerMove={(e) => gestureEngine.onPointerMove(e)}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // releasePointerCapture fallback
        }
        gestureEngine.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // releasePointerCapture fallback
        }
        gestureEngine.onPointerCancel(e);
      }}
      style={{ touchAction: 'none' }}
      className={`relative flex-1 w-full bg-surface rounded-pad border shadow-[inset_0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden select-none cursor-default active:cursor-grabbing transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        clickGlow
          ? 'border-accent shadow-[0_0_20px_rgba(0,122,255,0.35),inset_0_2px_12px_rgba(0,0,0,0.06)]'
          : 'border-separator'
      }`}
    >
      {/* Subtle 24px dot grid pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-pad"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.06,
        }}
      />

      {/* Touch Glow Feedback (120px radial gradient, follows finger, hidden on reduced motion) */}
      <div className="motion-reduce:hidden">
        {activePoints.map((pt) => (
          <div
            key={pt.id}
            aria-hidden="true"
            className="pointer-events-none absolute w-[120px] h-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl bg-accent/20 transition-transform duration-100 ease-out"
            style={{
              left: `${pt.currentX}px`,
              top: `${pt.currentY}px`,
            }}
          />
        ))}
      </div>

      {/* Ripple Animation Feedback (300ms expand and fade out) */}
      <div className="motion-reduce:hidden">
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent bg-accent/20 animate-ping"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: '64px',
              height: '64px',
              animationDuration: '300ms',
              animationIterationCount: 1,
            }}
          />
        ))}
      </div>

      {/* Centered Hint (fades out on touch, returns after 5s idle) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-300 ${
          hintVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-footnote text-muted px-4 py-2 rounded-full bg-surface-raised/80 backdrop-blur-xs border border-separator/50 shadow-xs">
          Move your finger to control the cursor
        </span>
      </div>

      {/* Debug Overlay (demo mode only): top left glass panel */}
      {demoMode && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none select-none glass rounded-md p-2.5 max-w-[210px] shadow-sm text-left">
          <div className="flex items-center justify-between gap-2 border-b border-separator/40 pb-1 mb-1.5">
            <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent" />
              DEMO DEBUG
            </span>
            <span className="text-[10px] font-mono text-accent font-semibold">
              {mps} msg/s
            </span>
          </div>

          <div className="space-y-0.5">
            {last6Messages.length === 0 ? (
              <span className="text-[11px] font-mono text-muted block italic">
                waiting for input...
              </span>
            ) : (
              last6Messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="text-[11px] font-mono text-foreground truncate leading-tight"
                >
                  <span className="text-muted mr-1.5">&rsaquo;</span>
                  {formatDebugMsg(msg)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const TrackpadSurface = React.memo(TrackpadSurfaceComponent);
