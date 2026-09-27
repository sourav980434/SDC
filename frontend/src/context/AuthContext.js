'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAlert } from '@/components/AlertDialog';
import { installApiUserHeaders } from '@/lib/apiClient';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  isLoaded: false,
});

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const SESSION_KEY = 'sdcp_user_session';

/**
 * The session lives in sessionStorage, which is per browser tab - a link opened in a NEW tab
 * (report review, PDF) would land on /login. So the session is mirrored in localStorage and
 * copied back on the first import in a new tab, i.e. before any page or permission hook reads it.
 * Signing out clears both, and other tabs follow through the `storage` event.
 */
if (typeof window !== 'undefined') {
  // Every API call carries the signed-in user, so the backend can log who did what
  installApiUserHeaders();
  try {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const shared = localStorage.getItem(SESSION_KEY);
      if (shared) sessionStorage.setItem(SESSION_KEY, shared);
    }
  } catch (e) {
    // private mode / storage blocked - the user simply logs in again
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const inactivityTimerRef = useRef(null);
  const { showAlert } = useAlert();

  // Initialize session from sessionStorage (already filled from localStorage above in a new tab)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
        // Sessions started before this tab-sharing existed are mirrored now
        if (!localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, stored);
      }
    } catch (e) {
      console.error('Failed to parse user session:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sign out everywhere when another tab signs out
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SESSION_KEY) return;
      if (!e.newValue) {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Login handler
  const login = (userData) => {
    try {
      const payload = JSON.stringify(userData);
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.setItem(SESSION_KEY, payload);   // so a link opened in a new tab stays signed in
      setUser(userData);
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  };

  // Logout handler
  const logout = (reason = '') => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      if (reason) {
        showAlert({ type: 'warning', title: 'Signed out', message: reason });
      }
      router.push('/login');
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  };

  // Route Guard Logic
  useEffect(() => {
    if (!isLoaded) return;

    const isPublicRoute = pathname === '/login';
    // Patients' report download page (QR code on the report) never needs a login
    if (pathname && pathname.startsWith('/r/')) return;

    if (!user && !isPublicRoute) {
      // Unauthenticated user trying to access protected route -> redirect to /login
      router.replace('/login');
    } else if (user && isPublicRoute) {
      // Authenticated user trying to access /login -> auto-skip to /dashboard
      router.replace('/dashboard');
    }
  }, [user, pathname, isLoaded, router]);

  // 15-Minute Inactivity Auto Logout Timer
  useEffect(() => {
    if (!user) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        logout('Session expired due to 15 minutes of inactivity. Please log in again.');
      }, INACTIVITY_LIMIT_MS);
    };

    // Initial timer setup
    resetInactivityTimer();

    // Event listeners to detect activity
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer));

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
