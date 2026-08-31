import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, Menu } from 'lucide-react';
import styles from '../app/layout.module.css';

import { fetchLabSettings } from '../lib/labSettings';
import { useAuth } from '@/context/AuthContext';
import API_BASE from '@/lib/apiConfig';

export default function Header({ toggleSidebar }) {
  const router = useRouter();
  const { user: activeUser, logout } = useAuth();
  const [labName, setLabName] = useState('Santoshpur Diagnostic Centre');

  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchLabSettings().then(cfg => {
      if (cfg && cfg.lab_name) setLabName(cfg.lab_name);
    });
  }, []);

  const handleLogOff = () => {
    logout();
  };

  // Debounced live search fetcher
  useEffect(() => {
    const q = headerSearch.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/booking/live-search?query=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : []);
          setIsSearchOpen(true);
          setActiveSearchIndex(0);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [headerSearch]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item) => {
    setIsSearchOpen(false);
    setHeaderSearch('');
    const targetSerial = item.serialNo || (item.bookingNo ? item.bookingNo.split('/').pop() : '');
    router.push(`/booking?loadSerial=${encodeURIComponent(targetSerial)}&t=${Date.now()}`);
  };

  const handleHeaderKeyDown = (e) => {
    if (isSearchOpen && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSearchIndex(prev => Math.min(searchResults.length - 1, prev + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSearchIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) {
        e.preventDefault();
        const selected = searchResults[activeSearchIndex];
        if (selected) {
          handleSelectResult(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSearchOpen(false);
        return;
      }
    } else if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) {
      e.preventDefault();
      const q = headerSearch.trim();
      if (!q) return;
      router.push(`/booking?search=${encodeURIComponent(q)}&t=${Date.now()}`);
      setHeaderSearch('');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggleBtn} onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <span className={styles.headerTitle}>{labName}</span>
        <div ref={searchContainerRef} className={styles.searchBar} style={{ position: 'relative' }}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search patient or report ID..."
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            onKeyDown={handleHeaderKeyDown}
            onFocus={() => { if (searchResults.length > 0) setIsSearchOpen(true); }}
          />

          {isSearchOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              minWidth: '380px',
              backgroundColor: 'var(--surface-container-lowest, #ffffff)',
              border: '1px solid var(--outline-variant, #e2e8f0)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
              zIndex: 99999,
              overflow: 'hidden',
              maxHeight: '420px',
              overflowY: 'auto'
            }}>
              {isSearching && searchResults.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--outline)', textAlign: 'center' }}>
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--outline)', textAlign: 'center' }}>
                  No booking records found
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const isActive = idx === activeSearchIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                        borderLeft: isActive ? '4px solid var(--primary, #2563eb)' : '4px solid transparent',
                        borderBottom: '1px solid var(--outline-variant, #f1f5f9)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '12.5px', color: 'var(--primary, #2563eb)' }}>
                            {item.bookingNo}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>
                            {item.dateFormatted}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface, #0f172a)', marginTop: '2px' }}>
                          {item.patientPrefix} {item.patientName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--outline, #64748b)' }}>
                          {item.age} • {item.sex} {item.mobile ? `• Ph: ${item.mobile}` : ''}
                        </div>
                      </div>
                      <div>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          backgroundColor: item.paymentStatus === 'FULL' ? 'rgba(46, 125, 50, 0.12)' : (item.paymentStatus === 'PARTIAL' ? 'rgba(237, 108, 2, 0.12)' : 'rgba(179, 38, 30, 0.12)'),
                          color: item.paymentStatus === 'FULL' ? '#2e7d32' : (item.paymentStatus === 'PARTIAL' ? '#ed6c02' : '#b3261e'),
                          border: item.paymentStatus === 'FULL' ? '1px solid rgba(46, 125, 50, 0.3)' : (item.paymentStatus === 'PARTIAL' ? '1px solid rgba(237, 108, 2, 0.3)' : '1px solid rgba(179, 38, 30, 0.3)')
                        }}>
                          {item.paymentStatus}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.headerRight}>
        {activeUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', flexShrink: 0 }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800', fontSize: '11px', flexShrink: 0 }}>
              {(activeUser.username || 'U')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', lineHeight: '1.2' }}>{activeUser.username}</span>
              <span style={{ fontSize: '9.5px', color: 'var(--outline)', fontWeight: '600', lineHeight: '1.2' }}>{activeUser.role_name || activeUser.role_code}</span>
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
