/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useConnection } from '../store/connection';
import { useSettings } from '../store/settings';
import { protocol, KeyModifier, ShortcutName } from '../lib/protocol';
import { TrackpadSurface } from '../components/TrackpadSurface';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import {
  Keyboard as KeyboardIcon,
  Zap,
  Settings as SettingsIcon,
  Laptop,
  Unlink,
  ArrowLeft,
  ArrowRight,
  Copy,
  Clipboard,
  AppWindow,
  Volume1,
  Volume2,
  VolumeX,
  Play,
  Presentation,
  CornerDownLeft,
  X,
  RefreshCw,
} from 'lucide-react';

interface PadScreenProps {
  onOpenSettings?: () => void;
  onOpenPresenter?: () => void;
}

export function PadScreen({ onOpenSettings, onOpenPresenter }: PadScreenProps) {
  const { status, laptopName, laptopOs, latency, demoMode, send, disconnect } = useConnection();
  const { settings } = useSettings();

  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [stickyMods, setStickyMods] = useState<Set<KeyModifier>>(new Set());

  // Click buttons pressed state for holding / dragging
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);

  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const triggerHaptic = useCallback(() => {
    if (settings.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore vibration errors
      }
    }
  }, [settings.haptics]);

  // Click button handlers supporting hold-to-drag
  const handlePointerDownClickButton = (buttonType: 'left' | 'right', e: React.PointerEvent) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors
    }
    triggerHaptic();
    if (buttonType === 'left') {
      setLeftPressed(true);
      send(protocol.click('left', 'down'));
    } else {
      setRightPressed(true);
      send(protocol.click('right', 'down'));
    }
  };

  const handlePointerUpClickButton = (buttonType: 'left' | 'right', e: React.PointerEvent) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }
    triggerHaptic();
    if (buttonType === 'left') {
      setLeftPressed(false);
      send(protocol.click('left', 'up'));
    } else {
      setRightPressed(false);
      send(protocol.click('right', 'up'));
    }
  };

  // Keyboard toggling
  const toggleKeyboard = () => {
    triggerHaptic();
    if (keyboardActive) {
      setKeyboardActive(false);
      hiddenInputRef.current?.blur();
    } else {
      setKeyboardActive(true);
      hiddenInputRef.current?.focus();
    }
  };

  // Modifier toggling
  const toggleModifier = (mod: KeyModifier) => {
    triggerHaptic();
    setStickyMods((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const sendSpecialKey = (keyName: string) => {
    triggerHaptic();
    const mods = Array.from(stickyMods);
    send(protocol.key(keyName, mods));
    // Clear sticky modifiers after key usage
    if (stickyMods.size > 0) {
      setStickyMods(new Set());
    }
  };

  // Hidden text input events
  const handleInputText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      triggerHaptic();
      send(protocol.text(val));
      if (stickyMods.size > 0) {
        setStickyMods(new Set());
      }
      e.target.value = '';
    }
  };

  const handleKeyDownHiddenInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      triggerHaptic();
      send(protocol.key('Backspace', Array.from(stickyMods)));
      if (stickyMods.size > 0) setStickyMods(new Set());
    } else if (e.key === 'Enter') {
      e.preventDefault();
      triggerHaptic();
      send(protocol.key('Enter', Array.from(stickyMods)));
      if (stickyMods.size > 0) setStickyMods(new Set());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      triggerHaptic();
      send(protocol.key('Tab', Array.from(stickyMods)));
      if (stickyMods.size > 0) setStickyMods(new Set());
    }
  };

  // Shortcut dispatch for Quick Actions
  const handleShortcut = (shortcutName: ShortcutName, keepOpen = false) => {
    triggerHaptic();
    send(protocol.shortcut(shortcutName));
    if (!keepOpen) {
      setQuickActionsOpen(false);
    }
  };

  const isReconnecting = status === 'connecting' || status === 'disconnected';
  const metaLabel = laptopOs === 'darwin' ? 'Cmd' : 'Win';
  const missionControlLabel = laptopOs === 'darwin' ? 'Mission Control' : 'Task View';

  // Left/Right buttons ordering
  const buttonConfigs = settings.leftHanded
    ? [
        { type: 'right' as const, label: 'Right', pressed: rightPressed },
        { type: 'left' as const, label: 'Left', pressed: leftPressed },
      ]
    : [
        { type: 'left' as const, label: 'Left', pressed: leftPressed },
        { type: 'right' as const, label: 'Right', pressed: rightPressed },
      ];

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col landscape:flex-row overflow-hidden select-none">
      {/* Hidden input to summon soft keyboard */}
      <input
        ref={hiddenInputRef}
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="absolute -top-40 opacity-0 pointer-events-none"
        onChange={handleInputText}
        onKeyDown={handleKeyDownHiddenInput}
        aria-hidden="true"
      />

      {/* Main Content Area (Top Bar + Trackpad Surface + Special Keys) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Bar: 56px in portrait, 44px in landscape */}
        <header className="h-14 landscape:h-11 shrink-0 px-4 pt-safe flex items-center justify-between border-b border-separator/40 glass z-30 transition-all">
          {/* Left: Connection Pill Dialog Trigger */}
          <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 -ml-1.5 rounded-full bg-surface-raised/70 border border-separator/50 active:scale-95 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Connection Details"
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-success/20 text-success shrink-0 animate-enter-spring">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                </span>
                <span className="text-footnote font-medium text-foreground truncate max-w-[110px] sm:max-w-[160px]">
                  {laptopName || (demoMode ? 'Demo MacBook' : 'Laptop')}
                </span>
                <span className="text-[11px] font-mono text-muted shrink-0">
                  {latency ? `${latency} ms` : '< 2 ms'}
                </span>
              </button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-accent" />
                  Connection Info
                </DialogTitle>
                <DialogDescription>
                  Details for currently linked companion session.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex justify-between items-center text-footnote">
                  <span className="text-muted">Host Machine</span>
                  <span className="font-semibold text-foreground">
                    {laptopName || 'Demo MacBook'}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex justify-between items-center text-footnote">
                  <span className="text-muted">Operating System</span>
                  <span className="font-mono text-foreground capitalize">
                    {laptopOs || 'darwin'}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex justify-between items-center text-footnote">
                  <span className="text-muted">Round-Trip Latency</span>
                  <span className="font-mono text-success">
                    {latency ? `${latency} ms` : '< 2 ms'}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-surface-raised border border-separator flex justify-between items-center text-footnote">
                  <span className="text-muted">Transport</span>
                  <span className="font-mono text-foreground">
                    {demoMode ? 'MockTransport (Demo Mode)' : 'WebSocket'}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto gap-2"
                  onClick={() => {
                    setConnectionDialogOpen(false);
                    disconnect();
                  }}
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect
                </Button>
                <DialogClose asChild>
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Right: Icon Buttons (Keyboard, Quick Actions, Settings) */}
          <div className="flex items-center gap-1 -mr-1">
            {/* Keyboard Button */}
            <button
              type="button"
              onClick={toggleKeyboard}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                keyboardActive
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-foreground hover:bg-surface-raised'
              }`}
              aria-label="Toggle Keyboard"
            >
              <KeyboardIcon className="w-5 h-5" />
            </button>

            {/* Quick Actions Sheet Trigger */}
            <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-foreground hover:bg-surface-raised transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Quick Actions"
                >
                  <Zap className="w-5 h-5 text-accent" />
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="max-h-[85vh]">
                <SheetHeader className="mb-4">
                  <SheetTitle>Quick Actions</SheetTitle>
                  <SheetDescription>
                    Tap shortcuts to trigger instant macOS/Windows commands.
                  </SheetDescription>
                </SheetHeader>

                {/* 4-column grid of 72px tiles */}
                <div className="grid grid-cols-4 gap-2.5 pb-4">
                  {/* Back */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('back')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <ArrowLeft className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">Back</span>
                  </button>

                  {/* Forward */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('forward')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <ArrowRight className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">Forward</span>
                  </button>

                  {/* Copy */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('copy')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Copy className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">Copy</span>
                  </button>

                  {/* Paste */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('paste')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Clipboard className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">Paste</span>
                  </button>

                  {/* Mission Control / Task View */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('missionControl')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <AppWindow className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none truncate max-w-[70px]">
                      {missionControlLabel}
                    </span>
                  </button>

                  {/* Volume Down (keeps sheet open) */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('volumeDown', true)}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Volume1 className="w-5 h-5 text-foreground" />
                    <span className="text-[12px] font-medium leading-none">Vol &minus;</span>
                  </button>

                  {/* Volume Up (keeps sheet open) */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('volumeUp', true)}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Volume2 className="w-5 h-5 text-foreground" />
                    <span className="text-[12px] font-medium leading-none">Vol +</span>
                  </button>

                  {/* Mute (keeps sheet open) */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('mute', true)}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <VolumeX className="w-5 h-5 text-danger" />
                    <span className="text-[12px] font-medium leading-none">Mute</span>
                  </button>

                  {/* Play/Pause */}
                  <button
                    type="button"
                    onClick={() => handleShortcut('playPause')}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Play className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">Play/Pause</span>
                  </button>

                  {/* Presenter */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setQuickActionsOpen(false);
                      onOpenPresenter?.();
                    }}
                    className="h-[72px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-raised border border-separator/50 active:scale-95 transition-transform cursor-pointer hover:bg-surface"
                  >
                    <Presentation className="w-5 h-5 text-accent" />
                    <span className="text-[12px] font-medium leading-none">
                      Presenter
                    </span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-foreground hover:bg-surface-raised transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5 text-muted hover:text-foreground" />
            </button>
          </div>
        </header>

        {/* Surface Area with 16px margins + safe area insets */}
        <div className="relative flex-1 flex flex-col p-4 pb-safe pl-safe pr-safe min-h-0 overflow-hidden">
          <TrackpadSurface />

          {/* Non-blocking Reconnecting Glass Toast */}
          {isReconnecting && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full glass border border-separator/80 shadow-md flex items-center gap-2 pointer-events-none animate-enter-spring">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              <span className="text-footnote font-medium text-foreground">
                Reconnecting to companion...
              </span>
            </div>
          )}
        </div>

        {/* 44px Glass Special-Keys Row (shown when keyboard is active) */}
        {keyboardActive && (
          <div className="h-11 shrink-0 glass border-t border-separator/50 px-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-20">
            {/* Esc */}
            <button
              type="button"
              onClick={() => sendSpecialKey('Escape')}
              className="h-8 min-w-[44px] px-2.5 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
            >
              Esc
            </button>

            {/* Tab */}
            <button
              type="button"
              onClick={() => sendSpecialKey('Tab')}
              className="h-8 min-w-[44px] px-2.5 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
            >
              Tab
            </button>

            {/* Ctrl */}
            <button
              type="button"
              onClick={() => toggleModifier('ctrl')}
              className={`h-8 min-w-[44px] px-2.5 rounded-sm border text-footnote font-mono font-medium active:scale-95 shrink-0 transition-colors ${
                stickyMods.has('ctrl')
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-raised border-separator/60 text-foreground hover:bg-surface'
              }`}
            >
              Ctrl
            </button>

            {/* Alt */}
            <button
              type="button"
              onClick={() => toggleModifier('alt')}
              className={`h-8 min-w-[44px] px-2.5 rounded-sm border text-footnote font-mono font-medium active:scale-95 shrink-0 transition-colors ${
                stickyMods.has('alt')
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-raised border-separator/60 text-foreground hover:bg-surface'
              }`}
            >
              Alt
            </button>

            {/* Shift */}
            <button
              type="button"
              onClick={() => toggleModifier('shift')}
              className={`h-8 min-w-[44px] px-2.5 rounded-sm border text-footnote font-mono font-medium active:scale-95 shrink-0 transition-colors ${
                stickyMods.has('shift')
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-raised border-separator/60 text-foreground hover:bg-surface'
              }`}
            >
              Shift
            </button>

            {/* Cmd / Win */}
            <button
              type="button"
              onClick={() => toggleModifier('meta')}
              className={`h-8 min-w-[44px] px-2.5 rounded-sm border text-footnote font-mono font-medium active:scale-95 shrink-0 transition-colors ${
                stickyMods.has('meta')
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-raised border-separator/60 text-foreground hover:bg-surface'
              }`}
            >
              {metaLabel}
            </button>

            {/* Arrow Left */}
            <button
              type="button"
              onClick={() => sendSpecialKey('ArrowLeft')}
              className="h-8 min-w-[40px] px-2 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
              aria-label="Arrow Left"
            >
              &larr;
            </button>

            {/* Arrow Up */}
            <button
              type="button"
              onClick={() => sendSpecialKey('ArrowUp')}
              className="h-8 min-w-[40px] px-2 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
              aria-label="Arrow Up"
            >
              &uarr;
            </button>

            {/* Arrow Down */}
            <button
              type="button"
              onClick={() => sendSpecialKey('ArrowDown')}
              className="h-8 min-w-[40px] px-2 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
              aria-label="Arrow Down"
            >
              &darr;
            </button>

            {/* Arrow Right */}
            <button
              type="button"
              onClick={() => sendSpecialKey('ArrowRight')}
              className="h-8 min-w-[40px] px-2 rounded-sm bg-surface-raised border border-separator/60 text-footnote font-mono font-medium active:scale-95 hover:bg-surface shrink-0"
              aria-label="Arrow Right"
            >
              &rarr;
            </button>

            {/* Close Keyboard bar button */}
            <button
              type="button"
              onClick={() => {
                setKeyboardActive(false);
                hiddenInputRef.current?.blur();
              }}
              className="h-8 min-w-[36px] ml-auto px-2 rounded-sm bg-surface-raised/50 text-muted hover:text-foreground shrink-0"
              aria-label="Hide Keyboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Click Buttons:
          Portrait: 72px bottom bar with safe-area bottom
          Landscape: vertical stack on right edge with safe-area right
      */}
      {settings.showClickButtons && (
        <div className="shrink-0 glass border-t landscape:border-t-0 landscape:border-l border-separator/40 z-20 transition-all duration-200 h-[72px] landscape:h-full landscape:w-28 flex flex-row landscape:flex-col items-center justify-center p-3 pb-safe landscape:pb-3 landscape:pr-safe gap-3">
          {buttonConfigs.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onPointerDown={(e) => handlePointerDownClickButton(btn.type, e)}
              onPointerUp={(e) => handlePointerUpClickButton(btn.type, e)}
              onPointerCancel={(e) => handlePointerUpClickButton(btn.type, e)}
              className={`flex-1 w-full h-14 min-h-[44px] rounded-lg border border-separator/80 font-medium text-headline transition-all duration-75 select-none touch-none flex items-center justify-center cursor-pointer shadow-xs ${
                btn.pressed
                  ? 'bg-surface-raised scale-[0.97] border-accent/40 shadow-inner'
                  : 'bg-surface hover:bg-surface-raised active:bg-surface-raised'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
