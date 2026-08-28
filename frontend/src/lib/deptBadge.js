/**
 * Department Badge Color Utility
 * 
 * Shared styling function for department pill badges across all LIS pages.
 * Single source of truth — edit colors here and all pages update automatically.
 */

export function getDeptBadgeStyle(deptName) {
  const name = (deptName || '').toUpperCase();

  if (name.includes('HAEMAT') || name.includes('BLOOD')) {
    return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
  }
  if (name.includes('BIOCHEM')) {
    return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
  }
  if (name.includes('USG') || name.includes('ULTRA') || name.includes('SONO') || name.includes('ULTRASONOGRAPHY')) {
    return { backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' };
  }
  if (name.includes('X-RAY') || name.includes('RADIO') || name.includes('XRAY') || name.includes('CT SCAN')) {
    return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  }
  if (name.includes('MICRO') || name.includes('CULTURE')) {
    return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
  }
  if (name.includes('CARDI') || name.includes('ECG')) {
    return { backgroundColor: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3' };
  }
  if (name.includes('PATH') || name.includes('LAB')) {
    return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
  }
  // Default / Unknown
  return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
}

/**
 * Inline badge style object for JSX spread usage.
 * Usage: <span style={{ ...DEPT_BADGE_BASE, ...getDeptBadgeStyle(name) }}>
 */
export const DEPT_BADGE_BASE = {
  display: 'inline-block',
  padding: '3px 9px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};
