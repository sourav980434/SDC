'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FlaskConical, Check, AlertTriangle, FileCheck, CheckCircle, Save } from 'lucide-react';
import styles from '../sample-tracking/sample.module.css';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
export default function LabResultEntryPage() {
  const [queue, setQueue] = useState([]);
  const [selectedBookingNo, setSelectedBookingNo] = useState('');
  const [bookingItems, setBookingItems] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  const listWrapperRef = useRef(null);
  const selectedRowRef = useRef(null);

  // Auto-scroll selected booking item into view inside left worklist container
  useEffect(() => {
    if (selectedRowRef.current && listWrapperRef.current) {
      const container = listWrapperRef.current;
      const row = selectedRowRef.current;

      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.offsetHeight;

      if (rowTop < containerTop) {
        container.scrollTop = rowTop;
      } else if (rowBottom > containerBottom) {
        container.scrollTop = rowBottom - container.clientHeight;
      }
    }
  }, [selectedBookingNo]);

  // Store parameter templates per item: { itemId: [ { param_code, param_name, unit, male_min, male_max, female_min, female_max, panic_low, panic_high } ] }
  const [itemParameters, setItemParameters] = useState({});

  // Store entered parameter values per item: { itemId: { [param_code]: valueStr } }
  const [paramValues, setParamValues] = useState({});

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWorklist = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/sample-tracking/queue?search=${encodeURIComponent(search)}`)
      .then(res => res.json())
      .then(data => {
        const qList = data.value || data || [];
        setQueue(qList);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading queue:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorklist();
  }, []);

  // Keyboard ArrowUp & ArrowDown navigation for patient list
  useEffect(() => {
    if (!queue || queue.length === 0) return;

    // Group queue by bookingNo
    const uBookings = [];
    const bMap = new Map();
    queue.forEach(q => {
      if (!bMap.has(q.bookingNo)) {
        bMap.set(q.bookingNo, true);
        uBookings.push(q);
      }
    });

    const handleKeyDown = (e) => {
      if (uBookings.length === 0) return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInput) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = uBookings.findIndex(b => b.bookingNo === selectedBookingNo);
        const nextIdx = currentIdx < uBookings.length - 1 ? currentIdx + 1 : 0;
        handleSelectBooking(uBookings[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = uBookings.findIndex(b => b.bookingNo === selectedBookingNo);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : uBookings.length - 1;
        handleSelectBooking(uBookings[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue, selectedBookingNo]);

  const handleSelectBooking = (item) => {
    setSelectedBookingNo(item.bookingNo);
    setPatientInfo({
      bookingId: item.bookingId || item.id,
      bookingNo: item.bookingNo,
      patientName: item.patientName,
      phone: item.phone,
      date: item.bookingDate,
      sex: item.sex || 'Male'
    });

    const items = queue.filter(q => q.bookingNo === item.bookingNo);
    setBookingItems(items);

    const templates = {};
    const initialVals = {};
    let fetchedCount = 0;

    items.forEach(it => {
      // Default initial values for test reading
      const pList = [
        {
          param_code: `P_${it.testCode}`,
          param_name: it.testName,
          unit: 'mg/dL',
          male_min: 70.0,
          male_max: 110.0,
          female_min: 70.0,
          female_max: 110.0,
          panic_low: 50.0,
          panic_high: 300.0
        }
      ];

      templates[it.id] = pList;

      const existingVals = {};
      if (it.resultJson) {
        try {
          const parsed = typeof it.resultJson === 'string' ? JSON.parse(it.resultJson) : it.resultJson;
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              existingVals[p.param_code] = p.value || '';
            });
          }
        } catch (e) {}
      }

      pList.forEach(p => {
        if (!(p.param_code in existingVals)) {
          existingVals[p.param_code] = '';
        }
      });

      initialVals[it.id] = existingVals;
      fetchedCount++;

      if (fetchedCount === items.length) {
        setItemParameters(templates);
        setParamValues(initialVals);
      }
    });
  };

  const handleParamValueChange = (itemId, paramCode, val) => {
    setParamValues(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [paramCode]: val
      }
    }));
  };

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
      return { label: 'CRITICAL LOW', bg: '#fee2e2', color: '#dc2626' };
    }
    if (panicHigh > 0 && val > panicHigh) {
      return { label: 'CRITICAL HIGH', bg: '#fee2e2', color: '#dc2626' };
    }
    if (max > 0 && val > max) {
      return { label: 'HIGH ALERT', bg: '#ffedd5', color: '#c2410c' };
    }
    if (min > 0 && val < min) {
      return { label: 'LOW ALERT', bg: '#dbeafe', color: '#1d4ed8' };
    }
    return { label: 'NORMAL', bg: '#f0fdf4', color: '#15803d' };
  };

  const handleSaveAllResults = () => {
    if (bookingItems.length === 0) return;
    setSaving(true);

    let completed = 0;
    bookingItems.forEach(it => {
      const pList = itemParameters[it.id] || [];
      const vals = paramValues[it.id] || {};

      const payloadResults = pList.map(p => ({
        param_code: p.param_code,
        param_name: p.param_name,
        value: vals[p.param_code] || '',
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
          id: it.id,
          sex: patientInfo.sex || 'Male',
          results: payloadResults
        })
      })
        .then(res => res.json())
        .then(() => {
          completed++;
          if (completed === bookingItems.length) {
            setSaving(false);
            setMessage('All lab test results saved successfully!');
            setTimeout(() => setMessage(''), 4000);
            fetchWorklist();
          }
        })
        .catch(err => {
          completed++;
          if (completed === bookingItems.length) setSaving(false);
        });
    });
  };

  // Group queue by bookingNo for clean worklist display
  const uniqueBookings = [];
  const bookingMap = new Map();
  queue.forEach(q => {
    if (!bookingMap.has(q.bookingNo)) {
      bookingMap.set(q.bookingNo, true);
      uniqueBookings.push(q);
    }
  });

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Lab Result Entry (Booking-Wise Sub-Parameter Sheet)</h2>
          <p className={styles.subtitle}>Parameter-wise test reading entry sheet with automatic reference range High/Low/Panic flagging</p>
        </div>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-lg)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: '16px' }}>
        {/* Left Col: Pending Bookings Worklist */}
        <div className={styles.tableCard}>
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', fontWeight: '800', fontSize: '13px', color: 'var(--primary)' }}>
            Select Booking for Parameter Entry
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }} ref={listWrapperRef}>
            <table className={styles.table}>
              <tbody>
                {uniqueBookings.length === 0 ? (
                  <tr><td style={{ padding: '16px', textAlign: 'center', color: 'var(--outline)' }}>No worklist items available</td></tr>
                ) : (
                  uniqueBookings.map(q => {
                    const isSelected = selectedBookingNo === q.bookingNo;
                    return (
                      <tr
                        key={q.bookingNo}
                        ref={isSelected ? selectedRowRef : null}
                        onClick={() => handleSelectBooking(q)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--secondary-container)' : 'transparent'
                        }}
                      >
                      <td className={styles.td} style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>{q.bookingNo}</div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--primary)', marginTop: '2px' }}>{q.patientName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--outline)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Date: {q.bookingDate}</span>
                          <span>•</span>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            ...getDeptBadgeStyle(q.deptName)
                          }}>
                            {q.deptName || 'PATHOLOGY'}
                          </span>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Sub-Parameter Result Entry Sheet */}
        <div className={styles.tableCard} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {patientInfo ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                    Booking No: {patientInfo.bookingNo}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--outline)', margin: '4px 0 0 0' }}>
                    Patient: <strong>{patientInfo.patientName}</strong> (+91 {patientInfo.phone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllResults}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  <Save size={18} /> {saving ? 'Saving Sheet...' : 'Save All Lab Results'}
                </button>
              </div>

              {/* Loop through each test in booking and render sub-parameters */}
              {bookingItems.map(it => {
                const params = itemParameters[it.id] || [];
                const vals = paramValues[it.id] || {};

                return (
                  <div key={it.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', fontWeight: '800', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Test: {it.testName} ({it.testCode})</span>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        ...getDeptBadgeStyle(it.deptName)
                      }}>
                        {it.deptName || 'PATHOLOGY'}
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-container-low)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Sub-Parameter Name</th>
                          <th style={{ padding: '8px 12px' }}>Result Value</th>
                          <th style={{ padding: '8px 12px' }}>Unit</th>
                          <th style={{ padding: '8px 12px' }}>Normal Reference Range</th>
                          <th style={{ padding: '8px 12px' }}>Live Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {params.map(p => {
                          const valStr = vals[p.param_code] || '';
                          const flagInfo = calculateLiveFlag(p, valStr, patientInfo.sex);

                          return (
                            <tr key={p.param_code} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: '700' }}>{p.param_name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <input
                                  type="text"
                                  placeholder="Enter value..."
                                  value={valStr}
                                  onChange={(e) => handleParamValueChange(it.id, p.param_code, e.target.value)}
                                  style={{
                                    padding: '6px 10px',
                                    border: '1.5px solid var(--outline-variant)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '13px',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: '700',
                                    width: '120px',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>{p.unit}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--outline)', fontSize: '12px' }}>
                                {p.male_min} - {p.male_max} {p.unit}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  backgroundColor: flagInfo.bg,
                                  color: flagInfo.color,
                                  padding: '3px 8px',
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
                );
              })}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--outline)' }}>
              <FlaskConical size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px 0' }}>No Booking Selected</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>Please select a booking from the left worklist to open the parameter result sheet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
