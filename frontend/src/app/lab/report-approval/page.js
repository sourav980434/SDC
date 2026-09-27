'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShieldCheck, TriangleAlert, RefreshCw, Undo2, ExternalLink, FileDown, Paperclip, Maximize2 } from 'lucide-react';
import styles from './approval.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import { useAuth } from '@/context/AuthContext';
import { getDeptBadgeStyle } from '@/lib/deptBadge';

const TABS = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'sent_back', label: 'Sent Back' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

export default function ReportApprovalPage() {
  const perms = useActionPermission('report_approval');
  const { user: activeUser } = useAuth();
  const { showAlert } = useAlert();

  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedRowRef = useRef(null);

  const fetchQueue = useCallback((keepSelectionId = null) => {
    setLoading(true);
    fetch(`${API_BASE}/api/lab/approval-queue?status=${tab}&search=${encodeURIComponent(search)}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        setSelected(prev => {
          const keepId = keepSelectionId ?? prev?.id;
          return list.find(r => r.id === keepId) || null;
        });
      })
      .catch(() => showAlert({ type: 'error', title: 'Could not load the list', message: 'Please check that the backend server is running.' }))
      .finally(() => setLoading(false));
  }, [tab, search, showAlert]);

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const openRow = (row) => {
    setSelected(row);
    setNote(row.note || '');
  };

  const decide = async (approve) => {
    if (!selected || busy) return;

    if (approve && !selected.hasDoctorCopy) {
      await showAlert({
        type: 'warning',
        title: 'Doctor copy missing',
        message: 'This report has no doctor copy uploaded, so it cannot be approved. Please upload it from Lab Result Entry first.',
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/lab/approve-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Name': activeUser?.username || 'System' },
        body: JSON.stringify({ id: selected.id, approve, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');

      await showAlert({
        type: 'success',
        title: approve ? 'Report approved' : 'Sent back',
        message: approve
          ? `${selected.testName} of ${selected.patientName} is approved.`
          : `${selected.testName} of ${selected.patientName} is sent back for correction.`,
      });
      fetchQueue(selected.id);
    } catch (e) {
      showAlert({ type: 'error', title: approve ? 'Not approved' : 'Not sent back', message: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={styles.denied}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission to approve reports. Please ask the administrator for the <strong>Report Approval</strong> module.</p>
      </div>
    );
  }

  const isImageCopy = selected?.doctorCopyName && !/\.pdf$/i.test(selected.doctorCopyName);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2>Report Approval</h2>
          <p>Match every written report with the doctor&apos;s signed copy, then approve it.</p>
        </div>
        <button type="button" className={styles.ghostBtn} onClick={() => fetchQueue()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.grid}>
        {/* Worklist */}
        <div className={styles.listCard}>
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.searchRow}>
            <Search size={15} />
            <input
              className={styles.searchInput}
              placeholder="Booking no, patient, mobile or test..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchQueue(); }}
            />
          </div>

          <div className={styles.listScroll}>
            {rows.length === 0 && !loading && (
              <div className={styles.emptyList}>No reports in this list.</div>
            )}
            {rows.map(row => {
              const active = selected?.id === row.id;
              return (
                <div
                  key={row.id}
                  ref={active ? selectedRowRef : null}
                  className={`${styles.row} ${active ? styles.rowActive : ''}`}
                  onClick={() => openRow(row)}
                >
                  <div className={styles.rowTop}>
                    <span className={styles.bookingNo}>{row.bookingNo}</span>
                    {row.approvedAt
                      ? <span className={`${styles.pill} ${styles.pillOk}`}>Approved</span>
                      : row.resubmittedAt
                        ? <span className={`${styles.pill} ${styles.pillFixed}`}>Corrected</span>
                        : row.sentBackAt
                        ? <span className={`${styles.pill} ${styles.pillBack}`}>Sent back</span>
                        : row.hasDoctorCopy
                          ? <span className={`${styles.pill} ${styles.pillReady}`}>Ready</span>
                          : <span className={`${styles.pill} ${styles.pillWait}`}>No doctor copy</span>}
                  </div>
                  <div className={styles.patient}>{row.patientName}</div>
                  <div className={styles.testLine}>
                    {row.testName} <span className={styles.testCode}>({row.testCode})</span>
                  </div>
                  <div className={styles.metaLine}>
                    <span>{row.bookingDate}</span>
                    {row.deptName && (
                      <span className={styles.deptBadge} style={getDeptBadgeStyle(row.deptName)}>{row.deptName}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side by side comparison */}
        <div className={styles.compareCard}>
          {!selected ? (
            <div className={styles.emptyState}>
              <ShieldCheck size={40} />
              <h3>Select a report</h3>
              <p>Pick a report on the left to see it next to the doctor copy.</p>
            </div>
          ) : (
            <>
              <div className={styles.patientBar}>
                <div>
                  <strong>{selected.patientName}</strong>
                  <span className={styles.sep}>·</span>{selected.bookingNo}
                  <span className={styles.sep}>·</span>{selected.age} {selected.sex}
                  <div className={styles.subLine}>
                    {selected.testName} ({selected.testCode}) · Ref: {selected.refDoctor || 'SELF'}
                    {selected.enteredBy ? ` · Entered by ${selected.enteredBy}` : ''}
                    {selected.enteredAt ? ` on ${selected.enteredAt}` : ''}
                  </div>
                </div>
                <a
                  className={styles.openTabBtn}
                  href={`/lab/report-approval/review?id=${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open this report and the doctor copy in a new tab"
                >
                  <Maximize2 size={14} /> Open in new tab
                </a>
                {selected.approvedAt && (
                  <div className={styles.approvedBox}>
                    <ShieldCheck size={14} /> Approved by {selected.approvedBy || '-'}<br />
                    <span>{selected.approvedAt}</span>
                  </div>
                )}
              </div>

              {selected.note && (
                <div className={styles.noteBar}>
                  <strong>{selected.sentBackAt ? 'Sent back' : 'Comment'}:</strong> {selected.note}
                  {selected.sentBackBy ? ` — ${selected.sentBackBy}, ${selected.sentBackAt}` : ''}
                </div>
              )}

              {selected.resubmittedAt && !selected.approvedAt && (
                <div className={styles.fixedBar}>
                  <strong>Corrected and saved again{selected.resubmittedBy ? ` by ${selected.resubmittedBy}` : ''}</strong>
                  {` on ${selected.resubmittedAt} — please check it against the doctor copy again.`}
                </div>
              )}

              <div className={styles.panes}>
                <div className={styles.pane}>
                  <div className={styles.paneHead}>
                    <span><FileDown size={14} /> Report (system)</span>
                    <a href={`${API_BASE}/api/lab/report-pdf/${selected.id}`} target="_blank" rel="noreferrer" title="Open in a new tab">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <iframe
                    key={`pdf-${selected.id}`}
                    className={styles.viewer}
                    src={`${API_BASE}/api/lab/report-pdf/${selected.id}#toolbar=0`}
                    title="Report PDF"
                  />
                </div>

                <div className={styles.pane}>
                  <div className={styles.paneHead}>
                    <span><Paperclip size={14} /> Doctor copy</span>
                    {selected.hasDoctorCopy && (
                      <a href={`${API_BASE}/api/lab/doctor-copy/${selected.id}`} target="_blank" rel="noreferrer" title="Open in a new tab">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {!selected.hasDoctorCopy ? (
                    <div className={styles.missingCopy}>
                      <TriangleAlert size={28} />
                      <p>No doctor copy uploaded for this test.</p>
                      <span>Upload it from Lab Result Entry, then approve here.</span>
                    </div>
                  ) : isImageCopy ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`copy-${selected.id}`}
                      className={styles.imageViewer}
                      src={`${API_BASE}/api/lab/doctor-copy/${selected.id}`}
                      alt="Doctor copy"
                    />
                  ) : (
                    <iframe
                      key={`copy-${selected.id}`}
                      className={styles.viewer}
                      src={`${API_BASE}/api/lab/doctor-copy/${selected.id}#toolbar=0`}
                      title="Doctor copy"
                    />
                  )}
                </div>
              </div>

              <div className={styles.actionBar}>
                <input
                  className={styles.noteInput}
                  placeholder="Remark (optional) - e.g. value corrected, matches doctor copy"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={500}
                />
                {selected.approvedAt ? (
                  <button type="button" className={styles.backBtn} onClick={() => decide(false)} disabled={busy || !perms.can_approve}>
                    <Undo2 size={16} /> {busy ? 'Working...' : 'Send back for correction'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.approveBtn}
                    onClick={() => decide(true)}
                    disabled={busy || !selected.hasDoctorCopy || !perms.can_approve}
                    title={!perms.can_approve ? 'You do not have approve rights' : (!selected.hasDoctorCopy ? 'Doctor copy is missing' : 'Approve this report')}
                  >
                    <ShieldCheck size={16} /> {busy ? 'Approving...' : 'Approve Report'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
