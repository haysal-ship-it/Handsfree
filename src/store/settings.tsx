/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface PocketPadSettings {
  pointerSpeed: number; // default 1.5
  scrollSpeed: number; // default 1
  naturalScroll: boolean; // default true
  tapToClick: boolean; // default true
  haptics: boolean; // default true
  longPressRightClick: boolean; // default false
  leftHanded: boolean; // default false
  showClickButtons: boolean; // default true
}

const DEFAULT_SETTINGS: PocketPadSettings = {
  pointerSpeed: 1.5,
  scrollSpeed: 1.0,
  naturalScroll: true,
  tapToClick: true,
  haptics: true,
  longPressRightClick: false,
  leftHanded: false,
  showClickButtons: true,
};

const SETTINGS_STORAGE_KEY = 'pocketpad.settings';

interface SettingsContextValue {
  settings: PocketPadSettings;
  updateSettings: (partial: Partial<PocketPadSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<PocketPadSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // LocalStorage access / JSON parse fallback
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((partial: Partial<PocketPadSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // LocalStorage write fallback
      }
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // LocalStorage write fallback
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
