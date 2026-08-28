'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import styles from './print.module.css';

import API_BASE from '@/lib/apiConfig';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';

function PrintReportContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [reportData, setReportData] = useState(null);
  const [labCfg, setLabCfg] = useState(DEFAULT_LAB_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLabSettings().then(cfg => setLabCfg(cfg));

    if (!bookingId) {
      setError('No Booking ID provided.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/lab/patient-full-report/${bookingId}`)
      .then(res => {
        if (!res.ok) throw new Error('Report data not found.');
        return res.json();
      })
      .then(data => {
        setReportData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading patient report:", err);
        setError('Failed to load patient report data.');
        setLoading(false);
      });
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Loading Clinical Report Canvas...</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className={styles.errorState}>
        <h2>Report Loading Error</h2>
        <p>{error || 'Clinical report record not found.'}</p>
        <button onClick={() => window.history.back()} className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const { header, test_items } = reportData;

  const pathologyItems = test_items.filter(it => it.result_json && it.result_json.length > 0);
  const narrativeItems = test_items.filter(it => it.narrative_html || (!it.result_json || it.result_json.length === 0));

  return (
    <div className={styles.pageWrapper}>
      {/* Top Action Bar (Screen Only) */}
      <div className={`${styles.actionBar} no-print`}>
        <button onClick={() => window.history.back()} className={styles.backBtn}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} className={styles.printBtn}>
            <Printer size={18} /> Print Clinical Report (Ctrl + P)
          </button>
        </div>
      </div>

      {/* Report Canvas Container */}
      <div className={styles.bgWrapper}>
        <div className={styles.reportContainer}>

          {/* 1. Official Dynamic Header */}
          <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {labCfg.lab_name}
              </h1>
              <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0 0', fontWeight: '600' }}>
                {labCfg.lab_address} | Phone: {labCfg.lab_phone}
              </p>
              <p style={{ fontSize: '10.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                Email: {labCfg.lab_email} | Web: {labCfg.lab_website}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {labCfg.lab_accreditation && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', color: '#15803d', fontSize: '10px', fontWeight: '800' }}>
                  <ShieldCheck size={14} /> {labCfg.lab_accreditation}
                </div>
              )}
              {labCfg.lab_certification && (
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: '700' }}>
                  {labCfg.lab_certification}
                </div>
              )}
            </div>
          </div>

          {/* 2. Patient Demography Card Box */}
          <div className={styles.demographyBox}>
            <div><strong>Patient Name:</strong> <span style={{ fontSize: '13px', textTransform: 'uppercase' }}>{header.patient_name}</span></div>
            <div><strong>Booking / Lab No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '13px' }}>{header.booking_no}</span></div>

            <div><strong>Age / Gender:</strong> {header.patient_age} / {header.patient_sex === 'M' ? 'Male' : 'Female'}</div>
            <div><strong>Booking Date:</strong> {header.booking_date ? new Date(header.booking_date).toLocaleDateString('en-IN') : 'N/A'}</div>

            <div><strong>Ref. Doctor:</strong> <span style={{ color: '#0369a1', fontWeight: '700' }}>{header.doctor_name}</span> {header.doctor_qual && `(${header.doctor_qual})`}</div>
            <div><strong>Contact No:</strong> +91 {header.patient_phone || 'N/A'}</div>
          </div>

          {/* 3. Pathology Tests Breakdown */}
          {pathologyItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '10px' }}>
                DEPARTMENT OF PATHOLOGY & CLINICAL BIOCHEMISTRY
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '35%' }}>INVESTIGATION</th>
                    <th style={{ padding: '8px 10px', width: '20%' }}>OBSERVED RESULT</th>
                    <th style={{ padding: '8px 10px', width: '15%' }}>UNIT</th>
                    <th style={{ padding: '8px 10px', width: '30%' }}>BIOLOGICAL REFERENCE INTERVAL</th>
                  </tr>
                </thead>
                <tbody>
                  {pathologyItems.map(it => (
                    <React.Fragment key={it.id}>
                      <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <td colSpan={4} style={{ padding: '6px 10px', fontWeight: '800', color: '#1e3a8a', fontSize: '12.5px' }}>
                          TEST: {it.test_name} ({it.test_code})
                        </td>
                      </tr>
                      {it.result_json.map((p, idx) => {
                        const isHigh = p.value && p.male_max && parseFloat(p.value) > p.male_max;
                        const isLow = p.value && p.male_min && parseFloat(p.value) < p.male_min;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', paddingLeft: '20px' }}>{p.param_name}</td>
                            <td style={{ padding: '6px 10px', fontWeight: '800', color: isHigh || isLow ? '#c2410c' : '#0f172a' }}>
                              {p.value || '—'} {isHigh && ' (H)'} {isLow && ' (L)'}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.unit}</td>
                            <td style={{ padding: '6px 10px', color: '#475569', fontSize: '11.5px' }}>
                              {p.male_min !== undefined ? `${p.male_min} - ${p.male_max}` : 'As per clinical correlation'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Radiology & Narrative Impression Tests */}
          {narrativeItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '12px' }}>
                RADIOLOGY & DESCRIPTIVE REPORT FINDINGS
              </div>

              {narrativeItems.map(it => (
                <div key={it.id} style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                    {it.test_name} ({it.test_code})
                  </h3>
                  {it.narrative_html ? (
                    <div
                      style={{ fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#334155' }}
                      dangerouslySetInnerHTML={{ __html: it.narrative_html }}
                    />
                  ) : (
                    <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                      Narrative report findings pending entry.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 5. Dynamic Footer Signatures & Disclaimer */}
          <div style={{ marginTop: '40px', borderTop: '1.5px solid #cbd5e1', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '11px', marginBottom: '20px' }}>
              {(labCfg.report_signatories || []).map((sig, idx) => (
                <div key={idx}>
                  <div style={{ height: '40px' }}></div>
                  <div style={{ fontWeight: '800', color: '#0f172a' }}>{sig.name || sig.designation}</div>
                  <div style={{ color: '#64748b' }}>{sig.designation}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '9.5px', color: '#94a3b8', textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
              * {labCfg.report_disclaimer}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'sans-serif' }}>Loading report canvas...</div>}>
      <PrintReportContent />
    </Suspense>
  );
}
