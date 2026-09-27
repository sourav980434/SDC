/**
 * Report signatures from Lab & Report Settings (report_signatories): the technologist signs on the
 * left, a doctor on the right. At approval the approver picks the doctor; before that (previews)
 * the doctor who fits the department is shown.
 */

export function signatoriesOf(lab) {
  let list = lab?.report_signatories;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  return Array.isArray(list) ? list.filter(s => s && s.name) : [];
}

export const doctorsOf = (lab) => signatoriesOf(lab).filter(s => s.isDoctor);

const isImaging = (deptName) => /RADIO|ULTRA|SONO|X.?RAY|IMAG|CARDIO|DOPPLER|ECHO|ECG/i.test(deptName || '');

/** The doctor who usually signs for a department: radiologist for imaging, else pathologist. */
export function defaultDoctor(lab, deptName) {
  const doctors = doctorsOf(lab);
  const pattern = isImaging(deptName) ? /radiolog|sonolog|cardiolog/i : /patholog/i;
  return doctors.find(s => pattern.test(`${s.designation} ${s.name}`)) || doctors[0] || null;
}

/** [left, right] signatures; `doctor` (chosen at approval) wins over the department default. */
export function pickSignatories(lab, deptName, doctor = null) {
  const left = signatoriesOf(lab).find(s => !s.isDoctor) || null;
  return [left, doctor && doctor.name ? doctor : defaultDoctor(lab, deptName)];
}

const pad = (n) => String(n).padStart(2, '0');

/** "27/09/2026 10:57 AM" for a date string / Date, '' when empty. */
export function reportDateTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
