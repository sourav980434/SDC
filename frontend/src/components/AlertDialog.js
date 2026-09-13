'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import styles from './AlertDialog.module.css';

/**
 * Modern replacement for window.alert()
 *
 * Usage:
 *   const { showAlert } = useAlert();
 *   showAlert({ type: 'warning', title: 'No test selected', message: 'Please select at least one test.' })
 *     .then(() => inputRef.current?.focus());
 *
 * - type: 'warning' | 'error' | 'success' | 'info' (default 'info')
 * - Returns a Promise that resolves when the dialog is dismissed.
 * - Enter / Esc / Space dismiss it; keystrokes never leak to page hotkeys while open.
 * - Focus returns to the previously focused element on close.
 */

const VARIANTS = {
  warning: { Icon: TriangleAlert, title: 'Attention required' },
  error: { Icon: CircleX, title: 'Something went wrong' },
  success: { Icon: CircleCheck, title: 'Success' },
  info: { Icon: Info, title: 'Notice' },
};

const AlertContext = createContext({
  // Fallback when used outside the provider
  showAlert: (opts) => {
    window.alert(typeof opts === 'string' ? opts : opts?.message);
    return Promise.resolve();
  },
});

export function AlertProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [mounted, setMounted] = useState(false);
  const okRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const current = queue[0];

  useEffect(() => setMounted(true), []);

  const showAlert = useCallback((opts) => new Promise((resolve) => {
    const options = typeof opts === 'string' ? { message: opts } : (opts || {});
    setQueue(q => [...q, {
      id: `${Date.now()}-${Math.random()}`,
      type: 'info',
      okText: 'OK',
      ...options,
      resolve,
    }]);
  }), []);

  const close = useCallback(() => {
    if (!current) return;
    setQueue(q => q.slice(1));

    // Restore focus once the last queued alert closes, then let the caller's .then() override it
    if (queue.length <= 1) {
      const el = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (el && document.contains(el) && typeof el.focus === 'function') el.focus();
    }
    current.resolve();
  }, [current, queue.length]);

  // Remember focus on open and move it to the OK button
  useEffect(() => {
    if (!current) return;
    if (!restoreFocusRef.current) restoreFocusRef.current = document.activeElement;
    const t = setTimeout(() => okRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [current]);

  // Capture-phase key handling so page-level Enter/Alt hotkeys don't fire behind the dialog
  useEffect(() => {
    if (!current) return;

    const handleKeyDown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) close();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        okRef.current?.focus();
      } else if (e.altKey || e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [current, close]);

  const variant = VARIANTS[current?.type] || VARIANTS.info;
  const Icon = variant.Icon;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {mounted && current && createPortal(
        <div
          className={styles.overlay}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            key={current.id}
            className={`${styles.dialog} ${styles[current.type] || ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-alert-title"
            aria-describedby="app-alert-message"
          >
            <div className={styles.iconWrap}>
              <Icon size={24} strokeWidth={2.2} />
            </div>

            <div className={styles.body}>
              <h2 id="app-alert-title" className={styles.title}>{current.title || variant.title}</h2>
              <p id="app-alert-message" className={styles.message}>{current.message}</p>
            </div>

            <div className={styles.actions}>
              <span className={styles.hint}>
                Press <kbd>Enter</kbd> to continue
              </span>
              <button ref={okRef} type="button" className={styles.okBtn} onClick={close}>
                {current.okText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
