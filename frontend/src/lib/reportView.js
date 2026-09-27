import { getAppOrigin } from './apiConfig';
import { pickSignatories, reportDateTime } from './reportSigners';

/**
 * Base address patients open reports on: Lab & Report Settings "Public Report URL" once the app
 * is live, else the address this app is opened on.
 */
export function publicBase(lab) {
  const configured = String(lab?.public_report_url || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(configured) ? configured : getAppOrigin();
}

/** Link in a report's QR code: the booking's approved reports, ready to download. */
export const reportLink = (lab, token) => `${publicBase(lab)}/r/${token || 'SAMPLE'}`;

export const STATE_LABELS = {
  PENDING: 'Not started',
  DRAFT: 'Draft',
  SUBMITTED: 'Waiting approval',
  SENT_BACK: 'Sent back',
  APPROVED: 'Approved',
};

/**
 * Props for <ReportPreview> from a Report Entry item (GET /api/report-entry/item/{id}),
 * the report being shown (saved or being typed) and its values.
 */
export function previewProps({ item, report, values, lab, letterhead, doctor = null, watermark = null }) {
  const p = item.patient || {};
  const ageUnit = p.age_unit || 'Y';
  return {
    lab,
    letterhead,
    watermark,
    patient: {
      prefix: p.prefix,
      name: p.name,
      age: p.age ?? '',
      age_unit: ageUnit,
      sex: p.sex,
      referred_by: p.referred_by,
      reg_no: p.booking_no || String(item.bookingNo || ''),
      registered: reportDateTime(p.booking_date),
      collected: reportDateTime(item.sampleCollectedAt),
      received: reportDateTime(item.deptReceivedAt),
      reported: reportDateTime(item.approvedAt || new Date()),
      qr_url: reportLink(lab, item.reportToken),
    },
    test: { name: item.testName, dept_name: item.deptName, sub_dept: item.subDeptName },
    format: report.format,
    parameters: report.parameters,
    values,
    signatories: pickSignatories(lab, item.deptName, doctor || item.doctor),
  };
}
