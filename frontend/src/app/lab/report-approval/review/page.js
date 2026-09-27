'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, TriangleAlert, Undo2, ExternalLink, FileDown, Paperclip, RefreshCw, X } from 'lucide-react';
import styles from './review.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import { useAuth } from '@/context/AuthContext';

/**
 * Full tab review of one report: the system PDF and the doctor copy side by side, large enough to
 * read, with Approve and "Send back with a comment" right there.
 * Opened from /lab/report-approval in a new tab: /lab/report-approval/review?id=<detail id>
 */
function ReviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const perms = useActionPermission('report_approval');
  const { user: activeUser } = useAuth();
  const { showAlert } = useAlert();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);   // 'report' | 'copy' - one pane full width

  const load = useCallback(() => {
    if (!id) {
      setError('No report selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/api/lab/approval-item/${encodeURIComponent(id)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Report not found.');
        setItem(data);
        setNote(data.note || '');
        setError('');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const decide = async (approve) => {
    if (!item || busy) return;

    if (approve && !item.hasDoctorCopy) {
      await showAlert({ type: 'warning', title: 'Doctor copy missing', message: 'This report cannot be approved until the doctor copy is uploaded.' });
      return;
    }
    if (!approve && !note.trim()) {
      await showAlert({ type: 'warning', title: 'Comment required', message: 'Please write what does not match, so the report can be corrected and the doctor copy re-uploaded.' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/lab/approve-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Name': activeUser?.username || 'System' },
        body: JSON.stringify({ id: item.id, approve, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');

      await showAlert({
        type: 'success',
        title: approve ? 'Report approved' : 'Sent back for correction',
        message: approve
          ? `${item.testName} of ${item.patientName} is approved.`
          : `${item.testName} of ${item.patientName} is sent back. Your comment is shown to the person who wrote the report.`,
      });
      load();
    } catch (e) {
      showAlert({ type: 'error', title: approve ? 'Not approved' : 'Not sent back', message: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={styles.state}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission to approve reports.</p>
      </div>
    );
  }

  if (loading) return <div className={styles.state}><h3>Loading report...</h3></div>;
  if (error || !item) {
    return (
      <div className={styles.state}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Could not open this report</h3>
        <p>{error}</p>
      </div>
    );
  }

  const isImageCopy = item.doctorCopyName && !/\.pdf$/i.test(item.doctorCopyName);

  return (
    <div className={styles.page}>
      {/* Patient / test header */}
      <div className={styles.header}>
        <div>
          <h2>{item.patientName}</h2>
          <div className={styles.meta}>
            {item.bookingNo} · {item.age} {item.sex} · {item.phone || 'no contact'} · {item.bookingDate}
          </div>
          <div className={styles.meta}>
            <strong>{item.testName}</strong> ({item.testCode}) · {item.deptName} · Ref: {item.refDoctor || 'SELF'}
            {item.enteredBy ? ` · Entered by ${item.enteredBy}` : ''}{item.enteredAt ? ` on ${item.enteredAt}` : ''}
          </div>
        </div>

        <div className={styles.headRight}>
          <button type="button" className={styles.ghostBtn} onClick={load} disabled={busy}>
            <RefreshCw size={14} /> Refresh
          </button>
          {item.approvedAt && (
            <div className={styles.statusOk}>
              <ShieldCheck size={15} /> Approved by {item.approvedBy || '-'} · {item.approvedAt}
            </div>
          )}
          {!item.approvedAt && item.sentBackAt && (
            <div className={styles.statusBack}>
              <Undo2 size={15} /> Sent back by {item.sentBackBy || '-'} · {item.sentBackAt}
            </div>
          )}
        </div>
      </div>

      {item.note && (
        <div className={styles.noteBar}>
          <strong>Last comment:</strong> {item.note}
        </div>
      )}

      {item.resubmittedAt && !item.approvedAt && (
        <div className={styles.fixedBar}>
          <strong>Corrected and saved again{item.resubmittedBy ? ` by ${item.resubmittedBy}` : ''}</strong>
          {` on ${item.resubmittedAt} — check it against the doctor copy again.`}
        </div>
      )}

      {/* Side by side, either pane can be zoomed to full width */}
      <div className={`${styles.panes} ${zoom ? styles.panesZoomed : ''}`}>
        {zoom !== 'copy' && (
          <div className={styles.pane}>
            <div className={styles.paneHead}>
              <span><FileDown size={15} /> Report (system)</span>
              <div className={styles.paneActions}>
                <button type="button" onClick={() => setZoom(zoom === 'report' ? null : 'report')} title={zoom === 'report' ? 'Show both' : 'Full width'}>
                  {zoom === 'report' ? <X size={15} /> : 'Full width'}
                </button>
                <a href={`${API_BASE}/api/lab/report-pdf/${item.id}`} target="_blank" rel="noreferrer" title="Open the PDF alone">
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
            <iframe className={styles.viewer} src={`${API_BASE}/api/lab/report-pdf/${item.id}`} title="Report PDF" />
          </div>
        )}

        {zoom !== 'report' && (
          <div className={styles.pane}>
            <div className={styles.paneHead}>
              <span><Paperclip size={15} /> Doctor copy</span>
              <div className={styles.paneActions}>
                {item.hasDoctorCopy && (
                  <>
                    <button type="button" onClick={() => setZoom(zoom === 'copy' ? null : 'copy')} title={zoom === 'copy' ? 'Show both' : 'Full width'}>
                      {zoom === 'copy' ? <X size={15} /> : 'Full width'}
                    </button>
                    <a href={`${API_BASE}/api/lab/doctor-copy/${item.id}`} target="_blank" rel="noreferrer" title="Open the copy alone">
                      <ExternalLink size={15} />
                    </a>
                  </>
                )}
              </div>
            </div>
            {!item.hasDoctorCopy ? (
              <div className={styles.missing}>
                <TriangleAlert size={30} />
                <p>No doctor copy uploaded for this test.</p>
                <span>It has to be uploaded from Lab Result Entry before this report can be approved.</span>
              </div>
            ) : isImageCopy ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.imageViewer} src={`${API_BASE}/api/lab/doctor-copy/${item.id}`} alt="Doctor copy" />
            ) : (
              <iframe className={styles.viewer} src={`${API_BASE}/api/lab/doctor-copy/${item.id}`} title="Doctor copy" />
            )}
          </div>
        )}
      </div>

      {/* Decision */}
      <div className={styles.actionBar}>
        <input
          className={styles.noteInput}
          placeholder="Comment - what does not match? (required when sending back)"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
        />
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => decide(false)}
          disabled={busy || !perms.can_approve}
          title={!perms.can_approve ? 'You do not have approve rights' : 'Send back for correction'}
        >
          <Undo2 size={16} /> Send back with comment
        </button>
        <button
          type="button"
          className={styles.approveBtn}
          onClick={() => decide(true)}
          disabled={busy || !!item.approvedAt || !item.hasDoctorCopy || !perms.can_approve}
          title={item.approvedAt ? 'Already approved' : (!item.hasDoctorCopy ? 'Doctor copy is missing' : 'Approve this report')}
        >
          <ShieldCheck size={16} /> {busy ? 'Working...' : (item.approvedAt ? 'Approved' : 'Approve Report')}
        </button>
      </div>
    </div>
  );
}

export default function ReportReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading report...</div>}>
      <ReviewContent />
    </Suspense>
  );
}
