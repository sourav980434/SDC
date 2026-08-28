'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, Save, X, LogOut } from 'lucide-react';
import styles from '../master.module.css';

import API_BASE from '@/lib/apiConfig';
export default function CategoryMaster() {
  const router = useRouter();
  
  // State
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'add', 'edit'

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
  }, [selectedCat]);
  
  // Form fields
  const [descr, setDescr] = useState('');

  // Load initial data
  useEffect(() => {
    fetchCategories();
  }, []);

  // Keyboard ArrowUp & ArrowDown list selection navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'view' || !displayCats || displayCats.length === 0) return;

      const activeEl = document.activeElement;
      const isInputText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.type === 'text' && !activeEl.classList.contains(styles.searchInput)) ||
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputText) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = displayCats.findIndex(c => c.Code === selectedCat?.Code);
        const nextIdx = currentIdx < displayCats.length - 1 ? currentIdx + 1 : 0;
        loadCategoryIntoForm(displayCats[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = displayCats.findIndex(c => c.Code === selectedCat?.Code);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : displayCats.length - 1;
        loadCategoryIntoForm(displayCats[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, categories, searchQuery, selectedCat]);

  const fetchCategories = () => {
    fetch(`${API_BASE}/api/master/categories`)
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0 && !selectedCat) {
          loadCategoryIntoForm(data[0]);
        }
      })
      .catch(err => console.error("Error fetching categories:", err));
  };

  const loadCategoryIntoForm = (cat) => {
    if (!cat) return;
    setSelectedCat(cat);
    setDescr(cat.Descr || '');
    setMode('view');
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedCat(null);
    setDescr('');
  };

  const handleModClick = () => {
    if (!selectedCat) return;
    setMode('edit');
  };

  const handleCancelClick = () => {
    if (mode === 'add') {
      if (categories.length > 0) {
        loadCategoryIntoForm(categories[0]);
      } else {
        handleAddClick();
      }
    } else {
      loadCategoryIntoForm(selectedCat);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedCat) return;
    if (confirm(`Are you sure you want to delete Category: ${selectedCat.Descr}?`)) {
      fetch(`${API_BASE}/api/master/categories/${selectedCat.Code}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSelectedCat(null);
          fetchCategories();
        })
        .catch(err => console.error("Error deleting category:", err));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!descr.trim()) {
      alert("Category Name is required");
      return;
    }

    const payload = {
      Descr: descr,
    };

    const url = mode === 'add' 
      ? `${API_BASE}/api/master/categories` 
      : `${API_BASE}/api/master/categories/${selectedCat.Code}`;
      
    const method = mode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setMode('view');
        fetchCategories();
        if (mode === 'add' && data.code) {
          payload.Code = data.code;
          setSelectedCat(payload);
        }
      })
      .catch(err => console.error("Error saving category:", err));
  };

  // Client side filtering for category search
  const displayCats = categories.filter(c => 
    c.Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.Descr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isView = mode === 'view';

  return (
    <div className={styles.container}>
      {/* Left panel: List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Category List</h2>
          <span className={styles.badge}>{displayCats.length} Categories</span>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={18} style={{ alignSelf: 'center', color: 'var(--outline)' }} />
          <input
            className={styles.searchInput}
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.listWrapper} ref={listWrapperRef}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th className={styles.listTh}>Category Code</th>
                <th className={styles.listTh}>Description</th>
              </tr>
            </thead>
            <tbody>
              {displayCats.map((cat) => {
                const isSelected = selectedCat && selectedCat.Code === cat.Code;

                return (
                  <tr
                    key={cat.Code}
                    ref={isSelected ? selectedRowRef : null}
                    className={`${styles.listRow} ${isSelected ? styles.listRowActive : ''}`}
                    onClick={() => {
                      if (mode === 'view') {
                        loadCategoryIntoForm(cat);
                      }
                    }}
                  >
                    <td className={styles.listTd}>{cat.Code}</td>
                    <td className={styles.listTd} style={{ fontWeight: '600' }}>{cat.Descr}</td>
                  </tr>
                );
              })}
              {displayCats.length === 0 && (
                <tr>
                  <td colSpan={2} className={styles.listTd} style={{ textAlign: 'center', color: 'var(--outline)' }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right panel: Details/Forms */}
      <form className={styles.card} onSubmit={handleSaveClick}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Category Details</h2>
          <div>
            {mode === 'view' && <span className={styles.badge}>View Mode</span>}
            {mode === 'edit' && <span className={`${styles.badge} ${styles.badgeEdit}`}>Modify Mode</span>}
            {mode === 'add' && <span className={`${styles.badge} ${styles.badgeAdd}`}>Add Mode</span>}
          </div>
        </div>

        <div className={styles.formGrid}>
          {/* Code */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category Code</label>
            <input
              className={styles.formInput}
              value={mode === 'add' ? 'AUTO-GENERATED' : (selectedCat?.Code || '')}
              disabled
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category Name / Descr</label>
            <input
              className={styles.formInput}
              value={descr}
              onChange={e => setDescr(e.target.value.toUpperCase())}
              disabled={isView}
              required
              placeholder="e.g. GENERAL, STAFF, TPA"
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleModClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedCat}>
                <Edit size={16} /> Mod
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteClick} style={{ display: 'flex', gap: '6px', alignItems: 'center' }} disabled={!selectedCat}>
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
