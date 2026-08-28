'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function TestMaster() {
  const router = useRouter();
  
  // State
  const [tests, setTests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [filteredSubDeps, setFilteredSubDeps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
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
  }, [selectedTest]);
  
  // Filters for test list
  const [listDeptFilter, setListDeptFilter] = useState('All');
  const [listSubDeptFilter, setListSubDeptFilter] = useState('All');
  
  // Form fields
  const [descr, setDescr] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [subDeptCode, setSubDeptCode] = useState('');
  const [duration, setDuration] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [medicineCharge, setMedicineCharge] = useState(0);
  const [drProcedureCharge, setDrProcedureCharge] = useState(0);
  const [profile, setProfile] = useState('NO');
  const [sendTo, setSendTo] = useState(1);
  const [drComm, setDrComm] = useState(0); // Default Dr. Disc.%
  const [generalRate, setGeneralRate] = useState(0); // Test rate (price)

  // Load initial data
  useEffect(() => {
    fetchTests('', 1, 'All', 'All');
    fetchDepartments();
    fetchSubDepartments();
  }, []);

  // Update filtered sub-departments in form when form deptCode changes
  useEffect(() => {
    if (deptCode) {
      setFilteredSubDeps(subDepartments.filter(sd => trim(sd.DeptCode) === trim(deptCode)));
    } else {
      setFilteredSubDeps([]);
    }
  }, [deptCode, subDepartments]);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !tests || tests.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'number') ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = tests.findIndex(t => t.Code === selectedTest?.Code);
        const nextIdx = currentIdx < tests.length - 1 ? currentIdx + 1 : 0;
        loadTestIntoForm(tests[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = tests.findIndex(t => t.Code === selectedTest?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : tests.length - 1;
        loadTestIntoForm(tests[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, tests, selectedTest]);

  const fetchTests = (search = searchQuery, pageNum = 1, dept = listDeptFilter, subDept = listSubDeptFilter) => {
    fetch(`${API_BASE}/api/master/tests?search=${encodeURIComponent(search)}&page=${pageNum}&per_page=25&dept_code=${dept}&sub_dept_code=${subDept}`)
      .then(res => res.json())
      .then(data => {
        const loadedTests = data.data || [];
        setTests(loadedTests);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        if (loadedTests.length > 0 && !selectedTest) {
          loadTestIntoForm(loadedTests[0]);
        }
      })
      .catch(err => console.error("Error fetching tests:", err));
  };

  const fetchDepartments = () => {
    fetch(`${API_BASE}/api/master/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error("Error fetching departments:", err));
  };

  const fetchSubDepartments = () => {
    fetch(`${API_BASE}/api/master/subdepartments`)
      .then(res => res.json())
      .then(data => setSubDepartments(data))
      .catch(err => console.error("Error fetching sub-departments:", err));
  };

  const loadTestIntoForm = (t) => {
    if (!t) return;
    setSelectedTest(t);
    setDescr(t.Descr || '');
    setDeptCode(trim(t.DeptCode));
    setSubDeptCode(trim(t.SubDeptCode));
    setDuration(t.Duration || 0);
    setRemarks(t.Remarks || '');
    setMedicineCharge(t.MedecineCharge || 0);
    setDrProcedureCharge(t.DrProcedureCharge || 0);
    // Profile column is char(1) in DB, trim it
    const profVal = trim(t.Profile);
    setProfile(profVal === 'Y' ? 'YES' : 'NO');
    setSendTo(t.SENDTO === undefined ? 1 : t.SENDTO);
    setDrComm(t.DrComm || 0);
    setGeneralRate(t.GeneralRate || 0);
    setMode('view');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchTests(e.target.value, 1, listDeptFilter, listSubDeptFilter);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedTest(null);
    setDescr('');
    setDeptCode('');
    setSubDeptCode('');
    setDuration(0);
    setRemarks('');
    setMedicineCharge(0);
    setDrProcedureCharge(0);
    setProfile('NO');
    setSendTo(1);
    setDrComm(0);
    setGeneralRate(0);
  };

  const handleModClick = () => {
    if (!selectedTest) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (tests.length > 0) {
        loadTestIntoForm(tests[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadTestIntoForm(selectedTest);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedTest) return;
    if (confirm(`Are you sure you want to delete Test: ${selectedTest.Descr}?`)) {
      fetch(`${API_BASE}/api/master/tests/${selectedTest.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedTest(null);
          fetchTests(searchQuery, currentPage, listDeptFilter, listSubDeptFilter);
        })
        .catch(err => console.error("Error deleting test:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!descr.trim()) {
      alert("Test Name is required");
      return;
    }

    const payload = {
      Descr: descr,
      DeptCode: deptCode,
      SubDeptCode: subDeptCode,
      Duration: Number(duration),
      Remarks: remarks,
      MedecineCharge: Number(medicineCharge),
      DrProcedureCharge: Number(drProcedureCharge),
      Profile: profile === 'YES' ? 'Y' : 'N',
      SENDTO: Number(sendTo),
      DrComm: Number(drComm),
      GeneralRate: Number(generalRate),
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/tests` 
      : `${API_BASE}/api/master/tests/${selectedTest.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchTests(searchQuery, mode === 'add' ? 1 : currentPage, listDeptFilter, listSubDeptFilter);
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          payload.GeneralRate = generalRate;
          // find subdept descr
          const subDeptObj = subDepartments.find(sd => sd.Code === subDeptCode);
          payload.SubDeptName = subDeptObj ? subDeptObj.Descr : '';
          setSelectedTest(payload);
        }
      })
      .catch(err => console.error("Error saving test:", err));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTests(searchQuery, newPage, listDeptFilter, listSubDeptFilter);
    }
  };

  // Since pagination and filtering are done server-side:
  const displayTests = tests;

  // Unique list of subdepartments for list top filters
  const filterListSubDeps = listDeptFilter === 'All' 
    ? subDepartments 
    : subDepartments.filter(sd => sd.DeptCode === listDeptFilter);

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Test List</h2>
        </div>

        {/* Top Dropdowns matching old UI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ fontSize: '11px', color: 'var(--outline)' }}>Dept Filter</label>
            <select 
              className={styles.formSelect} 
              value={listDeptFilter} 
              onChange={e => {
                setListDeptFilter(e.target.value);
                setListSubDeptFilter('All');
                fetchTests(searchQuery, 1, e.target.value, 'All');
              }}
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={trim(d.Code)} value={trim(d.Code)}>{trim(d.Descr)}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ fontSize: '11px', color: 'var(--outline)' }}>Sub Dept Filter</label>
            <select 
              className={styles.formSelect} 
              value={listSubDeptFilter} 
              onChange={e => {
                setListSubDeptFilter(e.target.value);
                fetchTests(searchQuery, 1, listDeptFilter, e.target.value);
              }}
            >
              <option value="All">All Sub Departments</option>
              {filterListSubDeps.map(sd => (
                <option key={trim(sd.Code)} value={trim(sd.Code)}>{trim(sd.Descr)}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={18} style={{ alignSelf: 'center', color: 'var(--outline)' }} />
          <input
            className={styles.searchInput}
            placeholder="Search by test name or code..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.listWrapper} ref={listWrapperRef}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th className={styles.listTh}>Code</th>
                <th className={styles.listTh}>Test Name</th>
                <th className={styles.listTh}>Dept</th>
                <th className={styles.listTh}>Sub Dept</th>
                <th className={styles.listTh} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {displayTests.map((t) => {
                const isSelected = selectedTest && selectedTest.Code === t.Code;

                return (
                  <tr
                    key={t.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadTestIntoForm(t);
                      }
                    }}
                  >
                    <td className={styles.listTd} style={{ whiteSpace: 'nowrap' }}>{t.Code}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }}>{t.Descr}</td>
                    <td className={styles.listTd}>{t.DeptName || '-'}</td>
                    <td className={styles.listTd}>{t.SubDeptName || '-'}</td>
                    <td className={styles.listTd} style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '700' }}>
                      ₹ {(Number(t.GeneralRate) || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {displayTests.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No tests found.
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
          <h2 className={styles.cardTitle}>Test Details</h2>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Test Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedTest?.Code || '')}
              disabled
            />
          </div>

          {/* Rate/Price */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>General Rate (Price)</label>
            <input
              className={styles.formInput}
              type="number"
              value={generalRate}
              onChange={e => setGeneralRate(Number(e.target.value))}
              disabled={isView}
              required
              min={0}
              placeholder="Test Cost"
              style={{ fontWeight: '700', color: 'var(--secondary)' }}
            />
          </div>

          {/* Department */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Department</label>
            <select
              className={styles.formSelect}
              value={deptCode}
              onChange={e => {
                setDeptCode(e.target.value);
                setSubDeptCode(''); // Reset subdepartment
              }}
              disabled={isView}
              required
            >
              <option value="">-- Select --</option>
              {departments.map(dept => (
                <option key={trim(dept.Code)} value={trim(dept.Code)}>{trim(dept.Descr)}</option>
              ))}
            </select>
          </div>

          {/* Sub Department */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Sub Department</label>
            <select
              className={styles.formSelect}
              value={subDeptCode}
              onChange={e => setSubDeptCode(e.target.value)}
              disabled={isView || !deptCode || filteredSubDeps.length === 0}
              required={filteredSubDeps.length > 0}
            >
              <option value="">-- Select --</option>
              {filteredSubDeps.map(sd => (
                <option key={trim(sd.Code)} value={trim(sd.Code)}>{trim(sd.Descr)}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Test Name</label>
            <input
              className={styles.formInput}
              value={descr}
              onChange={e => setDescr(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="Full Test Description"
            />
          </div>

          {/* Duration */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Duration (in Days)</label>
            <input
              className={styles.formInput}
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              disabled={isView}
              min={0}
            />
          </div>

          {/* Default Dr. Disc.% (DrComm) */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Default Dr. Disc. %</label>
            <input
              className={styles.formInput}
              type="number"
              value={drComm}
              onChange={e => setDrComm(Number(e.target.value))}
              disabled={isView}
              min={0}
              max={100}
              placeholder="Discount %"
            />
          </div>

          {/* Medicine Charge */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medicine Charge</label>
            <input
              className={styles.formInput}
              type="number"
              value={medicineCharge}
              onChange={e => setMedicineCharge(Number(e.target.value))}
              disabled={isView}
              min={0}
            />
          </div>

          {/* Dr Procedure Charge */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Dr. Procedure Charges</label>
            <input
              className={styles.formInput}
              type="number"
              value={drProcedureCharge}
              onChange={e => setDrProcedureCharge(Number(e.target.value))}
              disabled={isView}
              min={0}
            />
          </div>

          {/* Profile */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Profile (Multi-test)</label>
            <select
              className={styles.formSelect}
              value={profile}
              onChange={e => setProfile(e.target.value)}
              disabled={isView}
            >
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>

          {/* Send To & Checkbox */}
          <div className={styles.formGroup} style={{ justifyContent: 'center', paddingTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isView ? 'not-allowed' : 'pointer', fontSize: '13.5px', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={sendTo === 1}
                onChange={e => setSendTo(e.target.checked ? 1 : 0)}
                disabled={isView}
                style={{ width: '16px', height: '16px' }}
              />
              Send To (Active)
            </label>
          </div>

          {/* Remarks */}
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Remarks</label>
            <textarea
              className={styles.formTextarea}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={isView}
              placeholder="e.g. Fasting required, Special instructions..."
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedTest}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedTest}>
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
