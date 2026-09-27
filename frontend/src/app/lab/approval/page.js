'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, RefreshCw, CheckCircle, Undo2, Printer, FileCheck, TriangleAlert, Info, ExternalLink } from 'lucide-react';
import styles from '../../master/master.module.css';
import local from '../report-entry/entry.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import ReportPreview from '@/components/ReportPreview';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';
import { previewProps, STATE_LABELS } from '@/lib/reportView';

const TABS = [
  { key: 'SUBMITTED', label: 'Waiting' },
  { key: 'SENT_BACK', label: 'Sent back' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'all', label: 'All' },
];

const StatePill = ({ state }) => <span className={`${local.pill} ${local[`pill${state}`]}`}>{STATE_LABELS[state] || state}</span>;

function ApprovalContent() {
  const searchParams = useSearchParams();
  const perms = useActionPermission('report_approval');
  const { showAlert } = useAlert();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [item, setItem] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [note, setNote] = useState('');
  const [doctorCode, setDoctorCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [lab, setLab] = useState(DEFAULT_LAB_CONFIG);
  const [letterhead, setLetterhead] = useState(null);


  useEffect(() => {
    fetchLabSettings().then(cfg => {
      setLab(cfg);
      if (cfg?.letterhead_image) {
        setLetterhead({
          url: `${API_BASE}/api/setup/letterhead?v=${encodeURIComponent(cfg.letterhead_image)}`,
          topMm: Number(cfg.letterhead_top_mm) || 45,
          bottomMm: Number(cfg.letterhead_bottom_mm) || 25,
        });
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/report-approval/queue?status=all&search=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => showAlert({ type: 'error', title: 'Could not load reports', message: 'Please check that the backend server is running.' }))
      .finally(() => setLoading(false));
  }, [query, showAlert]);

  useEffect(() => { loadList(); }, [loadList]);

  const counts = useMemo(() => {
    const c = { all: list.length };
    TABS.forEach(t => { if (t.key !== 'all') c[t.key] = list.filter(r => r.state === t.key).length; });
    return c;
  }, [list]);

  const visible = useMemo(() => (tab === 'all' ? list : list.filter(r => r.state === tab)), [list, tab]);

  const openItem = useCallback((id) => {
    setSelectedId(id);
    setItem(null);
    setNote('');
    setItemLoading(true);
    fetch(`${API_BASE}/api/report-entry/item/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not open this report.');
        setItem(data);
      })
      .catch(err => {
        setSelectedId(null);
        showAlert({ type: 'error', title: 'Report not opened', message: err.message });
      })
      .finally(() => setItemLoading(false));
  }, [showAlert]);

  // Reporting doctors of the test's department; the one chosen in Report Entry comes first
  const doctors = item?.doctors || [];
  useEffect(() => {
    if (!item) return;
    setDoctorCode(item.doctor?.code || ((item.doctors || []).length === 1 ? item.doctors[0].code : ''));
  }, [item]);

  // /lab/approval?id=20150 - from a notification
  useEffect(() => {
    const id = Number(searchParams?.get('id'));
    if (id && !selectedId) {
      setTab('all');
      openItem(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const chosenDoctor = doctors.find(d => d.code === doctorCode) || (item?.doctor && (!item.doctor.code || item.doctor.code === doctorCode) ? item.doctor : null);

  const decide = async (approve) => {
    if (!item || busy) return;
    if (approve && !chosenDoctor) {
      showAlert({ type: 'warning', title: 'Choose the doctor', message: 'Please choose the reporting doctor who signs this report.' });
      return;
    }
    if (!approve && !note.trim()) {
      showAlert({ type: 'warning', title: 'Write the correction', message: 'Please write in the remark box what needs to be corrected.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-approval/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, approve, note: note.trim(), doctor_code: approve ? (chosenDoctor?.code || '') : '' }),
      });
      const data = await res.json().catch(() => ({ error: 'Unexpected reply from the server.' }));
      if (!res.ok) throw new Error(data.error || 'Not saved.');
      setList(prev => prev.map(r => (r.id === item.id ? { ...r, state: data.state } : r)));
      openItem(item.id);
      showAlert({
        type: 'success',
        title: approve ? 'Report approved' : 'Sent back',
        message: approve ? `${item.testName} of ${item.patientName} is approved and can be printed.` : `${item.testName} went back to ${item.submittedBy || 'the writer'} for correction.`,
      });
    } catch (err) {
      showAlert({ type: 'error', title: approve ? 'Not approved' : 'Not sent back', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={local.empty}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission to approve reports. Please ask the administrator for the <strong>Report Approval</strong> module.</p>
      </div>
    );
  }

  const report = item?.report;
  const canDecide = perms.can_approve;

  return (
    <div className={local.layout} style={{ gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)' }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Report Approval</h2>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={loadList} disabled={loading} title="Reload"><RefreshCw size={14} /></button>
        </div>
        <div className={styles.searchBox} style={{ position: 'relative', marginBottom: 0 }}>
          <input className={styles.searchInput} style={{ paddingRight: 36 }} placeholder="Patient, booking no or test..." value={search} onChange={e => setSearch(e.target.value)} />
          <Search size={16} className={local.searchIcon} />
        </div>
        <div className={local.tabs}>
          {TABS.map(t => (
            <button key={t.key} type="button" className={`${local.tab} ${tab === t.key ? local.tabActive : ''}`} onClick={() => setTab(t.key)}>
              {t.label} {counts[t.key] ?? 0}
            </button>
          ))}
        </div>
        <div className={local.list}>
          {loading && list.length === 0 && <div className={local.muted}>Loading...</div>}
          {!loading && visible.length === 0 && <div className={local.muted}>{tab === 'SUBMITTED' ? 'No report is waiting for approval.' : 'Nothing here.'}</div>}
          {visible.map(r => (
            <div key={r.id} className={`${local.lineRow} ${selectedId === r.id ? local.lineRowActive : ''}`} onClick={() => openItem(r.id)} style={{ paddingLeft: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.testName}</div>
                <div className={local.sub}>{r.patientName} · {r.bookingNo}</div>
                <div className={local.sub}>{r.submittedBy ? `by ${r.submittedBy}` : ''}{r.resubmittedAt && r.state === 'SUBMITTED' ? ' · corrected' : ''}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <StatePill state={r.state} />
                {!r.hasDoctorCopy && <span className={`${local.pill} ${local.pillWarn}`}>No copy</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        {!selectedId ? (
          <div className={local.empty}>
            <FileCheck size={40} />
            <h3>Select a report</h3>
            <p>Compare the typed report with the doctor copy, choose the signing doctor and approve - or send it back with a remark.</p>
          </div>
        ) : itemLoading || !item ? (
          <div className={local.muted}>Opening report...</div>
        ) : (
          <>
            <div className={local.head}>
              <div>
                <h2 className={styles.cardTitle}>{item.testName}</h2>
                <div className={local.patientLine}>
                  <strong>{item.patientName}</strong>
                  <span>{item.patient?.age ?? '-'} {({ Y: 'Yrs', M: 'Mths', D: 'Days' })[item.patient?.age_unit] || ''} / {({ M: 'Male', F: 'Female' })[item.patient?.sex] || '-'}</span>
                  <span>{item.bookingNo}</span>
                  <span>Ref: {item.refDoctor}</span>
                  <span>Entered by {item.submittedBy || item.savedBy || '-'}</span>
                </div>
                <div style={{ marginTop: 6 }}><StatePill state={item.state} /></div>
              </div>
              <div className={local.toolbar}>
                {item.state === 'APPROVED' && (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => window.open(`/print/report?ids=${item.id}`, '_blank')}>
                    <Printer size={14} /> Print
                  </button>
                )}
              </div>
            </div>

            {item.state === 'SENT_BACK' && (
              <div className={`${local.notice} ${local.noticeRed}`}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Sent back by {item.sentBackBy}: {item.note}. Waiting for the correction.</div>
              </div>
            )}
            {item.state === 'APPROVED' && (
              <div className={`${local.notice} ${local.noticeGreen}`}>
                <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Approved by {item.approvedBy}{item.doctor?.name ? `, signed by ${item.doctor.name}` : ''}{item.note ? ` - "${item.note}"` : ''}.</div>
              </div>
            )}
            {item.state === 'SUBMITTED' && item.resubmittedAt && item.note && (
              <div className={`${local.notice} ${local.noticeInfo}`}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Corrected after your remark: &quot;{item.note}&quot;</div>
              </div>
            )}

            <div className={local.panes}>
              <div className={local.pane}>
                <div className={local.paneHead}>Report (as it will print)</div>
                <div className={local.paneBody}>
                  {report ? (
                    <div className={local.scaled}>
                      <ReportPreview {...previewProps({
                        item,
                        report,
                        values: report.values || {},
                        lab,
                        letterhead,
                        doctor: item.state === 'APPROVED' ? item.doctor : chosenDoctor,
                        watermark: item.state === 'APPROVED' ? null : 'DRAFT',
                      })} />
                    </div>
                  ) : <div className={local.muted}>No report.</div>}
                </div>
              </div>
              <div className={local.pane}>
                <div className={local.paneHead}>
                  <span>Doctor copy{item.doctorCopy ? ` - ${item.doctorCopy.name}` : ''}</span>
                  {item.doctorCopy && (
                    <a className={local.linkBtn} href={`${API_BASE}/api/lab/doctor-copy/${item.id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open</a>
                  )}
                </div>
                <div className={local.paneBody}>
                  {!item.doctorCopy ? (
                    <div className={local.notice}>
                      <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>No doctor copy was uploaded - the report cannot be approved until it is.</div>
                    </div>
                  ) : item.doctorCopy.isPdf ? (
                    <iframe className={local.copyFrame} src={`${API_BASE}/api/lab/doctor-copy/${item.id}#toolbar=0`} title="Doctor copy" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={local.copyImg} src={`${API_BASE}/api/lab/doctor-copy/${item.id}`} alt="Doctor copy" />
                  )}
                </div>
              </div>
            </div>

            {canDecide && (item.state === 'SUBMITTED' || item.state === 'APPROVED') && (
              <div className={local.actionBar}>
                {item.state === 'SUBMITTED' && (
                  <select className={local.select} value={doctorCode} onChange={e => setDoctorCode(e.target.value)} title="Reporting doctor - signs the report (chosen in Report Entry)">
                    <option value="">Reporting doctor...</option>
                    {doctors.map(d => <option key={d.code} value={d.code}>{d.name}{d.designation ? ` - ${d.designation}` : ''}</option>)}
                  </select>
                )}
                <input className={local.remark} value={note} maxLength={500} onChange={e => setNote(e.target.value)}
                  placeholder={item.state === 'APPROVED' ? 'What must be corrected (needed to send back)' : 'Remark - needed when sending back'} />
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => decide(false)} disabled={busy}>
                  <Undo2 size={14} /> Send Back
                </button>
                {item.state === 'SUBMITTED' && (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => decide(true)} disabled={busy || !item.doctorCopy}>
                    <CheckCircle size={14} /> {busy ? 'Saving...' : 'Approve'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportApprovalPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading approvals...</div>}>
      <ApprovalContent />
    </Suspense>
  );
}
