'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FlaskConical, Truck, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';
import styles from './sample.module.css';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
export default function SampleTrackingPage() {
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState('');
  const [sampleStatusFilter, setSampleStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [resultVal, setResultVal] = useState('');
  const [resultFlag, setResultFlag] = useState('NORMAL');

  const listWrapperRef = useRef(null);
  const selectedRowRef = useRef(null);

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
  const fetchQueue = (sSearch = search, sStatus = sampleStatusFilter) => {
    setLoading(true);
    let url = `${API_BASE}/api/sample-tracking/queue?search=${encodeURIComponent(sSearch)}`;
    if (sStatus) url += `&sample_status=${encodeURIComponent(sStatus)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQueue(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching queue:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, [sampleStatusFilter]);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!queue || queue.length === 0) return;

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

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchQueue(val, sampleStatusFilter);
  };

  const handleUpdateStatus = (id, newStatus) => {
    fetch(`${API_BASE}/api/sample-tracking/update-sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    })
      .then(res => res.json())
      .then(() => fetchQueue())
      .catch(err => alert("Error updating status"));
  };

  const handleOpenResultModal = (item) => {
    setSelectedItem(item);
    setResultVal('');
    setResultFlag('NORMAL');
  };

  const handleSaveResult = () => {
    if (!selectedItem) return;
    fetch(`${API_BASE}/api/sample-tracking/save-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedItem.id, value: resultVal, flag: resultFlag })
    })
      .then(res => res.json())
      .then(() => {
        setSelectedItem(null);
        fetchQueue();
      })
      .catch(err => alert("Error saving result"));
  };

  const handleVerify = (id) => {
    fetch(`${API_BASE}/api/sample-tracking/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(() => fetchQueue())
      .catch(err => alert("Error verifying test"));
  };

  // Metric counts
  const pendingCount = queue.filter(q => q.sampleStatus === 'PENDING').length;
  const collectedCount = queue.filter(q => q.sampleStatus === 'COLLECTED').length;
  const transferredCount = queue.filter(q => q.sampleStatus === 'TRANSFERRED_TO_DEPT').length;
  const verifiedCount = queue.filter(q => q.testStatus === 'VERIFIED').length;

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Sample Tracking & Laboratory Worklist</h2>
          <p className={styles.subtitle}>Phlebotomy room sample collection, department transfer, result entry, and pathologist verification</p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#eab308' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div className={styles.metricValue}>{pendingCount}</div>
            <div className={styles.metricLabel}>Pending Collection</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#2563eb' }}>
            <FlaskConical size={20} />
          </div>
          <div>
            <div className={styles.metricValue}>{collectedCount}</div>
            <div className={styles.metricLabel}>Sample Collected</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#4f46e5' }}>
            <Truck size={20} />
          </div>
          <div>
            <div className={styles.metricValue}>{transferredCount}</div>
            <div className={styles.metricLabel}>In Dept Transfer</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#16a34a' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className={styles.metricValue}>{verifiedCount}</div>
            <div className={styles.metricLabel}>Verified / Completed</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Booking No (BK/26-27/01001), Patient Name, Mobile, or Test Name..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSampleStatusFilter('')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
              backgroundColor: sampleStatusFilter === '' ? 'var(--primary)' : 'var(--surface-container-low)',
              color: sampleStatusFilter === '' ? '#ffffff' : 'var(--on-surface-variant)',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            All Worklist
          </button>
          <button
            type="button"
            onClick={() => setSampleStatusFilter('PENDING')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
              backgroundColor: sampleStatusFilter === 'PENDING' ? 'var(--primary)' : 'var(--surface-container-low)',
              color: sampleStatusFilter === 'PENDING' ? '#ffffff' : 'var(--on-surface-variant)',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Pending Draw
          </button>
          <button
            type="button"
            onClick={() => setSampleStatusFilter('COLLECTED')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
              backgroundColor: sampleStatusFilter === 'COLLECTED' ? 'var(--primary)' : 'var(--surface-container-low)',
              color: sampleStatusFilter === 'COLLECTED' ? '#ffffff' : 'var(--on-surface-variant)',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Collected
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className={styles.tableCard} ref={listWrapperRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Booking No</th>
              <th className={styles.th}>Patient Name</th>
              <th className={styles.th}>Department</th>
              <th className={styles.th}>Test Name</th>
              <th className={styles.th}>Sample Status</th>
              <th className={styles.th}>Test Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  Loading laboratory worklist...
                </td>
              </tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  No active sample tracking items found. Create a new web booking from Booking / Advance module.
                </td>
              </tr>
            ) : (
              queue.map((item) => {
                const isSelected = selectedItem && selectedItem.id === item.id;
                return (
                  <tr
                    key={item.id}
                    ref={isSelected ? selectedRowRef : null}
                    style={{ backgroundColor: isSelected ? 'var(--secondary-container)' : undefined }}
                  >
                  <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--secondary)' }}>
                    {item.bookingNo}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {item.patientName}
                    <div style={{ fontSize: '11px', color: 'var(--outline)' }}>+91 {item.phone}</div>
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
                      ...getDeptBadgeStyle(item.deptName)
                    }}>
                      {item.deptName || 'PATHOLOGY'}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600' }}>
                    {item.testName}
                  </td>
                  <td className={styles.td}>
                    {item.sampleStatus === 'PENDING' && <span className={styles.badgePending}>Pending Draw</span>}
                    {item.sampleStatus === 'COLLECTED' && <span className={styles.badgeCollected}>Sample Drawn</span>}
                    {item.sampleStatus === 'TRANSFERRED_TO_DEPT' && <span className={styles.badgeTransferred}>In Lab Dept</span>}
                  </td>
                  <td className={styles.td}>
                    {item.testStatus === 'VERIFIED' ? (
                      <span className={styles.badgeVerified}>Verified</span>
                    ) : item.testStatus === 'RESULT_ENTERED' ? (
                      <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                        Result Entered ({item.resultFlag})
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--outline)' }}>{item.testStatus}</span>
                    )}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {item.sampleStatus === 'PENDING' && (
                        <button className={styles.btnCollect} onClick={() => handleUpdateStatus(item.id, 'COLLECTED')}>
                          Collect Sample
                        </button>
                      )}
                      {item.sampleStatus === 'COLLECTED' && (
                        <button className={styles.btnTransfer} onClick={() => handleUpdateStatus(item.id, 'TRANSFERRED_TO_DEPT')}>
                          Transfer to Dept
                        </button>
                      )}
                      {(item.sampleStatus === 'TRANSFERRED_TO_DEPT' || item.sampleStatus === 'COLLECTED') && item.testStatus !== 'VERIFIED' && (
                        <a href="/lab/result-entry" className={styles.btnResult} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          Open Result Sheet
                        </a>
                      )}
                      {item.testStatus === 'RESULT_ENTERED' && (
                        <button className={styles.btnVerify} onClick={() => handleVerify(item.id)}>
                          Approve & Verify
                        </button>
                      )}
                    </div>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Result Entry Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
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
            maxWidth: '500px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                Lab Result Entry: {selectedItem.testName}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              <div><strong>Booking No:</strong> {selectedItem.bookingNo}</div>
              <div><strong>Patient:</strong> {selectedItem.patientName}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>Test Result Value / Reading:</label>
              <input
                type="text"
                placeholder="e.g. 140 mg/dL"
                value={resultVal}
                onChange={(e) => setResultVal(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>Reference Flag (Auto/Manual):</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="flag"
                    value="NORMAL"
                    checked={resultFlag === 'NORMAL'}
                    onChange={() => setResultFlag('NORMAL')}
                  />
                  <span>Normal</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#dc2626', fontWeight: '700' }}>
                  <input
                    type="radio"
                    name="flag"
                    value="HIGH"
                    checked={resultFlag === 'HIGH'}
                    onChange={() => setResultFlag('HIGH')}
                  />
                  <span>HIGH Alert</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#2563eb', fontWeight: '700' }}>
                  <input
                    type="radio"
                    name="flag"
                    value="LOW"
                    checked={resultFlag === 'LOW'}
                    onChange={() => setResultFlag('LOW')}
                  />
                  <span>LOW Alert</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={handleSaveResult}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Check size={16} /> Save Technician Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
