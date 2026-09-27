'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, FlaskConical, Check, AlertTriangle, FileCheck, CheckCircle, Save, FileText, FileDown, Paperclip, Upload, ChevronDown, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '../sample-tracking/sample.module.css';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
import { useActionPermission } from '@/hooks/useActionPermission';
import { useAlert } from '@/components/AlertDialog';
import { useAuth } from '@/context/AuthContext';

export default function LabResultEntryPage() {
  const perms = useActionPermission('result_entry');
  const templatePerms = useActionPermission('report_templates');
  const { showAlert } = useAlert();
  const router = useRouter();
  const { user: activeUser } = useAuth();
  const isAdmin = activeUser?.role_code === 'ADMIN';

  // Clinical Department Access Filtering
  const userDepts = activeUser?.departments || [];
  const allowedDeptCodes = userDepts.map(d => (typeof d === 'object' ? d.dept_code : d)?.toString().trim().toUpperCase()).filter(Boolean);
  const allowedDeptNames = userDepts.map(d => (typeof d === 'object' ? d.dept_name : '')?.toString().trim().toUpperCase()).filter(Boolean);

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

  // Word report templates available per test code (REPORT_MASTER folder): { T0000006: 2 }
  const [templateCounts, setTemplateCounts] = useState({});
  const [templatesChecking, setTemplatesChecking] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);   // test card whose Actions menu is open
  const [menuRect, setMenuRect] = useState(null);      // where to draw it (menu is portalled out of the card)

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWorklist = () => {
    setLoading(true);
    let url = `${API_BASE}/api/sample-tracking/queue?search=${encodeURIComponent(search)}`;
    if (!isAdmin && allowedDeptCodes.length > 0) {
      url += `&allowed_depts=${encodeURIComponent(allowedDeptCodes.join(','))}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        let qList = data.value || data || [];
        if (!isAdmin && (allowedDeptCodes.length > 0 || allowedDeptNames.length > 0)) {
          qList = qList.filter(item => {
            const itemCode = (item.deptCode || '').toString().trim().toUpperCase();
            const itemName = (item.deptName || '').toString().trim().toUpperCase();
            const codeMatch = allowedDeptCodes.length > 0 && allowedDeptCodes.includes(itemCode);
            const nameMatch = allowedDeptNames.length > 0 && allowedDeptNames.some(n => itemName.includes(n));
            return codeMatch || nameMatch;
          });
        }
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

  // Close the Actions menu on an outside click, Esc, or when the page moves under it
  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => setOpenMenuId(null);
    const onDown = (e) => {
      if (!e.target.closest('[data-actions-menu]')) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenuId]);

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

    // Keep the old counts on screen until the new ones arrive, so no "no template" flash
    const codes = [...new Set(items.map(it => (it.testCode || '').trim()).filter(Boolean))];
    if (codes.length > 0) {
      setTemplatesChecking(true);
      fetch(`${API_BASE}/api/report-templates/lookup?codes=${encodeURIComponent(codes.join(','))}`)
        .then(res => res.json())
        .then(data => setTemplateCounts(data || {}))
        .catch(() => setTemplateCounts({}))
        .finally(() => setTemplatesChecking(false));
    } else {
      setTemplateCounts({});
    }

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

  const hasTemplate = (it) => !!templateCounts[(it.testCode || '').trim()];

  // Where a test stands, shown as one badge on its card
  const reportStatus = (it) => {
    if (it.approvedAt) return { label: 'Approved', hint: `Approved on ${it.approvedAt}`, style: { backgroundColor: '#dcfce7', color: '#15803d' } };
    if (it.sentBackNote) return { label: 'Sent back', hint: 'Returned by the approver - correct and save again', style: { backgroundColor: '#ffedd5', color: '#9a3412' } };
    if (it.hasNarrative && it.hasDoctorCopy) return { label: 'Waiting approval', hint: 'Report and doctor copy are ready for approval', style: { backgroundColor: '#dbeafe', color: '#1d4ed8' } };
    if (it.hasNarrative) return { label: 'Doctor copy pending', hint: 'Report saved - the doctor copy still has to be uploaded', style: { backgroundColor: '#fef3c7', color: '#92400e' } };
    return { label: 'Report pending', hint: 'The report has not been written yet', style: { backgroundColor: '#f1f5f9', color: '#475569' } };
  };

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '9px 12px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--primary)',
    fontSize: '13px',
    fontWeight: '700',
    textAlign: 'left',
    textDecoration: 'none',
    cursor: 'pointer',
  };


  const openReportEditor = (it) => {
    router.push(`/lab/report-editor?id=${encodeURIComponent(it.id)}&booking=${encodeURIComponent(it.booking_id)}`);
  };

  const handleSaveAllResults = () => {
    // Template tests are saved from the report editor, not from this sheet
    const sheetItems = bookingItems.filter(it => !hasTemplate(it));
    if (sheetItems.length === 0) return;
    setSaving(true);

    let completed = 0;
    sheetItems.forEach(it => {
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
          if (completed === sheetItems.length) {
            setSaving(false);
            setMessage('All lab test results saved successfully!');
            setTimeout(() => setMessage(''), 4000);
            fetchWorklist();
          }
        })
        .catch(err => {
          completed++;
          if (completed === sheetItems.length) setSaving(false);
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

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '50%', marginBottom: '16px' }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0' }}>Access Denied</h2>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px auto' }}>
          You do not have permission to view the Lab Result Entry module. Please contact your administrator to grant permission in User Management & Role Permission Matrix.
        </p>
      </div>
    );
  }

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
                {/* Save All Lab Results - commented out with the sub-parameter sheet (24-Sep-2026)
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
                */}
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

                    {templatesChecking && !hasTemplate(it) ? (
                      <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--outline)' }}>
                        Checking report template...
                      </div>
                    ) : hasTemplate(it) ? (
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                            Word report template ({templateCounts[(it.testCode || '').trim()]} format{templateCounts[(it.testCode || '').trim()] > 1 ? 's' : ''})
                          </div>
                          {it.sentBackNote && (
                            <div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', color: '#9a3412', fontSize: '12.5px', fontWeight: '600', maxWidth: '520px' }}>
                              <strong>Sent back{it.sentBackBy ? ` by ${it.sentBackBy}` : ''}:</strong> {it.sentBackNote}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Where this test stands right now */}
                          {(() => {
                            const st = reportStatus(it);
                            return (
                              <span title={st.hint} style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', ...st.style }}>
                                {st.label}
                              </span>
                            );
                          })()}

                          {/* One menu for everything that can be done with this test */}
                          <div style={{ position: 'relative' }} data-actions-menu>
                            <button
                              type="button"
                              onClick={(e) => {
                                if (openMenuId === it.id) { setOpenMenuId(null); return; }
                                setMenuRect(e.currentTarget.getBoundingClientRect());
                                setOpenMenuId(it.id);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', backgroundColor: '#0369a1', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-lg)', fontWeight: '800', cursor: 'pointer' }}
                            >
                              Actions <ChevronDown size={15} />
                            </button>

                            {openMenuId === it.id && menuRect && createPortal(
                              <div data-actions-menu style={{ position: 'fixed', top: menuRect.bottom + 6, left: Math.max(8, menuRect.right - 230), zIndex: 3000, minWidth: '230px', padding: '6px', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)' }}>
                                <button type="button" onClick={() => { setOpenMenuId(null); openReportEditor(it); }} style={menuItemStyle}>
                                  <FileText size={16} /> {it.sentBackNote ? 'Correct & Save report' : (it.hasNarrative ? 'View report' : 'Write report')}
                                </button>

                                {it.hasDoctorCopy ? (
                                  <a href={`${API_BASE}/api/lab/doctor-copy/${encodeURIComponent(it.id)}`} target="_blank" rel="noreferrer" onClick={() => setOpenMenuId(null)} style={menuItemStyle}>
                                    <Paperclip size={16} /> View doctor copy
                                  </a>
                                ) : (
                                  <button type="button" onClick={() => { setOpenMenuId(null); openReportEditor(it); }} style={menuItemStyle}>
                                    <Upload size={16} /> Upload doctor copy
                                  </button>
                                )}

                                {(it.hasPdf || it.hasNarrative) && (
                                  it.approvedAt ? (
                                    <>
                                      <a href={`${API_BASE}/api/lab/report-pdf/${encodeURIComponent(it.id)}`} target="_blank" rel="noreferrer" onClick={() => setOpenMenuId(null)} style={menuItemStyle}>
                                        <FileDown size={16} /> View report PDF
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          window.open(`/lab/print-report?bookingId=${encodeURIComponent(it.booking_id)}&itemId=${encodeURIComponent(it.id)}`, '_blank');
                                        }}
                                        style={menuItemStyle}
                                      >
                                        <Printer size={16} /> Print report
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        showAlert({
                                          type: 'warning',
                                          title: 'Waiting for approval',
                                          message: 'This report is not approved yet. The PDF opens once it is approved in Report Approval.',
                                        });
                                      }}
                                      style={{ ...menuItemStyle, color: 'var(--outline)' }}
                                    >
                                      <FileDown size={16} /> PDF (after approval)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        showAlert({
                                          type: 'warning',
                                          title: 'Waiting for approval',
                                          message: 'This report is not approved yet. Printing opens once it is approved in Report Approval.',
                                        });
                                      }}
                                      style={{ ...menuItemStyle, color: 'var(--outline)' }}
                                    >
                                      <Printer size={16} /> Print (after approval)
                                    </button>
                                    </>
                                  )
                                )}
                              </div>,
                              document.body
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '13px', color: 'var(--outline)' }}>
                          No Word report template is linked to this test yet.
                        </div>
                        {templatePerms.can_view && (
                          <button
                            type="button"
                            onClick={() => router.push(`/master/report-templates?test=${encodeURIComponent((it.testCode || '').trim())}`)}
                            title="Open Report Template master for this test"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', backgroundColor: 'var(--surface-container-high)', color: 'var(--primary)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', fontWeight: '800', cursor: 'pointer' }}
                          >
                            <Upload size={16} /> Upload Template
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sub-parameter result sheet - commented out on request (24-Sep-2026).
                        The parameters were hardcoded dummy values (mg/dL, 70-110), not real test
                        parameters, so the sheet was misleading. Results are entered through the
                        Word report template editor instead.
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
                    */}
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
