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
  FileText
} from 'lucide-react';
import styles from './dashboard.module.css';

export default function DailyDashboard() {
  const [activeUser, setActiveUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading session:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const currentRole = activeUser?.role_code || 'RECEPTIONIST'; // Non-admin safe fallback
  const currentName = activeUser?.full_name || activeUser?.username || 'User';
  const roleName = activeUser?.role_name || currentRole;

  // Real Production Mock Data
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

  const readyForDispatch = [
    { regId: 'BK/26-27/00081', name: 'Sourav Chowdhury', tests: 'SUGAR FASTING, SUGAR PP', status: 'Ready for Hardcopy' },
    { regId: 'BK/26-27/00082', name: 'Maya Chowdhury', tests: 'RBC COUNT', status: 'Ready for Hardcopy' },
    { regId: 'BK/26-27/00083', name: 'Rajesh Saha', tests: 'USG OF UPPER ABDOMEN', status: 'Ready for Hardcopy' }
  ];

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--outline)', fontWeight: '600' }}>
        Loading Diagnostic Workspace...
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <section className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Daily Diagnostic Workspace</h2>
          <p style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> 
            Welcome back, <strong>{currentName}</strong>! ({roleName})
          </p>
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
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>+12% Today</span>
              </div>
              <p className={styles.cardLabel}>Today&apos;s Total Bookings</p>
              <p className={styles.cardVal}>124</p>
              <p className={styles.cardSubtext}>64 Diagnostics, 60 Consultations</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><Coins size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Target 85%</span>
              </div>
              <p className={styles.cardLabel}>Revenue Today</p>
              <p className={styles.cardVal}>₹ 84,250</p>
              <p className={styles.cardSubtext}>Cash: ₹72,000 | Pending: ₹12,250</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Clock size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>94.2% Met</span>
              </div>
              <p className={styles.cardLabel}>Turnaround Target (TAT)</p>
              <p className={styles.cardVal}>3.8 hrs</p>
              <p className={styles.cardSubtext}>Average diagnostic report delivery</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><UserPlus size={20} /></div>
              </div>
              <p className={styles.cardLabel}>New Patient Growth</p>
              <p className={styles.cardVal}>18</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar} style={{ width: '65%' }}></div>
              </div>
              <p className={styles.cardSubtext} style={{ marginTop: '4px' }}>+5% growth vs last week</p>
            </div>
          </section>

          {/* Admin Main Grid */}
          <section className={styles.dashboardMainGrid}>
            <div className={styles.bookingsContainer}>
              <div className={styles.containerHeader}>
                <h3>Recent Bookings & Audit Activity</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Patient Name</th>
                      <th className={styles.th}>Test Type</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Assigned Lab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td className={styles.td}>
                          <div className={styles.patientNameCell}>
                            <span className={styles.patientName}>{b.name}</span>
                            <span className={styles.patientId}>{b.id}</span>
                          </div>
                        </td>
                        <td className={styles.td}><span className={styles.testType}>{b.test}</span></td>
                        <td className={styles.td}>
                          <span className={`${styles.statusPill} ${b.status === 'In Progress' ? styles.statusInProgress : styles.statusReady}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className={styles.td}><span className={styles.labText}>{b.lab}</span></td>
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
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Active</span>
              </div>
              <p className={styles.cardLabel}>Today&apos;s Registered Patients</p>
              <p className={styles.cardVal}>84</p>
              <p className={styles.cardSubtext}>Front Desk Footfall</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><Printer size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Ready</span>
              </div>
              <p className={styles.cardLabel}>Reports Ready for Hardcopy</p>
              <p className={styles.cardVal}>52</p>
              <p className={styles.cardSubtext}>Awaiting patient collection</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Coins size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Pending Collection</span>
              </div>
              <p className={styles.cardLabel}>Pending Due Receipts</p>
              <p className={styles.cardVal}>12</p>
              <p className={styles.cardSubtext}>Part payment due collections</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><Zap size={20} /></div>
              </div>
              <p className={styles.cardLabel}>VIP / Fast-Track Bookings</p>
              <p className={styles.cardVal}>04</p>
              <p className={styles.cardSubtext}>Urgent priority processing</p>
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
      {/* 🔬 3. LAB TECHNICIAN DASHBOARD VIEW                  */}
      {/* ==================================================== */}
      {currentRole === 'LAB_TECH' && (
        <>
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Activity size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Attention</span>
              </div>
              <p className={styles.cardLabel}>Pending Specimen Collection</p>
              <p className={styles.cardVal}>28</p>
              <p className={styles.cardSubtext}>Barcodes awaiting sample draw</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><Clock size={20} /></div>
              </div>
              <p className={styles.cardLabel}>In-Process Analyzer Runs</p>
              <p className={styles.cardVal}>42</p>
              <p className={styles.cardSubtext}>Biochemistry & Haematology</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><AlertTriangle size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>Panic Flag</span>
              </div>
              <p className={styles.cardLabel}>Out-of-Range Critical Values</p>
              <p className={styles.cardVal}>06</p>
              <p className={styles.cardSubtext}>Requires verification flag</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><CheckCircle2 size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Tests Processed Today</p>
              <p className={styles.cardVal}>98</p>
              <p className={styles.cardSubtext}>Lab technician shift throughput</p>
            </div>
          </section>

          <section className={styles.dashboardMainGrid}>
            <div className={styles.bookingsContainer}>
              <div className={styles.containerHeader}>
                <h3>STAT / Urgent Specimen Worklist</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Patient ID</th>
                      <th className={styles.th}>Patient Name</th>
                      <th className={styles.th}>Test Requested</th>
                      <th className={styles.th}>Department</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(b => (
                      <tr key={b.id}>
                        <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{b.id}</td>
                        <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>{b.name}</td>
                        <td className={styles.td}>{b.test}</td>
                        <td className={styles.td}>{b.lab}</td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <Link href="/lab/result-entry" className={styles.actionsLink}>Enter Result</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.widgetsCol}>
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitleGroup}>
                  <Activity size={18} style={{ color: 'var(--primary)' }} />
                  <h3>Analyzer Hardware Status</h3>
                </div>
                <div className={styles.notificationsList}>
                  <div className={`${styles.notificationItem} ${styles.itemInfo}`}>
                    <div className={styles.notifContent}>
                      <span className={`${styles.notifTag} ${styles.tagInfo}`}>ONLINE</span>
                      <p className={styles.notifTitle}>Sysmex XN-550 Cell Counter Connected</p>
                    </div>
                  </div>
                  <div className={`${styles.notificationItem} ${styles.itemInfo}`}>
                    <div className={styles.notifContent}>
                      <span className={`${styles.notifTag} ${styles.tagInfo}`}>ONLINE</span>
                      <p className={styles.notifTitle}>Cobas c311 Biochemistry Analyzer Connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ==================================================== */}
      {/* 🩺 4. CONSULTANT PATHOLOGIST DASHBOARD VIEW          */}
      {/* ==================================================== */}
      {currentRole === 'PATHOLOGIST' && (
        <>
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><FileCheck size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Review Queue</span>
              </div>
              <p className={styles.cardLabel}>Pending Verification Queue</p>
              <p className={styles.cardVal}>18</p>
              <p className={styles.cardSubtext}>Awaiting pathologist sign-off</p>
            </div>

            <div className={styles.bentoCard} style={{ borderColor: '#fca5a5', backgroundColor: '#fff5f5' }}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><AlertTriangle size={20} /></div>
                <span className={`${styles.badge} ${styles.badgeAlert}`}>CRITICAL</span>
              </div>
              <p className={styles.cardLabel} style={{ color: '#991b1b' }}>Critical Panic Values</p>
              <p className={styles.cardVal} style={{ color: '#991b1b' }}>04</p>
              <p className={styles.cardSubtext} style={{ color: '#b91c1c' }}>Immediate physician alert required</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><CheckCircle2 size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Reports Approved Today</p>
              <p className={styles.cardVal}>64</p>
              <p className={styles.cardSubtext}>Verified & digital signature appended</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><Clock size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Verification TAT Met</p>
              <p className={styles.cardVal}>95.8%</p>
              <p className={styles.cardSubtext}>Average review time: 14 mins</p>
            </div>
          </section>

          {/* Critical Panic Value Alert Panel */}
          <div style={{ backgroundColor: '#fff1f2', border: '2px solid #f43f5e', borderRadius: 'var(--radius-2xl)', padding: '20px', boxShadow: '0 8px 24px rgba(244,63,94,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={24} style={{ color: '#e11d48' }} />
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#9f1239', margin: 0 }}>
                🚨 Critical Panic Value Review Required Immediately
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {panicValues.map(p => (
                <div key={p.id} style={{ backgroundColor: '#ffffff', border: '1px solid #fecdd3', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#be123c' }}>{p.id}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#ffe4e6', color: '#e11d48', padding: '2px 6px', borderRadius: '4px' }}>{p.status}</span>
                  </div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--primary)' }}>{p.patient}</strong>
                  <div style={{ fontSize: '13px', color: '#9f1239', fontWeight: '700' }}>{p.test}: {p.value}</div>
                  <Link href="/lab/verification" style={{ fontSize: '12px', fontWeight: '700', color: '#e11d48', marginTop: '6px', textDecoration: 'none' }}>
                    Verify & Approve Report →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* 💼 5. ACCOUNTANT DASHBOARD VIEW                      */}
      {/* ==================================================== */}
      {currentRole === 'ACCOUNTANT' && (
        <>
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.revenueIcon}`}><Coins size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Shift Cash Collected</p>
              <p className={styles.cardVal}>₹ 72,000</p>
              <p className={styles.cardSubtext}>Front Desk cash drawer total</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.bookingsIcon}`}><CreditCard size={20} /></div>
              </div>
              <p className={styles.cardLabel}>UPI & Online Collections</p>
              <p className={styles.cardVal}>₹ 12,250</p>
              <p className={styles.cardSubtext}>Bank account settlement</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.pendingIcon}`}><Coins size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Due Collection Balance</p>
              <p className={styles.cardVal}>₹ 18,500</p>
              <p className={styles.cardSubtext}>Outstanding patient dues</p>
            </div>

            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconWrapper} ${styles.patientsIcon}`}><Building2 size={20} /></div>
              </div>
              <p className={styles.cardLabel}>Doctor Incentive Due</p>
              <p className={styles.cardVal}>₹ 24,000</p>
              <p className={styles.cardSubtext}>Monthly referral balance</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
