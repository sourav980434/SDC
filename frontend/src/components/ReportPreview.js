'use client';

import React from 'react';
import styles from './ReportPreview.module.css';
import { ageInDays, pickRange, flagFor, isPanic, decimalsFor, formatNumber, rangeText } from '@/lib/reportRanges';
import { code39Bars } from '@/lib/barcode';
import API_BASE from '@/lib/apiConfig';

/**
 * One A4 page of a lab report in the new layout, built from a Test Format Master format:
 * lab header (or the uploaded letterhead), patient block with barcode + QR, department and test
 * title, the result table with H / L flags (or the narrative text), notes, signatures and footer.
 *
 * props
 *   lab          lab settings (lib/labSettings)
 *   letterhead   { url, topMm, bottomMm } when a letterhead image is uploaded, else null
 *   patient      { prefix, name, age, age_unit, sex, referred_by, reg_no, registered, collected, received, reported, qr_url }
 *                qr_url = the patient's report download link (lib/reportView reportLink)
 *   test         { name, dept_name, sub_dept }
 *   format       { format_type, specimen, notes_html, narrative_html }
 *   parameters   format parameters (with ranges)
 *   values       result per parameter, keyed by valueKey(param)
 *   signatories  [left, right] - { name, designation }
 *   sample       true = "SAMPLE" watermark (or watermark="DRAFT" for any other text)
 */
export const valueKey = (p, i) => p._key || p.id || `row${i}`;

function Barcode({ text }) {
  const { bars, width } = code39Bars(text);
  if (!bars.length) return null;
  return (
    <svg className={styles.barcode} viewBox={`0 0 ${width} 30`} preserveAspectRatio="none" style={{ width: Math.min(190, width * 1.1) }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="#000" />)}
    </svg>
  );
}

/** Narrative text with the 0.00 measurement blanks highlighted, as the doctor would see them. */
const markBlanks = (html) => String(html || '').replace(/(^|[^\d.])(0+\.0+|00)(?=[^\d]|$)/g, `$1<span class="${styles.blank}">$2</span>`);

export default function ReportPreview({ lab, letterhead, patient, test, format, parameters = [], values = {}, signatories = [], sample = false, watermark = null }) {
  const days = ageInDays(patient.age, patient.age_unit);
  const isNarrative = format.format_type === 'NARRATIVE';
  const active = parameters.filter(p => p.row_type === 'HEADING' || p.is_active !== false);

  const pageStyle = letterhead ? {
    backgroundImage: `url(${letterhead.url})`,
    paddingTop: `${letterhead.topMm}mm`,
    paddingBottom: `${letterhead.bottomMm}mm`,
  } : undefined;

  const ageText = `${patient.age} ${({ Y: 'YRS', M: 'MTHS', D: 'DAYS' })[patient.age_unit] || 'YRS'}`;
  const sexText = ({ M: 'M', F: 'F' })[patient.sex] || '-';
  const [leftSign, rightSign] = signatories;

  return (
    <div className={styles.page} style={pageStyle}>
      {(sample || watermark) && <div className={styles.watermark}>{watermark || 'SAMPLE'}</div>}

      {!letterhead && (
        <div className={styles.header}>
          <div>
            <div className={styles.labName}>{lab.lab_name}</div>
            <div className={styles.labSub}>{lab.lab_address}</div>
            {(lab.lab_accreditation || lab.lab_certification) && (
              <div className={styles.labSub}>{[lab.lab_accreditation, lab.lab_certification].filter(Boolean).join(' · ')}</div>
            )}
          </div>
          <div className={styles.contact}>
            {lab.lab_phone && <div>☎ {lab.lab_phone}</div>}
            {lab.lab_email && <div>✉ {lab.lab_email}</div>}
            {lab.lab_website && <div>⊕ {lab.lab_website}</div>}
          </div>
        </div>
      )}

      <div className={styles.body}>
        {/* patient */}
        <div className={styles.patient}>
          <div>
            <div className={styles.patientName}>{[patient.prefix, patient.name].filter(Boolean).join(' ')}</div>
            <div className={styles.kv}>
              <span>Age / Sex</span><span>: {ageText} / {sexText}</span>
              <span>Referred by</span><span>: {patient.referred_by || 'Self'}</span>
              <span>Reg. no.</span><span>: <strong>{patient.reg_no}</strong></span>
            </div>
          </div>
          <div>
            <Barcode text={patient.reg_no} />
            <div className={styles.kv}>
              <span>Registered on</span><span>: {patient.registered}</span>
              <span>Collected on</span><span>: {patient.collected}</span>
              <span>Received on</span><span>: {patient.received}</span>
              <span>Reported on</span><span>: {patient.reported}</span>
            </div>
          </div>
          <div className={styles.qr}>
            Scan to download
            {/* QR made by our own server (GET /api/qr): the link opens the approved reports for download */}
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG from the API, printed as is */}
            {patient.qr_url && <img src={`${API_BASE}/api/qr?text=${encodeURIComponent(patient.qr_url)}`} alt="QR" title={patient.qr_url} />}
          </div>
        </div>

        {/* department + test */}
        <div className={styles.dept}>{(test.sub_dept || test.dept_name || '').toUpperCase()}</div>
        <div className={styles.testTitle}>{test.name}</div>
        {format.specimen && <div className={styles.specimen}>Specimen: {format.specimen}</div>}

        {isNarrative ? (
          <div className={styles.narrative} dangerouslySetInnerHTML={{ __html: markBlanks(format.narrative_html) }} />
        ) : (
          <>
            <table className={styles.results}>
              <thead>
                <tr>
                  <th className={styles.colName}>TEST</th>
                  <th className={styles.colFlag} />
                  <th className={styles.colValue}>VALUE</th>
                  <th className={styles.colUnit}>UNIT</th>
                  <th className={styles.colRef}>REFERENCE</th>
                </tr>
              </thead>
              <tbody>
                {active.map((p, i) => {
                  const pad = { paddingLeft: `${6 + (Number(p.indent) || 0) * 18}px` };
                  if (p.row_type === 'HEADING') {
                    return <tr key={valueKey(p, i)} className={styles.heading}><td colSpan={5} style={pad}>{p.name}</td></tr>;
                  }
                  const value = values[valueKey(p, i)] ?? '';
                  const numeric = p.result_type === 'NUMERIC' || p.result_type === 'FORMULA';
                  const range = numeric ? pickRange(p.ranges, patient.sex, days) : null;
                  const flag = numeric ? flagFor(value, range) : '';
                  const panic = numeric && isPanic(value, range);
                  const decimals = decimalsFor(p, range);
                  const shown = numeric && value !== '' ? formatNumber(value, decimals) : value;
                  const ref = p.ref_text || rangeText(range, decimals);
                  const rowClass = panic ? styles.panic : (flag || p.is_bold ? styles.abnormal : '');
                  return (
                    <tr key={valueKey(p, i)} className={rowClass}>
                      <td className={styles.colName} style={pad}>
                        {p.name}
                        {p.method && <span className={styles.method}>({p.method})</span>}
                      </td>
                      <td className={styles.colFlag}>{flag}</td>
                      <td className={styles.colValue}>{shown}</td>
                      <td className={styles.colUnit}>{p.unit}</td>
                      <td className={styles.colRef}>{ref}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={styles.endLine} />
          </>
        )}

        {!isNarrative && format.notes_html && (
          <div className={styles.notes} dangerouslySetInnerHTML={{ __html: format.notes_html }} />
        )}

        <div className={styles.endOfReport}>*** END OF REPORT ***</div>

        <div className={styles.signs}>
          <div className={styles.sign}>
            {leftSign && <><strong>{leftSign.name}</strong>{leftSign.designation}</>}
          </div>
          <div className={styles.pageNo}>Page 1 of 1</div>
          <div className={`${styles.sign} ${styles.signRight}`}>
            {rightSign && <><strong>{rightSign.name}</strong>{rightSign.designation}</>}
          </div>
        </div>
      </div>

      {!letterhead && (
        <div className={styles.footer}>{lab.report_disclaimer}</div>
      )}
    </div>
  );
}
