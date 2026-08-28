'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function MarketingExecutiveMaster() {
  const router = useRouter();
  
  // State
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
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
  }, [selectedAgent]);
  
  // Form fields
  const [descr, setDescr] = useState(''); // Name
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [district, setDistrict] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [status, setStatus] = useState(1); // 1 = Active, 0 = De-Active
  const [remarks, setRemarks] = useState('');

  // Load initial data
  useEffect(() => {
    fetchAgents('', 1);
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !agents || agents.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = agents.findIndex(a => a.Code === selectedAgent?.Code);
        const nextIdx = currentIdx < agents.length - 1 ? currentIdx + 1 : 0;
        loadAgentIntoForm(agents[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = agents.findIndex(a => a.Code === selectedAgent?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : agents.length - 1;
        loadAgentIntoForm(agents[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, agents, selectedAgent]);

  const fetchAgents = (search = searchQuery, pageNum = 1) => {
    fetch(`${API_BASE}/api/master/agents?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25`)
      .then(res => res.json())
      .then(data => {
        const loadedAgents = data.data || [];
        setAgents(loadedAgents);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedAgents.length > 0 && !selectedAgent) {
          loadAgentIntoForm(loadedAgents[0]);
        }
      })
      .catch(err => console.error("Error fetching agents:", err));
  };

  const loadAgentIntoForm = (a) => {
    if (!a) return;
    setSelectedAgent(a);
    setDescr(a.Descr || '');
    setAddress(a.Address || '');
    setPinCode(a.PinCode || '');
    setDistrict(a.District || '');
    setPhoneNo(a.PhoneNo || '');
    setMobileNo(a.MobileNo || '');
    setStatus(a.Status === undefined ? 1 : a.Status);
    setRemarks(a.Remarks || '');
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchAgents(e.target.value, 1);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedAgent(null);
    setDescr('');
    setAddress('');
    setPinCode('');
    setDistrict('');
    setPhoneNo('');
    setMobileNo('');
    setStatus(1);
    setRemarks('');
  };

  const handleModClick = () => {
    if (!selectedAgent) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (agents.length > 0) {
        loadAgentIntoForm(agents[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadAgentIntoForm(selectedAgent);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedAgent) return;
    if (confirm(`Are you sure you want to delete Marketing Executive: ${selectedAgent.Descr}?`)) {
      fetch(`${API_BASE}/api/master/agents/${selectedAgent.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedAgent(null);
          fetchAgents(searchQuery, currentPage);
        })
        .catch(err => console.error("Error deleting agent:", err));
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
      Address: address,
      PinCode: pinCode,
      District: district,
      PhoneNo: phoneNo,
      MobileNo: mobileNo,
      Status: Number(status),
      Remarks: remarks,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/agents` 
      : `${API_BASE}/api/master/agents/${selectedAgent.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchAgents(searchQuery, mode === 'add' ? 1 : currentPage);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedAgent(payload);
        }
      })
      .catch(err => console.error("Error saving agent:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchAgents(searchQuery, newPage);
    }
  };

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Marketing Executive List</h2>
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
                <th className={styles.listTh}>Address</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const isSelected = selectedAgent && selectedAgent.Code === a.Code;

                return (
                  <tr
                    key={a.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadAgentIntoForm(a);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{a.Code}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }}>{a.Descr}</td>
                    <td className={styles.listTd}>{a.Address || '-'}</td>
                  </tr>
                );
              })}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No marketing executives found.
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
          <h2 className={styles.cardTitle}>Marketing Executive Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Executive Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedAgent?.Code || '')}
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

          {/* Address */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Address</label>
            <input
              className={styles.formInput}
              value={address}
              onChange={e => setAddress(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="Address details"
            />
          </div>

          {/* Pin Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Pin Code</label>
            <input
              className={styles.formInput}
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              disabled={isView}
              placeholder="ZIP/Pin Code"
            />
          </div>

          {/* District */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>District</label>
            <input
              className={styles.formInput}
              value={district}
              onChange={e => setDistrict(e.target.value.toUpperCase())}
              disabled={isView}
              placeholder="District"
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedAgent}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedAgent}>
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
