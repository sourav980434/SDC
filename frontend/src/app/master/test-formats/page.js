'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, RefreshCw, Save, CheckCircle, Circle, FileText, History, X, TriangleAlert, Info,
  ArrowUp, ArrowDown, Trash2, Plus, Heading, Bold,
  IndentIncrease, IndentDecrease, EyeOff, Eye, Undo2, BookOpen,
} from 'lucide-react';
import styles from '../master.module.css';
import local from './formats.module.css';

import API_BASE from '@/lib/apiConfig';
import { reportLink } from '@/lib/reportView';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import ReportPreview, { valueKey } from '@/components/ReportPreview';
import RichText from '@/components/RichText';
import { pickSignatories, reportDateTime } from '@/lib/reportSigners';
import { fetchLabSettings, DEFAULT_LAB_CONFIG } from '@/lib/labSettings';
import { ageInDays, pickRange } from '@/lib/reportRanges';

const MODULE_KEY = 'test_formats';

const FILTERS = [
  { key: 'check', label: 'Check karein' },
  { key: 'pending', label: 'Not checked' },
  { key: 'checked', label: 'Checked' },
  { key: 'table', label: 'Table' },
  { key: 'narrative', label: 'Narrative' },
  { key: 'none', label: 'No format' },
  { key: 'all', label: 'All' },
];

const RESULT_TYPES = [
  { value: 'NUMERIC', label: 'Number' },
  { value: 'TEXT', label: 'Text' },
  { value: 'OPTIONS', label: 'Dropdown' },
  { value: 'FORMULA', label: 'Formula' },
];

const SEX_OPTIONS = [
  { value: 'A', label: 'All' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

const AGE_UNITS = [
  { value: 'Y', label: 'Years' },
  { value: 'M', label: 'Months' },
  { value: 'D', label: 'Days' },
];

let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

const str = (v) => (v === null || v === undefined ? '' : String(v));

const blankRange = (sex = 'A') => ({
  _key: nextKey(), sex, age_from: '', age_to: '', age_unit: 'Y', low: '', high: '', panic_low: '', panic_high: '',
});

const blankParam = (rowType = 'PARAM') => ({
  _key: nextKey(),
  row_type: rowType,
  name: '',
  method: '',
  unit: '',
  result_type: 'NUMERIC',
  options: '',
  default_value: '',
  ref_text: '',
  decimals: '',
  formula: '',
  indent: 0,
  is_bold: rowType === 'HEADING',
  is_active: true,
  ranges: [],
});

/** Server format -> editable draft (strings in every input, a stable key per row). */
function toDraft(data) {
  const format = data?.format || {};
  return {
    format: {
      format_type: format.format_type || 'TABLE',
      specimen: str(format.specimen),
      notes_html: str(format.notes_html),
      narrative_html: str(format.narrative_html),
    },
    parameters: (data?.parameters || []).map(p => ({
      _key: nextKey(),
      row_type: p.row_type || 'PARAM',
      name: str(p.name),
      method: str(p.method),
      unit: str(p.unit),
      result_type: p.result_type || 'NUMERIC',
      options: str(p.options),
      default_value: str(p.default_value),
      ref_text: str(p.ref_text),
      decimals: str(p.decimals),
      formula: str(p.formula),
      indent: Number(p.indent) || 0,
      is_bold: !!p.is_bold,
      is_active: p.is_active !== false,
      ranges: (p.ranges || []).map(r => ({
        _key: nextKey(),
        sex: r.sex || 'A',
        age_from: str(r.age_from),
        age_to: str(r.age_to),
        age_unit: r.age_unit || 'Y',
        low: str(r.low),
        high: str(r.high),
        panic_low: str(r.panic_low),
        panic_high: str(r.panic_high),
      })),
    })),
  };
}

/** Draft without the UI keys - what is compared for unsaved changes and posted to the server. */
function toPayload(draft) {
  return {
    format: draft.format,
    parameters: draft.parameters.map(({ _key, ranges, ...p }) => ({
      ...p,
      ranges: ranges.map(({ _key: k, ...r }) => r),
    })),
  };
}

/**
 * Made-up results for the report preview: the middle of each normal range, and - to show how
 * flags print - the first parameter with a range just above it and the second just below it.
 */
function sampleValues(parameters, sex, days, showFlags) {
  const values = {};
  let flagged = 0;
  parameters.forEach((p, i) => {
    if (p.row_type !== 'PARAM') return;
    const key = valueKey(p, i);
    if (p.result_type === 'TEXT' || p.result_type === 'OPTIONS') {
      values[key] = p.default_value || (p.options || '').split('\n').map(s => s.trim()).find(Boolean) || '';
      return;
    }
    const range = pickRange(p.ranges, sex, days);
    const low = range && range.low !== '' && range.low !== null ? Number(range.low) : null;
    const high = range && range.high !== '' && range.high !== null ? Number(range.high) : null;
    if (low === null && high === null) {
      values[key] = '';
      return;
    }
    let value = low !== null && high !== null ? (low + high) / 2 : high !== null ? high * 0.6 : low * 1.4;
    if (showFlags && flagged === 0 && high !== null) { value = high * 1.08 + (high === 0 ? 1 : 0); flagged++; }
    else if (showFlags && flagged === 1 && low !== null && low > 0) { value = low * 0.9; flagged++; }
    values[key] = String(Math.round(value * 100) / 100);
  });
  return values;
}

const nowText = () => reportDateTime(new Date());

const isNumberText = (v) => v === '' || /^-?\d+(\.\d+)?$/.test(String(v).replace(/,/g, '').trim());

function StatusPills({ info }) {
  if (!info) return <span className={`${local.pill} ${local.pillNone}`}>No format</span>;
  return (
    <>
      {info.is_checked
        ? <span className={`${local.pill} ${local.pillChecked}`}><CheckCircle size={11} /> Checked</span>
        : info.import_status === 'CHECK'
          ? <span className={`${local.pill} ${local.pillCheck}`}><TriangleAlert size={11} /> Check</span>
          : <span className={`${local.pill} ${local.pillOk}`}>Not checked</span>}
      <span className={`${local.pill} ${local.pillType}`}>
        {info.format_type === 'NARRATIVE' ? 'Narrative' : `${info.params} param${info.params === 1 ? '' : 's'}`}
      </span>
    </>
  );
}

function TestFormatMasterContent() {
  const searchParams = useSearchParams();
  const perms = useActionPermission(MODULE_KEY);
  const { showAlert } = useAlert();

  const [tests, setTests] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('check');

  const [selected, setSelected] = useState(null);
  const [meta, setMeta] = useState(null);          // saved format row (status, notes, checked by ...)
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState('');     // JSON of the last loaded / saved draft
  const [resetKey, setResetKey] = useState(0);
  const [formatLoading, setFormatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedVersion, setLoadedVersion] = useState(null); // history version loaded into the editor
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [modal, setModal] = useState(null);          // { kind: 'source' | 'history', ... }
  const [sample, setSample] = useState(null);         // { source, note, similar } - sample shown for a test without a format
  const [copyCode, setCopyCode] = useState('');
  const [preview, setPreview] = useState(null);      // { sex, age, age_unit, flags } while the report preview is open
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

  const canEdit = perms.can_edit || perms.can_add;
  const dirty = !!draft && JSON.stringify(toPayload(draft)) !== baseline;

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/tests/catalogue`).then(res => res.json()),
      fetch(`${API_BASE}/api/test-formats/overview`).then(res => res.json()),
    ])
      .then(([testList, map]) => {
        setTests(Array.isArray(testList) ? testList : []);
        setOverview(map && !Array.isArray(map) ? map : {});
      })
      .catch(() => showAlert({ type: 'error', title: 'Could not load tests', message: 'Please check that the backend server is running.' }))
      .finally(() => setLoading(false));
  }, [showAlert]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const matches = useCallback((t, key) => {
    const info = overview[t.code];
    switch (key) {
      case 'check': return !!info && info.import_status === 'CHECK' && !info.is_checked;
      case 'pending': return !!info && !info.is_checked;
      case 'checked': return !!info && info.is_checked;
      case 'table': return !!info && info.format_type === 'TABLE';
      case 'narrative': return !!info && info.format_type === 'NARRATIVE';
      case 'none': return !info;
      default: return true;
    }
  }, [overview]);

  const filterCounts = useMemo(() => {
    const counts = {};
    FILTERS.forEach(f => { counts[f.key] = tests.filter(t => matches(t, f.key)).length; });
    return counts;
  }, [tests, matches]);

  const visibleTests = useMemo(() => {
    const q = search.trim().toUpperCase();
    return tests.filter(t => {
      if (q) return t.code.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
      return matches(t, filter);
    });
  }, [tests, search, filter, matches]);

  const blankDraft = () => ({ format: { format_type: 'TABLE', specimen: '', notes_html: '', narrative_html: '' }, parameters: [blankParam()] });

  /** data = the saved format; suggestion = a sample for a test without one (GET /api/test-formats/suggest). */
  const applyLoaded = (data, suggestion = null) => {
    const next = data ? toDraft(data) : suggestion ? toDraft(suggestion) : blankDraft();
    setMeta(data?.format || null);
    setSample(!data && suggestion ? { source: suggestion.source, note: suggestion.note, similar: suggestion.similar || [] } : null);
    setDraft(next);
    setBaseline(JSON.stringify(toPayload(next)));   // a test without a format can still be created as it is
    setResetKey(k => k + 1);
    setLoadedVersion(null);
  };

  const openTest = (t) => {
    setPendingSwitch(null);
    setSelected(t);
    setDraft(null);
    setMeta(null);
    setFormatLoading(true);
    fetch(`${API_BASE}/api/test-formats?test_code=${encodeURIComponent(t.code)}`)
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Could not open the format.');
        if (body.data) {
          applyLoaded(body.data);
          return;
        }
        // No format yet: start from a sample made for this kind of test
        const suggestion = await fetch(`${API_BASE}/api/test-formats/suggest?test_code=${encodeURIComponent(t.code)}`)
          .then(r => (r.ok ? r.json() : null)).catch(() => null);
        applyLoaded(null, suggestion);
      })
      .catch(err => {
        setSelected(null);
        showAlert({ type: 'error', title: 'Format not opened', message: err.message });
      })
      .finally(() => setFormatLoading(false));
  };

  // Replace the sample with the format of another test (only for a test without a format yet)
  const copyFrom = async (code) => {
    const source = tests.find(t => t.code === code);
    try {
      const res = await fetch(`${API_BASE}/api/test-formats?test_code=${encodeURIComponent(code)}`);
      const body = await res.json();
      if (!res.ok || !body.data) throw new Error(body.error || 'That test has no format to copy.');
      setDraft(toDraft(body.data));
      setResetKey(k => k + 1);
      setSample(prev => ({ ...(prev || {}), source: 'Copied', note: `Copied from the format of "${source?.name || code}" (${code}). Change it where this test differs.` }));
      setCopyCode('');
    } catch (err) {
      showAlert({ type: 'error', title: 'Not copied', message: err.message });
    }
  };

  const startBlank = () => {
    setDraft(blankDraft());
    setResetKey(k => k + 1);
    setSample(prev => ({ ...(prev || {}), source: 'Blank', note: 'Started from an empty format.' }));
  };

  const selectTest = (t) => {
    if (selected?.code === t.code) return;
    if (dirty) setPendingSwitch(t);
    else openTest(t);
  };

  // /master/test-formats?test=T0000118 - opened from another screen
  useEffect(() => {
    const code = (searchParams?.get('test') || '').trim().toUpperCase();
    if (!code || selected || tests.length === 0) return;
    const test = tests.find(t => t.code.toUpperCase() === code);
    if (test) {
      setSearch(code);
      openTest(test);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests, searchParams]);

  // Leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---------- draft editing ----------
  const setFormatField = (field, value) => setDraft(d => ({ ...d, format: { ...d.format, [field]: value } }));

  const updateParam = (key, patch) => setDraft(d => ({
    ...d,
    parameters: d.parameters.map(p => (p._key === key ? { ...p, ...patch } : p)),
  }));

  const moveParam = (index, delta) => setDraft(d => {
    const list = [...d.parameters];
    const to = index + delta;
    if (to < 0 || to >= list.length) return d;
    [list[index], list[to]] = [list[to], list[index]];
    return { ...d, parameters: list };
  });

  const removeParam = (key) => setDraft(d => ({ ...d, parameters: d.parameters.filter(p => p._key !== key) }));

  const insertParam = (rowType, afterIndex) => setDraft(d => {
    const list = [...d.parameters];
    const row = blankParam(rowType);
    // a new parameter under a heading starts indented like its neighbour
    if (rowType === 'PARAM' && afterIndex >= 0 && list[afterIndex]) {
      row.indent = list[afterIndex].row_type === 'HEADING' ? 1 : list[afterIndex].indent;
    }
    list.splice(afterIndex + 1, 0, row);
    return { ...d, parameters: list };
  });

  const updateRange = (paramKey, rangeKey, patch) => setDraft(d => ({
    ...d,
    parameters: d.parameters.map(p => (p._key !== paramKey ? p : {
      ...p,
      ranges: p.ranges.map(r => (r._key === rangeKey ? { ...r, ...patch } : r)),
    })),
  }));

  const addRange = (paramKey) => setDraft(d => ({
    ...d,
    parameters: d.parameters.map(p => {
      if (p._key !== paramKey) return p;
      const used = p.ranges.map(r => r.sex);
      const sex = !used.includes('M') ? 'M' : !used.includes('F') ? 'F' : 'A';
      return { ...p, ranges: [...p.ranges, blankRange(p.ranges.length === 0 ? 'A' : sex)] };
    }),
  }));

  const removeRange = (paramKey, rangeKey) => setDraft(d => ({
    ...d,
    parameters: d.parameters.map(p => (p._key !== paramKey ? p : { ...p, ranges: p.ranges.filter(r => r._key !== rangeKey) })),
  }));

  const discardChanges = () => {
    if (!selected) return;
    openTest(selected);
  };

  // ---------- server calls ----------
  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ error: 'Unexpected reply from the server.' }));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const updateOverview = (code, data) => {
    const f = data?.format;
    if (!f) return;
    setOverview(prev => ({
      ...prev,
      [code]: {
        format_type: f.format_type,
        import_status: f.import_status,
        is_checked: !!f.is_checked,
        is_edited: !!f.is_edited,
        params: (data.parameters || []).filter(p => p.row_type === 'PARAM').length,
      },
    }));
  };

  const save = async () => {
    if (!draft || !selected || saving) return;
    if (!canEdit) {
      showAlert({ type: 'warning', title: 'Not allowed', message: 'You do not have permission to change report formats.' });
      return;
    }
    // quick check here so the user sees the row; the server checks everything again
    const bad = draft.parameters.find(p => p.ranges.some(r => ['age_from', 'age_to', 'low', 'high', 'panic_low', 'panic_high'].some(k => !isNumberText(r[k]))));
    if (bad) {
      showAlert({ type: 'warning', title: 'Check the ranges', message: `${bad.name || 'A parameter'}: age and range boxes take numbers only (red boxes).` });
      return;
    }

    setSaving(true);
    try {
      const data = await postJson(`${API_BASE}/api/test-formats/save`, { test_code: selected.code, ...toPayload(draft) });
      applyLoaded(data.data);
      updateOverview(selected.code, data.data);
      showAlert({ type: 'success', title: 'Format saved', message: `${selected.name}: the report format is saved. Re-importing the Word templates will not overwrite it.` });
    } catch (err) {
      showAlert({ type: 'error', title: 'Not saved', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S saves
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleChecked = async () => {
    if (!meta || !selected) return;
    if (dirty) {
      showAlert({ type: 'warning', title: 'Save first', message: 'Please save your changes before marking the format as checked.' });
      return;
    }
    try {
      const data = await postJson(`${API_BASE}/api/test-formats/check`, { test_code: selected.code, checked: !meta.is_checked });
      setMeta(m => ({ ...m, ...data }));
      setOverview(prev => ({ ...prev, [selected.code]: { ...prev[selected.code], is_checked: data.is_checked } }));
    } catch (err) {
      showAlert({ type: 'error', title: 'Not changed', message: err.message });
    }
  };

  const openSource = () => {
    setModal({ kind: 'source', loading: true });
    fetch(`${API_BASE}/api/test-formats/source?test_code=${encodeURIComponent(selected.code)}`)
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Could not open the template.');
        setModal({ kind: 'source', file: body.file, html: body.html });
      })
      .catch(err => setModal({ kind: 'source', error: err.message }));
  };

  const openHistory = () => {
    setModal({ kind: 'history', loading: true });
    fetch(`${API_BASE}/api/test-formats/history?test_code=${encodeURIComponent(selected.code)}`)
      .then(res => res.json())
      .then(list => setModal({ kind: 'history', list: Array.isArray(list) ? list : [] }))
      .catch(() => setModal({ kind: 'history', error: 'Could not load the history.' }));
  };

  const loadVersion = async (version) => {
    try {
      const res = await fetch(`${API_BASE}/api/test-formats/history/${version.id}`);
      const snapshot = await res.json();
      if (!res.ok) throw new Error(snapshot.error || 'Version not found.');
      const next = toDraft(snapshot);
      setDraft(next);
      setResetKey(k => k + 1);
      setLoadedVersion(version);
      setModal(null);
    } catch (err) {
      showAlert({ type: 'error', title: 'Version not loaded', message: err.message });
    }
  };

  // Esc closes a modal
  useEffect(() => {
    if (!modal && !preview) return;
    const onKey = (e) => { if (e.key === 'Escape') { setModal(null); setPreview(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, preview]);

  const previewValues = useMemo(() => {
    if (!preview || !draft) return {};
    return sampleValues(draft.parameters, preview.sex, ageInDays(preview.age, preview.age_unit), preview.flags);
  }, [preview, draft]);

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={local.empty}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission to manage test report formats. Please ask the administrator for the <strong>Test Format Master</strong> module.</p>
      </div>
    );
  }

  const withFormat = Object.keys(overview).length;
  const checkedCount = Object.values(overview).filter(o => o.is_checked).length;
  const importNotes = (meta?.import_notes || '').split('\n').filter(Boolean);
  const info = selected ? overview[selected.code] : null;

  return (
    <div className={local.layout}>
      {/* Left: tests */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Test Formats</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/master/test-formats/guide" className={`${styles.btn} ${styles.btnOutline}`} title="How to make each type of report - with pictures">
              <BookOpen size={14} /> User Guide
            </Link>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={loadAll} disabled={loading} title="Reload list">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className={local.summary}>
          {loading ? 'Loading tests...' : `${withFormat} of ${tests.length} tests have a format · ${checkedCount} checked`}
        </div>

        <div className={styles.searchBox} style={{ position: 'relative', marginBottom: 0 }}>
          <input
            className={styles.searchInput}
            style={{ paddingRight: '36px' }}
            placeholder="Search test name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <Search size={16} className={local.searchIcon} />
        </div>

        <div className={local.filterRow} style={search ? { opacity: 0.5 } : undefined} title={search ? 'Search looks in all tests' : undefined}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`${local.filterChip} ${filter === f.key ? local.filterChipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}<span className={local.chipCount}>{filterCounts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className={styles.listWrapper} style={{ maxHeight: 'calc(100vh - 330px)' }}>
          <table className={styles.listTable}>
            <tbody>
              {visibleTests.slice(0, 400).map(t => (
                <tr
                  key={t.code}
                  className={`${styles.listRow} ${selected?.code === t.code ? styles.listRowActive : ''}`}
                  onClick={() => selectTest(t)}
                >
                  <td className={styles.listTd}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div className={local.deptText}>{t.code} · {t.dept_name}</div>
                    <div className={local.headPills}><StatusPills info={overview[t.code]} /></div>
                  </td>
                </tr>
              ))}
              {!loading && visibleTests.length === 0 && (
                <tr><td className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>No tests found.</td></tr>
              )}
            </tbody>
          </table>
          {visibleTests.length > 400 && (
            <div className={local.moreHint}>Showing first 400 of {visibleTests.length} tests - type in search to narrow down.</div>
          )}
        </div>
      </div>

      {/* Right: the format of the selected test */}
      <div className={styles.card}>
        {!selected ? (
          <div className={local.empty}>
            <FileText size={40} />
            <h3>Select a test</h3>
            <p>Choose a test on the left to see and correct its parameters, reference ranges and report text.</p>
          </div>
        ) : formatLoading || !draft ? (
          <div className={local.muted}>Opening format...</div>
        ) : (
          <>
            <div className={local.editorHead}>
              <div>
                <h2 className={styles.cardTitle}>{selected.name}</h2>
                <div className={local.deptText}>{selected.code} · {selected.dept_name}</div>
                <div className={local.headPills}>
                  <StatusPills info={info} />
                  {meta?.is_checked && meta.checked_by && (
                    <span className={local.deptText}>by {meta.checked_by}{meta.checked_at ? ` on ${String(meta.checked_at).slice(0, 16)}` : ''}</span>
                  )}
                </div>
              </div>
              <div className={local.toolbar}>
                {dirty && <span className={local.dirtyDot}>● Unsaved changes</span>}
                <button type="button" className={`${styles.btn} ${styles.btnOutline}`} title="How the report prints in the new layout (sample patient)"
                  onClick={() => setPreview({ sex: 'M', age: '35', age_unit: 'Y', flags: true })}>
                  <Eye size={14} /> Preview
                </button>
                {meta?.has_source && (
                  <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={openSource} title="Word template this format was imported from">
                    <FileText size={14} /> Original
                  </button>
                )}
                {meta && (
                  <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={openHistory} title="Earlier versions">
                    <History size={14} /> History
                  </button>
                )}
                {dirty && meta && (
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={discardChanges} title="Throw away unsaved changes">
                    <Undo2 size={14} /> Discard
                  </button>
                )}
                {meta && canEdit && (
                  <button type="button" className={`${styles.btn} ${meta.is_checked ? styles.btnSecondary : styles.btnOutline}`} onClick={toggleChecked}
                    title={meta.is_checked ? 'Take the tick back' : 'Mark this format as checked by the lab'}>
                    {meta.is_checked ? <CheckCircle size={14} color="#15803d" /> : <Circle size={14} />} {meta.is_checked ? 'Checked' : 'Mark Checked'}
                  </button>
                )}
                {canEdit && (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving || (!dirty && !!meta)} title="Save (Ctrl+S)">
                    <Save size={14} /> {saving ? 'Saving...' : meta ? 'Save' : 'Create Format'}
                  </button>
                )}
              </div>
            </div>

            {pendingSwitch && (
              <div className={local.confirmBar}>
                <TriangleAlert size={16} />
                <span style={{ flex: 1 }}>You have unsaved changes in <strong>{selected.name}</strong>. Open <strong>{pendingSwitch.name}</strong> without saving?</span>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => openTest(pendingSwitch)}>Discard &amp; Open</button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setPendingSwitch(null)}>Stay</button>
              </div>
            )}

            {!meta && (
              <div className={`${local.notice} ${local.noticeInfo}`}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <strong>This test has no report format yet{sample ? ' - a sample format is filled in for you' : ''}.</strong>
                  {sample?.note && <div>{sample.source && sample.source !== 'Copied' && sample.source !== 'Blank' ? `(${sample.source}) ` : ''}{sample.note}</div>}
                  <div style={{ marginTop: 4 }}>
                    Values, units and ranges are <strong>samples</strong> - change them as per your lab and kit, check with <strong>Preview</strong>, then press <strong>Create Format</strong>.
                    Nothing is saved until you do.
                  </div>
                  {canEdit && (
                    <div className={local.copyRow}>
                      {sample?.similar?.length > 0 && <span>Or copy from a similar test:</span>}
                      {sample?.similar?.map(s => (
                        <button key={s.code} type="button" className={local.copyChip} onClick={() => copyFrom(s.code)} title={`Copy the format of ${s.code}`}>
                          {s.name} <span className={local.chipCount}>{s.type === 'NARRATIVE' ? 'Narrative' : 'Table'}</span>
                        </button>
                      ))}
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input className={local.input} style={{ width: 230 }} list="copy-from-tests" value={copyCode} placeholder="Copy from any test (code)..."
                          onChange={e => setCopyCode(e.target.value.toUpperCase().split(' ')[0])} />
                        <datalist id="copy-from-tests">
                          {tests.filter(t => overview[t.code] && t.code !== selected.code).map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                        </datalist>
                        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} disabled={!overview[copyCode]} onClick={() => copyFrom(copyCode)}>Copy</button>
                        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={startBlank} title="Start from an empty format">Blank</button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadedVersion && (
              <div className={`${local.notice} ${local.noticeInfo}`}>
                <History size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  Showing the version saved on <strong>{String(loadedVersion.created_at).slice(0, 16)}</strong> by {loadedVersion.created_by || '—'}.
                  Press <strong>Save</strong> to make it the current format, or <strong>Discard</strong> to go back.
                </div>
              </div>
            )}

            {importNotes.length > 0 && !meta?.is_edited && (
              <div className={local.notice}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Imported from the Word template{meta?.source_file ? ` (${meta.source_file})` : ''}:</strong>
                  <ul>{importNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                </div>
              </div>
            )}

            <div className={local.fieldRow}>
              <div>
                <label className={local.cellLabel}>Report Type</label>
                <select className={local.select} value={draft.format.format_type} disabled={!canEdit}
                  onChange={e => setFormatField('format_type', e.target.value)}>
                  <option value="TABLE">Table (parameters)</option>
                  <option value="NARRATIVE">Narrative (report text)</option>
                </select>
              </div>
              <div>
                <label className={local.cellLabel}>Specimen</label>
                <input className={local.input} value={draft.format.specimen} readOnly={!canEdit} maxLength={150}
                  placeholder="e.g. Serum, EDTA whole blood, Urine" onChange={e => setFormatField('specimen', e.target.value)} />
              </div>
            </div>

            {draft.format.format_type === 'TABLE' ? (
              <>
                <div className={local.sectionTitle}>
                  <span>Parameters</span>
                  <span className={local.hint}>
                    Range match order when the report is made: age + sex → sex → All. The printed range text is shown as typed.
                  </span>
                </div>

                <div className={local.paramList}>
                  {draft.parameters.map((p, index) => (
                    <ParamRow
                      key={p._key}
                      param={p}
                      index={index}
                      count={draft.parameters.length}
                      readOnly={!canEdit}
                      onChange={patch => updateParam(p._key, patch)}
                      onMove={delta => moveParam(index, delta)}
                      onRemove={() => removeParam(p._key)}
                      onInsert={rowType => insertParam(rowType, index)}
                      onRangeChange={(rangeKey, patch) => updateRange(p._key, rangeKey, patch)}
                      onRangeAdd={() => addRange(p._key)}
                      onRangeRemove={rangeKey => removeRange(p._key, rangeKey)}
                    />
                  ))}
                </div>

                {canEdit && (
                  <div className={local.addRow}>
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => insertParam('PARAM', draft.parameters.length - 1)}>
                      <Plus size={14} /> Add Parameter
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => insertParam('HEADING', draft.parameters.length - 1)}>
                      <Heading size={14} /> Add Group Heading
                    </button>
                  </div>
                )}

                <div className={local.sectionTitle}>
                  <span>Notes printed under the results</span>
                  <span className={local.hint}>Method, interpretation, remarks - edit or clear as needed.</span>
                </div>
                <RichText
                  html={draft.format.notes_html}
                  resetKey={resetKey}
                  readOnly={!canEdit}
                  placeholder="No notes"
                  onChange={html => setFormatField('notes_html', html)}
                />
              </>
            ) : (
              <>
                <div className={local.sectionTitle}>
                  <span>Report text</span>
                  <span className={local.hint}>Default text of the report. The doctor can still change it for each patient. Write 0.00 where a measurement is filled in.</span>
                </div>
                <RichText
                  tall
                  html={draft.format.narrative_html}
                  resetKey={resetKey}
                  readOnly={!canEdit}
                  placeholder="Type the report format..."
                  onChange={html => setFormatField('narrative_html', html)}
                />
              </>
            )}
          </>
        )}
      </div>

      {preview && draft && selected && (
        <div className={local.modalBackdrop} onClick={() => setPreview(null)}>
          <div className={`${local.modal} ${local.previewModal}`} onClick={e => e.stopPropagation()}>
            <div className={local.modalHeader}>
              <div>
                <strong>Report preview - {selected.name}</strong>
                <div className={local.deptText}>Sample patient and made-up values{dirty ? ' · includes your unsaved changes' : ''}</div>
              </div>
              <div className={local.previewControls}>
                <label className={local.hint}>Sex</label>
                <select className={local.select} style={{ width: 96 }} value={preview.sex} onChange={e => setPreview(p => ({ ...p, sex: e.target.value }))}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                <label className={local.hint}>Age</label>
                <input className={`${local.input} ${local.inputNum}`} style={{ width: 60 }} value={preview.age} inputMode="decimal"
                  onChange={e => setPreview(p => ({ ...p, age: e.target.value.replace(/[^\d.]/g, '') }))} />
                <select className={local.select} style={{ width: 92 }} value={preview.age_unit} onChange={e => setPreview(p => ({ ...p, age_unit: e.target.value }))}>
                  {AGE_UNITS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {draft.format.format_type === 'TABLE' && (
                  <label className={local.hint} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <input type="checkbox" checked={preview.flags} onChange={e => setPreview(p => ({ ...p, flags: e.target.checked }))} /> Show H / L
                  </label>
                )}
                <button type="button" className={local.iconBtn} onClick={() => setPreview(null)} title="Close (Esc)"><X size={18} /></button>
              </div>
            </div>
            <div className={`${local.modalBody} ${local.previewBody}`}>
              <ReportPreview
                sample
                lab={lab}
                letterhead={letterhead}
                patient={{
                  prefix: preview.sex === 'F' ? 'Mrs.' : 'Mr.',
                  name: 'Sample Patient',
                  age: preview.age || '0',
                  age_unit: preview.age_unit,
                  sex: preview.sex,
                  referred_by: 'Self',
                  reg_no: '1001',
                  registered: nowText(),
                  collected: nowText(),
                  received: nowText(),
                  reported: nowText(),
                  qr_url: reportLink(lab, null),
                }}
                test={{ name: selected.name, dept_name: selected.dept_name, sub_dept: selected.sub_dept }}
                format={draft.format}
                parameters={draft.parameters}
                values={previewValues}
                signatories={pickSignatories(lab, selected.dept_name)}
              />
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className={local.modalBackdrop} onClick={() => setModal(null)}>
          <div className={local.modal} onClick={e => e.stopPropagation()}>
            <div className={local.modalHeader}>
              <strong>{modal.kind === 'source' ? `Original template${modal.file ? ` - ${modal.file}` : ''}` : `History - ${selected?.name}`}</strong>
              <button type="button" className={local.iconBtn} onClick={() => setModal(null)} title="Close (Esc)"><X size={18} /></button>
            </div>
            <div className={local.modalBody}>
              {modal.loading && <div className={local.muted}>Loading...</div>}
              {modal.error && <div className={local.notice}>{modal.error}</div>}
              {modal.kind === 'source' && modal.html && (
                <div className={local.paper} dangerouslySetInnerHTML={{ __html: modal.html }} />
              )}
              {modal.kind === 'history' && modal.list && (
                modal.list.length === 0 ? <div className={local.muted}>No earlier versions.</div> : modal.list.map((v, i) => (
                  <div key={v.id} className={local.historyRow}>
                    <div>
                      <strong>{v.action === 'IMPORT' ? 'Imported from Word template' : 'Saved'}</strong>
                      {i === 0 && <span className={`${local.pill} ${local.pillOk}`} style={{ marginLeft: 8 }}>Current</span>}
                      <div className={local.deptText}>{String(v.created_at).slice(0, 16)} · {v.created_by || '—'}</div>
                    </div>
                    {i > 0 && canEdit && (
                      <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => loadVersion(v)}>Load this version</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParamRow({ param: p, index, count, readOnly, onChange, onMove, onRemove, onInsert, onRangeChange, onRangeAdd, onRangeRemove }) {
  const isHeading = p.row_type === 'HEADING';
  const indentStyle = { marginLeft: `${Math.min(p.indent, 3) * 22}px` };

  const actions = (
    <div className={local.rowActions}>
      {!isHeading && (
        <button type="button" className={`${local.iconBtn} ${p.is_bold ? local.iconBtnOn : ''}`} title="Print in bold" disabled={readOnly}
          onClick={() => onChange({ is_bold: !p.is_bold })}><Bold size={13} /></button>
      )}
      <button type="button" className={local.iconBtn} title="Indent less" disabled={readOnly || p.indent === 0}
        onClick={() => onChange({ indent: Math.max(0, p.indent - 1) })}><IndentDecrease size={14} /></button>
      <button type="button" className={local.iconBtn} title="Indent more (under a heading)" disabled={readOnly || p.indent >= 3}
        onClick={() => onChange({ indent: Math.min(3, p.indent + 1) })}><IndentIncrease size={14} /></button>
      <button type="button" className={local.iconBtn} title="Move up" disabled={readOnly || index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></button>
      <button type="button" className={local.iconBtn} title="Move down" disabled={readOnly || index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14} /></button>
      {!isHeading && (
        <button type="button" className={local.iconBtn} title={p.is_active ? 'Hide from new reports (kept for old ones)' : 'Show again'} disabled={readOnly}
          onClick={() => onChange({ is_active: !p.is_active })}>{p.is_active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
      )}
      <button type="button" className={local.iconBtn} title="Add a parameter below" disabled={readOnly} onClick={() => onInsert('PARAM')}><Plus size={14} /></button>
      <button type="button" className={`${local.iconBtn} ${local.dangerBtn}`} title="Delete row" disabled={readOnly} onClick={onRemove}><Trash2 size={14} /></button>
    </div>
  );

  if (isHeading) {
    return (
      <div className={`${local.paramCard} ${local.paramCardHeading}`} style={indentStyle}>
        <div className={local.headingMain}>
          <div className={local.rowNo}><Heading size={13} /></div>
          <div>
            <label className={local.cellLabel}>Group heading</label>
            <input className={local.input} style={{ fontWeight: 700 }} value={p.name} readOnly={readOnly} maxLength={255}
              placeholder="e.g. DIFFERENTIAL COUNT" onChange={e => onChange({ name: e.target.value })} />
          </div>
          {actions}
        </div>
      </div>
    );
  }

  const numeric = p.result_type === 'NUMERIC' || p.result_type === 'FORMULA';

  return (
    <div className={`${local.paramCard} ${p.is_active ? '' : local.paramCardInactive}`} style={indentStyle}>
      <div className={local.paramMain}>
        <div className={local.rowNo}>{index + 1}</div>
        <div>
          <label className={local.cellLabel}>Parameter</label>
          <input className={local.input} style={p.is_bold ? { fontWeight: 700 } : undefined} value={p.name} readOnly={readOnly} maxLength={255}
            placeholder="e.g. Haemoglobin" onChange={e => onChange({ name: e.target.value })} />
          <input className={local.input} style={{ marginTop: 4, fontSize: 12 }} value={p.method} readOnly={readOnly} maxLength={255}
            placeholder="Method (optional)" onChange={e => onChange({ method: e.target.value })} />
        </div>
        <div>
          <label className={local.cellLabel}>Unit</label>
          <input className={local.input} value={p.unit} readOnly={readOnly} maxLength={60} placeholder="g/dl"
            onChange={e => onChange({ unit: e.target.value })} />
        </div>
        <div>
          <label className={local.cellLabel}>Result type</label>
          <select className={local.select} value={p.result_type} disabled={readOnly} onChange={e => onChange({ result_type: e.target.value })}>
            {RESULT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={local.cellLabel}>Printed reference range</label>
          <textarea className={local.textarea} value={p.ref_text}
            rows={Math.min(5, Math.max(1, p.ref_text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 26)), 0)))}
            readOnly={readOnly} placeholder="e.g. Male: 13.0 - 18.0" onChange={e => onChange({ ref_text: e.target.value })} />
        </div>
        {actions}
      </div>

      {p.result_type !== 'NUMERIC' && (
        <div className={local.paramExtra}>
          {p.result_type === 'OPTIONS' && (
            <div className={local.paramExtraWide}>
              <label className={local.cellLabel}>Dropdown choices (one per line)</label>
              <textarea className={local.textarea} rows={Math.min(6, Math.max(2, p.options.split('\n').length))} value={p.options}
                readOnly={readOnly} placeholder={'Absent\nTrace\nPresent'} onChange={e => onChange({ options: e.target.value })} />
            </div>
          )}
          {p.result_type === 'FORMULA' && (
            <div className={local.paramExtraWide}>
              <label className={local.cellLabel}>Formula (worked out in result entry)</label>
              <input className={local.input} value={p.formula} readOnly={readOnly} maxLength={255}
                placeholder="e.g. [Total Protein] - [Albumin]" onChange={e => onChange({ formula: e.target.value })} />
            </div>
          )}
          {(p.result_type === 'TEXT' || p.result_type === 'OPTIONS') && (
            <div>
              <label className={local.cellLabel}>Default value</label>
              <input className={local.input} value={p.default_value} readOnly={readOnly} maxLength={255}
                placeholder="e.g. Absent" onChange={e => onChange({ default_value: e.target.value })} />
            </div>
          )}
        </div>
      )}

      {numeric && (
        <div className={local.ranges}>
          {p.ranges.length > 0 && (
            <table className={local.rangeTable}>
              <thead>
                <tr>
                  <th>Sex</th><th>Age from</th><th>Age to</th><th>Age in</th>
                  <th>Low</th><th>High</th><th title="Critical value - alert in result entry">Panic low</th><th title="Critical value - alert in result entry">Panic high</th><th />
                </tr>
              </thead>
              <tbody>
                {p.ranges.map(r => (
                  <tr key={r._key}>
                    <td style={{ width: 90 }}>
                      <select className={local.select} value={r.sex} disabled={readOnly} onChange={e => onRangeChange(r._key, { sex: e.target.value })}>
                        {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    {['age_from', 'age_to'].map(k => (
                      <td key={k} style={{ width: 72 }}>
                        <input className={`${local.input} ${local.inputNum} ${isNumberText(r[k]) ? '' : local.inputError}`} value={r[k]} readOnly={readOnly}
                          inputMode="decimal" placeholder="any" onChange={e => onRangeChange(r._key, { [k]: e.target.value })} />
                      </td>
                    ))}
                    <td style={{ width: 92 }}>
                      <select className={local.select} value={r.age_unit} disabled={readOnly} onChange={e => onRangeChange(r._key, { age_unit: e.target.value })}>
                        {AGE_UNITS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    {['low', 'high', 'panic_low', 'panic_high'].map(k => (
                      <td key={k}>
                        <input className={`${local.input} ${local.inputNum} ${isNumberText(r[k]) ? '' : local.inputError}`} value={r[k]} readOnly={readOnly}
                          inputMode="decimal" placeholder="—" onChange={e => onRangeChange(r._key, { [k]: e.target.value })} />
                      </td>
                    ))}
                    <td style={{ width: 32 }}>
                      <button type="button" className={`${local.iconBtn} ${local.dangerBtn}`} title="Remove range" disabled={readOnly}
                        onClick={() => onRangeRemove(r._key)}><X size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className={local.rangeFoot}>
            <span className={local.hint}>
              {p.ranges.length === 0 ? 'No numeric range - no H / L flag for this parameter.' : 'Leave age empty for all ages. Low or high alone is fine (e.g. "< 20").'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <label className={local.hint} htmlFor={`dec-${p._key}`}>Decimals</label>
              <input id={`dec-${p._key}`} className={`${local.input} ${local.inputNum}`} style={{ width: 52, padding: '3px 6px' }} value={p.decimals}
                readOnly={readOnly} inputMode="numeric" maxLength={1} placeholder="auto" title="Decimal places shown on the report"
                onChange={e => onChange({ decimals: e.target.value.replace(/\D/g, '') })} />
              {!readOnly && (
                <button type="button" className={local.linkBtn} onClick={onRangeAdd}><Plus size={13} /> Range</button>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestFormatMaster() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading test formats...</div>}>
      <TestFormatMasterContent />
    </Suspense>
  );
}
