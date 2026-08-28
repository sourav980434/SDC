'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from '@/context/HotkeyContext';
import styles from './shortcuts.module.css';
import API_BASE from '@/lib/apiConfig';
import { 
  Keyboard, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  RotateCcw, 
  Save, 
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';

export default function ShortcutsPage() {
  const { shortcuts, saveShortcut, resetToDefaults, parseKeyEvent } = useHotkeys();
  
  // Simulation flag for Admin Role testing
  const [isAdmin, setIsAdmin] = useState(true);
  const [recordingAction, setRecordingAction] = useState(null); // Action ID currently being recorded
  const [recordedKeys, setRecordedKeys] = useState('');
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success'|'error', msg: '' }
  const recordingRef = useRef(null);

  const [is24h, setIs24h] = useState(false);

  useEffect(() => {
    setIs24h(localStorage.getItem('sdcp_time_format') === '24h');
  }, []);

  const toggleTimeFormat = () => {
    const nextVal = !is24h;
    setIs24h(nextVal);
    localStorage.setItem('sdcp_time_format', nextVal ? '24h' : '12h');
    window.dispatchEvent(new Event('storage'));
  };

  // Patient Master Migration state
  const [isPatientImplemented, setIsPatientImplemented] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [migratedCount, setMigratedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/master/patients/status`)
      .then(res => res.json())
      .then(data => setIsPatientImplemented(data.implemented))
      .catch(err => console.error("Error fetching patient status:", err));
  }, []);

  const handleMigratePatients = () => {
    if (!confirm("Are you sure you want to implement the Patient Master table? This will migrate all unique patients from the transaction headers.")) return;
    
    setMigrationLoading(true);
    setProgress(0);
    setMigratedCount(0);
    setTotalCount(0);
    setSaveStatus(null);

    // Step 1: Initialize migration and get total count
    fetch(`${API_BASE}/api/master/patients/migrate-init`, {
      method: 'POST'
    })
      .then(res => {
        if (!res.ok) throw new Error("Migration initialization failed.");
        return res.json();
      })
      .then(data => {
        const total = data.total || 0;
        setTotalCount(total);
        if (total === 0) {
          setIsPatientImplemented(true);
          setMigrationLoading(false);
          setSaveStatus({ type: 'success', msg: 'Patient Master table implemented. No historical records found to migrate.' });
          return;
        }
        
        // Step 2: Migrate in chunks recursively
        migrateChunk(1, total);
      })
      .catch(err => {
        console.error(err);
        setSaveStatus({ type: 'error', msg: err.message || 'Migration initialization failed.' });
        setMigrationLoading(false);
      });
  };

  const migrateChunk = (start, total) => {
    const chunkSize = 5000;
    const end = Math.min(start + chunkSize - 1, total);

    fetch(`${API_BASE}/api/master/patients/migrate-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to migrate chunk: ${start} to ${end}`);
        return res.json();
      })
      .then(() => {
        const nextStart = end + 1;
        setMigratedCount(end);
        setProgress(Math.round((end / total) * 100));

        if (nextStart <= total) {
          migrateChunk(nextStart, total);
        } else {
          // Finished!
          setIsPatientImplemented(true);
          setMigrationLoading(false);
          setSaveStatus({ type: 'success', msg: 'Patient Master table implemented and all records migrated successfully!' });
        }
      })
      .catch(err => {
        console.error(err);
        setSaveStatus({ type: 'error', msg: err.message || 'Migration failed during chunk transfer.' });
        setMigrationLoading(false);
      });
  };

  // Key event interceptor during shortcut recording
  useEffect(() => {
    if (!recordingAction) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // If they press Escape on its own, cancel recording
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setRecordingAction(null);
        setRecordedKeys('');
        return;
      }

      // Parse the combo
      const combo = parseKeyEvent(e);
      
      // Do not save if it's just modifier key
      if (['Control', 'Shift', 'Alt'].includes(e.key)) {
        return;
      }

      setRecordedKeys(combo);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingAction, parseKeyEvent]);

  // Click outside to cancel or save recording
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (recordingRef.current && !recordingRef.current.contains(e.target)) {
        finishRecording();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [recordingAction, recordedKeys]);

  const startRecording = (actionId) => {
    setRecordingAction(actionId);
    setRecordedKeys(shortcuts[actionId].key);
    setSaveStatus(null);
  };

  const finishRecording = () => {
    if (!recordingAction) return;

    if (recordedKeys && recordedKeys !== shortcuts[recordingAction].key) {
      const res = saveShortcut(recordingAction, recordedKeys);
      if (res.success) {
        setSaveStatus({ type: 'success', msg: `Successfully assigned "${recordedKeys}" to "${shortcuts[recordingAction].label}"` });
      } else {
        setSaveStatus({ type: 'error', msg: res.error || 'Failed to assign shortcut.' });
      }
    }
    
    setRecordingAction(null);
    setRecordedKeys('');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all customizable shortcuts to defaults?')) {
      resetToDefaults();
      setSaveStatus({ type: 'success', msg: 'All shortcuts reset to defaults successfully!' });
    }
  };

  // If user is not Admin, show access denied view with a simulated toggle
  if (!isAdmin) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.accessDenied}>
          <ShieldAlert size={64} className={styles.deniedIcon} />
          <h3>Access Denied</h3>
          <p>
            You do not have administrative privileges to customize keyboard shortcuts. 
            Only Super Admins or authorized Admin users can reconfigure system hotkeys.
          </p>
          <div className={styles.roleToggle}>
            <span>Test Role Simulator:</span>
            <button className={styles.toggleSwitch} onClick={() => setIsAdmin(true)}>
              Switch to Admin Role
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <section className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Keyboard Shortcuts Configuration</h2>
          <p>Assign custom keys for high-speed workflows or review system-locked navigation shortcuts.</p>
        </div>
        <div className={styles.roleToggle}>
          <span>Logged in as <strong>Super Admin</strong></span>
          <button className={styles.toggleSwitch} onClick={() => setIsAdmin(false)}>
            Simulate Operator Role
          </button>
        </div>
      </section>

      {/* Alert Status Banners */}
      {saveStatus && (
        <div className={`alertBanner ${saveStatus.type === 'success' ? 'alertSuccess' : 'alertError'}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderRadius: '12px' }}>
          {saveStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontSize: '14px', fontWeight: '600' }}>{saveStatus.msg}</span>
        </div>
      )}

      {/* General Settings Card */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>General Configuration</h3>
        </div>
        <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--primary)', fontWeight: '700' }}>Time Format</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--outline)' }}>
              Choose between 12-hour (AM/PM) and 24-hour time format for booking timestamps.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: !is24h ? 'var(--secondary)' : 'var(--outline)' }}>12 Hrs</span>
            {/* Toggle Switch */}
            <button 
              type="button"
              onClick={toggleTimeFormat}
              style={{
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: is24h ? 'var(--secondary)' : 'var(--outline-variant)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                padding: 0
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                position: 'absolute',
                top: '3px',
                left: is24h ? '27px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: '700', color: is24h ? 'var(--secondary)' : 'var(--outline)' }}>24 Hrs</span>
          </div>
        </div>
      </div>

      {/* Shortcuts Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Interactive Settings List</h3>
          <div className={styles.btnGroup}>
            <button className={styles.secondaryBtn} onClick={handleReset}>
              <RotateCcw size={16} />
              Reset Defaults
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '45%' }}>Action / Description</th>
                <th className={styles.th} style={{ width: '20%' }}>Type</th>
                <th className={styles.th} style={{ width: '35%' }}>Key Assignment</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(shortcuts).map((actionId) => {
                const item = shortcuts[actionId];
                const isRecordingThis = recordingAction === actionId;

                return (
                  <tr key={actionId}>
                    <td className={styles.td}>
                      <div className={styles.actionName}>{item.label}</div>
                      <div className={styles.actionDesc}>
                        {item.locked 
                          ? `Pressing this key combo instantly jumps to the corresponding page from anywhere.`
                          : `Local trigger active on target form pages for high-speed processing.`
                        }
                      </div>
                    </td>
                    <td className={styles.td}>
                      {item.locked ? (
                        <span className={styles.badgeLocked}>
                          <Lock size={12} />
                          System Locked
                        </span>
                      ) : (
                        <span className={styles.badgeCustomizable}>
                          <Unlock size={12} />
                          Customizable
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.keyInputWrapper} ref={isRecordingThis ? recordingRef : null}>
                        <input
                          type="text"
                          readOnly
                          className={`${styles.keyInput} ${
                            item.locked ? styles.keyInputLocked : ''
                          } ${isRecordingThis ? styles.keyInputRecording : ''}`}
                          value={isRecordingThis ? (recordedKeys || 'Press any keys...') : item.key}
                          onClick={() => !item.locked && startRecording(actionId)}
                          placeholder="Click to record..."
                        />
                        <Keyboard size={16} className={styles.keyIcon} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Administration Card */}
      <div className={styles.card} style={{ marginTop: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>System Administration</h3>
        </div>
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--outline)', marginBottom: '16px' }}>
            Configure and maintain database extensions for advanced clinical operations.
          </p>
          
          {migrationLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--surface-container-high)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  Migrating Patients: {migratedCount.toLocaleString()} / {totalCount.toLocaleString()} ({progress}%)
                </span>
                <div className="spinner" style={{
                  width: '18px',
                  height: '18px',
                  border: '3px solid var(--outline-variant)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--outline-variant)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary)',
                  transition: 'width 0.2s ease-out'
                }} />
              </div>
            </div>
          ) : isPatientImplemented ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '8px', backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                <CheckCircle2 size={20} style={{ color: '#4CAF50' }} />
                <span style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--on-surface)' }}>
                  Patient Master (MPatient Table) is fully implemented and active.
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--outline)' }}>
                Autocomplete dropdowns for Patient Code, Name, and Mobile Number are now fully active on the booking page.
              </p>
              <button 
                type="button" 
                onClick={handleMigratePatients}
                className={styles.secondaryBtn} 
                style={{ 
                  alignSelf: 'flex-start',
                  border: '1px solid var(--outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Re-migrate / Re-implement Patient Master
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '8px', backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                <AlertTriangle size={20} style={{ color: '#FF9800' }} />
                <span style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--on-surface)' }}>
                  Patient Master table is not yet implemented. Autocomplete dropdown suggestions are currently disabled.
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--outline)', lineHeight: '1.5' }}>
                Clicking the button below will run a fast native database procedure to create the `MPatient` table and migrate existing patient records from the `TBookingHDR` transaction log starting with Patient Code 1000.
              </p>
              <button 
                type="button" 
                onClick={handleMigratePatients}
                className={styles.primaryBtn} 
                style={{ 
                  alignSelf: 'flex-start',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Implement Patient Master
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Inject custom spin animation for the loading state */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
