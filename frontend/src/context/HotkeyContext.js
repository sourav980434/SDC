'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { flashShortcut } from '../components/ShortcutLabel';

const HotkeyContext = createContext();

export const DEFAULT_SHORTCUTS = {
  // Locked navigation hotkeys
  GOTO_DASHBOARD: { key: 'Alt+d', label: 'Go to Dashboard', locked: true },
  GOTO_BOOKING: { key: 'Alt+b', label: 'Go to Booking', locked: true },
  GOTO_PENDING: { key: 'Alt+t', label: 'Go to Pending Register', locked: true },
  CLOSE_MODAL: { key: 'Escape', label: 'Close Modal', locked: true },

  // Locked sidebar menu hotkeys: open the menu, then press the item's underlined letter (components/Sidebar.js)
  MENU_MASTER: { key: 'Alt+m', label: 'Open Master Menu', locked: true, description: 'Opens the Master menu in the sidebar; then press the underlined letter of a page (e.g. D = Doctor List).' },
  MENU_TRANSACTION: { key: 'Alt+r', label: 'Open Transaction Menu', locked: true, description: 'Opens the Transaction menu in the sidebar; then press the underlined letter (B = Booking, A = Archive Bills, I = Bill / Invoice).' },
  MENU_SETUP: { key: 'Alt+u', label: 'Open SetUp Menu', locked: true, description: 'Opens the SetUp menu in the sidebar; then press the underlined letter of a page.' },
  MENU_PRINT: { key: 'Alt+o', label: 'Open Report Print Menu', locked: true, description: 'Opens the Report Print menu in the sidebar (reports coming soon).' },
  MENU_QUERY: { key: 'Alt+q', label: 'Open Report/Query Menu', locked: true, description: 'Opens the Report/Query menu in the sidebar; then press the underlined letter (S, R, V, T).' },

  // Customizable action hotkeys
  FOCUS_TEST_SEARCH: { key: 'Alt+f', label: 'Focus Test Search', locked: false },
  SAVE_VOUCHER: { key: 'Alt+s', label: 'Save Booking', locked: false },
  PRINT_INVOICE: { key: 'Alt+p', label: 'Print Receipt', locked: false },
  CLEAR_FORM: { key: 'Alt+c', label: 'Clear Form', locked: false },
  NEW_BOOKING: { key: 'Alt+n', label: 'New Booking', locked: false },
  OPEN_BOOKING_LIST: { key: 'Alt+l', label: 'Open Booking List', locked: false },
};

export function HotkeyProvider({ children }) {
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);

  // Load customized shortcuts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sdcp_shortcuts');
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...DEFAULT_SHORTCUTS };
        Object.keys(parsed).forEach((action) => {
          if (merged[action] && !merged[action].locked) {
            // Copy the entry so DEFAULT_SHORTCUTS itself is not mutated (keeps "Reset to defaults" correct)
            merged[action] = { ...merged[action], key: parsed[action] };
          }
        });
        setShortcuts(merged);
      }
    } catch (e) {
      console.error('Failed to load shortcuts from localStorage:', e);
    }
  }, []);

  const saveShortcut = useCallback((action, newKey) => {
    if (shortcuts[action]?.locked) return false;
    
    // Check if newKey is already used by another shortcut
    const duplicate = Object.keys(shortcuts).find(
      (act) => shortcuts[act].key.toLowerCase() === newKey.toLowerCase() && act !== action
    );
    if (duplicate) {
      return { success: false, error: `Shortcut "${newKey}" is already assigned to "${shortcuts[duplicate].label}"` };
    }

    const updated = {
      ...shortcuts,
      [action]: { ...shortcuts[action], key: newKey },
    };
    setShortcuts(updated);

    // Save only customizable shortcuts
    const toSave = {};
    Object.keys(updated).forEach((act) => {
      if (!updated[act].locked) {
        toSave[act] = updated[act].key;
      }
    });
    localStorage.setItem('sdcp_shortcuts', JSON.stringify(toSave));
    return { success: true };
  }, [shortcuts]);

  const resetToDefaults = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem('sdcp_shortcuts');
  }, []);

  // Standard keypress parser helper
  const parseKeyEvent = useCallback((e) => {
    if (!e || !e.key || typeof e.key !== 'string') return '';
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') {
      if (e.key === ' ') {
        parts.push('Space');
      } else if (e.key.length === 1) {
        parts.push(e.key.toLowerCase());
      } else {
        parts.push(e.key);
      }
    }
    return parts.join('+');
  }, []);

  // Global keydown listener for navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e || !e.key) return;
      const combo = parseKeyEvent(e);
      if (!combo) return;

      // We handle global navigation hotkeys here
      if (combo === shortcuts.GOTO_DASHBOARD.key) {
        e.preventDefault();
        flashShortcut('GOTO_DASHBOARD');
        router.push('/dashboard');
      } else if (combo === shortcuts.GOTO_BOOKING.key) {
        e.preventDefault();
        flashShortcut('GOTO_BOOKING');
        router.push('/booking');
      } else if (combo === shortcuts.GOTO_PENDING.key) {
        e.preventDefault();
        flashShortcut('GOTO_PENDING');
        router.push('/pending-tests');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, router, parseKeyEvent]);

  const value = useMemo(() => ({
    shortcuts,
    saveShortcut,
    resetToDefaults,
    parseKeyEvent
  }), [shortcuts, saveShortcut, resetToDefaults, parseKeyEvent]);

  return (
    <HotkeyContext.Provider value={value}>
      {children}
    </HotkeyContext.Provider>
  );
}

export function useHotkeys() {
  const context = useContext(HotkeyContext);
  if (!context) {
    throw new Error('useHotkeys must be used within a HotkeyProvider');
  }
  return context;
}
