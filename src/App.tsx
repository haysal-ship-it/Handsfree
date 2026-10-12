/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ConnectionProvider, useConnection } from './store/connection';
import { SettingsProvider } from './store/settings';
import { PairScreen } from './screens/Pair';
import { PadScreen } from './screens/PadScreen';
import { Button } from './components/ui/button';
import { Palette } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

// Code splitting: lazy load Settings, Presenter, and DesignSystemGallery
const SettingsScreen = lazy(() =>
  import('./screens/Settings').then((m) => ({ default: m.SettingsScreen }))
);

const PresenterScreen = lazy(() =>
  import('./screens/Presenter').then((m) => ({ default: m.PresenterScreen }))
);

const DesignSystemGallery = lazy(() =>
  import('./components/gallery/DesignSystemGallery').then((m) => ({
    default: m.DesignSystemGallery,
  }))
);

function AppContent() {
  const { status } = useConnection();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPresenterOpen, setIsPresenterOpen] = useState(false);

  // Allow ?gallery only in dev mode or with ?dev=1 in URL
  const isDevAllowed =
    typeof window !== 'undefined' &&
    (import.meta.env.DEV || window.location.search.includes('dev=1'));

  const [isGallery, setIsGallery] = useState(() => {
    if (typeof window !== 'undefined') {
      const dev = import.meta.env.DEV || window.location.search.includes('dev=1');
      return dev && window.location.search.includes('gallery');
    }
    return false;
  });

  useEffect(() => {
    const handlePopState = () => {
      const dev = import.meta.env.DEV || window.location.search.includes('dev=1');
      setIsGallery(dev && window.location.search.includes('gallery'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openGallery = () => {
    window.history.pushState({}, '', '?dev=1&gallery');
    setIsGallery(true);
  };

  const closeGallery = () => {
    window.history.pushState({}, '', window.location.pathname);
    setIsGallery(false);
  };

  if (isGallery && isDevAllowed) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed top-3 right-3 z-50">
          <Button
            size="sm"
            variant="secondary"
            onClick={closeGallery}
            className="shadow-md glass text-footnote"
            aria-label="Exit Gallery"
          >
            Exit Gallery
          </Button>
        </div>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <DesignSystemGallery />
        </Suspense>
      </main>
    );
  }

  if (status !== 'connected') {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col justify-between pt-safe pb-safe">
        <PairScreen />
        {isDevAllowed && (
          <div className="pb-4 text-center">
            <button
              onClick={openGallery}
              className="text-footnote text-muted hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer py-2 px-3"
              aria-label="Open Design System Gallery"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Design System Gallery (?gallery)</span>
            </button>
          </div>
        )}
      </main>
    );
  }

  // Connected state: Render main PadScreen + lazy slide-in SettingsScreen / PresenterScreen
  return (
    <main className="relative h-screen w-screen bg-background text-foreground overflow-hidden select-none">
      <PadScreen
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPresenter={() => setIsPresenterOpen(true)}
      />

      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsScreen onBack={() => setIsSettingsOpen(false)} />
        )}
        {isPresenterOpen && (
          <PresenterScreen onClose={() => setIsPresenterOpen(false)} />
        )}
      </Suspense>
    </main>
  );
}

export default function App() {
  useTheme();

  return (
    <SettingsProvider>
      <ConnectionProvider>
        <AppContent />
      </ConnectionProvider>
    </SettingsProvider>
  );
}
