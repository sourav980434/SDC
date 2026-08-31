'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { Lock, User, LogIn, AlertCircle, Eye, EyeOff, HeartPulse } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
import { useAuth } from '@/context/AuthContext';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [labConfig, setLabConfig] = useState(DEFAULT_LAB_CONFIG);

  useEffect(() => {
    fetchLabSettings().then(cfg => {
      if (cfg) setLabConfig(cfg);
    });
  }, []);

  const handleKeyDownPassword = (e) => {
    if (e.getModifierState) {
      setIsCapsLock(e.getModifierState('CapsLock'));
    }
  };

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
          login(data.user);
        }
      })
      .catch(() => {
        setLoading(false);
        setErrorMsg('Connection failed. Ensure backend server is running.');
      });
  };

  const fillQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  // Determine Background & Theme - Defaults to Santoshpur Building Photo with 80% Overlay
  const bgImage = labConfig.login_bg_image_url || '/santoshpur_building.jpg';
  const logoAnim = labConfig.login_logo_animation || 'pulse';

  const wrapperStyle = {
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.85)), url('${bgImage}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className={styles.loginWrapper} style={wrapperStyle}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={`${styles.logoBadge} ${logoAnim === 'spin' ? styles.animSpin : (logoAnim === 'float' ? styles.animFloat : styles.animPulse)}`}>
            <HeartPulse size={32} />
          </div>
          <h1 className={styles.title}>
            {labConfig.lab_name || 'Santoshpur Diagnostic Centre'}
          </h1>
          <p className={styles.subtitle}>
            Clinical LIMS & Web Authorization Portal
          </p>
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
            <div className={styles.labelRow}>
              <label className={styles.label}>Password</label>
              {isCapsLock && (
                <span className={styles.capsBadge}>⚠️ Caps Lock is ON</span>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDownPassword}
                onKeyUp={handleKeyDownPassword}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className={styles.rememberRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember session on this browser</span>
          </label>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Authenticating Credentials...' : 'Sign In to System'}
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
