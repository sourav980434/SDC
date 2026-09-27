'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import styles from '../layout.module.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collapsed menu: the toggle sits in the top bar, the sidebar only follows it
  const [isCollapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sdcp_sidebar_collapsed');
      if (stored !== null) setCollapsedState(stored === 'true');
    } catch (e) {
      // storage blocked - the menu simply starts expanded
    }
  }, []);

  const setIsCollapsed = useCallback((next) => {
    setCollapsedState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem('sdcp_sidebar_collapsed', String(value)); } catch (e) {}
      return value;
    });
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* Dynamic Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 45
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main dashboard content layout */}
      <div className={styles.main}>
        <Header toggleSidebar={toggleSidebar} isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(v => !v)} />
        
        <main className={styles.content}>
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
