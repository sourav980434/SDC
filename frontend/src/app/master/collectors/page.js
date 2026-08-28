'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function CollectorMaster() {
  const router = useRouter();
  
  // State
  const [collectors, setCollectors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollector, setSelectedCollector] = useState(null);
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
  }, [selectedCollector]);
  
  // Form fields
  const [descr, setDescr] = useState(''); // Name
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [status, setStatus] = useState(1); // 1 = Active, 0 = De-Active
  const [remarks, setRemarks] = useState('');

  // Load initial data
  useEffect(() => {
    fetchCollectors('', 1);
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !collectors || collectors.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = collectors.findIndex(c => c.Code === selectedCollector?.Code);
        const nextIdx = currentIdx < collectors.length - 1 ? currentIdx + 1 : 0;
        loadCollectorIntoForm(collectors[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = collectors.findIndex(c => c.Code === selectedCollector?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : collectors.length - 1;
        loadCollectorIntoForm(collectors[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, collectors, selectedCollector]);

  const fetchCollectors = (search = searchQuery, pageNum = 1) => {
    fetch(`${API_BASE}/api/master/collectors?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => res.json())
      .then(data => {
        const loadedCollectors = data.data || [];
        setCollectors(loadedCollectors);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedCollectors.length > 0 && !selectedCollector) {
          loadCollectorIntoForm(loadedCollectors[0]);
        }
      })
      .catch(err => console.error("Error fetching collectors:", err));
  };

  const loadCollectorIntoForm = (c) => {
    if (!c) return;
    setSelectedCollector(c);
    setDescr(c.Descr || '');
    setAddress1(c.Address1 || '');
    setAddress2(c.Address2 || '');
    setPhoneNo(c.PhoneNo || '');
    setMobileNo(c.MobileNo || '');
    setStatus(c.Status === undefined ? 1 : c.Status);
    setRemarks(c.Remarks || '');
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchCollectors(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedCollector(null);
    setDescr('');
    setAddress1('');
    setAddress2('');
    setPhoneNo('');
    setMobileNo('');
    setStatus(1);
    setRemarks('');
  };

  const handleModClick = () => {
    if (!selectedCollector) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (collectors.length > 0) {
        loadCollectorIntoForm(collectors[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadCollectorIntoForm(selectedCollector);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedCollector) return;
    if (confirm(`Are you sure you want to delete Collector: ${selectedCollector.Descr}?`)) {
      fetch(`${API_BASE}/api/master/collectors/${selectedCollector.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedCollector(null);
          fetchCollectors(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting collector:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!descr.trim()) {
      alert("Name is required");
      return;
    }

    const payload = {
      Descr: descr,
      Address1: address1,
      Address2: address2,
      PhoneNo: phoneNo,
      MobileNo: mobileNo,
      Status: Number(status),
      Remarks: remarks,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/collectors` 
      : `${API_BASE}/api/master/collectors/${selectedCollector.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchCollectors(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedCollector(payload);
        }
      })
      .catch(err => console.error("Error saving collector:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCollectors(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Collector List</h2>
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
                <th className={styles.listTh}>Name</th>
                <th className={styles.listTh}>Mobile/Phone</th>
              </tr>
            </thead>
            <tbody>
              {collectors.map((c) => {
                const isSelected = selectedCollector && selectedCollector.Code === c.Code;
                const contact = c.MobileNo || c.PhoneNo || '-';

                return (
                  <tr
                    key={c.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadCollectorIntoForm(c);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{c.Code}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }} title={c.Descr}>{c.Descr}</td>
                    <td className={styles.listTd} title={contact}>{contact}</td>
                  </tr>
                );
              })}
              {collectors.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No collectors found.
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
          <h2 className={styles.cardTitle}>Collector Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Collector Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedCollector?.Code || '')}
              disabled
            />
          </div>

          {/* Name */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Name</label>
            <input
              className={styles.formInput}
              value={descr}
              onChange={e => setDescr(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="Full Name"
            />
          </div>

          {/* Address Line 1 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Address Line 1</label>
            <input
              className={styles.formInput}
              value={address1}
              onChange={e => setAddress1(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Address line 1"
            />
          </div>

          {/* Address Line 2 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Address Line 2</label>
            <input
              className={styles.formInput}
              value={address2}
              onChange={e => setAddress2(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Address line 2"
            />
          </div>

          {/* Phone No */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Phone No.</label>
            <input
              className={styles.formInput}
              value={phoneNo}
              onChange={e => setPhoneNo(e.target.value)}
              disabled={isView}
              placeholder="Landline Number"
            />
          </div>

          {/* Mobile No */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Mobile No.</label>
            <input
              className={styles.formInput}
              value={mobileNo}
              onChange={e => setMobileNo(e.target.value)}
              disabled={isView}
              placeholder="Mobile Number"
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
              <option value={0}>De-Active</option>
            </select>
          </div>

          {/* Remarks */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Remarks</label>
            <textarea
              className={styles.formTextarea}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={isView}
              placeholder="Add notes or remarks..."
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedCollector}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedCollector}>
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
