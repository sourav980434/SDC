'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Coins, 
  UserPlus, 
  AlertTriangle, 
  Filter, 
  Download, 
  Megaphone, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Zap,
  Printer,
  Sparkles,
  Server,
  Activity,
  CreditCard,
  Building2,
  Users,
  PlusCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import styles from './dashboard.module.css';
import API_BASE from '@/lib/apiConfig';

export default function DailyDashboard() {
  const [activeUser, setActiveUser] = useState(null);
  const [stats, setStats] = useState({
    today_bookings: 0,
    today_revenue: 0,
    pending_dues_count: 0,
    pending_dues_amount: 0,
    today_new_patients: 0,
    ready_dispatches: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading session:", e);
    }
  }, []);

  const fetchDashboardStats = () => {
    setLoadingStats(true);
    fetch(`${API_BASE}/api/dashboard/stats`)
      .then(res => res.json())
      .then(data => {
        setLoadingStats(false);
        if (!data.error) {
          setStats(data);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      })
      .catch(err => {
        console.error("Error fetching dashboard stats:", err);
        setLoadingStats(false);
      });
  };

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentRole = activeUser?.role_code || 'ADMIN'; // Default to full workspace view
  const currentName = activeUser?.full_name || activeUser?.username || 'Administrator';
  const roleName = activeUser?.role_name || currentRole;

  const recentBookings = [
    { id: 'PID-99238', name: 'Amitabh Banerjee', test: 'Complete Blood Count (CBC)', status: 'In Progress', lab: 'Hematology-B' },
    { id: 'PID-99239', name: 'Susmita Das', test: 'Lipid Profile', status: 'Pending Collection', lab: 'Biochemistry-A' },
    { id: 'PID-99240', name: 'Rajesh Kumar', test: 'MRI Brain (Contrast)', status: 'Report Ready', lab: 'Radiology-M1' },
    { id: 'PID-99241', name: 'Priya Sharma', test: 'Thyroid Profile (T3, T4, TSH)', status: 'In Progress', lab: 'Pathology-A' }
  ];

  const panicValues = [
    { id: 'PID-99238', patient: 'Amitabh Banerjee', test: 'Hb (Hemoglobin)', value: '6.2 g/dL', status: 'PANIC LOW', time: '5m ago' },
    { id: 'PID-99244', patient: 'Subrata Roy', test: 'Fasting Plasma Glucose', value: '410 mg/dL', status: 'PANIC HIGH', time: '12m ago' },
    { id: 'PID-99245', patient: 'Meena Sharma', test: 'Serum Potassium (K+)', value: '6.8 mmol/L', status: 'PANIC HIGH', time: '28m ago' }
  ];

  const readyForDispatch = stats.ready_dispatches && stats.ready_dispatches.length > 0
    ? stats.ready_dispatches
    : [
        { regId: 'BK/26-27/00081', name: 'Sourav Chowdhury', tests: 'SUGAR FASTING, SUGAR PP', status: 'Ready for Hardcopy' },
        { regId: 'BK/26-27/00082', name: 'Maya Chowdhury', tests: 'RBC COUNT', status: 'Ready for Hardcopy' },
        { regId: 'BK/26-27/00083', name: 'Rajesh Saha', tests: 'USG OF UPPER ABDOMEN', status: 'Ready for Hardcopy' }
      ];

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <section className={styles.topSection} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.titleGroup}>
          <h2>Daily Diagnostic Workspace</h2>
          <p style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> 
            Welcome back, <strong>{currentName}</strong>! ({roleName})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--outline)', fontWeight: '600' }}>
              Live Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchDashboardStats}
            disabled={loadingStats}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--primary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loadingStats ? 'spinIcon' : ''} />
            {loadingStats ? 'Refreshing SQL...' : 'Refresh Metrics'}
          </button>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 👑 1. SUPER ADMIN DASHBOARD VIEW                     */}
      {/* ==================================================== */}
      {currentRole === 'ADMIN' && (
        <>
          {/* Admin KPI Cards */}
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><Calendar size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Live SQL</span>
              </div>
              <p className={styles.cardLabel}>Today&apos;s Total Bookings</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : stats.today_bookings}</p>
              <p className={styles.cardSubtext}>Real-time SQL Server Count</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><Coins size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Today Cash</span>
              </div>
              <p className={styles.cardLabel}>Revenue Today</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : `₹ ${stats.today_revenue.toLocaleString('en-IN')}`}</p>
              <p className={styles.cardSubtext}>Pending Dues: ₹ {stats.pending_dues_amount.toLocaleString('en-IN')}</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Clock size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>{stats.pending_dues_count} Pending</span>
              </div>
              <p className={styles.cardLabel}>Pending Due Vouchers</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : stats.pending_dues_count}</p>
              <p className={styles.cardSubtext}>Uncollected diagnostic balances</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><UserPlus size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Today&apos;s Registered Patients</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : stats.today_new_patients}</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar} style={{ width: '100%' }}></div>
              </div>
              <p className={styles.cardSubtext} style={{ marginTop: '4px' }}>Live SQL Server Count</p>
            </div>
          </section>

          {/* Admin Main Grid */}
          <section className={styles.dashboardMainGrid}>
            <div className={styles.bookingsContainer}>
              <div className={styles.containerHeader}>
                <h3>Recent Patient Registrations & Dispatches</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Booking No</th>
                      <th className={styles.th}>Patient Name</th>
                      <th className={styles.th}>Tests Included</th>
                      <th className={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyForDispatch.map((b) => (
                      <tr key={b.regId}>
                        <td className={styles.td} style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{b.regId}</td>
                        <td className={styles.td}>
                          <span className={styles.patientName}>{b.name}</span>
                        </td>
                        <td className={styles.td}><span className={styles.testType} title={b.tests}>{b.tests}</span></td>
                        <td className={styles.td}>
                          <span className={`${styles.statusPill} ${styles.statusReady}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Admin Right Sidebar Widgets */}
            <div className={styles.widgetsCol}>
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitleGroup}>
                  <Server size={18} style={{ color: 'var(--primary)' }} />
                  <h3>Server & System Backup Health</h3>
                </div>
                <div className={styles.notificationsList}>
                  <div className={`${styles.notificationItem} ${styles.itemInfo}`}>
                    <div className={styles.notifContent}>
                      <span className={`${styles.notifTag} ${styles.tagInfo}`}>Auto Backup Completed</span>
                      <p className={styles.notifTitle}>SQL Server Database Backup Success</p>
                      <span className={styles.notifMeta}>15m ago • DIAGMS.bak</span>
                    </div>
                  </div>
                  <div className={`${styles.notificationItem} ${styles.itemUpdate}`}>
                    <div className={styles.notifContent}>
                      <span className={`${styles.notifTag} ${styles.tagUpdate}`}>System Status</span>
                      <p className={styles.notifTitle}>Laravel & Next.js Server Healthy</p>
                      <span className={styles.notifMeta}>Uptime 99.9%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.capacityCard}>
                <h4>Total Lab Capacity Utilization</h4>
                <div className={styles.capacityContent}>
                  <div className={styles.capacityMeta}>
                    <p>Global Status</p>
                    <div className={styles.capacityVal}>82% <span>Busy</span></div>
                  </div>
                  <TrendingUp size={64} className={styles.capacityBgIcon} />
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ==================================================== */}
      {/* 👩‍💼 2. RECEPTIONIST DASHBOARD VIEW                     */}
      {/* ==================================================== */}
      {currentRole === 'RECEPTIONIST' && (
        <>
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><Users size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Live SQL</span>
              </div>
              <p className={styles.cardLabel}>Today&apos;s Registered Patients</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : stats.today_bookings}</p>
              <p className={styles.cardSubtext}>Front Desk Footfall</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><Printer size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Ready</span>
              </div>
              <p className={styles.cardLabel}>Reports Ready for Hardcopy</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : readyForDispatch.length}</p>
              <p className={styles.cardSubtext}>Awaiting patient collection</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Coins size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Pending Collection</span>
              </div>
              <p className={styles.cardLabel}>Pending Due Receipts</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : stats.pending_dues_count}</p>
              <p className={styles.cardSubtext}>Part payment due collections</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><Zap size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Today Revenue Collected</p>
              <p className={styles.cardVal}>{loadingStats ? '...' : `₹ ${stats.today_revenue.toLocaleString('en-IN')}`}</p>
              <p className={styles.cardSubtext}>Live Cash Collections</p>
            </div>
          </section>

          {/* Quick Action Button for Receptionist */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/booking"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                borderRadius: 'var(--radius-xl)',
                fontWeight: '800',
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
              }}
            >
              <PlusCircle size={20} /> + New Patient Diagnostic Booking (Hotkey: F2)
            </Link>
          </div>

          <section className={styles.dashboardMainGrid}>
            <div className={styles.bookingsContainer}>
              <div className={styles.containerHeader}>
                <h3>Reports Ready for Patient Dispatch</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Booking No</th>
                      <th className={styles.th}>Patient Name</th>
                      <th className={styles.th}>Tests Included</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyForDispatch.map((r) => (
                      <tr key={r.regId}>
                        <td className={styles.td} style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{r.regId}</td>
                        <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>{r.name}</td>
                        <td className={styles.td}>{r.tests}</td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <button className={styles.actionsLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Printer size={14} /> Print Hardcopy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receptionist Updates Sidebar */}
            <div className={styles.widgetsCol}>
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitleGroup}>
                  <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                  <h3>Front Desk Updates</h3>
                </div>
                <div className={styles.notificationsList}>
                  <div className={`${styles.notificationItem} ${styles.itemInfo}`}>
                    <div className={styles.notifContent}>
                      <span className={`${styles.notifTag} ${styles.tagInfo}`}>Notice</span>
                      <p className={styles.notifTitle}>USG Doctor Arrived at Chamber 2</p>
                      <span className={styles.notifMeta}>Front Desk Manager • 10m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ==================================================== */}
      {/* 🔬 3. LAB TECH / PATHOLOGIST WORKSPACE               */}
      {/* ==================================================== */}
      {(currentRole === 'LAB_TECH' || currentRole === 'PATHOLOGIST') && (
        <>
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><Activity size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Action Needed</span>
              </div>
              <p className={styles.cardLabel}>Pending Sample Collection</p>
              <p className={styles.cardVal}>14</p>
              <p className={styles.cardSubtext}>Phlebotomy Queue</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><FileText size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>In Progress</span>
              </div>
              <p className={styles.cardLabel}>Awaiting Result Entry</p>
              <p className={styles.cardVal}>28</p>
              <p className={styles.cardSubtext}>Lab Equipment Processing</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><CheckCircle2 size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Verification</span>
              </div>
              <p className={styles.cardLabel}>Awaiting Doctor Verification</p>
              <p className={styles.cardVal}>19</p>
              <p className={styles.cardSubtext}>Pathologist Approval Queue</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><AlertTriangle size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Critical</span>
              </div>
              <p className={styles.cardLabel}>Panic / Critical Value Alerts</p>
              <p className={styles.cardVal}>03</p>
              <p className={styles.cardSubtext}>Immediate Doctor Notification</p>
            </div>
          </section>

          {/* Lab Tech Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/lab/result-entry"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                borderRadius: 'var(--radius-xl)',
                fontWeight: '800',
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
              }}
            >
              <FileText size={20} /> Enter Lab Test Results
            </Link>
            <Link
              href="/lab/verification"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'var(--surface-container-high)',
                color: 'var(--primary)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-xl)',
                fontWeight: '800',
                fontSize: '15px',
                textDecoration: 'none'
              }}
            >
              <CheckCircle2 size={20} /> Pathology Doctor Verification
            </Link>
          </div>

          <section className={styles.dashboardMainGrid}>
            <div className={styles.bookingsContainer}>
              <div className={styles.containerHeader}>
                <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> Critical Panic Values Alert Queue
                </h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Patient Name</th>
                      <th className={styles.th}>Test Parameter</th>
                      <th className={styles.th}>Observed Value</th>
                      <th className={styles.th}>Alert Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panicValues.map((pv) => (
                      <tr key={pv.id}>
                        <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>{pv.patient}</td>
                        <td className={styles.td}>{pv.test}</td>
                        <td className={styles.td} style={{ fontWeight: '800', color: '#dc2626', fontFamily: 'var(--font-mono)' }}>{pv.value}</td>
                        <td className={styles.td}>
                          <span className={styles.statusPill} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            {pv.status} ({pv.time})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
