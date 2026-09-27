import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Menu, ChevronDown, Headphones, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, CheckCheck } from 'lucide-react';
import styles from '../app/layout.module.css';

import { fetchLabSettings } from '../lib/labSettings';
import { useAuth } from '@/context/AuthContext';
import API_BASE from '@/lib/apiConfig';

export default function Header({ toggleSidebar, isCollapsed = false, onToggleCollapse = () => {} }) {
  const router = useRouter();
  const { user: activeUser, logout } = useAuth();
  const [labName, setLabName] = useState('Santoshpur Diagnostic Centre');

  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

  // Notifications (bell)
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef(null);

  const loadNotifications = React.useCallback(() => {
    if (!activeUser) return;
    fetch(`${API_BASE}/api/notifications?unread=1&per_page=8`)
      .then(res => res.json())
      .then(data => {
        setNotifications(data.data || []);
        setUnread(data.unread || 0);
      })
      .catch(() => {});
  }, [activeUser]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 60000);          // check once a minute
    const onChanged = () => loadNotifications();                  // the Notifications page tells us
    window.addEventListener('sdcp-notifications-changed', onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener('sdcp-notifications-changed', onChanged);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isBellOpen) return;
    const onDown = (e) => { if (!bellRef.current?.contains(e.target)) setIsBellOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setIsBellOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isBellOpen]);

  const markRead = async (id) => {
    await fetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : {}),
    }).catch(() => {});
    loadNotifications();
  };

  const openNotification = async (n) => {
    setIsBellOpen(false);
    await markRead(n.id);                 // read notifications leave the bell
    if (n.link) router.push(n.link);
  };

  // Profile menu (user card, Support, Help and Log Off live here)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setIsProfileOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setIsProfileOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isProfileOpen]);

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
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
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
        <div className={styles.headerLeft}>
          <div className={styles.bellWrap} ref={bellRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setIsBellOpen(v => !v)}
              title={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
            >
              <Bell size={20} />
              {unread > 0 && <span className={styles.bellCount}>{unread > 99 ? '99+' : unread}</span>}
            </button>

            {isBellOpen && (
              <div className={styles.bellMenu}>
                <div className={styles.bellHead}>
                  <span>Notifications{unread ? ` (${unread} unread)` : ''}</span>
                  {unread > 0 && (
                    <button type="button" onClick={() => markRead(null)} title="Mark all as read">
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className={styles.bellEmpty}>Nothing new. Everything is read.</div>
                ) : (
                  notifications.map(n => (
                    <button key={n.id} type="button" className={styles.bellItem} onClick={() => openNotification(n)}>
                      <span className={styles.bellItemTitle}>{n.title}</span>
                      <span className={styles.bellItemMsg}>{n.message}</span>
                      <span className={styles.bellItemMeta}>{n.from ? `${n.from} · ` : ''}{n.created_at}</span>
                    </button>
                  ))
                )}

                <button
                  type="button"
                  className={styles.bellAll}
                  onClick={() => { setIsBellOpen(false); router.push('/notifications'); }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
          {/* Settings icon has no page behind it yet
          <button className={styles.iconBtn}>
            <Settings size={20} />
          </button>
          */}
        </div>
        {activeUser && (
          <div className={styles.profileWrap} ref={profileRef}>
            <button
              type="button"
              className={styles.profileBtn}
              onClick={() => setIsProfileOpen(v => !v)}
              title="Account menu"
              aria-expanded={isProfileOpen}
            >
              <div className={styles.profileAvatar}>
                {(activeUser.username || 'U')[0].toUpperCase()}
              </div>
              <div className={styles.profileText}>
                <span className={styles.profileName}>{activeUser.username}</span>
                <span className={styles.profileRole}>{activeUser.role_name || activeUser.role_code}</span>
              </div>
              <ChevronDown size={14} className={isProfileOpen ? styles.profileChevronOpen : styles.profileChevron} />
            </button>

            {isProfileOpen && (
              <div className={styles.profileMenu}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileAvatarLarge}>
                    {(activeUser.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.profileHeaderName}>{activeUser.full_name || activeUser.username}</div>
                    <div className={styles.profileHeaderRole}>{activeUser.role_name || activeUser.role_code}</div>
                  </div>
                </div>

                <a className={styles.profileItem} href="#" onClick={() => setIsProfileOpen(false)}>
                  <Headphones size={16} /> Support
                </a>
                <a className={styles.profileItem} href="#" onClick={() => setIsProfileOpen(false)}>
                  <HelpCircle size={16} /> Help
                </a>

                <button type="button" className={styles.profileLogout} onClick={() => { setIsProfileOpen(false); logout(); }}>
                  <LogOut size={16} /> Log Off
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
