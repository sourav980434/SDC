'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function DepartmentMaster() {
  const router = useRouter();
  
  // State
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
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
  }, [selectedDept]);
  
  // Form fields
  const [descr, setDescr] = useState('');
  const [remarks, setRemarks] = useState('');

  // Load initial data
  useEffect(() => {
    fetchDepartments('', 1);
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !departments || departments.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = departments.findIndex(d => d.Code === selectedDept?.Code);
        const nextIdx = currentIdx < departments.length - 1 ? currentIdx + 1 : 0;
        loadDeptIntoForm(departments[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = departments.findIndex(d => d.Code === selectedDept?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : departments.length - 1;
        loadDeptIntoForm(departments[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, departments, selectedDept]);

  const fetchDepartments = (search = searchQuery, pageNum = 1) => {
    fetch(`${API_BASE}/api/master/departments/list?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => res.json())
      .then(data => {
        const loadedDepts = data.data || [];
        setDepartments(loadedDepts);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedDepts.length > 0 && !selectedDept) {
          loadDeptIntoForm(loadedDepts[0]);
        }
      })
      .catch(err => console.error("Error fetching departments:", err));
  };

  const loadDeptIntoForm = (d) => {
    if (!d) return;
    setSelectedDept(d);
    setDescr(d.Descr || '');
    setRemarks(d.Remarks || '');
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchDepartments(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedDept(null);
    setDescr('');
    setRemarks('');
  };

  const handleModClick = () => {
    if (!selectedDept) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (departments.length > 0) {
        loadDeptIntoForm(departments[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadDeptIntoForm(selectedDept);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedDept) return;
    if (confirm(`Are you sure you want to delete Department: ${selectedDept.Descr}?`)) {
      fetch(`${API_BASE}/api/master/departments/${selectedDept.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedDept(null);
          fetchDepartments(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting department:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!descr.trim()) {
      alert("Department Name is required");
      return;
    }

    const payload = {
      Descr: descr,
      Remarks: remarks,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/departments` 
      : `${API_BASE}/api/master/departments/${selectedDept.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchDepartments(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedDept(payload);
        }
      })
      .catch(err => console.error("Error saving department:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchDepartments(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Department List</h2>
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
                <th className={styles.listTh}>Dept. Name</th>
                <th className={styles.listTh}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => {
                const isSelected = selectedDept && selectedDept.Code === d.Code;

                return (
                  <tr
                    key={d.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadDeptIntoForm(d);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{d.Code}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }}>{d.Descr}</td>
                    <td className={styles.listTd}>{d.Remarks || '-'}</td>
                  </tr>
                );
              })}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No departments found.
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
          <h2 className={styles.cardTitle}>Department Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Department Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedDept?.Code || '')}
              disabled
            />
          </div>

          {/* Department Name */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Dept. Name</label>
            <input
              className={styles.formInput}
              value={descr}
              onChange={e => setDescr(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="e.g. BIOCHEMISTRY"
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedDept}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedDept}>
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
