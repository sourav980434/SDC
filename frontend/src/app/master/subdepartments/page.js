'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function SubDepartmentMaster() {
  const router = useRouter();
  
  // State
  const [subdepartments, setSubdepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubDept, setSelectedSubDept] = useState(null);
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
  }, [selectedSubDept]);
  
  // Form fields
  const [deptCode, setDeptCode] = useState('');
  const [descr, setDescr] = useState('');
  const [remarks, setRemarks] = useState('');

  // Load initial data
  useEffect(() => {
    fetchSubdepartments('', 1);
    fetchDepartments();
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !subdepartments || subdepartments.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = subdepartments.findIndex(sd => sd.Code === selectedSubDept?.Code);
        const nextIdx = currentIdx < subdepartments.length - 1 ? currentIdx + 1 : 0;
        loadSubDeptIntoForm(subdepartments[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = subdepartments.findIndex(sd => sd.Code === selectedSubDept?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : subdepartments.length - 1;
        loadSubDeptIntoForm(subdepartments[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, subdepartments, selectedSubDept]);

  const fetchSubdepartments = (search = searchQuery, pageNum = 1) => {
    fetch(`${API_BASE}/api/master/subdepartments/list?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => res.json())
      .then(data => {
        const loadedSubDepts = data.data || [];
        setSubdepartments(loadedSubDepts);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedSubDepts.length > 0 && !selectedSubDept) {
          loadSubDeptIntoForm(loadedSubDepts[0]);
        }
      })
      .catch(err => console.error("Error fetching subdepartments:", err));
  };

  const fetchDepartments = () => {
    fetch(`${API_BASE}/api/master/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error("Error fetching departments:", err));
  };

  const loadSubDeptIntoForm = (sd) => {
    if (!sd) return;
    setSelectedSubDept(sd);
    setDeptCode(sd.DeptCode || '');
    setDescr(sd.Descr || '');
    setRemarks(sd.Remarks || '');
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchSubdepartments(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedSubDept(null);
    setDeptCode(departments.length > 0 ? departments[0].Code : '');
    setDescr('');
    setRemarks('');
  };

  const handleModClick = () => {
    if (!selectedSubDept) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (subdepartments.length > 0) {
        loadSubDeptIntoForm(subdepartments[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadSubDeptIntoForm(selectedSubDept);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedSubDept) return;
    if (confirm(`Are you sure you want to delete Sub Department: ${selectedSubDept.Descr}?`)) {
      fetch(`${API_BASE}/api/master/subdepartments/${selectedSubDept.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedSubDept(null);
          fetchSubdepartments(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting subdepartment:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!descr.trim()) {
      alert("Sub Department Name is required");
      return;
    }
    if (!deptCode) {
      alert("Department Name is required");
      return;
    }

    const payload = {
      DeptCode: deptCode,
      Descr: descr,
      Remarks: remarks,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/subdepartments` 
      : `${API_BASE}/api/master/subdepartments/${selectedSubDept.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchSubdepartments(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          const deptObj = departments.find(d => d.Code === deptCode);
          payload.DeptName = deptObj ? deptObj.Descr : '';
          setSelectedSubDept(payload);
        }
      })
      .catch(err => console.error("Error saving subdepartment:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchSubdepartments(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Sub Department List</h2>
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
                <th className={styles.listTh}>Code</th>
                <th className={styles.listTh}>Department</th>
                <th className={styles.listTh}>Sub Dept.</th>
              </tr>
            </thead>
            <tbody>
              {subdepartments.map((sd) => {
                const isSelected = selectedSubDept && selectedSubDept.Code === sd.Code;

                return (
                  <tr
                    key={sd.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadSubDeptIntoForm(sd);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{sd.Code}</td>
                    <td className={styles.listTd}>{sd.DeptName || '-'}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }}>{sd.Descr}</td>
                  </tr>
                );
              })}
              {subdepartments.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No sub departments found.
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
          <h2 className={styles.cardTitle}>Sub Department Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Sub Dept Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedSubDept?.Code || '')}
              disabled
            />
          </div>

          {/* Department */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Department</label>
            <select
              className={styles.formSelect}
              value={deptCode}
              onChange={e => setDeptCode(e.target.value)}
              disabled={isView}
              required
            >
              <option value="">-- Select --</option>
              {departments.map(d => (
                <option key={d.Code} value={d.Code}>{d.Descr}</option>
              ))}
            </select>
          </div>

          {/* Sub Dept Name */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Sub Dept. Name</label>
            <input
              className={styles.formInput}
              value={descr}
              onChange={e => setDescr(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="e.g. CLINICAL PATHOLOGY"
            />
          </div>

          {/* Remarks */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Remarks</label>
            <textarea
              className={styles.formTextarea}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={isView}
              placeholder="Special instructions or notes..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.actionBar}>
          {isView ? (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Plus size={16} /> Add
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedSubDept}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedSubDept}>
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
