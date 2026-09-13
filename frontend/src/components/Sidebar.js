'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useHotkeys } from '../context/HotkeyContext';
import { ShortcutLabel, formatShortcut, flashShortcut } from './ShortcutLabel';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
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

/**
 * Sidebar menu definition (single source for the expanded menu and the collapsed flyouts).
 *
 * Keyboard: press a group shortcut (e.g. Alt+M) to open that menu, then the item's underlined letter.
 * - shortcutId:     DEFAULT_SHORTCUTS action that opens the group (context/HotkeyContext.js)
 * - isActivePath:   highlights the group header for matching routes
 * - letter:         accelerator inside the open group — must be unique within the group and present in the label
 * - module:         permission module key (shown when isAdmin || hasModule(module)); omitted = visible with the group
 * - globalShortcut: direct app-wide shortcut already mapped to this page (used as its flash target id)
 * - badge:          { text, className } using layout.module.css badge classes
 * - comingSoon:     placeholder item (no navigation, no letter)
 */
const MENU_GROUPS = [
  {
    id: 'master',
    label: 'Master',
    icon: Database,
    shortcutId: 'MENU_MASTER',
    isActivePath: (p) => p.startsWith('/master/'),
    items: [
      { href: '/master/doctors', label: 'Doctor List', letter: 'd' },
      { href: '/master/tests', label: 'Test Rate List', letter: 't' },
      { href: '/master/categories', label: 'Category List', letter: 'c' },
      { href: '/master/patients', label: 'Patient List', letter: 'p' },
      { href: '/master/departments', label: 'Department Details', letter: 'e' },
      { href: '/master/subdepartments', label: 'Sub Department', letter: 's' },
      { href: '/master/marketing-executives', label: 'Marketing Executive', letter: 'm' },
      { href: '/master/collectors', label: 'Collector Details', letter: 'l' },
    ],
  },
  {
    id: 'transaction',
    label: 'Transaction',
    icon: ReceiptText,
    shortcutId: 'MENU_TRANSACTION',
    isActivePath: (p) => p.startsWith('/booking') || p.startsWith('/transaction/'),
    items: [
      { href: '/booking', label: 'Booking / Advance', letter: 'b', module: 'booking', globalShortcut: 'GOTO_BOOKING' },
      { href: '/transaction/archive-bills', label: 'Archive Bills', letter: 'a', module: 'archive_bills', badge: { text: 'Legacy', className: 'legacyBadge' } },
      { href: '/transaction/invoice', label: 'Bill / Invoice', letter: 'i', module: 'invoice' },
    ],
  },
  {
    id: 'setup',
    label: 'SetUp',
    icon: Settings,
    shortcutId: 'MENU_SETUP',
    isActivePath: (p) => p.startsWith('/setup/') || p === '/shortcuts',
    items: [
      { href: '/setup/settings', label: 'Lab & Report Settings', letter: 'l', badge: { text: 'Admin', className: 'adminBadge' } },
      { href: '/setup/users', label: 'User Management', letter: 'u', badge: { text: 'Admin', className: 'adminBadge' } },
      { href: '/setup/permissions', label: 'Permission Matrix', letter: 'p', badge: { text: 'Admin', className: 'adminBadge' } },
      { href: '/setup/audit-trail', label: 'System Audit Trail', letter: 'a', badge: { text: 'Admin', className: 'adminBadge' } },
      { href: '/shortcuts', label: 'Configure Shortcuts', letter: 'c', badge: { text: 'Admin', className: 'adminBadge' } },
    ],
  },
  {
    id: 'print',
    label: 'Report Print',
    icon: Printer,
    shortcutId: 'MENU_PRINT',
    isActivePath: () => false,
    items: [
      { label: 'Doctor List', comingSoon: true },
      { label: 'Sale - Before Bill', comingSoon: true },
      { label: 'Sale - After Bill', comingSoon: true },
      { label: 'Collector Register', comingSoon: true },
    ],
  },
  {
    id: 'query',
    label: 'Report/Query',
    icon: BarChart3,
    shortcutId: 'MENU_QUERY',
    isActivePath: (p) => p.startsWith('/pending-tests') || p.startsWith('/lab/'),
    items: [
      { href: '/lab/sample-tracking', label: 'Sample Tracking', letter: 's', module: 'sample_tracking' },
      { href: '/lab/result-entry', label: 'Lab Result Entry', letter: 'r', module: 'result_entry' },
      { href: '/lab/verification', label: 'Pathology Verification', letter: 'v', module: 'verification' },
      { href: '/pending-tests', label: 'Pending Test Register', letter: 't', module: 'pending_tests', globalShortcut: 'GOTO_PENDING' },
    ],
  },
];

const CLOSED_MENUS = { master: false, transaction: false, setup: false, print: false, query: false };

// Flash target id for a menu item (reuses the global shortcut id when the page has one)
const itemShortcutId = (item) => item.globalShortcut || `MENU_ITEM:${item.href}`;

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { shortcuts, parseKeyEvent } = useHotkeys();
  const { user: activeUser, logout, isLoaded } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  // Group waiting for an item letter after its menu shortcut was pressed (null = not in letter mode)
  const [keyMenu, setKeyMenu] = useState(null);

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

  const expandSidebar = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem('sdcp_sidebar_collapsed', 'false');
    }
  };

  const toggleMenu = (menu) => {
    expandSidebar();
    setOpenMenus((prev) => {
      const nextState = { ...CLOSED_MENUS };
      if (!prev[menu]) {
        nextState[menu] = true;
      }
      return nextState;
    });
  };

  // Keyboard: always open (never toggle closed) the requested menu
  const openMenuExclusive = (menu) => {
    expandSidebar();
    setOpenMenus({ ...CLOSED_MENUS, [menu]: true });
  };

  const isAdmin = activeUser?.role_code === 'ADMIN';

  // Helper to check module permission (Integrates User Management + Role Permission Matrix)
  const hasModule = (moduleKey) => {
    if (!isLoaded || !activeUser) return false;
    if (isAdmin) return true;

    // Check 1: User-assigned modules
    const userModules = activeUser.modules || [];
    const modKeys = userModules.map(m => typeof m === 'object' ? m.module_key : m);
    const assignedInUserManagement = modKeys.includes(moduleKey);

    // Check 2: Role Permission Matrix can_view
    const rolePerms = activeUser.permissions || [];
    const matchPerm = rolePerms.find(p => p.module_key === moduleKey);
    const canViewInMatrix = matchPerm ? Number(matchPerm.can_view) === 1 : false;

    return assignedInUserManagement && canViewInMatrix;
  };

  const groupVisible = {
    master: isLoaded && (isAdmin || hasModule('masters')),
    transaction: isLoaded && (isAdmin || hasModule('booking') || hasModule('invoice') || hasModule('archive_bills')),
    setup: isLoaded && (isAdmin || hasModule('setup')),
    print: isLoaded && (isAdmin || hasModule('reports')),
    query: isLoaded && (isAdmin || hasModule('reports') || hasModule('pending_tests') || hasModule('verification') || hasModule('sample_tracking') || hasModule('result_entry')),
  };

  const visibleItems = (group) => group.items.filter(item => !item.module || isAdmin || hasModule(item.module));

  // Leave letter mode when the page changes or the user clicks anywhere
  useEffect(() => {
    setKeyMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!keyMenu) return;
    const cancel = () => setKeyMenu(null);
    document.addEventListener('mousedown', cancel);
    return () => document.removeEventListener('mousedown', cancel);
  }, [keyMenu]);

  // Menu keyboard accelerators (capture phase, so a letter is not typed into a focused input).
  // Re-registered every render to always see current permissions, shortcuts and letter mode.
  useEffect(() => {
    const handleMenuKeys = (e) => {
      if (!e || !e.key) return;
      // Leave the keyboard to an open dialog (e.g. AlertDialog)
      if (document.querySelector('[role="alertdialog"]')) return;

      const combo = parseKeyEvent(e);
      const group = MENU_GROUPS.find(g => groupVisible[g.id] && shortcuts[g.shortcutId] && combo === shortcuts[g.shortcutId].key);
      if (group) {
        e.preventDefault();
        e.stopPropagation();
        flashShortcut(group.shortcutId);
        openMenuExclusive(group.id);
        setKeyMenu(group.id);
        return;
      }

      if (!keyMenu) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setKeyMenu(null);
        return;
      }

      // Only a plain single character selects an item; Tab, arrows and modifier combos stay with the page
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;

      e.preventDefault();
      e.stopPropagation();
      const activeGroup = MENU_GROUPS.find(g => g.id === keyMenu);
      const item = activeGroup && visibleItems(activeGroup).find(i => !i.comingSoon && i.letter === e.key.toLowerCase());
      if (item) {
        flashShortcut(itemShortcutId(item));
        setKeyMenu(null);
        router.push(item.href);
      }
    };

    window.addEventListener('keydown', handleMenuKeys, true);
    return () => window.removeEventListener('keydown', handleMenuKeys, true);
  });

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Sidebar Header Brand */}
      <Link
        href="/dashboard"
        className={styles.sidebarHeader}
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
        data-shortcut="GOTO_DASHBOARD"
        title={`Dashboard (${formatShortcut(shortcuts.GOTO_DASHBOARD.key)})`}
      >
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
        {/* Dashboard: direct link (no submenu), Alt+D */}
        {isLoaded && (
          <div className={styles.navGroup}>
            <Link
              href="/dashboard"
              className={`${styles.navHeader} ${pathname === '/dashboard' ? styles.navHeaderActive : ''}`}
              title={`Dashboard (${formatShortcut(shortcuts.GOTO_DASHBOARD.key)})`}
              aria-keyshortcuts={formatShortcut(shortcuts.GOTO_DASHBOARD.key).replace(/ /g, '')}
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
            >
              {/* data-shortcut on the inner element: its className never changes, so the flash is not cut */}
              <div className={styles.navHeaderContent} data-shortcut="GOTO_DASHBOARD">
                <LayoutDashboard size={19} className={styles.navIcon} />
                {!isCollapsed && <span><ShortcutLabel text="Dashboard" combo={shortcuts.GOTO_DASHBOARD.key} /></span>}
              </div>
            </Link>
          </div>
        )}

        {MENU_GROUPS.map((group) => {
          if (!groupVisible[group.id]) return null;

          const Icon = group.icon;
          const items = visibleItems(group);
          const isMenuOpen = openMenus[group.id];
          const groupCombo = shortcuts[group.shortcutId]?.key || '';
          const groupKeys = formatShortcut(groupCombo);
          const inKeyMode = keyMenu === group.id;

          return (
            <div key={group.id} className={styles.navGroup}>
              <button
                className={`${styles.navHeader} ${isMenuOpen || group.isActivePath(pathname) ? styles.navHeaderActive : ''}`}
                onClick={() => toggleMenu(group.id)}
                title={groupKeys ? `${group.label} (${groupKeys}, then the underlined letter)` : group.label}
                aria-keyshortcuts={groupKeys.replace(/ /g, '') || undefined}
                aria-expanded={!isCollapsed && !!isMenuOpen}
              >
                {/* data-shortcut sits on this inner element: its className never changes, so the flash is not cut */}
                <div className={styles.navHeaderContent} data-shortcut={group.shortcutId}>
                  <Icon size={19} className={styles.navIcon} />
                  {!isCollapsed && <span><ShortcutLabel text={group.label} combo={groupCombo} /></span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    size={15}
                    className={`${styles.chevronIcon} ${isMenuOpen ? styles.chevronIconRotated : ''}`}
                  />
                )}
              </button>

              {/* Inline Submenu (Expanded Mode) */}
              {!isCollapsed && (
                <div className={`${styles.submenu} ${isMenuOpen ? styles.submenuOpen : ''} ${inKeyMode ? styles.submenuKeyMode : ''}`}>
                  {inKeyMode && (
                    <div className={styles.keyModeHint}>Press the underlined letter · Esc to cancel</div>
                  )}
                  {items.map((item) =>
                    item.comingSoon ? (
                      <a key={item.label} className={styles.sublink} href="#" onClick={e => e.preventDefault()}>
                        <span>{item.label}</span>
                        <span className={styles.legacyBadge}>Coming Soon</span>
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.sublink} ${pathname === item.href ? styles.sublinkActive : ''}`}
                        title={groupKeys ? `${item.label} (${groupKeys}, then ${item.letter.toUpperCase()})` : item.label}
                      >
                        <span data-shortcut={itemShortcutId(item)}>
                          <ShortcutLabel text={item.label} letter={item.letter} />
                        </span>
                        {item.badge && <span className={styles[item.badge.className]}>{item.badge.text}</span>}
                      </Link>
                    )
                  )}
                </div>
              )}

              {/* Flyout Submenu (Collapsed Mode Hover) */}
              {isCollapsed && (
                <div className={styles.flyoutMenu}>
                  <div className={styles.flyoutTitle}>{group.label}</div>
                  {items.map((item) =>
                    item.comingSoon ? (
                      <a key={item.label} className={styles.flyoutLink} href="#" onClick={e => e.preventDefault()}>
                        {item.label} (Soon)
                      </a>
                    ) : (
                      <Link key={item.href} href={item.href} className={styles.flyoutLink}>
                        <ShortcutLabel text={item.label} letter={item.letter} />
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
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
