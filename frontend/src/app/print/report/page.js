'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, TriangleAlert } from 'lucide-react';
import styles from './print.module.css';

import API_BASE from '@/lib/apiConfig';
import ReportPreview from '@/components/ReportPreview';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';
import { previewProps } from '@/lib/reportView';

/**
 * Approved reports (Report Entry / Report Approval) ready to print: /print/report?ids=20150,20151
 * or every approved report of a booking: /print/report?booking=20041
 * One A4 page per test. Outside the dashboard layout, so only the report is printed.
 */
function PrintContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [lab, setLab] = useState(DEFAULT_LAB_CONFIG);
  const [letterhead, setLetterhead] = useState(null);

  useEffect(() => {
    const bookingId = Number(searchParams?.get('booking'));
    const listed = String(searchParams?.get('ids') || '').split(',').map(s => Number(s.trim())).filter(Boolean);
    // ?booking=<id>: every approved report of that booking
    const idsFor = bookingId
      ? fetch(`${API_BASE}/api/report-entry/queue?status=approved&booking_id=${bookingId}`).then(res => res.json()).then(rows => (Array.isArray(rows) ? rows.map(r => r.id) : []))
      : Promise.resolve(listed);

    idsFor
      .then(ids => {
        if (!ids.length) {
          setError(bookingId ? 'No approved report for this booking yet.' : 'No report was chosen.');
          return null;
        }
        return Promise.all([
          fetchLabSettings(),
          ...ids.map(id => fetch(`${API_BASE}/api/report-entry/item/${id}`).then(async res => {
            const data = await res.json();
            return res.ok ? data : { id, error: data.error || 'Could not load this report.' };
          })),
        ]);
      })
      .then(loaded => {
        if (!loaded) return;
        const [cfg, ...list] = loaded;
        setLab(cfg);
        if (cfg?.letterhead_image) {
          setLetterhead({
            url: `${API_BASE}/api/setup/letterhead?v=${encodeURIComponent(cfg.letterhead_image)}`,
            topMm: Number(cfg.letterhead_top_mm) || 45,
            bottomMm: Number(cfg.letterhead_bottom_mm) || 25,
          });
        }
        setItems(list);
      })
      .catch(() => setError('Could not load the reports. Please check that the backend server is running.'));
  }, [searchParams]);

  if (error) return <div className={styles.message}><TriangleAlert size={18} /> {error}</div>;
  if (!items) return <div className={styles.message}>Loading reports...</div>;

  const ready = items.filter(it => !it.error && it.state === 'APPROVED' && it.report);
  const skipped = items.filter(it => !ready.includes(it));

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <strong>{ready.length} report{ready.length === 1 ? '' : 's'} ready to print</strong>
        {skipped.length > 0 && (
          <span className={styles.warn}>
            <TriangleAlert size={14} /> Not printed (not approved): {skipped.map(it => it.testName || `#${it.id}`).join(', ')}
          </span>
        )}
        <button type="button" className={styles.printBtn} onClick={() => window.print()} disabled={!ready.length}>
          <Printer size={16} /> Print
        </button>
      </div>

      {ready.map(it => (
        <div key={it.id} className={styles.sheet}>
          <ReportPreview {...previewProps({ item: it, report: it.report, values: it.report.values || {}, lab, letterhead, doctor: it.doctor })} />
        </div>
      ))}
    </div>
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
