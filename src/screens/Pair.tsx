/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useConnection } from '../store/connection';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Touchpad, Laptop, QrCode, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export function PairScreen() {
  const { status, errorReason, connect } = useConnection();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount if idle
  useEffect(() => {
    if (status === 'idle' || status === 'error' || status === 'disconnected') {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [status]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const cleanVal = value.replace(/[^0-9]/g, '');

    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Handle single digit input
    const char = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === 6 && status !== 'connecting') {
        connect(code, false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasteData[i] || '';
    }
    setDigits(nextDigits);

    // Focus last filled index or next empty
    const focusIdx = Math.min(pasteData.length, 5);
    inputRefs.current[focusIdx]?.focus();

    // If full 6 digits were pasted, can auto-connect
    if (pasteData.length === 6) {
      connect(pasteData, false);
    }
  };

  const codeString = digits.join('');
  const isCodeComplete = codeString.length === 6;

  const handleConnectClick = () => {
    if (isCodeComplete && status !== 'connecting') {
      connect(codeString, false);
    }
  };

  const handleDemoClick = () => {
    connect('demo-session', true);
  };

  return (
    <div className="w-full max-w-md mx-auto px-5 py-6 sm:py-8 flex flex-col justify-center min-h-[calc(100vh-2rem)] animate-enter-spring">
      {/* Header with Title and Subtitle */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-pad bg-surface-raised border border-separator shadow-xs text-accent mb-1">
          <Touchpad className="w-9 h-9" />
        </div>
        <h1 className="text-large-title tracking-tight text-foreground">PocketPad</h1>
        <p className="text-body text-muted">Turn your phone into a trackpad.</p>
      </div>

      {/* Status Badge & Banner (if connecting, disconnected, or error) */}
      {status !== 'idle' && (
        <div className="mb-5">
          {status === 'connecting' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-warning/10 border border-warning/20 text-warning text-headline justify-center">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Connecting to companion...</span>
              <Badge variant="warning" className="ml-1">Connecting</Badge>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-md bg-danger/10 border border-danger/25 text-danger text-center">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <Badge variant="danger">Connection Error</Badge>
              </div>
              <p className="text-footnote font-medium text-danger">
                {errorReason === 'bad_token'
                  ? 'Wrong or expired code. Check the terminal for a new code.'
                  : errorReason === 'expired'
                  ? 'Token expired. Check the terminal for a new code.'
                  : 'Cannot find your laptop. Is PocketPad running, and are you on the same Wi-Fi network?'}
              </p>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-surface-raised border border-separator text-muted text-footnote text-center">
              <Badge variant="default">Connection Lost</Badge>
              <span>Cannot find your laptop. Is PocketPad running, and are you on the same Wi-Fi network?</span>
            </div>
          )}
        </div>
      )}

      {/* Browser feature support warning */}
      {typeof window !== 'undefined' && (!('WebSocket' in window) || !('PointerEvent' in window)) && (
        <div className="mb-5 p-3 rounded-md bg-danger/10 border border-danger/25 text-danger text-footnote text-center">
          Your browser does not support WebSockets or Pointer Events. Please use modern Safari, Chrome, or Firefox.
        </div>
      )}

      {/* 3 Numbered Steps Card */}
      <Card className="glass mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent/15 text-accent flex items-center justify-center text-footnote font-bold">
              1
            </div>
            <div className="pt-0.5">
              <span className="text-headline text-foreground block">
                Run PocketPad on your laptop.
              </span>
              <span className="text-footnote text-muted block mt-0.5">
                Start the companion CLI in your laptop terminal.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent/15 text-accent flex items-center justify-center text-footnote font-bold">
              2
            </div>
            <div className="pt-0.5">
              <span className="text-headline text-foreground block">
                Scan the QR code shown in the terminal with your camera.
              </span>
              <span className="text-footnote text-muted block mt-0.5">
                Or enter the 6-digit session code below.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent/15 text-accent flex items-center justify-center text-footnote font-bold">
              3
            </div>
            <div className="pt-0.5">
              <span className="text-headline text-foreground block">
                Start moving your finger.
              </span>
              <span className="text-footnote text-muted block mt-0.5">
                Instant low-latency cursor tracking and gestures.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6-Digit Code Input Card */}
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="text-center">
            <span className="text-headline block text-foreground">Pair with 6-Digit Code</span>
            <span className="text-footnote text-muted block mt-0.5">
              Enter the numeric code printed in your laptop terminal
            </span>
          </div>

          {/* 6 Auto-advancing boxes */}
          <div className="flex justify-between items-center gap-2 max-w-[340px] mx-auto">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={status === 'connecting'}
                className="w-12 h-13 min-h-[44px] text-center text-title font-mono font-bold rounded-md bg-surface-raised border border-separator text-foreground shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Connect button */}
          <Button
            variant="default"
            size="default"
            className="w-full gap-2"
            disabled={!isCodeComplete || status === 'connecting'}
            onClick={handleConnectClick}
          >
            {status === 'connecting' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Laptop className="w-5 h-5" />
                Connect
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Secondary Demo Mode Action */}
      <div className="space-y-3 text-center">
        <Button
          variant="secondary"
          size="default"
          className="w-full gap-2"
          onClick={handleDemoClick}
          disabled={status === 'connecting'}
        >
          <Sparkles className="w-4 h-4 text-accent" />
          Try demo mode
        </Button>
        <p className="text-caption text-muted">
          Demo mode uses an in-memory mock transport with zero network dependencies.
        </p>
      </div>
    </div>
  );
}
