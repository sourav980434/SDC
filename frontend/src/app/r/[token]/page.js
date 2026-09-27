'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Clock, TriangleAlert } from 'lucide-react';
import styles from '../../print/report/print.module.css';
import local from './public.module.css';

import API_BASE from '@/lib/apiConfig';
import ReportPreview from '@/components/ReportPreview';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';
import { previewProps } from '@/lib/reportView';

/**
 * Patient's report page - the QR code on a printed report opens it: /r/<token>.
 * No login. Shows the booking's approved reports and saves them as PDF (browser "Save as PDF").
 */
export default function PublicReportPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lab, setLab] = useState(DEFAULT_LAB_CONFIG);
  const [letterhead, setLetterhead] = useState(null);
  const [scale, setScale] = useState(1);   // A4 page shrunk to the phone's width on screen (print is full size)

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 16) / 794));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchLabSettings(),
      fetch(`${API_BASE}/api/public/report/${encodeURIComponent(token)}`).then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || (res.status === 429 ? 'Too many tries - please wait a minute and open the link again.' : 'This report link is not valid.'));
        return body;
      }),
    ])
      .then(([cfg, body]) => {
        setLab(cfg);
        if (cfg?.letterhead_image) {
          setLetterhead({
            url: `${API_BASE}/api/setup/letterhead?v=${encodeURIComponent(cfg.letterhead_image)}`,
            topMm: Number(cfg.letterhead_top_mm) || 45,
            bottomMm: Number(cfg.letterhead_bottom_mm) || 25,
          });
        }
        setData(body);
        document.title = `Report - ${body.patientName} (${body.bookingNo})`;
      })
      .catch(err => setError(err.message || 'Could not open the report. Please try again later.'));
  }, [token]);

  if (error) return <div className={styles.message}><TriangleAlert size={18} /> {error}</div>;
  if (!data) return <div className={styles.message}>Opening your report...</div>;

  const ready = data.reports || [];

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div>
          <strong>{lab.lab_name}</strong>
          <div className={local.sub}>{data.patientName} · {data.bookingNo} · {data.bookingDate}</div>
        </div>
        {ready.length > 0 && (
          <button type="button" className={styles.printBtn} onClick={() => window.print()} title="Choose “Save as PDF” in the print window">
            <Download size={16} /> Download PDF
          </button>
        )}
      </div>

      {ready.length > 0 && (
        <div className={local.hint}>
          Tap <strong>Download PDF</strong> and choose <strong>Save as PDF</strong> as the printer to keep the report on your phone or computer.
        </div>
      )}

      {data.pending?.length > 0 && (
        <div className={local.pending}>
          <Clock size={18} />
          <div>
            <strong>{ready.length ? 'Some reports are not ready yet' : 'Your report is not ready yet'}</strong>
            <div>{data.pending.join(', ')} - please open this link again later.</div>
          </div>
        </div>
      )}

      {ready.map(it => (
        <div key={it.id} className={`${styles.sheet} ${local.fit}`} style={{ '--fit': scale }}>
          <ReportPreview {...previewProps({ item: it, report: it.report, values: it.report.values || {}, lab, letterhead, doctor: it.doctor })} />
        </div>
      ))}
    </div>
  );
}
