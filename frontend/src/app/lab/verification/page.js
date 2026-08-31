'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, ShieldCheck, FileCheck, Lock, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import styles from '../sample-tracking/sample.module.css';
import PermissionButton from '@/components/PermissionButton';
import { useActionPermission } from '@/hooks/useActionPermission';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
export default function PathologyVerificationPage() {
  const perms = useActionPermission('verification');
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState('');

  const listWrapperRef = useRef(null);
  const selectedRowRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus trap & restoration for verification review modal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && selectedItem) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      const timer = setTimeout(() => {
        if (searchInputRef.current && (document.activeElement === document.body || !document.activeElement)) {
          searchInputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedItem]);

  // Auto-scroll selected row into view inside table container
  useEffect(() => {
    if (selectedRowRef.current && listWrapperRef.current) {
      const container = listWrapperRef.current;
      const row = selectedRowRef.current;

      const containerTop = container.scrollTop;
      const headerHeight = container.querySelector('thead')?.offsetHeight || 35;
      const visibleTop = containerTop + headerHeight;
      const containerBottom = containerTop + container.clientHeight;

      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.offsetHeight;

      if (rowTop < visibleTop) {
        container.scrollTop = rowTop - headerHeight;
      } else if (rowBottom > containerBottom) {
        container.scrollTop = rowBottom - container.clientHeight;
      }
    }
  }, [selectedItem]);

  const fetchVerificationQueue = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/sample-tracking/queue?search=${encodeURIComponent(search)}`)
      .then(res => res.json())
      .then(data => {
        setQueue(data.value || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVerificationQueue();
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    if (!queue || queue.length === 0) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = queue.findIndex(q => q.id === selectedItem?.id);
        const nextIdx = currentIdx < queue.length - 1 ? currentIdx + 1 : 0;
        setSelectedItem(queue[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = queue.findIndex(q => q.id === selectedItem?.id);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : queue.length - 1;
        setSelectedItem(queue[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue, selectedItem]);

  const handleVerifyItem = (id) => {
    fetch(`${API_BASE}/api/sample-tracking/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(() => {
        setMessage('Report result approved & digitally signed successfully!');
        setSelectedItem(null);
        setTimeout(() => setMessage(''), 4000);
        fetchVerificationQueue();
      })
      .catch(err => alert("Error approving report"));
  };

  const parseResultJson = (item) => {
    if (!item || !item.resultJson) return [];
    try {
      const parsed = typeof item.resultJson === 'string' ? JSON.parse(item.resultJson) : item.resultJson;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && parsed.value) {
        return [{
          param_name: item.testName,
          value: parsed.value,
          unit: 'mg/dL',
          ref_range: '70 - 110 mg/dL',
          flag: item.resultFlag || 'NORMAL'
        }];
      }
    } catch (e) {}
    return [];
  };

  if (perms.isLoaded && perms.can_view === false) {
    return (
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
          Access Denied: Pathology Verification Restricted
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--outline)', margin: 0 }}>
          Your role does not have <strong>View</strong> permission for Lab Result Verification. Contact Administrator to update Role Permission Matrix.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Pathology Verification & Doctor Approval</h2>
          <p className={styles.subtitle}>Review multi-parameter laboratory readings, verify high/low/panic alerts, and digitally approve report lockdown</p>
        </div>
      </div>

      {message && (
        <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-lg)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search by Booking No, Patient Name, or Test Name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchVerificationQueue();
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard} ref={listWrapperRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Booking No</th>
              <th className={styles.th}>Patient Name</th>
              <th className={styles.th}>Department</th>
              <th className={styles.th}>Test Description</th>
              <th className={styles.th}>Overall Result Flag</th>
              <th className={styles.th}>Approval Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>Loading verification queue...</td></tr>
            ) : queue.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>No pending report verifications found.</td></tr>
            ) : (
              queue.map(q => {
                const isSelected = selectedItem && selectedItem.id === q.id;
                return (
                  <tr
                    key={q.id}
                    ref={isSelected ? selectedRowRef : null}
                    style={{ backgroundColor: isSelected ? 'var(--secondary-container)' : undefined }}
                  >
                  <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--secondary)' }}>
                    {q.bookingNo}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {q.patientName}
                  </td>
                  <td className={styles.td}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      ...getDeptBadgeStyle(q.deptName)
                    }}>
                      {q.deptName || 'PATHOLOGY'}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600' }}>{q.testName}</td>
                  <td className={styles.td}>
                    {q.resultFlag === 'CRITICAL' ? (
                      <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        CRITICAL PANIC
                      </span>
                    ) : q.resultFlag === 'HIGH' ? (
                      <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        HIGH ALERT
                      </span>
                    ) : q.resultFlag === 'LOW' ? (
                      <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        LOW ALERT
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {q.testStatus === 'VERIFIED' ? (
                      <span className={styles.badgeVerified} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} /> Approved & Locked
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--outline)' }}>Pending Doctor Signature</span>
                    )}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    {q.testStatus !== 'VERIFIED' ? (
                      <PermissionButton
                        moduleKey="verification"
                        action="can_approve"
                        className={styles.btnVerify}
                        onClick={() => setSelectedItem(q)}
                      >
                        <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Review & Approve
                      </PermissionButton>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>Verified</span>
                    )}
                  </td>
                </tr>
              );
            }) )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--secondary)', margin: 0 }}>
                Pathologist Review: {selectedItem.testName}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button 
                  type="button" 
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
              <div><strong>Booking No:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedItem.bookingNo}</span></div>
              <div><strong>Patient:</strong> {selectedItem.patientName}</div>
              <div><strong>Department:</strong> {selectedItem.deptName}</div>
              <div><strong>Date:</strong> {selectedItem.bookingDate}</div>
            </div>

            <div style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-container-high)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Parameter</th>
                    <th style={{ padding: '10px 14px' }}>Technician Value</th>
                    <th style={{ padding: '10px 14px' }}>Unit</th>
                    <th style={{ padding: '10px 14px' }}>Normal Range</th>
                    <th style={{ padding: '10px 14px' }}>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResultJson(selectedItem).length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--outline)' }}>No parameter readings entered yet.</td></tr>
                  ) : (
                    parseResultJson(selectedItem).map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '700' }}>{p.param_name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: '800', color: p.flag?.includes('CRITICAL') ? '#dc2626' : p.flag === 'HIGH' ? '#c2410c' : 'var(--primary)' }}>
                          {p.value || 'N/A'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--outline)' }}>{p.unit}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--outline)', fontSize: '12px' }}>{p.ref_range}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            backgroundColor: p.flag?.includes('CRITICAL') ? '#fee2e2' : p.flag === 'HIGH' ? '#ffedd5' : p.flag === 'LOW' ? '#dbeafe' : '#f0fdf4',
                            color: p.flag?.includes('CRITICAL') ? '#dc2626' : p.flag === 'HIGH' ? '#c2410c' : p.flag === 'LOW' ? '#1d4ed8' : '#15803d',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '800'
                          }}>
                            {p.flag || 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <PermissionButton
                moduleKey="verification"
                action="can_approve"
                type="button"
                onClick={() => handleVerifyItem(selectedItem.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: '700'
                }}
              >
                <ShieldCheck size={18} /> Approve & Attach Digital Signature
              </PermissionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
