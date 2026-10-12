/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSettings } from '../store/settings';
import { useConnection } from '../store/connection';
import { useTheme, ThemeChoice } from '../hooks/useTheme';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { ChevronLeft, RotateCcw, Unlink, Laptop, Sun, Moon, Monitor } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { laptopName, latency, demoMode, connect, disconnect } = useConnection();
  const { theme, setTheme } = useTheme();

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const hasVibrateSupport =
    typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const handleReset = () => {
    resetSettings();
    setResetDialogOpen(false);
  };

  const handleDemoToggle = (checked: boolean) => {
    if (checked) {
      connect('demo-session', true);
    } else {
      connect('live-session', false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col overflow-y-auto animate-slide-in-right">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 h-14 shrink-0 glass px-4 pt-safe flex items-center justify-between border-b border-separator/40">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1 text-accent font-medium text-headline active:opacity-70 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Back to trackpad"
        >
          <ChevronLeft className="w-6 h-6 -ml-1" />
          <span>Back</span>
        </button>

        <span className="text-headline font-semibold text-foreground sm:hidden">
          Settings
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-accent font-semibold text-headline px-2 h-11"
        >
          Done
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-safe space-y-6">
        {/* Large Title */}
        <div className="px-1 pt-1">
          <h1 className="text-large-title font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        {/* Group 1: Pointer */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Pointer
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            {/* Pointer Speed */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[52px] px-4 py-2.5 gap-2">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-headline text-foreground">Pointer speed</span>
                <span className="text-footnote font-mono text-muted">
                  {settings.pointerSpeed.toFixed(1)}&times;
                </span>
              </div>
              <div className="w-full sm:w-48">
                <Slider
                  value={[settings.pointerSpeed]}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onValueChange={([val]) =>
                    updateSettings({ pointerSpeed: Number(val.toFixed(1)) })
                  }
                  aria-label="Pointer speed"
                />
              </div>
            </div>

            {/* Tap to Click */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">Tap to click</span>
              <Switch
                checked={settings.tapToClick}
                onCheckedChange={(checked) => updateSettings({ tapToClick: checked })}
                aria-label="Toggle tap to click"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Scrolling */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Scrolling
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            {/* Scroll Speed */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[52px] px-4 py-2.5 gap-2">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-headline text-foreground">Scroll speed</span>
                <span className="text-footnote font-mono text-muted">
                  {settings.scrollSpeed.toFixed(1)}&times;
                </span>
              </div>
              <div className="w-full sm:w-48">
                <Slider
                  value={[settings.scrollSpeed]}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onValueChange={([val]) =>
                    updateSettings({ scrollSpeed: Number(val.toFixed(1)) })
                  }
                  aria-label="Scroll speed"
                />
              </div>
            </div>

            {/* Natural Scrolling */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">Natural scrolling</span>
              <Switch
                checked={settings.naturalScroll}
                onCheckedChange={(checked) =>
                  updateSettings({ naturalScroll: checked })
                }
                aria-label="Toggle natural scrolling"
              />
            </div>
          </div>
          <p className="text-footnote text-muted px-4 mt-1.5">
            Drag two fingers up to scroll the page down.
          </p>
        </div>

        {/* Group 3: Feedback */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Feedback
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            {/* Haptics */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <div className="flex flex-col">
                <span className="text-headline text-foreground">Haptics</span>
                {!hasVibrateSupport && (
                  <span className="text-caption text-danger">Not supported on this device</span>
                )}
              </div>
              <Switch
                checked={settings.haptics && hasVibrateSupport}
                disabled={!hasVibrateSupport}
                onCheckedChange={(checked) => updateSettings({ haptics: checked })}
                aria-label="Toggle haptics"
              />
            </div>

            {/* Long Press for Right Click */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">
                Long press for right click
              </span>
              <Switch
                checked={settings.longPressRightClick}
                onCheckedChange={(checked) =>
                  updateSettings({ longPressRightClick: checked })
                }
                aria-label="Toggle long press right click"
              />
            </div>
          </div>
          {!hasVibrateSupport && (
            <p className="text-footnote text-muted px-4 mt-1.5">
              Not supported on this device.
            </p>
          )}
        </div>

        {/* Group 4: Layout */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Layout
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            {/* Show Click Buttons */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">Show click buttons</span>
              <Switch
                checked={settings.showClickButtons}
                onCheckedChange={(checked) =>
                  updateSettings({ showClickButtons: checked })
                }
                aria-label="Toggle show click buttons"
              />
            </div>

            {/* Left-handed Layout */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">Left-handed layout</span>
              <Switch
                checked={settings.leftHanded}
                onCheckedChange={(checked) =>
                  updateSettings({ leftHanded: checked })
                }
                aria-label="Toggle left-handed layout"
              />
            </div>
          </div>
        </div>

        {/* Group 5: Appearance */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Appearance
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden shadow-xs p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-headline text-foreground">Theme</span>
              <Tabs
                value={theme}
                onValueChange={(val) => setTheme(val as ThemeChoice)}
                className="w-full sm:w-72"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="system" className="gap-1.5 text-footnote">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>System</span>
                  </TabsTrigger>
                  <TabsTrigger value="light" className="gap-1.5 text-footnote">
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="gap-1.5 text-footnote">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Group 6: Connection */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            Connection
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            {/* Laptop row */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-accent" />
                <span className="text-headline text-foreground">Laptop</span>
              </div>
              <span className="text-footnote font-mono text-muted">
                {laptopName || (demoMode ? 'Demo MacBook' : 'Laptop')} &middot;{' '}
                {latency ? `${latency} ms` : '< 2 ms'}
              </span>
            </div>

            {/* Demo mode Switch */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">Demo mode</span>
              <Switch
                checked={demoMode}
                onCheckedChange={handleDemoToggle}
                aria-label="Toggle demo mode"
              />
            </div>

            {/* Disconnect action */}
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-danger font-medium">
                Connection
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  disconnect();
                  onBack();
                }}
                className="gap-1.5 h-10 px-3 text-footnote"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Group 7: About */}
        <div>
          <div className="px-3 mb-1.5 text-caption uppercase tracking-wider text-muted font-medium">
            About
          </div>
          <div className="rounded-lg border border-separator bg-surface overflow-hidden divide-y divide-separator shadow-xs">
            <div className="flex items-center justify-between min-h-[52px] px-4 py-2.5">
              <span className="text-headline text-foreground">PocketPad</span>
              <span className="text-footnote font-mono text-muted">Version 1.0.0</span>
            </div>
          </div>
          <p className="text-footnote text-muted px-4 mt-1.5">
            PocketPad works only on the same Wi-Fi network as the laptop.
          </p>
        </div>

        {/* Reset to Defaults Dialog */}
        <div className="pt-2 pb-6">
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="default"
                className="w-full gap-2 text-danger hover:text-danger active:text-danger border-separator"
              >
                <RotateCcw className="w-4 h-4 text-danger" />
                Reset to defaults
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset All Settings?</DialogTitle>
                <DialogDescription>
                  This will restore pointer speed, scrolling, haptics, and layout
                  to their factory default settings.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={handleReset}
                >
                  Reset Settings
                </Button>
                <DialogClose asChild>
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
