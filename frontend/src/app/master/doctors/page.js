'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function DoctorMaster() {
  const router = useRouter();
  
  // State
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'add', 'edit'
  
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
  }, [selectedDoc]);
  
  // Form fields
  const [prefix, setPrefix] = useState('Dr.');
  const [doctName, setDoctName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [desigCode, setDesigCode] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptCode2, setDeptCode2] = useState('');
  const [rAddress1, setRAddress1] = useState('');
  const [rAddress2, setRAddress2] = useState('');
  const [rContactNo, setRContactNo] = useState('');
  const [c1Address, setC1Address] = useState('');
  const [c1ContactNo, setC1ContactNo] = useState('');
  const [c2Address, setC2Address] = useState('');
  const [c2ContactNo, setC2ContactNo] = useState('');
  const [status, setStatus] = useState(1);

  // Load initial data
  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !doctors || doctors.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = doctors.findIndex(d => d.Code === selectedDoc?.Code);
        const nextIdx = currentIdx < doctors.length - 1 ? currentIdx + 1 : 0;
        loadDoctorIntoForm(doctors[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = doctors.findIndex(d => d.Code === selectedDoc?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : doctors.length - 1;
        loadDoctorIntoForm(doctors[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, doctors, selectedDoc]);

  const fetchDoctors = (search = '', pageNum = 1) => {
    fetch(`${API_BASE}/api/master/doctors?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => res.json())
      .then(data => {
        const loadedDocs = data.data || [];
        setDoctors(loadedDocs);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedDocs.length > 0 && !selectedDoc) {
          loadDoctorIntoForm(loadedDocs[0]);
        }
      })
      .catch(err => console.error("Error fetching doctors:", err));
  };

  const fetchDepartments = () => {
    fetch(`${API_BASE}/api/master/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error("Error fetching departments:", err));
  };

  const loadDoctorIntoForm = (doc) => {
    if (!doc) return;
    setSelectedDoc(doc);
    setPrefix(doc.Prefix || 'Dr.');
    setDoctName(doc.DoctName || '');
    setRegNo(doc.RegNo || '');
    setDesigCode(doc.DesigCode || '');
    setDeptCode(doc.DeptCode || '');
    setDeptCode2(doc.DeptCode2 || '');
    setRAddress1(doc.RAddress1 || '');
    setRAddress2(doc.RAddress2 || '');
    setRContactNo(doc.RContactNo || '');
    setC1Address(doc.C1Address || '');
    setC1ContactNo(doc.C1ContactNo || '');
    setC2Address(doc.C2Address || '');
    setC2ContactNo(doc.C2ContactNo || '');
    setStatus(doc.Status === undefined ? 1 : doc.Status);
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchDoctors(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedDoc(null);
    setPrefix('Dr.');
    setDoctName('');
    setRegNo('');
    setDesigCode('');
    setDeptCode('');
    setDeptCode2('');
    setRAddress1('');
    setRAddress2('');
    setRContactNo('');
    setC1Address('');
    setC1ContactNo('');
    setC2Address('');
    setC2ContactNo('');
    setStatus(1);
  };

  const handleModClick = () => {
    if (!selectedDoc) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (doctors.length > 0) {
        loadDoctorIntoForm(doctors[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadDoctorIntoForm(selectedDoc);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedDoc) return;
    if (confirm(`Are you sure you want to delete Doctor: ${selectedDoc.Prefix} ${selectedDoc.DoctName}?`)) {
      fetch(`${API_BASE}/api/master/doctors/${selectedDoc.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedDoc(null);
          fetchDoctors(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting doctor:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!doctName.trim()) {
      alert("Doctor Name is required");
      return;
    }

    const payload = {
      Prefix: prefix,
      DoctName: doctName,
      RegNo: regNo,
      DesigCode: desigCode,
      DeptCode: deptCode,
      DeptCode2: deptCode2,
      RAddress1: rAddress1,
      RAddress2: rAddress2,
      RContactNo: rContactNo,
      C1Address: c1Address,
      C1ContactNo: c1ContactNo,
      C2Address: c2Address,
      C2ContactNo: c2ContactNo,
      Status: status,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/doctors` 
      : `${API_BASE}/api/master/doctors/${selectedDoc.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchDoctors(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedDoc(payload);
        }
      })
      .catch(err => console.error("Error saving doctor:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchDoctors(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Doctor List</h2>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={18} style={{ alignSelf: 'center', color: 'var(--outline)' }} />
          <input
            className={styles.searchInput}
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.listWrapper} ref={listWrapperRef}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th className={styles.listTh}>Dr. Code</th>
                <th className={styles.listTh}>Name</th>
                <th className={styles.listTh}>Address(Res.)</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => {
                const prefixStr = trim(doc.Prefix ?? '');
                const nameStr = trim(doc.DoctName ?? '');
                const fullName = prefixStr !== '' ? `${prefixStr} ${nameStr}` : nameStr;
                const address = trim(doc.RAddress1 ?? '') + (doc.RAddress2 ? ` / ${trim(doc.RAddress2)}` : '');
                const isSelected = selectedDoc && selectedDoc.Code === doc.Code;

                return (
                  <tr
                    key={doc.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadDoctorIntoForm(doc);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{doc.Code}</td>
                    <td className={styles.listTd}>{fullName}</td>
                    <td className={styles.listTd}>{address || '-'}</td>
                  </tr>
                );
              })}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No doctors found.
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
          <h2 className={styles.cardTitle}>Doctor Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedDoc?.Code || '')}
              disabled
            />
          </div>

          {/* Reg No */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Reg. No.</label>
            <input
              className={styles.formInput}
              value={regNo}
              onChange={e => setRegNo(e.target.value)}
              disabled={isView}
              placeholder="Registration Number"
            />
          </div>

          {/* Doctor Title/Prefix & Name */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title / Prefix</label>
            <select
              className={styles.formSelect}
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              disabled={isView}
            >
              <option value="Dr.">Dr.</option>
              <option value="DR">DR</option>
              <option value="Dr. (CAPT)">Dr. (CAPT)</option>
              <option value="SMT.">SMT.</option>
              <option value="MRS">MRS</option>
              <option value="PROF">PROF</option>
              <option value="PROF.">PROF.</option>
              <option value="MR.">MR.</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Doctor Name</label>
            <input
              className={styles.formInput}
              value={doctName}
              onChange={e => setDoctName(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="Doctor Full Name"
            />
          </div>

          {/* Specialization */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Specialization In</label>
            <input
              className={styles.formInput}
              value={desigCode}
              onChange={e => setDesigCode(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="e.g. GENERAL PHYSICIAN, CARDIOLOGIST"
            />
          </div>

          {/* Status */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Status</label>
            <select
              className={styles.formSelect}
              value={status}
              onChange={e => setStatus(Number(e.target.value))}
              disabled={isView}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          {/* Department I & II */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Department I</label>
            <select
              className={styles.formSelect}
              value={deptCode}
              onChange={e => setDeptCode(e.target.value)}
              disabled={isView}
            >
              <option value="">-- None --</option>
              {departments.map(dept => (
                <option key={dept.Code} value={dept.Code}>{dept.Descr}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Department II</label>
            <select
              className={styles.formSelect}
              value={deptCode2}
              onChange={e => setDeptCode2(e.target.value)}
              disabled={isView}
            >
              <option value="">-- None --</option>
              {departments.map(dept => (
                <option key={dept.Code} value={dept.Code}>{dept.Descr}</option>
              ))}
            </select>
          </div>

          {/* Residential Info */}
          <div className={styles.formSectionHeader}>Residential Info</div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Address Line 1</label>
            <input
              className={styles.formInput}
              value={rAddress1}
              onChange={e => setRAddress1(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Residential Address line 1"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Address Line 2</label>
            <input
              className={styles.formInput}
              value={rAddress2}
              onChange={e => setRAddress2(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Residential Address line 2"
            />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Contact Number(s)</label>
            <input
              className={styles.formInput}
              value={rContactNo}
              onChange={e => setRContactNo(e.target.value)}
              disabled={isView}
              placeholder="Contact Details"
            />
          </div>

          {/* Chamber 1 Info */}
          <div className={styles.formSectionHeader}>Chamber 1 Info</div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chamber 1 Address</label>
            <input
              className={styles.formInput}
              value={c1Address}
              onChange={e => setC1Address(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Chamber Address"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chamber 1 Contact</label>
            <input
              className={styles.formInput}
              value={c1ContactNo}
              onChange={e => setC1ContactNo(e.target.value)}
              disabled={isView}
              placeholder="Chamber Contact Details"
            />
          </div>

          {/* Chamber 2 Info */}
          <div className={styles.formSectionHeader}>Chamber 2 Info</div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chamber 2 Address</label>
            <input
              className={styles.formInput}
              value={c2Address}
              onChange={e => setC2Address(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Chamber Address"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chamber 2 Contact</label>
            <input
              className={styles.formInput}
              value={c2ContactNo}
              onChange={e => setC2ContactNo(e.target.value)}
              disabled={isView}
              placeholder="Chamber Contact Details"
            />
          </div>
        </div>

        {/* Buttons matching old software but responsive and modern */}
        <div className={styles.actionBar}>
          {isView ? (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Plus size={16} /> Add
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedDoc}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedDoc}>
                <Trash2 size={16} /> Del
              </button>
            </>
          ) : (
            <>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Save size={16} /> Save
              </button>
              <button type="button" className={`${styles.btn} styles.btnOutline`} onClick={handleCancelClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <X size={16} /> Cancel
              </button>
            </>
          )}
          
          <button type="button" className={`${styles.btn} styles.btnOutline`} style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => router.push('/dashboard')}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </form>
    </div>
  );
}

function trim(str) {
  return str ? str.trim() : '';
}
