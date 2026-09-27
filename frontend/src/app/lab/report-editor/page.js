'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Printer, FileText, RefreshCw, TriangleAlert, FileDown, Upload, Paperclip } from 'lucide-react';
import styles from './editor.module.css';

import API_BASE from '@/lib/apiConfig';
import { useAlert } from '@/components/AlertDialog';
import { useActionPermission } from '@/hooks/useActionPermission';
import { useAuth } from '@/context/AuthContext';

// Measurement placeholders in the legacy templates ("Liver span = 0.00 cm")
const BLANK_TEXT = '0.00';
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24'];

// Templates are converted once and the converted copy ships with the REPORT_MASTER folder, so
// reports open on any server. Only a template that was never converted needs Word / LibreOffice.
const LOCKED_ALERT = {
  type: 'info',
  title: 'Report locked',
  message: 'This report is saved and waiting for approval. It can be changed only after the approver sends it back with a comment.',
};

const WAITING_APPROVAL_ALERT = {
  type: 'warning',
  title: 'Waiting for approval',
  message: 'This report is not approved yet. The PDF and printing open once it is checked against the doctor copy and approved in Report Approval.',
};

const NO_CONVERTER_ALERT = {
  type: 'error',
  title: 'Template not converted yet',
  message: 'This template has not been converted to a report format yet, and this server has neither Microsoft Word nor LibreOffice. Please ask the administrator to convert the templates (php artisan report-templates:warm) or to install LibreOffice on the server.',
};

/** Wraps every "0.00" placeholder in a highlighted <mark> so Tab can jump between them. */
function markBlanks(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.includes(BLANK_TEXT) && !node.parentElement.closest('mark.rt-blank')) nodes.push(node);
  }
  nodes.forEach(node => {
    const frag = document.createDocumentFragment();
    node.nodeValue.split(/(0\.00)/).forEach(part => {
      if (part === BLANK_TEXT) {
        const mark = document.createElement('mark');
        mark.className = 'rt-blank';
        mark.textContent = part;
        frag.appendChild(mark);
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
  return box.innerHTML;
}

/** Splits a saved report (<style> + <div class="rt-doc rt-xxxx">) back into its parts. */
function parseSavedReport(saved) {
  const box = document.createElement('div');
  box.innerHTML = saved;
  const doc = box.querySelector('div.rt-doc');
  if (!doc) return { css: '', scope: '', margin: '', html: saved };
  return {
    css: box.querySelector('style')?.textContent || '',
    scope: [...doc.classList].find(c => c.startsWith('rt-') && c !== 'rt-doc') || '',
    margin: doc.dataset.pageMargin || '',
    html: doc.innerHTML,
  };
}

/** Left/right padding for the sheet from Word's page margin ("151.2pt 36.0pt 72.0pt 36.0pt"). */
function sheetPadding(margin) {
  const parts = (margin || '').trim().split(/\s+/);
  const right = parts[1] || '36pt';
  const left = parts[3] || right;
  return `28pt ${right} 36pt ${left}`;
}

function ReportEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const itemId = searchParams.get('id');
  const bookingRef = searchParams.get('booking');

  const { showAlert } = useAlert();
  const perms = useActionPermission('result_entry');
  const { user: activeUser } = useAuth();

  const editorRef = useRef(null);
  const savedRangeRef = useRef(null); // caret kept while the font-size dropdown has focus
  const blankWarningShownRef = useRef(false);

  const [header, setHeader] = useState(null);
  const [item, setItem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [doc, setDoc] = useState({ css: '', scope: '', margin: '' });
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [blankCount, setBlankCount] = useState({ total: 0, open: 0 });
  const [confirm, setConfirm] = useState(null); // { message, yesText, onYes }
  const [hasPdf, setHasPdf] = useState(false);   // a PDF copy exists for this test line

  // Doctor's signed copy (image -> WebP, at least 25% smaller; PDF up to 3 MB)
  const doctorCopyInputRef = useRef(null);
  const [hasDoctorCopy, setHasDoctorCopy] = useState(false);
  const [sentBack, setSentBack] = useState(null);   // { note, by, at } when the approver returned it
  const [approvedAt, setApprovedAt] = useState(null);   // PDF / print open only after approval
  const [locked, setLocked] = useState(false);          // saved reports cannot be changed until sent back
  const [uploadingCopy, setUploadingCopy] = useState(false);

  const countBlanks = useCallback(() => {
    const marks = editorRef.current ? [...editorRef.current.querySelectorAll('mark.rt-blank')] : [];
    setBlankCount({ total: marks.length, open: marks.filter(m => m.textContent.trim() === BLANK_TEXT).length });
  }, []);

  const putContent = useCallback((html, meta) => {
    if (editorRef.current) editorRef.current.innerHTML = markBlanks(html);
    setDoc(meta);
    setDirty(false);
    blankWarningShownRef.current = false;
    setTimeout(countBlanks, 0);
  }, [countBlanks]);

  const loadTemplate = useCallback(async (file) => {
    setTemplateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-templates/content?file=${encodeURIComponent(file)}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'NO_CONVERTER') await showAlert(NO_CONVERTER_ALERT);
        else await showAlert({ type: 'error', title: 'Template not opened', message: data.error || 'Could not open the template.' });
        return false;
      }
      setSelectedFile(file);
      putContent(data.html, { css: data.css, scope: data.scope, margin: data.page?.margin || '' });
      return true;
    } catch (e) {
      await showAlert({ type: 'error', title: 'Server not reachable', message: 'Could not load the template. Please check that the backend is running.' });
      return false;
    } finally {
      setTemplateLoading(false);
    }
  }, [putContent, showAlert]);

  // Initial load: Word check, patient details, saved report and template list
  useEffect(() => {
    if (!itemId || !bookingRef) {
      setError('Test line not specified. Please open the report editor from Lab Result Entry.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const reportRes = await fetch(`${API_BASE}/api/lab/patient-full-report/${encodeURIComponent(bookingRef)}`);
        if (!reportRes.ok) throw new Error('Booking not found.');
        const report = await reportRes.json();
        const line = (report.test_items || []).find(t => String(t.id) === String(itemId));
        if (!line) throw new Error('Test line not found in this booking.');

        const tplRes = await fetch(`${API_BASE}/api/report-templates?test_code=${encodeURIComponent(line.test_code)}`);
        const tplList = (await tplRes.json()).templates || [];

        setHeader(report.header);
        setItem(line);
        setTemplates(tplList);
        setLoading(false);

        setHasPdf(!!line.report_pdf_path);
        setHasDoctorCopy(!!line.has_doctor_copy);
        setSentBack(line.sent_back_note ? { note: line.sent_back_note, by: line.sent_back_by, at: line.sent_back_at } : null);
        setApprovedAt(line.approved_at || null);
        // Already saved and not sent back -> read only
        setLocked(!!line.narrative_html && !line.sent_back_note);

        if (line.narrative_html) {
          // Re-open the report that was already saved
          const saved = parseSavedReport(line.narrative_html);
          setSelectedFile(line.report_template_file || '');
          putContent(saved.html, { css: saved.css, scope: saved.scope, margin: saved.margin });
        } else if (tplList.length > 0) {
          await loadTemplate(tplList[0].file);
        }
      } catch (e) {
        setError(e.message || 'Failed to load report details.');
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, bookingRef]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const buildReportHtml = () => {
    const box = editorRef.current.cloneNode(true);
    box.querySelectorAll('mark.rt-blank').forEach(m => m.replaceWith(...m.childNodes));
    const marginAttr = doc.margin ? ` data-page-margin="${doc.margin}"` : '';
    return `<style>${doc.css}</style><div class="rt-doc ${doc.scope}"${marginAttr}>${box.innerHTML}</div>`;
  };

  // Save asks for a confirmation first - after saving, the report is locked for approval
  const askAndSave = () => {
    if (saving || locked) return;
    setConfirm({
      message: 'Please check the whole report once more. After saving it goes for approval and cannot be changed until the approver sends it back with a comment.',
      yesText: 'Checked, save it',
      onYes: () => saveReport(),
    });
  };

  const saveReport = async () => {
    if (saving || !editorRef.current) return;

    // The doctor's signed copy is mandatory
    if (!hasDoctorCopy) {
      await showAlert({
        type: 'warning',
        title: 'Doctor copy required',
        message: 'Please upload the Doctor copy first (Upload Doctor copy button above), then save the report.',
      });
      doctorCopyInputRef.current?.click();
      return;
    }

    if (!editorRef.current.textContent.trim()) {
      showAlert({ type: 'warning', title: 'Report is empty', message: 'Please select a template or type the report before saving.' });
      return;
    }

    // Unfilled 0.00 blanks: warn once, the next save goes through
    const open = [...editorRef.current.querySelectorAll('mark.rt-blank')].filter(m => m.textContent.trim() === BLANK_TEXT).length;
    if (open > 0 && !blankWarningShownRef.current) {
      blankWarningShownRef.current = true;
      await showAlert({
        type: 'warning',
        title: `${open} blank${open > 1 ? 's' : ''} still 0.00`,
        message: 'Some measurements are not filled yet (yellow boxes). Press Tab to jump to them. Save again to keep them as they are.',
      });
      gotoBlank(1);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/sample-tracking/save-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Name': activeUser?.username || 'System' },
        body: JSON.stringify({ id: item.id, html: buildReportHtml(), template_file: selectedFile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');

      setDirty(false);
      setHasPdf(!!data.pdf);
      setSentBack(null);
      setApprovedAt(null);   // every save has to be approved again
      setLocked(true);       // and the report is locked until it comes back
      {
        const pdfNote = data.pdf
          ? ` A PDF copy (${Math.max(1, Math.round((data.pdf.size || 0) / 1024))} KB) is saved against this patient and bill.`
          : (data.pdf_error ? ' The report is saved, but the PDF copy could not be created.' : '');
        await showAlert({ type: 'success', title: 'Report saved', message: `${item.test_name} report saved for ${header.patient_name}.${pdfNote}` });
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Report not saved', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const uploadDoctorCopy = async (e) => {
    const file = e.target.files?.[0];
    if (doctorCopyInputRef.current) doctorCopyInputRef.current.value = '';
    if (!file || !item) return;

    const body = new FormData();
    body.append('id', item.id);
    body.append('file', file);

    setUploadingCopy(true);
    try {
      const res = await fetch(`${API_BASE}/api/lab/doctor-copy`, {
        method: 'POST',
        headers: { 'X-User-Name': activeUser?.username || 'System' },
        body,
      });
      const data = await res.json().catch(() => ({ error: 'Upload failed.' }));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setHasDoctorCopy(true);
      const kb = (n) => Math.max(1, Math.round((n || 0) / 1024));
      const note = /\.pdf$/i.test(data.file)
        ? `PDF saved (${kb(data.size)} KB).`
        : `Converted to WebP: ${kb(data.original_size)} KB -> ${kb(data.size)} KB (${data.saved_percent}% smaller).`;
      await showAlert({ type: 'success', title: 'Doctor copy uploaded', message: `${note} It is linked to bill ${header.booking_no}.` });
    } catch (err) {
      await showAlert({ type: 'error', title: 'Upload failed', message: err.message });
    } finally {
      setUploadingCopy(false);
    }
  };

  // Print: only for an approved report. Unsaved changes are saved first, so the print matches the screen.
  const printReport = async () => {
    if (!item || saving) return;

    if (!approvedAt) {
      await showAlert(WAITING_APPROVAL_ALERT);
      return;
    }
    if (dirty && !locked) {
      await showAlert({
        type: 'warning',
        title: 'Unsaved changes',
        message: 'Save the report first. Saving sends it for approval again, and printing opens once it is approved.',
      });
      return;
    }
    router.push(`/lab/print-report?bookingId=${encodeURIComponent(header.booking_id)}&itemId=${encodeURIComponent(item.id)}`);
  };

  // Tab / Shift+Tab: select the next / previous yellow blank so typing replaces it
  const gotoBlank = (dir) => {
    const editor = editorRef.current;
    const blanks = editor ? [...editor.querySelectorAll('mark.rt-blank')] : [];
    if (blanks.length === 0) return false;

    const sel = window.getSelection();
    const focus = sel.rangeCount && editor.contains(sel.focusNode) ? sel.focusNode : null;
    const current = focus ? blanks.findIndex(b => b === focus || b.contains(focus)) : -1;
    let idx;
    if (current >= 0) {
      idx = current + dir;
    } else {
      const firstAfter = focus ? blanks.findIndex(b => focus.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) : 0;
      const after = firstAfter === -1 ? blanks.length : firstAfter;
      idx = dir > 0 ? after : after - 1;
    }
    idx = (idx + blanks.length) % blanks.length;

    const range = document.createRange();
    range.selectNodeContents(blanks[idx]);
    sel.removeAllRanges();
    sel.addRange(range);
    blanks[idx].scrollIntoView({ block: 'nearest' });
    return true;
  };

  const handleEditorKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!gotoBlank(e.shiftKey ? -1 : 1)) {
        document.execCommand('insertText', false, '    ');
      }
    }
  };

  // Ctrl+S = save, Ctrl+P = save & print
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || loading || error || !item) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (locked) {
          showAlert(LOCKED_ALERT);
        } else {
          askAndSave();
        }
      } else if (key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        printReport();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const format = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
  };

  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const setFontSize = (pt) => {
    if (!pt || !savedRangeRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
    format('fontSize', '7');
    editorRef.current.querySelectorAll('font[size="7"]').forEach(f => {
      const span = document.createElement('span');
      span.style.fontSize = `${pt}pt`;
      span.append(...f.childNodes);
      f.replaceWith(span);
    });
  };

  const askThen = (message, yesText, onYes) => {
    if (!dirty) {
      onYes();
      return;
    }
    setConfirm({ message, yesText, onYes });
  };

  const switchTemplate = (file) => {
    if (!file || file === selectedFile) return;
    askThen('Replace the current report text with the selected template? Your changes will be lost.', 'Replace', () => loadTemplate(file));
  };

  const reloadTemplate = () => {
    const file = selectedFile || templates[0]?.file;
    if (!file) return;
    askThen('Reload the original template? Your changes will be lost.', 'Reload', () => loadTemplate(file));
  };

  const goBack = () => {
    askThen('You have unsaved changes. Leave without saving?', 'Leave', () => {
      setDirty(false);
      router.push('/lab/result-entry');
    });
  };

  if (perms.isLoaded && !perms.can_view) {
    return (
      <div className={styles.state}>
        <TriangleAlert size={36} color="#dc2626" />
        <h3>Access Denied</h3>
        <p>You do not have permission to enter lab results.</p>
      </div>
    );
  }

  const templateLabel = (t) =>
    `${t.variant_type === 'USER' ? 'User: ' : ''}${t.variant_name || t.variant} · ${t.modified.slice(0, 10)}${t.is_default ? ' (default)' : ''}`;

  return (
    <div className={styles.shell}>
      {/* Title + main actions */}
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <h2>{item ? `${item.test_name} (${item.test_code})` : 'Report Editor'}</h2>
          <p>{header ? `${header.patient_name} · ${header.booking_no}` : 'Loading...'}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={goBack}>
            <ArrowLeft size={16} /> Back
          </button>
          {!locked && (
            <button type="button" className={`${styles.btn} ${styles.btnSave}`} onClick={askAndSave} disabled={saving || loading || !!error}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save (Ctrl+S)'}
            </button>
          )}
          <input
            ref={doctorCopyInputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={uploadDoctorCopy}
          />
          <button
            type="button"
            className={styles.btn}
            onClick={() => doctorCopyInputRef.current?.click()}
            disabled={uploadingCopy || loading || !!error}
            title="Upload the doctor's signed copy (image or PDF up to 3 MB)"
          >
            <Upload size={16} /> {uploadingCopy ? 'Uploading...' : (hasDoctorCopy ? 'Replace Doctor copy' : 'Upload Doctor copy')}
          </button>
          {!hasDoctorCopy && !loading && !error && (
            <span className={styles.requiredNote} title="A report cannot be saved before the doctor copy is uploaded">
              Doctor copy required
            </span>
          )}
          {hasDoctorCopy && item && (
            <a
              className={styles.btn}
              href={`${API_BASE}/api/lab/doctor-copy/${encodeURIComponent(item.id)}`}
              target="_blank"
              rel="noreferrer"
              title="Open the uploaded doctor copy"
            >
              <Paperclip size={16} /> Doctor copy
            </a>
          )}
          {hasPdf && item && (
            approvedAt ? (
              <a
                className={styles.btn}
                href={`${API_BASE}/api/lab/report-pdf/${encodeURIComponent(item.id)}`}
                target="_blank"
                rel="noreferrer"
                title="Open the approved PDF"
              >
                <FileDown size={16} /> PDF
              </a>
            ) : (
              <button
                type="button"
                className={styles.btn}
                onClick={() => showAlert(WAITING_APPROVAL_ALERT)}
                title="Available after approval"
              >
                <FileDown size={16} /> PDF
              </button>
            )
          )}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrint}`}
            onClick={printReport}
            disabled={saving || loading || !!error}
            title={approvedAt ? 'Print this report' : 'Available after approval'}
          >
            <Printer size={16} /> Print (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Formatting ribbon */}
      {!loading && !error && (
        <div className={styles.ribbon}>
          <div className={styles.ribbonGroup}>
            <FileText size={16} color="#475569" />
            <select
              className={`${styles.select} ${styles.templateSelect}`}
              value={selectedFile}
              onChange={(e) => switchTemplate(e.target.value)}
              disabled={templateLoading || templates.length === 0}
            >
              {templates.length === 0 && <option value="">No template for this test</option>}
              {selectedFile === '' && templates.length > 0 && <option value="">Select template...</option>}
              {templates.map(t => (
                <option key={t.file} value={t.file}>{templateLabel(t)}</option>
              ))}
            </select>
            <button type="button" className={styles.tool} title="Reload original template" onClick={reloadTemplate} disabled={templateLoading || templates.length === 0}>
              <RefreshCw size={14} />
            </button>
          </div>

          <div className={styles.ribbonGroup}>
            <button type="button" className={styles.tool} title="Bold (Ctrl+B)" onMouseDown={e => e.preventDefault()} onClick={() => format('bold')}><b>B</b></button>
            <button type="button" className={styles.tool} title="Italic (Ctrl+I)" onMouseDown={e => e.preventDefault()} onClick={() => format('italic')}><i>I</i></button>
            <button type="button" className={styles.tool} title="Underline (Ctrl+U)" onMouseDown={e => e.preventDefault()} onClick={() => format('underline')}><u>U</u></button>
            <select className={styles.select} title="Font size" value="" onChange={e => setFontSize(e.target.value)}>
              <option value="">Size</option>
              {FONT_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
            </select>
          </div>

          <div className={styles.ribbonGroup}>
            {[
              ['justifyLeft', 'Align left', 'M3 5h18M3 10h12M3 15h18M3 20h12'],
              ['justifyCenter', 'Center', 'M3 5h18M6 10h12M3 15h18M6 20h12'],
              ['justifyRight', 'Align right', 'M3 5h18M9 10h12M3 15h18M9 20h12'],
              ['justifyFull', 'Justify', 'M3 5h18M3 10h18M3 15h18M3 20h18'],
            ].map(([cmd, label, path]) => (
              <button key={cmd} type="button" className={styles.tool} title={label} onMouseDown={e => e.preventDefault()} onClick={() => format(cmd)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={path} /></svg>
              </button>
            ))}
          </div>

          <div className={styles.ribbonGroup}>
            <button type="button" className={styles.tool} title="Jump to next blank (Tab)" onMouseDown={e => e.preventDefault()} onClick={() => { editorRef.current?.focus(); gotoBlank(1); }}>
              Next blank ⇥
            </button>
          </div>

          {blankCount.total > 0 && (
            <span className={`${styles.blankInfo} ${blankCount.open === 0 ? styles.blankInfoDone : ''}`}>
              {blankCount.open === 0 ? 'All blanks filled' : `${blankCount.open} of ${blankCount.total} blanks still 0.00`}
            </span>
          )}
        </div>
      )}

      {locked && (
        <div className={styles.lockedBar}>
          <TriangleAlert size={16} />
          <span>
            {approvedAt
              ? `This report was approved on ${approvedAt}, so it is read only.`
              : 'This report is saved and waiting for approval, so it is read only. The approver has to send it back with a comment before it can be changed.'}
          </span>
        </div>
      )}

      {sentBack && (
        <div className={styles.sentBackBar}>
          <TriangleAlert size={16} />
          <span>
            <strong>Sent back for correction{sentBack.by ? ` by ${sentBack.by}` : ''}{sentBack.at ? ` (${sentBack.at})` : ''}:</strong> {sentBack.note}
            {' '}— correct the report (and re-upload the doctor copy if needed), then save again.
          </span>
        </div>
      )}

      {confirm && (
        <div className={styles.confirmBar}>
          <TriangleAlert size={16} />
          <span style={{ flex: 1 }}>{confirm.message}</span>
          <button type="button" className={`${styles.btn} ${styles.btnSave}`} onClick={() => { const fn = confirm.onYes; setConfirm(null); fn(); }}>
            {confirm.yesText}
          </button>
          <button type="button" className={styles.btn} onClick={() => setConfirm(null)}>Cancel</button>
        </div>
      )}

      {/* A4 sheet */}
      <div className={styles.desk}>
        {loading && <div className={styles.state}><h3>Loading report...</h3></div>}
        {error && (
          <div className={styles.state}>
            <TriangleAlert size={36} color="#dc2626" />
            <h3>Report editor could not open</h3>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.paper} style={{ display: loading || error ? 'none' : 'block', padding: sheetPadding(doc.margin) }}>
          {doc.css && <style dangerouslySetInnerHTML={{ __html: doc.css }} />}

          {header && (
            <div className={styles.patientBox}>
              <div><strong>Patient Name:</strong> {header.patient_name}</div>
              <div><strong>Lab No:</strong> {header.booking_no}</div>
              <div><strong>Age / Sex:</strong> {header.patient_age} / {header.patient_sex === 'M' ? 'Male' : header.patient_sex === 'F' ? 'Female' : header.patient_sex}</div>
              <div><strong>Date:</strong> {header.booking_date ? new Date(header.booking_date).toLocaleDateString('en-IN') : ''}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Ref. By:</strong> {header.doctor_name}</div>
            </div>
          )}

          {templateLoading && <div className={styles.state} style={{ padding: '24px' }}>Opening template...</div>}

          <div
            ref={editorRef}
            className={`${styles.editor} rt-doc ${doc.scope}`}
            contentEditable={!templateLoading && !locked}
            suppressContentEditableWarning
            spellCheck
            onInput={() => { setDirty(true); countBlanks(); }}
            onKeyDown={handleEditorKeyDown}
            onBlur={rememberSelection}
          />
        </div>
      </div>

      <div className={styles.hint}>
        Tab / Shift+Tab: next / previous yellow blank · Ctrl+B / I / U: bold, italic, underline · Ctrl+Z: undo · Ctrl+S: save · Ctrl+P: save &amp; print
      </div>
    </div>
  );
}

export default function ReportEditorPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px' }}>Loading report editor...</div>}>
      <ReportEditorContent />
    </Suspense>
  );
}
