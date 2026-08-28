import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, Menu, LogOut, User } from 'lucide-react';
import styles from '../app/layout.module.css';

import { fetchLabSettings } from '../lib/labSettings';

export default function Header({ toggleSidebar }) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState(null);
  const [labName, setLabName] = useState('Santoshpur Diagnostic Centre');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading user session:", e);
    }
    fetchLabSettings().then(cfg => {
      if (cfg && cfg.lab_name) setLabName(cfg.lab_name);
    });
  }, []);

  const handleLogOff = () => {
    try {
      localStorage.removeItem('sdcp_user_session');
    } catch (e) {}
    router.push('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggleBtn} onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <span className={styles.headerTitle}>{labName}</span>
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search patient or report ID..."
            type="text"
          />
        </div>
      </div>
      
      <div className={styles.headerRight}>
        {activeUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800', fontSize: '12px' }}>
              {(activeUser.username || 'U')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>{activeUser.username}</span>
              <span style={{ fontSize: '10px', color: 'var(--outline)', fontWeight: '600' }}>{activeUser.role_name || activeUser.role_code}</span>
            </div>
          </div>
        )}

        <div className={styles.headerLeft}>
          <button className={styles.iconBtn}>
            <Bell size={20} />
            <span className={styles.iconBadge}></span>
          </button>
          <button className={styles.iconBtn}>
            <Settings size={20} />
          </button>
        </div>
        
        <div className={styles.divider}></div>
        
        <button className={styles.logoffBtn} onClick={handleLogOff}>Log Off</button>
        <button className={styles.exitBtn} onClick={handleLogOff}>Exit</button>
      </div>
    </header>
  );
}
