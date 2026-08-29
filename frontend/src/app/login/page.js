'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { Activity, Lock, User, LogIn, AlertCircle, KeyRound } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password: password.trim() })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.error) {
          setErrorMsg(data.error);
        } else if (data.user) {
          // Save user session via AuthContext (sessionStorage) & redirect
          login(data.user);
        }
      })

      .catch(err => {
        setLoading(false);
        setErrorMsg('Connection failed. Ensure backend server is running.');
      });
  };

  const fillQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logoBadge}>
            <Activity size={30} />
          </div>
          <h1 className={styles.title}>Santoshpur Diagnostic Centre</h1>
          <p className={styles.subtitle}>Clinical Management & Web Portal Authorization</p>
        </div>

        {errorMsg && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username / Login ID</label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="Enter username (e.g. ADMIN)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type="password"
                className={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Authenticating...' : 'Sign In to System'}
          </button>
        </form>

        <div className={styles.quickAccounts}>
          <span className={styles.quickTitle}>Quick Demo Credentials</span>
          <div className={styles.accountPills}>
            <button type="button" className={styles.pill} onClick={() => fillQuickLogin('ADMIN', 'adminmoumita')}>
              👑 ADMIN
            </button>
            <button type="button" className={styles.pill} onClick={() => fillQuickLogin('RECEPTION', '123456')}>
              👩‍💼 RECEPTION
            </button>
            <button type="button" className={styles.pill} onClick={() => fillQuickLogin('LABTECH', '123456')}>
              🔬 LABTECH
            </button>
            <button type="button" className={styles.pill} onClick={() => fillQuickLogin('PATHOLOGIST', '123456')}>
              🩺 PATHOLOGIST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
