'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Upload, Download, Eye, Trash2, CheckCircle, FileText, X, TriangleAlert, RefreshCw, FileUp } from 'lucide-react';
import styles from '../master.module.css';
import local from './templates.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/SearchableSelect';

const FILTERS = [
  { key: 'all', label: 'All Tests' },
  { key: 'with', label: 'With Template' },
  { key: 'without', label: 'Without Template' },
];

export default function ReportTemplateMaster() {
  const { showAlert } = useAlert();
  const { user: activeUser } = useAuth();
  const userHeader = { 'X-User-Name': activeUser?.username || 'System' };

  const [tests, setTests] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [busyFile, setBusyFile] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [variant, setVariant] = useState('D0000390');
  const [doctors, setDoctors] = useState([]); // reporting doctors - variant code is the MDoctor code
  const [customVariant, setCustomVariant] = useState(false);
  const [makeDefault, setMakeDefault] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Replace an existing template: { tpl, file } once a file is picked (confirm bar)
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const [confirmReplace, setConfirmReplace] = useState(null);

  const [preview, setPreview] = useState(null); // { file, loading, css, html, error }

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/tests/catalogue`).then(res => res.json()),
      fetch(`${API_BASE}/api/report-templates/overview`).then(res => res.json()),
      fetch(`${API_BASE}/api/report-templates/doctors`).then(res => res.json()).catch(() => []),
    ])
      .then(([testList, countMap, doctorList]) => {
        setTests(Array.isArray(testList) ? testList : []);
        setCounts(countMap && !Array.isArray(countMap) ? countMap : {});
        setDoctors(Array.isArray(doctorList) ? doctorList : []);
      })
      .catch(() => showAlert({ type: 'error', title: 'Could not load tests', message: 'Please check that the backend server is running.' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTests = useMemo(() => {
    const q = search.trim().toUpperCase();
    return tests.filter(t => {
      const n = counts[t.code] || 0;
      if (filter === 'with' && n === 0) return false;
      if (filter === 'without' && n > 0) return false;
      return !q || t.code.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
    });
  }, [tests, counts, search, filter]);

  const applyTemplates = (testCode, list) => {
    setTemplates(list);
    setCounts(prev => {
      const next = { ...prev };
      if (list.length) next[testCode] = list.length;
      else delete next[testCode];
      return next;
    });
  };

  const selectTest = (t) => {
    setSelected(t);
    setConfirmDelete(null);
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTemplatesLoading(true);
    fetch(`${API_BASE}/api/report-templates?test_code=${encodeURIComponent(t.code)}`)
      .then(res => res.json())
      .then(data => {
        const list = data.templates || [];
        setTemplates(list);
        // New uploads continue the variant already used for this test
        const regular = list.find(x => x.variant_type === 'DEFAULT');
        setVariant(regular ? regular.variant : (/PATHO|BIOCHEM|HAEMAT|HEMAT|MICRO|SERO|CLINICAL/i.test(t.dept_name) ? 'D0000391' : 'D0000390'));
        setCustomVariant(false);
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  };

  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...userHeader },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const setAsDefault = async (tpl) => {
    setBusyFile(tpl.file);
    try {
      const data = await postJson(`${API_BASE}/api/report-templates/set-default`, { file: tpl.file });
      applyTemplates(selected.code, data.templates || []);
    } catch (e) {
      showAlert({ type: 'error', title: 'Default not changed', message: e.message });
    } finally {
      setBusyFile('');
    }
  };

  const deleteTemplate = async (tpl) => {
    setConfirmDelete(null);
    setBusyFile(tpl.file);
    try {
      const data = await postJson(`${API_BASE}/api/report-templates/delete`, { file: tpl.file });
      applyTemplates(selected.code, data.templates || []);
      showAlert({ type: 'success', title: 'Template removed', message: `${tpl.file} is no longer linked. The file was moved to REPORT_MASTER\\_deleted.` });
    } catch (e) {
      showAlert({ type: 'error', title: 'Template not removed', message: e.message });
    } finally {
      setBusyFile('');
    }
  };

  const pickReplacement = (tpl) => {
    setConfirmDelete(null);
    replaceTargetRef.current = tpl;
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const onReplacementChosen = (e) => {
    const file = e.target.files?.[0];
    if (file && replaceTargetRef.current) setConfirmReplace({ tpl: replaceTargetRef.current, file });
  };

  const replaceTemplate = async () => {
    const { tpl, file } = confirmReplace;
    setConfirmReplace(null);
    setBusyFile(tpl.file);

    const body = new FormData();
    body.append('template', tpl.file);
    body.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/report-templates/replace`, { method: 'POST', headers: userHeader, body });
      const data = await res.json().catch(() => ({ error: 'Update failed.' }));
      if (!res.ok) throw new Error(data.error || 'Update failed.');

      applyTemplates(selected.code, data.templates || []);
      showAlert({
        type: 'success',
        title: 'Template updated',
        message: `${data.file} now uses "${file.name}". New reports will open with the updated format; already saved patient reports are not changed. The old file is kept in REPORT_MASTER\\_versions.`,
      });
    } catch (err) {
      showAlert({ type: 'error', title: 'Template not updated', message: err.message });
    } finally {
      setBusyFile('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!uploadFile) {
      showAlert({ type: 'warning', title: 'No file selected', message: 'Please choose a Word template (.dot, .doc, .dotx or .docx).' });
      return;
    }
    if (!/^[DU]\d{7}$/.test(variant.trim().toUpperCase())) {
      showAlert({ type: 'warning', title: 'Select reporting doctor', message: 'Choose a doctor from the list, or type a doctor code (D + 7 digits, e.g. D0000390) from Master → Doctor List.' });
      return;
    }

    const form = new FormData();
    form.append('file', uploadFile);
    form.append('test_code', selected.code);
    form.append('variant', variant.trim().toUpperCase());
    form.append('make_default', makeDefault ? '1' : '0');

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-templates/upload`, { method: 'POST', headers: userHeader, body: form });
      const data = await res.json().catch(() => ({ error: 'Upload failed.' }));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      applyTemplates(selected.code, data.templates || []);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showAlert({ type: 'success', title: 'Template uploaded', message: `Saved as ${data.file}. It is now available in Lab Result Entry for ${selected.name}.` });
    } catch (err) {
      showAlert({ type: 'error', title: 'Upload failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const openPreview = (tpl) => {
    setPreview({ file: tpl.file, loading: true });
    fetch(`${API_BASE}/api/report-templates/content?file=${encodeURIComponent(tpl.file)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.code === 'WORD_NOT_INSTALLED' ? 'Microsoft Word is not installed on the server PC.' : (data.error || 'Could not open this template.'));
        setPreview({ file: tpl.file, loading: false, css: data.css, html: data.html, scope: data.scope });
      })
      .catch(err => setPreview({ file: tpl.file, loading: false, error: err.message }));
  };

  // Esc closes the preview
  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const withTemplateCount = tests.filter(t => counts[t.code]).length;

  return (
    <div className={styles.container}>
      {/* Left: tests */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Report Templates</h2>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={loadAll} disabled={loading} title="Reload list">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className={local.summary}>
          {loading ? 'Loading tests...' : `${withTemplateCount} of ${tests.length} tests have a Word template`}
        </div>

        <div className={styles.searchBox} style={{ position: 'relative' }}>
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

        <div className={local.filterRow}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`${local.filterChip} ${filter === f.key ? local.filterChipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.listWrapper} style={{ maxHeight: 'calc(100vh - 360px)' }}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th className={styles.listTh}>Code</th>
                <th className={styles.listTh}>Test Name</th>
                <th className={styles.listTh} style={{ textAlign: 'center' }}>Templates</th>
              </tr>
            </thead>
            <tbody>
              {visibleTests.slice(0, 400).map(t => {
                const n = counts[t.code] || 0;
                return (
                  <tr
                    key={t.code}
                    className={`${styles.listRow} ${selected?.code === t.code ? styles.listRowActive : ''}`}
                    onClick={() => selectTest(t)}
                  >
                    <td className={styles.listTd} style={{ whiteSpace: 'nowrap' }}>{t.code}</td>
                    <td className={styles.listTd} style={{ fontWeight: 600 }}>
                      {t.name}
                      <div className={local.deptText}>{t.dept_name}</div>
                    </td>
                    <td className={styles.listTd} style={{ textAlign: 'center' }}>
                      <span className={n ? local.countYes : local.countNo}>{n || '—'}</span>
                    </td>
                  </tr>
                );
              })}
              {!loading && visibleTests.length === 0 && (
                <tr><td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>No tests found.</td></tr>
              )}
            </tbody>
          </table>
          {visibleTests.length > 400 && (
            <div className={local.moreHint}>Showing first 400 of {visibleTests.length} tests - type in search to narrow down.</div>
          )}
        </div>
      </div>

      {/* Right: templates of the selected test */}
      <div className={styles.card}>
        {!selected ? (
          <div className={local.empty}>
            <FileText size={40} />
            <h3>Select a test</h3>
            <p>Choose a test on the left to see, upload or change its Word report templates.</p>
          </div>
        ) : (
          <>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{selected.name}</h2>
                <div className={local.deptText}>{selected.code} · {selected.dept_name}</div>
              </div>
              <span className={styles.badge}>{templates.length} template{templates.length === 1 ? '' : 's'}</span>
            </div>

            {confirmReplace && (
              <div className={local.replaceBar}>
                <FileUp size={16} />
                <span style={{ flex: 1 }}>Replace <strong>{confirmReplace.tpl.file}</strong> with <strong>{confirmReplace.file.name}</strong>? The template keeps its name, doctor and default setting.</span>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={replaceTemplate}>Replace</button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setConfirmReplace(null)}>Cancel</button>
              </div>
            )}

            {confirmDelete && (
              <div className={local.confirmBar}>
                <TriangleAlert size={16} />
                <span style={{ flex: 1 }}>Remove <strong>{confirmDelete.file}</strong>? It will be moved to REPORT_MASTER\_deleted and no longer offered for this test.</span>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => deleteTemplate(confirmDelete)}>Remove</button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            )}

            {templatesLoading ? (
              <div className={local.muted}>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className={local.noTemplate}>
                No Word template is linked to this test yet. Upload one below - it will appear as <strong>Write Report</strong> in Lab Result Entry.
              </div>
            ) : (
              <div className={styles.listWrapper}>
                <table className={styles.listTable}>
                  <thead>
                    <tr>
                      <th className={styles.listTh}>Template File</th>
                      <th className={styles.listTh}>Doctor / Owner</th>
                      <th className={styles.listTh}>Modified</th>
                      <th className={styles.listTh} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(tpl => (
                      <tr key={tpl.file} className={styles.listRow}>
                        <td className={styles.listTd}>
                          <div className={local.fileName}>{tpl.file}</div>
                          {tpl.is_default && <span className={local.defaultBadge}><CheckCircle size={12} /> Default</span>}
                        </td>
                        <td className={styles.listTd}>
                          <div style={{ fontWeight: 700 }}>{tpl.variant_type === 'USER' ? `User: ${tpl.variant_name || tpl.variant}` : (tpl.variant_name || tpl.variant)}</div>
                          <div className={local.deptText}>{tpl.variant}</div>
                        </td>
                        <td className={styles.listTd} style={{ whiteSpace: 'nowrap' }}>{tpl.modified}<div className={local.deptText}>{tpl.size_kb} KB</div></td>
                        <td className={styles.listTd}>
                          <div className={local.actions}>
                            <button type="button" className={local.iconBtn} title="Preview" onClick={() => openPreview(tpl)}><Eye size={15} /></button>
                            <a className={local.iconBtn} title="Download to edit in Word" href={`${API_BASE}/api/report-templates/download?file=${encodeURIComponent(tpl.file)}`}><Download size={15} /></a>
                            <button type="button" className={local.iconBtn} title="Replace with edited file" disabled={busyFile === tpl.file} onClick={() => pickReplacement(tpl)}><FileUp size={15} /></button>
                            {!tpl.is_default && (
                              <button type="button" className={local.textBtn} disabled={busyFile === tpl.file} onClick={() => setAsDefault(tpl)}>Set Default</button>
                            )}
                            <button type="button" className={`${local.iconBtn} ${local.dangerBtn}`} title="Remove" disabled={busyFile === tpl.file} onClick={() => setConfirmDelete(tpl)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Upload */}
            <form className={local.uploadBox} onSubmit={handleUpload}>
              <div className={styles.formSectionHeader}>Upload New Template</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>Word File (.dot / .doc / .dotx / .docx)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".dot,.doc,.dotx,.docx"
                    className={styles.formInput}
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reporting Doctor</label>
                  {customVariant ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        className={styles.formInput}
                        value={variant}
                        onChange={e => setVariant(e.target.value.toUpperCase())}
                        maxLength={8}
                        placeholder="Doctor code e.g. D0000390"
                        autoFocus
                      />
                      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setCustomVariant(false)}>List</button>
                    </div>
                  ) : (
                    <SearchableSelect
                      className={styles.formSelect}
                      value={doctors.some(d => d.code === variant) ? variant : ''}
                      onChange={e => {
                        if (e.target.value === '__other') setCustomVariant(true);
                        else setVariant(e.target.value);
                      }}
                    >
                      {!doctors.some(d => d.code === variant) && <option value="">{variant || 'Select doctor...'}</option>}
                      {doctors.map(d => (
                        <option key={d.code} value={d.code}>
                          {d.name} ({d.code}){d.template_count ? ` - ${d.template_count} templates` : ''}
                        </option>
                      ))}
                      <option value="__other">Other doctor - type code...</option>
                    </SearchableSelect>
                  )}
                </div>
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <label className={local.checkRow}>
                    <input type="checkbox" checked={makeDefault} onChange={e => setMakeDefault(e.target.checked)} />
                    Make this the default template
                  </label>
                </div>
              </div>
              <div className={local.fileNameHint}>
                Will be saved as <code>{/^U/.test(variant) ? `${variant}_${selected.code}_<time>` : `${selected.code}_${variant || 'D0000390'}_<time>`}.{uploadFile?.name.split('.').pop()?.toLowerCase() || 'dot'}</code> in the REPORT_MASTER folder.
                Write <code>0.00</code> where a measurement should be filled - it becomes a yellow Tab-stop in the report editor.
              </div>
              <div className={styles.actionBar}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={uploading || !uploadFile}>
                  <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Template'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Hidden picker for "Replace with edited file" */}
      <input ref={replaceInputRef} type="file" accept=".dot,.doc,.dotx,.docx" style={{ display: 'none' }} onChange={onReplacementChosen} />

      {/* Preview modal */}
      {preview && (
        <div className={local.modalBackdrop} onClick={() => setPreview(null)}>
          <div className={local.modal} onClick={e => e.stopPropagation()}>
            <div className={local.modalHeader}>
              <strong>{preview.file}</strong>
              <button type="button" className={local.iconBtn} onClick={() => setPreview(null)} title="Close (Esc)"><X size={18} /></button>
            </div>
            <div className={local.modalBody}>
              {preview.loading && <div className={local.muted}>Opening template with Microsoft Word...</div>}
              {preview.error && <div className={local.noTemplate}>{preview.error}</div>}
              {preview.html && (
                <div className={local.paper}>
                  <style dangerouslySetInnerHTML={{ __html: preview.css }} />
                  <div className={`rt-doc ${preview.scope}`} dangerouslySetInnerHTML={{ __html: preview.html }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
