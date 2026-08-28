'use client';

import { useState, useEffect } from 'react';
import styles from './permissions.module.css';
import { ShieldCheck, Save, CheckCircle2, AlertCircle } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
export default function PermissionMatrixPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const modules = [
    { key: 'booking', name: 'Booking / Advance' },
    { key: 'pending_tests', name: 'Pending Test Register' },
    { key: 'verification', name: 'Lab Result Verification' },
    { key: 'invoice', name: 'Bill / Final Invoice' },
    { key: 'masters', name: 'Master Setup' },
    { key: 'reports', name: 'Reports & Analytics' },
    { key: 'setup', name: 'User & Permission Setup' }
  ];

  const fetchInitialData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/setup/roles`).then(r => r.json()),
      fetch(`${API_BASE}/api/setup/permissions`).then(r => r.json())
    ])
      .then(([rolesData, permData]) => {
        setRoles(rolesData);
        setPermissions(permData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading permission matrix:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const getPermValue = (roleCode, moduleKey, actionField) => {
    const item = permissions.find(p => p.role_code === roleCode && p.module_key === moduleKey);
    if (!item) return false;
    const val = item[actionField];
    return val === 1 || val === '1' || val === true;
  };

  const handleTogglePerm = (roleCode, moduleKey, actionField) => {
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.role_code === roleCode && p.module_key === moduleKey);
      if (idx !== -1) {
        const updated = [...prev];
        const currentVal = updated[idx][actionField];
        const isTrue = currentVal === 1 || currentVal === '1' || currentVal === true;
        updated[idx] = {
          ...updated[idx],
          [actionField]: isTrue ? 0 : 1
        };
        return updated;
      } else {
        // Add new entry
        return [
          ...prev,
          {
            role_code: roleCode,
            module_key: moduleKey,
            module_name: modules.find(m => m.key === moduleKey)?.name || moduleKey,
            can_view: actionField === 'can_view' ? 1 : 0,
            can_add: actionField === 'can_add' ? 1 : 0,
            can_edit: actionField === 'can_edit' ? 1 : 0,
            can_delete: actionField === 'can_delete' ? 1 : 0,
            can_approve: actionField === 'can_approve' ? 1 : 0
          }
        ];
      }
    });
  };

  const handleSaveMatrix = () => {
    setSaving(true);
    setMessage('');

    fetch(`${API_BASE}/api/setup/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix: permissions })
    })
      .then(res => res.json())
      .then(data => {
        setSaving(false);
        if (data.error) {
          setMessage(`❌ Error: ${data.error}`);
        } else {
          setMessage('✅ Role Permission Matrix successfully saved to SQL Server database!');
          fetchInitialData();
          setTimeout(() => setMessage(''), 5000);
        }
      })
      .catch(err => {
        setSaving(false);
        setMessage('❌ Error saving permission matrix.');
      });
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Role Permission Matrix</h2>
          <p className={styles.subtitle}>Granular access control grid for modules, view/edit actions, and report approval privileges</p>
        </div>
        <button className={styles.saveBtn} onClick={handleSaveMatrix} disabled={saving}>
          <Save size={18} /> {saving ? 'Saving Matrix...' : 'Save Permission Matrix'}
        </button>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${message.includes('✅') ? '#86efac' : '#fca5a5'}`,
          color: message.includes('✅') ? '#15803d' : '#991b1b',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          fontWeight: '700',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message}
        </div>
      )}

      {/* Permission Matrix Card */}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: '220px' }}>System Module</th>
              {roles.map(r => (
                <th key={r.role_code} className={styles.th} style={{ textAlign: 'center' }}>
                  {r.role_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={roles.length + 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--outline)' }}>
                  Loading permission matrix...
                </td>
              </tr>
            ) : (
              modules.map((m) => (
                <tr key={m.key}>
                  <td className={styles.td}>
                    <span className={styles.moduleBadge}>{m.name}</span>
                  </td>
                  {roles.map((r) => (
                    <td key={r.role_code} className={styles.td} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        {r.role_code === 'ADMIN' ? (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                            FULL ACCESS
                          </span>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={getPermValue(r.role_code, m.key, 'can_view')}
                                  onChange={() => handleTogglePerm(r.role_code, m.key, 'can_view')}
                                />
                                View
                              </label>
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={getPermValue(r.role_code, m.key, 'can_add')}
                                  onChange={() => handleTogglePerm(r.role_code, m.key, 'can_add')}
                                />
                                Add
                              </label>
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={getPermValue(r.role_code, m.key, 'can_edit')}
                                  onChange={() => handleTogglePerm(r.role_code, m.key, 'can_edit')}
                                />
                                Edit
                              </label>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={getPermValue(r.role_code, m.key, 'can_delete')}
                                  onChange={() => handleTogglePerm(r.role_code, m.key, 'can_delete')}
                                />
                                Delete
                              </label>
                              {(m.key === 'verification' || m.key === 'pending_tests') && (
                                <label className={styles.checkboxLabel} style={{ color: '#86198f', fontWeight: '700' }}>
                                  <input
                                    type="checkbox"
                                    checked={getPermValue(r.role_code, m.key, 'can_approve')}
                                    onChange={() => handleTogglePerm(r.role_code, m.key, 'can_approve')}
                                  />
                                  Approve
                                </label>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
