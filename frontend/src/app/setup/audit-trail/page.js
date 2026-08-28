'use client';

import { useState, useEffect } from 'react';
import styles from './audit.module.css';
import { History, Search, ShieldAlert, UserCheck, Activity, RefreshCw } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    fetch(`${API_BASE}/api/setup/audit-logs${query}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading audit logs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeStyle = (action) => {
    switch (action) {
      case 'LOGIN':
        return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
      case 'FAILED_LOGIN':
      case 'BLOCKED_LOGIN':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'USER_CREATED':
      case 'USER_UPDATED':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      case 'VERIFY':
        return { backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>System Audit Trail & Activity Logs</h2>
          <p className={styles.subtitle}>Real-time forensic security log tracking user logins, booking edits, result approvals, and permission changes</p>
        </div>
        <button 
          onClick={fetchLogs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--outline-variant)',
            backgroundColor: 'var(--surface-container-lowest)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '13px'
          }}
        >
          <RefreshCw size={16} /> Refresh Timeline
        </button>
      </div>

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} style={{ color: 'var(--outline)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Username, Action (LOGIN, USER_UPDATED), Module, or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(); }}
          />
        </div>
        <button 
          onClick={fetchLogs}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--primary)',
            color: 'var(--on-primary)',
            border: 'none',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Search Logs
        </button>
      </div>

      {/* Logs Table Card */}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Timestamp</th>
              <th className={styles.th}>User Account</th>
              <th className={styles.th}>Module</th>
              <th className={styles.th}>Action Type</th>
              <th className={styles.th}>Activity Description</th>
              <th className={styles.th}>Client IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--outline)' }}>
                  Loading audit log timeline...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--outline)' }}>
                  No audit log entries matching your search.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--outline)', whiteSpace: 'nowrap' }}>
                    {l.created_at}
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{l.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--outline)' }}>{l.user_code}</div>
                  </td>
                  <td className={styles.td}>
                    <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>{l.module_name}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.actionBadge} style={getActionBadgeStyle(l.action_type)}>
                      {l.action_type}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontWeight: '500' }}>
                    {l.description}
                  </td>
                  <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
                    {l.ip_address}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
