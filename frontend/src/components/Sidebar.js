'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHotkeys } from '../context/HotkeyContext';
import { useAuth } from '../context/AuthContext';
import {
  Database,
  ReceiptText,
  Settings,
  Printer,
  BarChart3,
  ChevronDown,
  Headphones,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import styles from '../app/layout.module.css';

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { shortcuts } = useHotkeys();
  const { user: activeUser, logout, isLoaded } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem('sdcp_sidebar_collapsed');
      if (storedCollapsed !== null) {
        setIsCollapsed(storedCollapsed === 'true');
      }
    } catch (e) {
      console.error("Error reading sidebar state:", e);
    }
  }, []);


  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sdcp_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [openMenus, setOpenMenus] = useState({
    master: pathname.startsWith('/master/'),
    transaction: pathname === '/booking' || pathname.startsWith('/transaction/'),
    setup: pathname.startsWith('/setup/') || pathname === '/shortcuts',
    print: false,
    query: pathname === '/pending-tests' || pathname.startsWith('/lab/')
  });

  const toggleMenu = (menu) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem('sdcp_sidebar_collapsed', 'false');
    }
    setOpenMenus((prev) => {
      const nextState = {
        master: false,
        transaction: false,
        setup: false,
        print: false,
        query: false
      };
      if (!prev[menu]) {
        nextState[menu] = true;
      }
      return nextState;
    });
  };

  const isAdmin = activeUser?.role_code === 'ADMIN';

  // Helper to check module permission
  const hasModule = (moduleKey) => {
    if (!isLoaded || !activeUser) return false;
    if (isAdmin) return true;

    const userModules = activeUser.modules || [];
    const modKeys = userModules.map(m => typeof m === 'object' ? m.module_key : m);
    return modKeys.includes(moduleKey);
  };

  const showMaster = isLoaded && (isAdmin || hasModule('masters'));
  const showTransaction = isLoaded && (isAdmin || hasModule('booking') || hasModule('invoice') || hasModule('archive_bills'));
  const showSetUp = isLoaded && (isAdmin || hasModule('setup'));
  const showPrint = isLoaded && (isAdmin || hasModule('reports'));
  const showQuery = isLoaded && (isAdmin || hasModule('reports') || hasModule('pending_tests') || hasModule('verification'));

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Sidebar Header Brand */}
      <Link href="/dashboard" className={styles.sidebarHeader} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className={styles.brandBadge}>
          <ShieldCheck size={20} color="#ffffff" />
        </div>
        {!isCollapsed && (
          <div className={styles.brandTextGroup}>
            <h1 className={styles.sidebarTitle}>SDCP Panel</h1>
            <p className={styles.sidebarSubtitle}>Clinical Management</p>
          </div>
        )}
      </Link>

      <nav className={styles.sidebarNav}>
        {/* Master */}
        {showMaster && (
          <div className={styles.navGroup}>
            <button
              className={`${styles.navHeader} ${openMenus.master || pathname.startsWith('/master/') ? styles.navHeaderActive : ''}`}
              onClick={() => toggleMenu('master')}
              title={isCollapsed ? "Master" : ""}
            >
              <div className={styles.navHeaderContent}>
                <Database size={19} className={styles.navIcon} />
                {!isCollapsed && <span>Master</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={15}
                  className={`${styles.chevronIcon} ${openMenus.master ? styles.chevronIconRotated : ''}`}
                />
              )}
            </button>
            
            {/* Inline Submenu (Expanded Mode) */}
            {!isCollapsed && (
              <div className={`${styles.submenu} ${openMenus.master ? styles.submenuOpen : ''}`}>
                <Link href="/master/doctors" className={`${styles.sublink} ${pathname === '/master/doctors' ? styles.sublinkActive : ''}`}>
                  Doctor List
                </Link>
                <Link href="/master/tests" className={`${styles.sublink} ${pathname === '/master/tests' ? styles.sublinkActive : ''}`}>
                  Test Rate List
                </Link>
                <Link href="/master/categories" className={`${styles.sublink} ${pathname === '/master/categories' ? styles.sublinkActive : ''}`}>
                  Category List
                </Link>
                <Link href="/master/patients" className={`${styles.sublink} ${pathname === '/master/patients' ? styles.sublinkActive : ''}`}>
                  Patient List
                </Link>
                <Link href="/master/departments" className={`${styles.sublink} ${pathname === '/master/departments' ? styles.sublinkActive : ''}`}>
                  Department Details
                </Link>
                <Link href="/master/subdepartments" className={`${styles.sublink} ${pathname === '/master/subdepartments' ? styles.sublinkActive : ''}`}>
                  Sub Department
                </Link>
                <Link href="/master/marketing-executives" className={`${styles.sublink} ${pathname === '/master/marketing-executives' ? styles.sublinkActive : ''}`}>
                  Marketing Executive
                </Link>
                <Link href="/master/collectors" className={`${styles.sublink} ${pathname === '/master/collectors' ? styles.sublinkActive : ''}`}>
                  Collector Details
                </Link>
              </div>
            )}

            {/* Flyout Submenu (Collapsed Mode Hover) */}
            {isCollapsed && (
              <div className={styles.flyoutMenu}>
                <div className={styles.flyoutTitle}>Master</div>
                <Link href="/master/doctors" className={styles.flyoutLink}>Doctor List</Link>
                <Link href="/master/tests" className={styles.flyoutLink}>Test Rate List</Link>
                <Link href="/master/categories" className={styles.flyoutLink}>Category List</Link>
                <Link href="/master/patients" className={styles.flyoutLink}>Patient List</Link>
                <Link href="/master/departments" className={styles.flyoutLink}>Department Details</Link>
                <Link href="/master/subdepartments" className={styles.flyoutLink}>Sub Department</Link>
                <Link href="/master/marketing-executives" className={styles.flyoutLink}>Marketing Executive</Link>
                <Link href="/master/collectors" className={styles.flyoutLink}>Collector Details</Link>
              </div>
            )}
          </div>
        )}

        {/* Transaction */}
        {showTransaction && (
          <div className={styles.navGroup}>
            <button
              className={`${styles.navHeader} ${openMenus.transaction || pathname.startsWith('/booking') || pathname.startsWith('/transaction/') ? styles.navHeaderActive : ''}`}
              onClick={() => toggleMenu('transaction')}
              title={isCollapsed ? "Transaction" : ""}
            >
              <div className={styles.navHeaderContent}>
                <ReceiptText size={19} className={styles.navIcon} />
                {!isCollapsed && <span>Transaction</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={15}
                  className={`${styles.chevronIcon} ${openMenus.transaction ? styles.chevronIconRotated : ''}`}
                />
              )}
            </button>
            {!isCollapsed && (
              <div className={`${styles.submenu} ${openMenus.transaction ? styles.submenuOpen : ''}`}>
                {(isAdmin || hasModule('booking')) && (
                  <Link href="/booking" className={`${styles.sublink} ${pathname === '/booking' ? styles.sublinkActive : ''}`}>
                    <span><u>B</u>ooking / Advance</span>
                  </Link>
                )}
                {(isAdmin || hasModule('archive_bills')) && (
                  <Link href="/transaction/archive-bills" className={`${styles.sublink} ${pathname === '/transaction/archive-bills' ? styles.sublinkActive : ''}`}>
                    <span>Archive Bills</span>
                    <span className={styles.legacyBadge}>Legacy</span>
                  </Link>
                )}
                {(isAdmin || hasModule('invoice')) && (
                  <Link href="/transaction/invoice" className={`${styles.sublink} ${pathname === '/transaction/invoice' ? styles.sublinkActive : ''}`}>
                    <span>Bill / Invoice</span>
                  </Link>
                )}
              </div>
            )}

            {/* Flyout Submenu (Collapsed Mode) */}
            {isCollapsed && (
              <div className={styles.flyoutMenu}>
                <div className={styles.flyoutTitle}>Transaction</div>
                {(isAdmin || hasModule('booking')) && <Link href="/booking" className={styles.flyoutLink}>Booking / Advance</Link>}
                {(isAdmin || hasModule('archive_bills')) && <Link href="/transaction/archive-bills" className={styles.flyoutLink}>Archive Bills</Link>}
                {(isAdmin || hasModule('invoice')) && <Link href="/transaction/invoice" className={styles.flyoutLink}>Bill / Invoice</Link>}
              </div>
            )}
          </div>
        )}

        {/* SetUp */}
        {showSetUp && (
          <div className={styles.navGroup}>
            <button
              className={`${styles.navHeader} ${openMenus.setup || pathname.startsWith('/setup/') || pathname === '/shortcuts' ? styles.navHeaderActive : ''}`}
              onClick={() => toggleMenu('setup')}
              title={isCollapsed ? "SetUp" : ""}
            >
              <div className={styles.navHeaderContent}>
                <Settings size={19} className={styles.navIcon} />
                {!isCollapsed && <span>SetUp</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={15}
                  className={`${styles.chevronIcon} ${openMenus.setup ? styles.chevronIconRotated : ''}`}
                />
              )}
            </button>
            {!isCollapsed && (
              <div className={`${styles.submenu} ${openMenus.setup ? styles.submenuOpen : ''}`}>
                <Link href="/setup/settings" className={`${styles.sublink} ${pathname === '/setup/settings' ? styles.sublinkActive : ''}`}>
                  <span>Lab & Report Settings</span>
                  <span className={styles.adminBadge}>Admin</span>
                </Link>
                <Link href="/setup/users" className={`${styles.sublink} ${pathname === '/setup/users' ? styles.sublinkActive : ''}`}>
                  <span>User Management</span>
                  <span className={styles.adminBadge}>Admin</span>
                </Link>
                <Link href="/setup/permissions" className={`${styles.sublink} ${pathname === '/setup/permissions' ? styles.sublinkActive : ''}`}>
                  <span>Permission Matrix</span>
                  <span className={styles.adminBadge}>Admin</span>
                </Link>
                <Link href="/setup/audit-trail" className={`${styles.sublink} ${pathname === '/setup/audit-trail' ? styles.sublinkActive : ''}`}>
                  <span>System Audit Trail</span>
                  <span className={styles.adminBadge}>Admin</span>
                </Link>
                <Link href="/shortcuts" className={`${styles.sublink} ${pathname === '/shortcuts' ? styles.sublinkActive : ''}`}>
                  <span>Configure Shortcuts</span>
                  <span className={styles.adminBadge}>Admin</span>
                </Link>
              </div>
            )}

            {/* Flyout Submenu (Collapsed Mode) */}
            {isCollapsed && (
              <div className={styles.flyoutMenu}>
                <div className={styles.flyoutTitle}>SetUp</div>
                <Link href="/setup/settings" className={styles.flyoutLink}>Lab & Report Settings</Link>
                <Link href="/setup/users" className={styles.flyoutLink}>User Management</Link>
                <Link href="/setup/permissions" className={styles.flyoutLink}>Permission Matrix</Link>
                <Link href="/setup/audit-trail" className={styles.flyoutLink}>System Audit Trail</Link>
                <Link href="/shortcuts" className={styles.flyoutLink}>Configure Shortcuts</Link>
              </div>
            )}
          </div>
        )}

        {/* Report Print */}
        {showPrint && (
          <div className={styles.navGroup}>
            <button
              className={`${styles.navHeader} ${openMenus.print ? styles.navHeaderActive : ''}`}
              onClick={() => toggleMenu('print')}
              title={isCollapsed ? "Report Print" : ""}
            >
              <div className={styles.navHeaderContent}>
                <Printer size={19} className={styles.navIcon} />
                {!isCollapsed && <span>Report Print</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={15}
                  className={`${styles.chevronIcon} ${openMenus.print ? styles.chevronIconRotated : ''}`}
                />
              )}
            </button>
            {!isCollapsed && (
              <div className={`${styles.submenu} ${openMenus.print ? styles.submenuOpen : ''}`}>
                <a className={styles.sublink} href="#" onClick={e => e.preventDefault()}>
                  <span>Doctor List</span>
                  <span className={styles.legacyBadge}>Coming Soon</span>
                </a>
                <a className={styles.sublink} href="#" onClick={e => e.preventDefault()}>
                  <span>Sale - Before Bill</span>
                  <span className={styles.legacyBadge}>Coming Soon</span>
                </a>
                <a className={styles.sublink} href="#" onClick={e => e.preventDefault()}>
                  <span>Sale - After Bill</span>
                  <span className={styles.legacyBadge}>Coming Soon</span>
                </a>
                <a className={styles.sublink} href="#" onClick={e => e.preventDefault()}>
                  <span>Collector Register</span>
                  <span className={styles.legacyBadge}>Coming Soon</span>
                </a>
              </div>
            )}

            {/* Flyout Submenu (Collapsed Mode) */}
            {isCollapsed && (
              <div className={styles.flyoutMenu}>
                <div className={styles.flyoutTitle}>Report Print</div>
                <a className={styles.flyoutLink} href="#" onClick={e => e.preventDefault()}>Doctor List (Soon)</a>
                <a className={styles.flyoutLink} href="#" onClick={e => e.preventDefault()}>Sale - Before Bill (Soon)</a>
                <a className={styles.flyoutLink} href="#" onClick={e => e.preventDefault()}>Sale - After Bill (Soon)</a>
                <a className={styles.flyoutLink} href="#" onClick={e => e.preventDefault()}>Collector Register (Soon)</a>
              </div>
            )}
          </div>
        )}

        {/* Report/Query */}
        {showQuery && (
          <div className={styles.navGroup}>
            <button
              className={`${styles.navHeader} ${openMenus.query || pathname.startsWith('/pending-tests') || pathname.startsWith('/lab/') ? styles.navHeaderActive : ''}`}
              onClick={() => toggleMenu('query')}
              title={isCollapsed ? "Report/Query" : ""}
            >
              <div className={styles.navHeaderContent}>
                <BarChart3 size={19} className={styles.navIcon} />
                {!isCollapsed && <span>Report/Query</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={15}
                  className={`${styles.chevronIcon} ${openMenus.query ? styles.chevronIconRotated : ''}`}
                />
              )}
            </button>
            {!isCollapsed && (
              <div className={`${styles.submenu} ${openMenus.query ? styles.submenuOpen : ''}`}>
                {(isAdmin || hasModule('pending_tests') || hasModule('verification')) && (
                  <>
                    <Link href="/lab/sample-tracking" className={`${styles.sublink} ${pathname === '/lab/sample-tracking' ? styles.sublinkActive : ''}`}>
                      <span>Sample Tracking</span>
                    </Link>
                    <Link href="/lab/result-entry" className={`${styles.sublink} ${pathname === '/lab/result-entry' ? styles.sublinkActive : ''}`}>
                      <span>Lab Result Entry</span>
                    </Link>
                    <Link href="/lab/verification" className={`${styles.sublink} ${pathname === '/lab/verification' ? styles.sublinkActive : ''}`}>
                      <span>Pathology Verification</span>
                    </Link>
                    <Link href="/pending-tests" className={`${styles.sublink} ${pathname === '/pending-tests' ? styles.sublinkActive : ''}`}>
                      <span>Pending <u>T</u>est Register</span>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Flyout Submenu (Collapsed Mode) */}
            {isCollapsed && (
              <div className={styles.flyoutMenu}>
                <div className={styles.flyoutTitle}>Report/Query</div>
                {(isAdmin || hasModule('pending_tests') || hasModule('verification')) && (
                  <>
                    <Link href="/lab/sample-tracking" className={styles.flyoutLink}>Sample Tracking</Link>
                    <Link href="/lab/result-entry" className={styles.flyoutLink}>Lab Result Entry</Link>
                    <Link href="/lab/verification" className={styles.flyoutLink}>Pathology Verification</Link>
                    <Link href="/pending-tests" className={styles.flyoutLink}>Pending Test Register</Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Sidebar Footer with Collapse Toggle */}
      <div className={styles.sidebarFooter}>
        <button
          onClick={toggleCollapse}
          className={styles.collapseToggleBtn}
          title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span>Hide Menu</span>}
        </button>

        {!isCollapsed && (
          <>
            <a className={styles.footerLink} href="#">
              <Headphones size={15} />
              <span>Support</span>
            </a>
            <a className={styles.footerLink} href="#">
              <HelpCircle size={15} />
              <span>Help</span>
            </a>
          </>
        )}
        
        {isLoaded && activeUser && (
          <div className={styles.userCard} title={isCollapsed ? `${activeUser.full_name || activeUser.username} (${activeUser.role_code})` : ""}>
            <div className={styles.userAvatar}>
              {(activeUser.username || 'U')[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{activeUser.full_name || activeUser.username}</span>
                <span className={styles.userRole}>{activeUser.role_name || activeUser.role_code}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className={styles.sidebarLogoffBtn}
          title="Log Off Session"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Log Off</span>}
        </button>
      </div>
    </aside>
  );
}
