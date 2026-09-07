/**
 * Centralized System Module Registry for SDCP Panel
 *
 * NOTE FOR FUTURE MODULE ADDITIONS:
 * Whenever you create or modify a module in the application, add it to this array.
 * It automatically updates:
 * 1. User Management modal permissions (/setup/users)
 * 2. Role Permission Matrix grid (/setup/permissions)
 * 3. Sidebar permission evaluations
 */

export const SYSTEM_MODULES = [
  { key: 'booking', name: 'Booking / Advance' },
  { key: 'invoice', name: 'Bill / Final Invoice' },
  { key: 'archive_bills', name: 'Archive Bills (Legacy)' },
  { key: 'sample_tracking', name: 'Sample Tracking' },
  { key: 'result_entry', name: 'Lab Result Entry' },
  { key: 'pending_tests', name: 'Pending Test Register' },
  { key: 'verification', name: 'Lab Result Verification' },
  { key: 'masters', name: 'Master Setup' },
  { key: 'reports', name: 'Reports & Analytics' },
  { key: 'setup', name: 'User & Permission Setup' }
];

export default SYSTEM_MODULES;
