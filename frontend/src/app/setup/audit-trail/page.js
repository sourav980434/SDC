'use client';

import { useState, useEffect } from 'react';
import styles from './audit.module.css';
import { History, Search, ShieldAlert, UserCheck, Activity, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
import SearchableSelect from '@/components/SearchableSelect';
export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Who / what / when filters
  const [user, setUser] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [options, setOptions] = useState({ users: [], modules: [], actions: [] });

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [pageInfo, setPageInfo] = useState({ total: 0, last_page: 1, from: 0, to: 0 });

  const filterParams = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (user) params.set('user', user);
    if (module) params.set('module', module);
    if (action) params.set('action', action);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    return params;
  };

  const fetchLogs = (goToPage = page) => {
    setLoading(true);
    const params = filterParams();
    params.set('page', String(goToPage));
    params.set('per_page', String(perPage));

    fetch(`${API_BASE}/api/setup/audit-logs?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const rows = Array.isArray(data) ? data : (data.data || []);
        setLogs(rows);
        setPage(data.page || goToPage);
        setPageInfo({
          total: data.total ?? rows.length,
          last_page: data.last_page ?? 1,
          from: data.from ?? (rows.length ? 1 : 0),
          to: data.to ?? rows.length,
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading audit logs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
    fetch(`${API_BASE}/api/setup/audit-filters`)
      .then(res => res.json())
      .then(data => setOptions({ users: data.users || [], modules: data.modules || [], actions: data.actions || [] }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setSearch(''); setUser(''); setModule(''); setAction(''); setFromDate(''); setToDate('');
    setTimeout(() => fetchLogs(1), 0);
  };

  const exportExcel = () => {
    window.open(`${API_BASE}/api/setup/audit-logs/export?${filterParams().toString()}`, '_blank');
  };

  // Rows per page change reloads from the first page
  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

  // One entry per user name (the same person can appear with several codes in old rows)
  const userNames = [...new Set(options.users.map(u => u.name).filter(Boolean))];

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
          onClick={() => fetchLogs(1)}
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
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <div style={{ minWidth: '190px' }}>
            <SearchableSelect value={user} onChange={e => setUser(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <option value="">All users</option>
              {userNames.map(name => <option key={name} value={name}>{name}</option>)}
            </SearchableSelect>
          </div>
          <div style={{ minWidth: '190px' }}>
            <SearchableSelect value={module} onChange={e => setModule(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <option value="">All modules</option>
              {options.modules.map(m => <option key={m} value={m}>{m}</option>)}
            </SearchableSelect>
          </div>
          <div style={{ minWidth: '160px' }}>
            <SearchableSelect value={action} onChange={e => setAction(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <option value="">All actions</option>
              {options.actions.map(a => <option key={a} value={a}>{a}</option>)}
            </SearchableSelect>
          </div>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From date"
            style={{ padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To date"
            style={{ padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }} />
          <button
            onClick={clearFilters}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-lg)', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--outline-variant)', fontWeight: '700', cursor: 'pointer' }}
          >
            Clear
          </button>
          <button
            onClick={exportExcel}
            title="Download the filtered list as a spreadsheet (opens in Excel)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
        <button 
          onClick={() => fetchLogs(1)}
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

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 16px', borderTop: '1px solid var(--outline-variant)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--outline)', fontWeight: '600' }}>
            {pageInfo.total > 0
              ? `Showing ${pageInfo.from}-${pageInfo.to} of ${pageInfo.total} activities`
              : 'No activities'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', color: 'var(--outline)', fontWeight: '600' }}>Rows</label>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              style={{ padding: '6px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
            >
              {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={loading || page <= 1}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', backgroundColor: 'transparent', color: 'var(--primary)', fontWeight: '700', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={15} /> Prev
            </button>

            <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--primary)' }}>
              Page {page} / {pageInfo.last_page}
            </span>

            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={loading || page >= pageInfo.last_page}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', backgroundColor: 'transparent', color: 'var(--primary)', fontWeight: '700', cursor: page >= pageInfo.last_page ? 'not-allowed' : 'pointer', opacity: page >= pageInfo.last_page ? 0.5 : 1 }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
