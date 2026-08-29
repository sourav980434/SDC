'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  isLoaded: false,
});

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const inactivityTimerRef = useRef(null);

  // Initialize session from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('sdcp_user_session');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse user session:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Login handler
  const login = (userData) => {
    try {
      sessionStorage.setItem('sdcp_user_session', JSON.stringify(userData));
      setUser(userData);
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  };

  // Logout handler
  const logout = (reason = '') => {
    try {
      sessionStorage.removeItem('sdcp_user_session');
      setUser(null);
      if (reason) {
        alert(reason);
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
