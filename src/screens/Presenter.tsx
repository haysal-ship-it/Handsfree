/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection } from '../store/connection';
import { useSettings } from '../store/settings';
import { protocol } from '../lib/protocol';
import {
  subscribeTimer,
  startTimer,
  pauseTimer,
  resetTimer,
} from '../lib/presenterTimer';
import { TrackpadSurface } from '../components/TrackpadSurface';
import { Switch } from '../components/ui/switch';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronRight,
  ChevronLeft,
  MousePointer2,
} from 'lucide-react';

interface PresenterProps {
  onClose: () => void;
}

export function PresenterScreen({ onClose }: PresenterProps) {
  const { send } = useConnection();
  const { settings } = useSettings();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showPointerStrip, setShowPointerStrip] = useState(false);

  // Subscribe to singleton timer so elapsed seconds survive unmount/remount
  useEffect(() => {
    const unsubscribe = subscribeTimer((secs, running) => {
      setElapsedSeconds(secs);
      setIsRunning(running);
    });
    return unsubscribe;
  }, []);

  const triggerHaptic = useCallback(() => {
    if (settings.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }, [settings.haptics]);

  const handleNextSlide = () => {
    triggerHaptic();
    send(protocol.shortcut('nextSlide'));
  };

  const handlePrevSlide = () => {
    triggerHaptic();
    send(protocol.shortcut('prevSlide'));
  };

  const toggleTimer = () => {
    triggerHaptic();
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleResetTimer = () => {
    triggerHaptic();
    resetTimer();
  };

  // Format mm:ss
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden select-none animate-enter-spring">
      {/* Top Bar: Timer, Timer Controls, and Close Button */}
      <header className="h-16 shrink-0 px-4 pt-safe flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md z-30">
        {/* Left: Timer Display & Controls */}
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-[34px] font-bold tracking-tight text-white leading-none">
            {formattedTime}
          </span>

          <div className="flex items-center gap-1">
            {/* Start / Pause */}
            <button
              type="button"
              onClick={toggleTimer}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            >
              {isRunning ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-accent ml-0.5" />
              )}
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetTimer}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-4 h-4 text-white/70 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Right: Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Exit Presenter Mode"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </header>

      {/* Main Slide Controls + Optional Pointer Strip */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-4">
        {/* Optional Trackpad Surface Strip (about 40% height when active) */}
        {showPointerStrip && (
          <div className="h-[38%] min-h-[140px] shrink-0 flex flex-col rounded-pad overflow-hidden border border-white/15 bg-white/5 shadow-inner">
            <TrackpadSurface />
          </div>
        )}

        {/* Center Slide Action Buttons:
            Portrait: Next on top (flex 6), Previous on bottom (flex 4).
            Landscape: Side by side, Next (flex 6), Previous (flex 4).
        */}
        <div className="flex-1 flex flex-col landscape:flex-row gap-3 min-h-0">
          {/* Next Button (60% space, accent filled, at least 96px tall) */}
          <button
            type="button"
            onClick={handleNextSlide}
            className="flex-[6] min-h-[96px] rounded-2xl bg-accent text-white flex flex-col landscape:flex-row items-center justify-center gap-2 px-6 shadow-lg active:scale-[0.98] transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Next slide"
          >
            <div className="flex items-center gap-2">
              <span className="text-large-title font-bold tracking-tight">Next</span>
              <ChevronRight className="w-8 h-8" />
            </div>
            <span className="text-footnote opacity-80 font-medium">Forward 1 Slide</span>
          </button>

          {/* Previous Button (40% space, secondary styling, at least 96px tall) */}
          <button
            type="button"
            onClick={handlePrevSlide}
            className="flex-[4] min-h-[96px] rounded-2xl bg-white/10 border border-white/15 text-white flex flex-col landscape:flex-row items-center justify-center gap-2 px-6 active:scale-[0.98] transition-all cursor-pointer select-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Previous slide"
          >
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-7 h-7 text-white/80" />
              <span className="text-title font-semibold tracking-tight text-white/90">Previous</span>
            </div>
            <span className="text-footnote text-white/60 font-medium">Back 1 Slide</span>
          </button>
        </div>
      </div>

      {/* Bottom Bar: Pointer Strip Toggle */}
      <footer className="h-14 shrink-0 px-5 pb-safe border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-2 text-white/90">
          <MousePointer2 className="w-4.5 h-4.5 text-accent" />
          <span className="text-headline font-medium">Cursor Trackpad Strip</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-footnote text-white/60">
            {showPointerStrip ? 'On' : 'Off'}
          </span>
          <Switch
            checked={showPointerStrip}
            onCheckedChange={setShowPointerStrip}
            aria-label="Toggle Pointer Trackpad Strip"
          />
        </div>
      </footer>
    </div>
  );
}
