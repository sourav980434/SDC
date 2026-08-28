'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function PatientMaster() {
  const router = useRouter();

  // State
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPat, setSelectedPat] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'add', 'edit'
  const [isImplemented, setIsImplemented] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const listWrapperRef = useRef(null);
  const selectedRowRef = useRef(null);

  // Auto-scroll selected row into view inside table container
  useEffect(() => {
    if (selectedRowRef.current && listWrapperRef.current) {
      const container = listWrapperRef.current;
      const row = selectedRowRef.current;

      const containerTop = container.scrollTop;
      const headerHeight = container.querySelector('thead')?.offsetHeight || 35;
      const visibleTop = containerTop + headerHeight;
      const containerBottom = containerTop + container.clientHeight;

      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.offsetHeight;

      if (rowTop < visibleTop) {
        container.scrollTop = rowTop - headerHeight;
      } else if (rowBottom > containerBottom) {
        container.scrollTop = rowBottom - container.clientHeight;
      }
    }
  }, [selectedPat]);

  // Form fields
  const [code, setCode] = useState('');
  const [prefix, setPrefix] = useState('Mr.');
  const [name, setName] = useState('');
  const [sex, setSex] = useState('Male');
  const [ageYear, setAgeYear] = useState('');
  const [ageMonth, setAgeMonth] = useState('');
  const [ageDay, setAgeDay] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [mobileNo, setMobileNo] = useState('');

  // Load initial data
  useEffect(() => {
    // Check if Patient table is implemented first
    fetch(`${API_BASE}/api/master/patients/status`)
      .then(res => res.json())
      .then(data => {
        setIsImplemented(data.implemented);
        if (data.implemented) {
          fetchPatients('', 1);
        }
      })
      .catch(err => {
        console.error("Error checking patient table status:", err);
      });
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !patients || patients.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = patients.findIndex(p => p.Code === selectedPat?.Code);
        const nextIdx = currentIdx < patients.length - 1 ? currentIdx + 1 : 0;
        loadPatientIntoForm(patients[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = patients.findIndex(p => p.Code === selectedPat?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : patients.length - 1;
        loadPatientIntoForm(patients[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, patients, selectedPat]);

  const fetchPatients = (search = '', pageNum = 1) => {
    fetch(`${API_BASE}/api/master/patients?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => {
        if (!res.ok) throw new Error("Table not implemented");
        return res.json();
      })
      .then(data => {
        const loadedPats = data.data || [];
        setPatients(loadedPats);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedPats.length > 0 && !selectedPat) {
          loadPatientIntoForm(loadedPats[0]);
        }
      })
      .catch(err => {
        console.error("Error fetching patients:", err);
        setIsImplemented(false);
      });
  };

  const loadPatientIntoForm = (pat) => {
    if (!pat) return;
    setSelectedPat(pat);
    setCode(pat.Code || '');
    setPrefix(pat.Prefix || 'Mr.');
    setName(pat.Name || '');
    setSex(pat.Sex || 'Male');
    setAgeYear(pat.AgeYear ?? '');
    setAgeMonth(pat.AgeMonth ?? '');
    setAgeDay(pat.AgeDay ?? '');
    setAddress1(pat.Address1 || '');
    setAddress2(pat.Address2 || '');
    setMobileNo(pat.MobileNo || '');
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchPatients(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedPat(null);
    setCode('AUTO');
    setPrefix('Mr.');
    setName('');
    setSex('Male');
    setAgeYear('');
    setAgeMonth('');
    setAgeDay('');
    setAddress1('');
    setAddress2('');
    setMobileNo('');
  };

  const handleModifyClick = () => {
    if (!selectedPat) return;
    setMode('edit');
  };

  const handleDeleteClick = () => {
    if (!selectedPat) return;
    if (confirm(`Are you sure you want to delete Patient Code: ${selectedPat.Code}?`)) {
      fetch(`${API_BASE}/api/master/patients/${selectedPat.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedPat(null);
          fetchPatients(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting patient:", err));
    }
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (patients.length > 0) {
        loadPatientIntoForm(patients[0]);
      } else {
        setSelectedPat(null);
        setMode('view');
      }
    } else {
      loadPatientIntoForm(selectedPat);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }

    const payload = {
      Prefix: prefix,
      Name: name,
      Sex: sex,
      AgeYear: ageYear !== '' ? parseInt(ageYear) : null,
      AgeMonth: ageMonth !== '' ? parseInt(ageMonth) : null,
      AgeDay: ageDay !== '' ? parseInt(ageDay) : null,
      Address1: address1,
      Address2: address2,
      MobileNo: mobileNo,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/patients` 
      : `${API_BASE}/api/master/patients/${code}`;
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchPatients(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedPat(payload);
        }
      })
      .catch(err => console.error("Error saving patient:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchPatients(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  if (!isImplemented) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center', padding: '64px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', backgroundColor: 'var(--surface-container-lowest)', padding: '40px', borderRadius: '16px', border: '1px solid var(--outline-variant)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '12px' }}>Database Extension Required</h2>
          <p style={{ color: 'var(--outline)', marginBottom: '24px', fontSize: '14.5px', lineHeight: '1.6' }}>
            {`The Patient Master database has not been implemented yet. To browse and manage patients, please go to the Configure Shortcuts settings page and click the "Implement Patient Master" button.`}
          </p>
          <button 
            onClick={() => router.push('/shortcuts')}
            className={styles.btn}
            style={{ backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            Go to Settings / Shortcuts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Left panel: Listing */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Patient List</h2>
        </div>

        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={18} />
          <input
            className={styles.searchInput}
            placeholder="Search by code, name or mobile..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.listWrapper} ref={listWrapperRef}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th className={styles.listTh}>Code</th>
                <th className={styles.listTh}>Name</th>
                <th className={styles.listTh}>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(pat => {
                const isSelected = selectedPat && selectedPat.Code === pat.Code;
                return (
                  <tr
                    key={pat.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadPatientIntoForm(pat);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{pat.Code}</td>
                    <td className={styles.listTd}>{pat.Prefix} {pat.Name}</td>
                    <td className={styles.listTd}>{pat.MobileNo || '-'}</td>
                  </tr>
                );
              })}
              {patients.length === 0 && (
                <tr>
                  <td colSpan="3" className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0 4px' }}>
            <button
              type="button"
              className={styles.btn}
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.btn}
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Right panel: Details/Forms */}
      <form className={styles.card} onSubmit={handleSaveClick}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Patient Details</h2>
        </div>

        <div className={styles.formGrid}>
          <div className="form-group">
            <label className="form-label">Patient Code</label>
            <input
              className="form-input"
              value={code}
              readOnly
              disabled
              style={{ backgroundColor: 'var(--surface-container-high)' }}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Prefix & Name</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                className="form-input"
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                disabled={isView}
                style={{ width: '80px', padding: '10px 8px', cursor: 'pointer' }}
              >
                <option>Mr.</option>
                <option>Mrs.</option>
                <option>Miss</option>
                <option>Dr.</option>
                <option>Baby</option>
                <option>Mast.</option>
              </select>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isView}
                placeholder="Full name"
                required
                style={{ flexGrow: 1 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sex</label>
            <select
              className="form-input"
              value={sex}
              onChange={e => setSex(e.target.value)}
              disabled={isView}
              style={{ cursor: 'pointer' }}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Age (Yrs / Mths / Days)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                className="form-input"
                value={ageYear}
                onChange={e => setAgeYear(e.target.value)}
                disabled={isView}
                placeholder="Yrs"
                style={{ width: '33.33%' }}
              />
              <input
                type="number"
                className="form-input"
                value={ageMonth}
                onChange={e => setAgeMonth(e.target.value)}
                disabled={isView}
                placeholder="Mths"
                style={{ width: '33.33%' }}
              />
              <input
                type="number"
                className="form-input"
                value={ageDay}
                onChange={e => setAgeDay(e.target.value)}
                disabled={isView}
                placeholder="Days"
                style={{ width: '33.33%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact / Mobile</label>
            <input
              className="form-input"
              value={mobileNo}
              onChange={e => setMobileNo(e.target.value)}
              disabled={isView}
              placeholder="Mobile phone"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Address Line 1</label>
            <input
              className="form-input"
              value={address1}
              onChange={e => setAddress1(e.target.value)}
              disabled={isView}
              placeholder="Primary address details"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Address Line 2</label>
            <input
              className="form-input"
              value={address2}
              onChange={e => setAddress2(e.target.value)}
              disabled={isView}
              placeholder="Locality, landmark details"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.actionBar}>
          {isView ? (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Plus size={16} /> Add
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModifyClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedPat}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedPat}>
                <Trash2 size={16} /> Del
              </button>
            </>
          ) : (
            <>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Save size={16} /> Save
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={handleCancelClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <X size={16} /> Cancel
              </button>
            </>
          )}
          
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => router.push('/dashboard')}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </form>
    </div>
  );
}
