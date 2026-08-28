'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import styles from '../layout.module.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* Dynamic Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} />
      
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
        <Header toggleSidebar={toggleSidebar} />
        
        <main className={styles.content}>
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
