'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, RefreshCw, Save, Send, Eye, Printer, Upload, FileText, X, TriangleAlert, Info, CheckCircle, Paperclip, BookOpen,
} from 'lucide-react';
import styles from '../../master/master.module.css';
import local from './entry.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import ReportPreview from '@/components/ReportPreview';
import RichText from '@/components/RichText';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';
import { ageInDays, pickRange, flagFor, isPanic, decimalsFor, rangeText } from '@/lib/reportRanges';
import { evaluateFormula, valuesByName } from '@/lib/formula';
import { previewProps, STATE_LABELS } from '@/lib/reportView';

const TABS = [
  { key: 'todo', label: 'To do', states: ['PENDING', 'DRAFT', 'SENT_BACK'] },
  { key: 'SENT_BACK', label: 'Sent back', states: ['SENT_BACK'] },
  { key: 'SUBMITTED', label: 'Waiting approval', states: ['SUBMITTED'] },
  { key: 'APPROVED', label: 'Approved', states: ['APPROVED'] },
  { key: 'all', label: 'All', states: null },
];

const keyOf = (p) => String(p.id);

const StatePill = ({ state }) => <span className={`${local.pill} ${local[`pill${state}`]}`}>{STATE_LABELS[state] || state}</span>;

/** Values typed so far for a report: saved ones, else the default answers of text / dropdown parameters. */
function startValues(report, isSaved) {
  const values = {};
  (report?.parameters || []).forEach(p => {
    if (p.row_type !== 'PARAM') return;
    const saved = report.values?.[keyOf(p)];
    values[keyOf(p)] = saved !== undefined && saved !== null ? String(saved)
      : (!isSaved && (p.result_type === 'TEXT' || p.result_type === 'OPTIONS') ? (p.default_value || '') : '');
  });
  return values;
}

function ReportEntryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const perms = useActionPermission('result_entry');
  const { showAlert } = useAlert();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todo');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');   // search sent to the server, a moment after typing stops

  const [selectedId, setSelectedId] = useState(null);
  const [item, setItem] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [values, setValues] = useState({});
  const [narrativeHtml, setNarrativeHtml] = useState('');
  const [notesHtml, setNotesHtml] = useState('');
  const [doctorCode, setDoctorCode] = useState('');   // reporting doctor - signs the report
  const [baseline, setBaseline] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(null);   // list of empty parameters, when asking
  const [showPreview, setShowPreview] = useState(false);
  const [lab, setLab] = useState(DEFAULT_LAB_CONFIG);
  const [letterhead, setLetterhead] = useState(null);
  const copyInputRef = useRef(null);
  const gridRef = useRef(null);

  const canEdit = perms.can_edit || perms.can_add;

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
    fetch(`${API_BASE}/api/report-entry/queue?status=all&search=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => showAlert({ type: 'error', title: 'Could not load tests', message: 'Please check that the backend server is running.' }))
      .finally(() => setLoading(false));
  }, [query, showAlert]);

  useEffect(() => { loadList(); }, [loadList]);

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(t => { counts[t.key] = t.states ? list.filter(r => t.states.includes(r.state)).length : list.length; });
    return counts;
  }, [list]);

  const groups = useMemo(() => {
    const states = TABS.find(t => t.key === tab)?.states;
    const map = new Map();
    list.filter(r => !states || states.includes(r.state)).forEach(r => {
      if (!map.has(r.bookingNo)) map.set(r.bookingNo, { head: r, lines: [] });
      map.get(r.bookingNo).lines.push(r);
    });
    return [...map.values()];
  }, [list, tab]);

  // ---------- the open report ----------
  const report = item?.report || null;
  const isNarrative = report?.format?.format_type === 'NARRATIVE';
  const locked = !item || item.state === 'SUBMITTED' || item.state === 'APPROVED' || !canEdit;
  const days = item ? ageInDays(item.patient?.age, item.patient?.age_unit) : null;

  // Formula parameters are worked out from the others on every change
  const allValues = useMemo(() => {
    if (!report) return values;
    const next = { ...values };
    const formulas = report.parameters.filter(p => p.row_type === 'PARAM' && p.result_type === 'FORMULA' && p.formula);
    for (let pass = 0; pass < 3 && formulas.length; pass++) {   // formulas may use other formulas
      const byName = valuesByName(report.parameters, next, keyOf);
      formulas.forEach(p => { next[keyOf(p)] = evaluateFormula(p.formula, byName); });
    }
    return next;
  }, [values, report]);

  const snapshot = JSON.stringify({ allValues, narrativeHtml, notesHtml, doctorCode });
  const doctors = item?.doctors || [];
  // older approvals kept only the name - show it as it is
  const chosenDoctor = doctors.find(d => d.code === doctorCode) || (item?.doctor && (!item.doctor.code || item.doctor.code === doctorCode) ? item.doctor : null);
  const dirty = !!item && !locked && snapshot !== baseline;

  const applyItem = (data) => {
    const v = startValues(data.report, data.isSaved);
    setItem(data);
    setValues(v);
    setNarrativeHtml(data.report?.format?.narrative_html || '');
    setNotesHtml(data.report?.format?.notes_html || '');
    // the doctor already chosen, else the only doctor of the department
    setDoctorCode(data.doctor?.code || ((data.doctors || []).length === 1 ? data.doctors[0].code : ''));
    setResetKey(k => k + 1);
    setConfirmSubmit(null);
    // baseline is taken after formulas run - see effect below
    setBaseline('');
  };

  // Take the baseline once the loaded values (and formula results) have settled
  useEffect(() => {
    if (item && baseline === '') setBaseline(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, snapshot]);

  const openLine = useCallback((id) => {
    setPendingSwitch(null);
    setSelectedId(id);
    setItem(null);
    setItemLoading(true);
    fetch(`${API_BASE}/api/report-entry/item/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not open this test.');
        applyItem(data);
      })
      .catch(err => {
        setSelectedId(null);
        showAlert({ type: 'error', title: 'Test not opened', message: err.message });
      })
      .finally(() => setItemLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlert]);

  const selectLine = (row) => {
    if (row.id === selectedId) return;
    if (dirty) setPendingSwitch(row);
    else openLine(row.id);
  };

  // /lab/report-entry?id=20150 - from a notification or another screen
  useEffect(() => {
    const id = Number(searchParams?.get('id'));
    if (id && !selectedId) {
      setTab('all');
      openLine(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---------- saving ----------
  const save = async (submit, refreshFormat = false) => {
    if (!item || saving || locked) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-entry/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          values: allValues,
          narrative_html: isNarrative ? narrativeHtml : null,
          notes_html: isNarrative ? null : notesHtml,
          submit,
          doctor_code: doctorCode,
          refresh_format: refreshFormat,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Unexpected reply from the server.' }));
      if (!res.ok) throw new Error(data.error || 'Not saved.');

      const fresh = await fetch(`${API_BASE}/api/report-entry/item/${item.id}`).then(r => r.json());
      applyItem(fresh);
      setList(prev => prev.map(r => (r.id === item.id ? { ...r, state: fresh.state, hasDoctorCopy: fresh.hasDoctorCopy } : r)));
      if (submit) {
        showAlert({ type: 'success', title: 'Sent for approval', message: `${item.testName} of ${item.patientName} is waiting for approval. It is locked until the approver decides.` });
      } else if (refreshFormat) {
        showAlert({ type: 'success', title: 'Latest format applied', message: 'The report now uses the current Test Format. Values of parameters with the same name were kept.' });
      }
    } catch (err) {
      showAlert({ type: 'error', title: submit ? 'Not sent' : 'Not saved', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const askSubmit = () => {
    if (!item) return;
    if (!doctorCode) {
      showAlert({ type: 'warning', title: 'Choose the reporting doctor', message: 'Please choose the doctor who checked this report. Their name and designation are printed as the signature.' });
      return;
    }
    if (!item.hasDoctorCopy) {
      showAlert({ type: 'warning', title: 'Doctor copy needed', message: 'Please upload the doctor copy first. The approver checks the report against it.' });
      return;
    }
    const empty = isNarrative ? [] : report.parameters.filter(p => p.row_type === 'PARAM' && !String(allValues[keyOf(p)] || '').trim()).map(p => p.name);
    if (empty.length) setConfirmSubmit(empty);
    else save(true);
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current(false);
      }
      if (e.key === 'Escape') setShowPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const uploadCopy = async (file) => {
    if (!file || !item) return;
    const form = new FormData();
    form.append('id', item.id);
    form.append('file', file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/lab/doctor-copy`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({ error: 'Upload failed.' }));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setItem(prev => ({ ...prev, hasDoctorCopy: true, doctorCopy: { name: file.name, isPdf: /\.pdf$/i.test(file.name), at: new Date().toISOString() } }));
      setList(prev => prev.map(r => (r.id === item.id ? { ...r, hasDoctorCopy: true } : r)));
    } catch (err) {
      showAlert({ type: 'error', title: 'Doctor copy not uploaded', message: err.message });
    } finally {
      setUploading(false);
      if (copyInputRef.current) copyInputRef.current.value = '';
    }
  };

  const printReports = (ids) => window.open(`/print/report?ids=${ids.join(',')}`, '_blank');

  // Enter moves to the next result box
  const onValueKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const boxes = [...(gridRef.current?.querySelectorAll('input[data-value]:not([disabled])') || [])];
    const next = boxes[boxes.indexOf(e.currentTarget) + 1];
    if (next) next.focus();
    else e.currentTarget.blur();
  };

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={local.empty}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission for report entry. Please ask the administrator for the <strong>Lab Result Entry</strong> module.</p>
      </div>
    );
  }

  const bookingApproved = item ? list.filter(r => r.bookingNo === item.bookingNo && r.state === 'APPROVED').map(r => r.id) : [];

  return (
    <div className={local.layout}>
      {/* Left: tests to report */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Report Entry</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/master/test-formats/guide#after" className={`${styles.btn} ${styles.btnOutline}`} title="User guide: formats, entry, approval and print">
              <BookOpen size={14} /> Guide
            </Link>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={loadList} disabled={loading} title="Reload">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className={styles.searchBox} style={{ position: 'relative', marginBottom: 0 }}>
          <input className={styles.searchInput} style={{ paddingRight: 36 }} placeholder="Patient, booking no, mobile or test..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <Search size={16} className={local.searchIcon} />
        </div>

        <div className={local.tabs}>
          {TABS.map(t => (
            <button key={t.key} type="button" className={`${local.tab} ${tab === t.key ? local.tabActive : ''}`} onClick={() => setTab(t.key)}>
              {t.label} {tabCounts[t.key] ?? 0}
            </button>
          ))}
        </div>

        <div className={local.list}>
          {loading && list.length === 0 && <div className={local.muted}>Loading...</div>}
          {!loading && groups.length === 0 && <div className={local.muted}>Nothing here.</div>}
          {groups.map(g => (
            <div key={g.head.bookingNo}>
              <div className={local.bookingHead}>
                {g.head.patientName}
                <div className={local.sub}>{g.head.bookingNo} · {g.head.bookingDate} · {g.head.age ?? ''} {g.head.ageUnit === 'Y' ? 'Y' : g.head.ageUnit} / {g.head.sex || '-'}</div>
              </div>
              {g.lines.map(r => (
                <div key={r.id} className={`${local.lineRow} ${selectedId === r.id ? local.lineRowActive : ''}`} onClick={() => selectLine(r)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.testName}</div>
                    <div className={local.sub}>{r.deptName}{!r.hasFormat ? ' · no format' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {r.hasDoctorCopy && <Paperclip size={12} color="var(--outline)" title="Doctor copy uploaded" />}
                    <StatePill state={r.state} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right: the report */}
      <div className={styles.card}>
        {!selectedId ? (
          <div className={local.empty}>
            <FileText size={40} />
            <h3>Select a test</h3>
            <p>Choose a test on the left. Its report format comes from the Test Format Master - just type the results.</p>
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
                  <span>{item.deptName}</span>
                </div>
                <div style={{ marginTop: 6 }}><StatePill state={item.state} /></div>
                <div className={local.doctorRow}>
                  <label htmlFor="reporting-doctor">Reporting Doctor</label>
                  {locked ? (
                    <strong>{chosenDoctor ? `${chosenDoctor.name}${chosenDoctor.designation ? ` - ${chosenDoctor.designation}` : ''}` : '-'}</strong>
                  ) : (
                    <select id="reporting-doctor" className={`${local.select} ${!doctorCode ? local.selectEmpty : ''}`} value={doctorCode} onChange={e => setDoctorCode(e.target.value)}>
                      <option value="">Choose the doctor who checked this report...</option>
                      {doctors.map(d => (
                        <option key={d.code} value={d.code}>{d.name}{d.designation ? ` - ${d.designation}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className={local.toolbar}>
                {dirty && <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>● Unsaved</span>}
                {report && (
                  <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setShowPreview(true)}>
                    <Eye size={14} /> Preview
                  </button>
                )}
                {item.state === 'APPROVED' && (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => printReports([item.id])}>
                    <Printer size={14} /> Print
                  </button>
                )}
                {item.state === 'APPROVED' && bookingApproved.length > 1 && (
                  <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => printReports(bookingApproved)} title="All approved reports of this booking">
                    <Printer size={14} /> Print all ({bookingApproved.length})
                  </button>
                )}
                {!locked && report && (
                  <>
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => save(false)} disabled={saving} title="Save draft (Ctrl+S)">
                      <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={askSubmit} disabled={saving}>
                      <Send size={14} /> Submit for Approval
                    </button>
                  </>
                )}
              </div>
            </div>

            {pendingSwitch && (
              <div className={`${local.notice} ${local.noticeRed}`} style={{ alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span style={{ flex: 1 }}>Unsaved results in <strong>{item.testName}</strong>. Open <strong>{pendingSwitch.testName}</strong> without saving?</span>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => openLine(pendingSwitch.id)}>Discard &amp; Open</button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setPendingSwitch(null)}>Stay</button>
              </div>
            )}

            {confirmSubmit && (
              <div className={local.notice} style={{ alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span style={{ flex: 1 }}>No result for <strong>{confirmSubmit.join(', ')}</strong>. Send for approval anyway? Empty rows print blank.</span>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setConfirmSubmit(null); save(true); }}>Send anyway</button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setConfirmSubmit(null)}>Go back</button>
              </div>
            )}

            {item.state === 'SENT_BACK' && (
              <div className={`${local.notice} ${local.noticeRed}`}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div><strong>Sent back by {item.sentBackBy || 'the approver'}:</strong> {item.note}<br />Correct the report and submit it again.</div>
              </div>
            )}
            {item.state === 'SUBMITTED' && (
              <div className={`${local.notice} ${local.noticeInfo}`}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Waiting for approval (sent by {item.submittedBy}). The report is locked - the approver can send it back for correction.</div>
              </div>
            )}
            {item.state === 'APPROVED' && (
              <div className={`${local.notice} ${local.noticeGreen}`}>
                <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Approved by {item.approvedBy}{item.doctor?.name ? ` · signed by ${item.doctor.name}` : ''}{item.note ? ` · "${item.note}"` : ''}.</div>
              </div>
            )}
            {item.formatChanged && !locked && (
              <div className={`${local.notice} ${local.noticeInfo}`} style={{ alignItems: 'center' }}>
                <Info size={16} />
                <span style={{ flex: 1 }}>The Test Format of this test was changed after this report was started.</span>
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => save(false, true)} disabled={saving}>Use latest format</button>
              </div>
            )}

            {!report ? (
              <div className={local.notice}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  This test has no report format yet.{' '}
                  <button type="button" className={local.linkBtn} onClick={() => router.push(`/master/test-formats?test=${item.testCode}`)}>Create it in Test Format →</button>
                </div>
              </div>
            ) : (
              <>
                {report.format.specimen && <div className={local.hint}>Specimen: <strong>{report.format.specimen}</strong></div>}

                {isNarrative ? (
                  <>
                    <div className={local.sectionTitle}>
                      <span>Report</span>
                      <span className={local.hint}>Fill in the 0.00 measurements and change the text where needed.</span>
                    </div>
                    <RichText tall html={narrativeHtml} resetKey={resetKey} readOnly={locked} onChange={setNarrativeHtml} />
                  </>
                ) : (
                  <>
                    <div className={local.sectionTitle}>
                      <span>Results</span>
                      <span className={local.hint}>Enter moves to the next box. Ranges for {({ M: 'male', F: 'female' })[item.patient?.sex] || 'unknown sex'}, {item.patient?.age ?? '?'} {({ Y: 'years', M: 'months', D: 'days' })[item.patient?.age_unit] || ''}.</span>
                    </div>
                    <div ref={gridRef} style={{ overflowX: 'auto' }}>
                      <table className={local.grid}>
                        <thead>
                          <tr><th style={{ width: '38%' }}>Test</th><th>Result</th><th style={{ width: 36 }} /><th>Unit</th><th style={{ width: '26%' }}>Reference</th></tr>
                        </thead>
                        <tbody>
                          {report.parameters.map(p => {
                            const pad = { paddingLeft: `${8 + (Number(p.indent) || 0) * 18}px` };
                            if (p.row_type === 'HEADING') {
                              return <tr key={p.id} className={local.gridHeading}><td colSpan={5} style={pad}>{p.name}</td></tr>;
                            }
                            const k = keyOf(p);
                            const value = allValues[k] ?? '';
                            const numeric = p.result_type === 'NUMERIC' || p.result_type === 'FORMULA';
                            const range = numeric ? pickRange(p.ranges, item.patient?.sex, days) : null;
                            const flag = numeric ? flagFor(value, range) : '';
                            const panic = numeric && isPanic(value, range);
                            const cls = panic ? local.valuePanic : flag === 'H' ? local.valueHigh : flag === 'L' ? local.valueLow : '';
                            const options = p.result_type === 'OPTIONS' ? (p.options || '').split('\n').map(s => s.trim()).filter(Boolean) : [];
                            return (
                              <tr key={p.id}>
                                <td style={pad}>
                                  <span style={{ fontWeight: p.is_bold ? 700 : 500 }}>{p.name}</span>
                                  {p.method && <span className={local.method}>({p.method})</span>}
                                </td>
                                <td>
                                  <input
                                    data-value
                                    className={`${local.valueInput} ${numeric ? '' : local.valueWide} ${cls}`}
                                    value={value}
                                    disabled={locked || p.result_type === 'FORMULA'}
                                    title={p.result_type === 'FORMULA' ? `Worked out: ${p.formula || 'no formula set'}` : undefined}
                                    placeholder={p.result_type === 'FORMULA' ? 'auto' : ''}
                                    inputMode={numeric ? 'decimal' : undefined}
                                    list={options.length ? `opt-${p.id}` : undefined}
                                    onKeyDown={onValueKey}
                                    onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                                  />
                                  {options.length > 0 && (
                                    <datalist id={`opt-${p.id}`}>{options.map(o => <option key={o} value={o} />)}</datalist>
                                  )}
                                </td>
                                <td>
                                  {panic ? <span className={`${local.flag} ${local.flagP}`}>{flag || '!'}!</span>
                                    : flag ? <span className={`${local.flag} ${flag === 'H' ? local.flagH : local.flagL}`}>{flag}</span> : null}
                                </td>
                                <td>{p.unit}</td>
                                <td className={local.ref}>{p.ref_text || rangeText(range, decimalsFor(p, range))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className={local.sectionTitle}>
                      <span>Notes on the report</span>
                      <span className={local.hint}>From the Test Format - change for this patient if needed.</span>
                    </div>
                    <RichText html={notesHtml} resetKey={resetKey} readOnly={locked} placeholder="No notes" onChange={setNotesHtml} />
                  </>
                )}

                <div className={local.copyBox}>
                  <Paperclip size={16} />
                  {item.doctorCopy ? (
                    <>
                      <span>Doctor copy: <strong>{item.doctorCopy.name}</strong></span>
                      <a className={local.linkBtn} href={`${API_BASE}/api/lab/doctor-copy/${item.id}`} target="_blank" rel="noreferrer"><Eye size={13} /> View</a>
                    </>
                  ) : (
                    <span>No doctor copy yet - upload the doctor&apos;s signed sheet (photo or PDF) before submitting.</span>
                  )}
                  {item.state !== 'APPROVED' && canEdit && (
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} style={{ marginLeft: 'auto' }} disabled={uploading}
                      onClick={() => copyInputRef.current?.click()}>
                      <Upload size={14} /> {uploading ? 'Uploading...' : item.doctorCopy ? 'Replace' : 'Upload Doctor Copy'}
                    </button>
                  )}
                  <input ref={copyInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => uploadCopy(e.target.files?.[0])} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showPreview && item && report && (
        <div className={local.modalBackdrop} onClick={() => setShowPreview(false)}>
          <div className={local.modal} onClick={e => e.stopPropagation()}>
            <div className={local.modalHeader}>
              <strong>Report preview - {item.testName}</strong>
              <button type="button" className={local.iconBtn} onClick={() => setShowPreview(false)} title="Close (Esc)"><X size={18} /></button>
            </div>
            <div className={local.modalBody}>
              <ReportPreview
                {...previewProps({
                  item,
                  report: { ...report, format: { ...report.format, narrative_html: narrativeHtml, notes_html: notesHtml } },
                  values: allValues,
                  lab,
                  letterhead,
                  doctor: chosenDoctor || { name: 'Reporting doctor not chosen', designation: '' },
                  watermark: item.state !== 'APPROVED' ? 'DRAFT' : null,
                })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportEntryPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading report entry...</div>}>
      <ReportEntryContent />
    </Suspense>
  );
}
