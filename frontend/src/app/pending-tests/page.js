'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from '@/context/HotkeyContext';
import { 
  Printer, 
  RefreshCw, 
  Hourglass, 
  Coins, 
  CheckCircle2, 
  Users, 
  Search, 
  Maximize2, 
  Eye, 
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FlaskConical,
  Save,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import styles from './pending.module.css';
import PermissionButton from '@/components/PermissionButton';
import { useActionPermission } from '@/hooks/useActionPermission';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
export default function PendingTestRegister() {
  const { shortcuts, parseKeyEvent } = useHotkeys();
  const perms = useActionPermission('pending_tests');

  const [density, setDensity] = useState('small');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All');

  // Queue state
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Result Entry Modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [paramList, setParamList] = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [savingResult, setSavingResult] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Report View Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  const searchInputRef = useRef(null);
  const listWrapperRef = useRef(null);
  const selectedRowRef = useRef(null);
  const firstParamInputRef = useRef(null);

  // Focus trap & restoration for result entry modal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && (entryModalOpen || reportModalOpen)) {
        e.preventDefault();
        e.stopPropagation();
        setEntryModalOpen(false);
        setReportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [entryModalOpen, reportModalOpen]);

  useEffect(() => {
    if (entryModalOpen) {
      const timer = setTimeout(() => {
        firstParamInputRef.current?.focus();
        firstParamInputRef.current?.select();
      }, 80);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        if (searchInputRef.current && (document.activeElement === document.body || !document.activeElement)) {
          searchInputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [entryModalOpen]);

  // Auto-scroll active queue item into view inside table container
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
  }, [activeItem]);

  const fetchLiveQueue = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/sample-tracking/queue?search=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json())
      .then(data => {
        setQueueList(data.value || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching queue:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLiveQueue();
  }, [searchQuery]);

  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    if (!queueList || queueList.length === 0) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && activeEl !== searchInputRef.current) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText || entryModalOpen || reportModalOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = queueList.findIndex(q => q.id === activeItem?.id);
        const nextIdx = currentIdx < queueList.length - 1 ? currentIdx + 1 : 0;
        setActiveItem(queueList[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = queueList.findIndex(q => q.id === activeItem?.id);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : queueList.length - 1;
        setActiveItem(queueList[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueList, activeItem, entryModalOpen, reportModalOpen]);

  // Filter queue by department & status
  const filteredQueue = queueList.filter((item) => {
    const matchesDept = 
      selectedDept === 'All Departments' || 
      item.deptName === selectedDept;

    const matchesStatus = 
      statusFilter === 'All' || 
      item.testStatus === statusFilter;

    return matchesDept && matchesStatus;
  });

  // Handle Opening Parameter Result Entry Sheet
  const handleOpenResultEntry = (item) => {
    setActiveItem(item);
    setParamValues({});
    setEntryModalOpen(true);

    fetch(`${API_BASE}/api/lab/test-parameters/${item.testCode}`)
      .then(res => res.json())
      .then(params => {
        const pList = params.value || params || [];
        setParamList(pList);
        
        // Initialize values object
        const initial = {};
        pList.forEach(p => {
          initial[p.param_code] = '';
        });
        setParamValues(initial);
      })
      .catch(err => {
        console.error("Error loading test parameters:", err);
      });
  };

  const handleParamValueChange = (code, val) => {
    setParamValues(prev => ({
      ...prev,
      [code]: val
    }));
  };

  // Helper to calculate live real-time parameter flag
  const calculateLiveFlag = (param, valStr, sex = 'Male') => {
    if (!valStr || valStr.trim() === '') return { label: 'PENDING', bg: '#f3f4f6', color: '#6b7280' };
    const val = parseFloat(valStr);
    if (isNaN(val)) return { label: 'ENTERED', bg: '#e0f2fe', color: '#0369a1' };

    const isFemale = (sex || 'Male').toUpperCase() === 'FEMALE';
    const min = isFemale ? (param.female_min ?? param.male_min ?? 0) : (param.male_min ?? 0);
    const max = isFemale ? (param.female_max ?? param.male_max ?? 0) : (param.male_max ?? 0);
    const panicLow = param.panic_low ?? 0;
    const panicHigh = param.panic_high ?? 0;

    if (panicLow > 0 && val < panicLow) {
      return { label: 'CRITICAL LOW', bg: '#fef2f2', color: '#991b1b', isPanic: true };
    }
    if (panicHigh > 0 && val > panicHigh) {
      return { label: 'CRITICAL HIGH', bg: '#fef2f2', color: '#991b1b', isPanic: true };
    }
    if (max > 0 && val > max) {
      return { label: 'HIGH ALERT', bg: '#fff7ed', color: '#c2410c' };
    }
    if (min > 0 && val < min) {
      return { label: 'LOW ALERT', bg: '#eff6ff', color: '#1d4ed8' };
    }
    return { label: 'NORMAL', bg: '#f0fdf4', color: '#15803d' };
  };

  // Save Multi-Parameter Test Results
  const handleSaveParameterResults = (e) => {
    e.preventDefault();
    if (!activeItem) return;
    setSavingResult(true);

    const payloadResults = paramList.map(p => ({
      param_code: p.param_code,
      param_name: p.param_name,
      value: paramValues[p.param_code] || '',
      unit: p.unit,
      male_min: p.male_min,
      male_max: p.male_max,
      female_min: p.female_min,
      female_max: p.female_max,
      panic_low: p.panic_low,
      panic_high: p.panic_high
    }));

    fetch(`${API_BASE}/api/sample-tracking/save-parameter-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeItem.id,
        sex: activeItem.sex || 'Male',
        results: payloadResults
      })
    })
      .then(res => res.json())
      .then(data => {
        setSavingResult(false);
        setAlertMsg(`Result saved successfully with overall status: ${data.overall_flag}`);
        setEntryModalOpen(false);
        fetchLiveQueue();
        setTimeout(() => setAlertMsg(''), 4000);
      })
      .catch(err => {
        setSavingResult(false);
        alert("Error saving test result parameters");
      });
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
          Access Denied: Pending Test Register Restricted
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--outline)', margin: 0 }}>
          Your role does not have <strong>View</strong> permission for Pending Test Register. Contact Administrator to update Role Permission Matrix.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Page Header */}
      <section className={`${styles.topSection} no-print`}>
        <div className={styles.titleGroup}>
          <h2>Diagnostic Report & Query Management</h2>
          <p>Parameter-based laboratory result entry sheet, critical panic alerts, and report queue</p>
        </div>
        <div className={styles.topRightActions}>
          <button className={styles.btnSecondary} onClick={fetchLiveQueue} title="Refresh Queue">
            <RefreshCw size={15} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </section>

      {alertMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-lg)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CheckCircle2 size={18} /> {alertMsg}
        </div>
      )}

      {/* Main Filter & Queue Table Card */}
      <section className={`${styles.mainCard} no-print`}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              ref={searchInputRef}
              type="text" 
              className={styles.searchInput}
              placeholder="Search by Booking No, Patient Name, or Test Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.selectWrapper}>
              <select 
                className={styles.selectInput}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="All Departments">All Departments</option>
                <option value="Pathology">Pathology</option>
                <option value="Radiology">Radiology</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Biochemistry">Biochemistry</option>
              </select>
            </div>

            <div className={styles.selectWrapper}>
              <select 
                className={styles.selectInput}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="PENDING">Pending Entry</option>
                <option value="RESULT_ENTERED">Result Entered</option>
                <option value="VERIFIED">Doctor Verified</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper} ref={listWrapperRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Booking No</th>
                <th className={styles.th}>Patient Name</th>
                <th className={styles.th}>Department</th>
                <th className={styles.th}>Test Description</th>
                <th className={styles.th}>Result Flag</th>
                <th className={styles.th}>Test Status</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="zebra-table">
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--outline)' }}>Loading live laboratory queue...</td></tr>
              ) : filteredQueue.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--outline)' }}>No pending test records found.</td></tr>
              ) : (
                filteredQueue.map((item) => {
                  const isSelected = activeItem && activeItem.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      ref={isSelected ? selectedRowRef : null}
                      style={{ backgroundColor: isSelected ? 'var(--secondary-container)' : undefined }}
                    >
                    <td className={styles.td}>
                      <span className={styles.regId}>{item.bookingNo}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.patientName}>{item.patientName}</div>
                      <div className={styles.patientMeta}>{item.phone || 'No Contact'}</div>
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
                    <td className={styles.td}>
                      <span className={styles.testName}>{item.testName}</span>
                    </td>
                    <td className={styles.td}>
                      {item.resultFlag === 'CRITICAL' ? (
                        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                          CRITICAL PANIC
                        </span>
                      ) : item.resultFlag === 'HIGH' ? (
                        <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                          HIGH ALERT
                        </span>
                      ) : item.resultFlag === 'LOW' ? (
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
                      <span className={`${styles.statusPill} ${
                        item.testStatus === 'VERIFIED' ? styles.statusReady :
                        item.testStatus === 'RESULT_ENTERED' ? styles.statusProcessing :
                        styles.statusPending
                      }`}>
                        {item.testStatus === 'VERIFIED' ? 'Doctor Verified' :
                         item.testStatus === 'RESULT_ENTERED' ? 'Result Entered' : 'Pending Entry'}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <PermissionButton
                        moduleKey="pending_tests"
                        action="can_edit"
                        className={styles.actionBtn}
                        onClick={() => handleOpenResultEntry(item)}
                      >
                        <FlaskConical size={15} />
                        <span>{item.testStatus === 'PENDING' ? 'Enter Result' : 'Edit Result Sheet'}</span>
                      </PermissionButton>
                    </td>
                  </tr>
                );
              }) )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PARAMETER RESULT ENTRY SHEET MODAL */}
      {entryModalOpen && activeItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--outline-variant)',
            width: '100%',
            maxWidth: '750px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: 'var(--surface-container-high)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--outline-variant)'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                  Laboratory Result Entry Sheet
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                  Test: <strong>{activeItem.testName}</strong> ({activeItem.testCode})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button 
                  type="button" 
                  onClick={() => setEntryModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Patient Header Box */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: 'var(--surface-container-low)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              fontSize: '13px',
              borderBottom: '1px solid var(--outline-variant)'
            }}>
              <div><strong>Booking No:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{activeItem.bookingNo}</span></div>
              <div><strong>Patient Name:</strong> {activeItem.patientName}</div>
              <div><strong>Date:</strong> {activeItem.bookingDate}</div>
            </div>

            {/* Form & Parameter Table */}
            <form onSubmit={handleSaveParameterResults} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--secondary)' }}>
                Test Parameters & Live Reference Ranges:
              </div>

              <div style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-container-high)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Parameter Name</th>
                      <th style={{ padding: '10px 14px' }}>Result Value</th>
                      <th style={{ padding: '10px 14px' }}>Unit</th>
                      <th style={{ padding: '10px 14px' }}>Reference Range</th>
                      <th style={{ padding: '10px 14px' }}>Live Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramList.map((p, idx) => {
                      const valStr = paramValues[p.param_code] || '';
                      const flagInfo = calculateLiveFlag(p, valStr, activeItem.sex);

                      return (
                        <tr key={p.param_code} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '700' }}>
                            {p.param_name}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              ref={idx === 0 ? firstParamInputRef : null}
                              type="text"
                              value={valStr}
                              onChange={(e) => handleParamValueChange(p.param_code, e.target.value)}
                              placeholder="Enter value..."
                              style={{
                                width: '130px',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1.5px solid var(--outline-variant)',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '700',
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>
                            {p.unit}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--outline)', fontSize: '12px' }}>
                            {p.male_min} - {p.male_max} {p.unit}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              backgroundColor: flagInfo.bg,
                              color: flagInfo.color,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}>
                              {flagInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResult}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-lg)',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={18} />
                  {savingResult ? 'Saving Parameters...' : 'Save Parameter Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
