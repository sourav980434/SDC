'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import styles from '../layout.module.css';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SetupLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error checking auth session:", e);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const isAuthorized = () => {
    if (!activeUser) return false;
    if (activeUser.role_code === 'ADMIN') return true;
    
    // Check if setup module is explicitly assigned
    const userModules = activeUser.modules || [];
    const modKeys = userModules.map(m => typeof m === 'object' ? m.module_key : m);
    if (modKeys.includes('setup')) return true;

    return false;
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

      {/* Main layout frame */}
      <div className={styles.main}>
        <Header toggleSidebar={toggleSidebar} />
        
        <main className={styles.content}>
          {loadingUser ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--outline)' }}>
              Verifying system authorization...
            </div>
          ) : isAuthorized() ? (
            children
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--surface-container-lowest)',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-xl)',
              margin: '40px auto',
              maxWidth: '600px',
              boxShadow: '0 12px 32px rgba(225, 29, 72, 0.1)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <ShieldAlert size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#991b1b', margin: '0 0 8px 0' }}>
                Access Denied: Administrator Rights Required
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--outline)', margin: '0 0 24px 0', maxWidth: '480px' }}>
                Your active account (<strong>{activeUser?.username || 'Guest'}</strong> - {activeUser?.role_name || activeUser?.role_code || 'User'}) does not have permission to access User Management, Permission Control, or System Audit Trails.
              </p>
              <Link 
                href="/booking" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                  fontWeight: '700',
                  textDecoration: 'none'
                }}
              >
                <ArrowLeft size={16} /> Return to Booking / Dashboard
              </Link>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
