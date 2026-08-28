'use client';

import { useState, useEffect } from 'react';
import styles from './users.module.css';
import { UserPlus, Edit3, Shield, Key, Check, X, Building2, LayoutGrid, Sparkles } from 'lucide-react';

import API_BASE from '@/lib/apiConfig';
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleCode, setRoleCode] = useState('RECEPTIONIST');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [discountLimit, setDiscountLimit] = useState(10);
  const [status, setStatus] = useState('ACTIVE');
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const availableModules = [
    { key: 'booking', name: 'Booking / Advance' },
    { key: 'invoice', name: 'Bill / Final Invoice' },
    { key: 'archive_bills', name: 'Archive Bills (Legacy)' },
    { key: 'pending_tests', name: 'Pending Test Register' },
    { key: 'verification', name: 'Lab Result Verification' },
    { key: 'masters', name: 'Master Setup' },
    { key: 'reports', name: 'Reports & Analytics' },
    { key: 'setup', name: 'User & Permission Setup' }
  ];

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/setup/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching users:", err);
        setLoading(false);
      });
  };

  const fetchRoles = () => {
    fetch(`${API_BASE}/api/setup/roles`)
      .then(res => res.json())
      .then(data => setRoles(data))
      .catch(err => console.error("Error fetching roles:", err));
  };

  const fetchDepartments = () => {
    fetch(`${API_BASE}/api/master/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error("Error fetching departments:", err));
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRoleCode('RECEPTIONIST');
    setPhone('');
    setEmail('');
    setDiscountLimit(10);
    setStatus('ACTIVE');
    setSelectedDepts([]);
    setSelectedModules(['booking', 'invoice', 'reports']);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(''); // Leave blank if not changing
    setFullName(user.full_name);
    setRoleCode(user.role_code);
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setDiscountLimit(user.discount_limit_percent || 10);
    setStatus(user.status || 'ACTIVE');

    const deptCodes = (user.departments || []).map(d => typeof d === 'object' ? d.dept_code : d);
    const modKeys = (user.modules || []).map(m => typeof m === 'object' ? m.module_key : m);

    setSelectedDepts(deptCodes);
    setSelectedModules(modKeys);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleToggleDept = (deptCode) => {
    if (selectedDepts.includes(deptCode)) {
      setSelectedDepts(selectedDepts.filter(d => d !== deptCode));
    } else {
      setSelectedDepts([...selectedDepts, deptCode]);
    }
  };

  const handleToggleModule = (modKey) => {
    if (selectedModules.includes(modKey)) {
      setSelectedModules(selectedModules.filter(m => m !== modKey));
    } else {
      setSelectedModules([...selectedModules, modKey]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    const payload = {
      username,
      password,
      full_name: fullName,
      role_code: roleCode,
      phone,
      email,
      discount_limit_percent: parseFloat(discountLimit),
      status,
      departments: selectedDepts,
      modules: selectedModules
    };

    const url = editingUser
      ? `${API_BASE}/api/setup/users/update/${editingUser.id}`
      : `${API_BASE}/api/setup/users`;
    
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setSaving(false);
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setShowModal(false);
          fetchUsers();

          // Refresh active session if editing self
          try {
            const currentSession = localStorage.getItem('sdcp_user_session');
            if (currentSession && editingUser) {
              const parsed = JSON.parse(currentSession);
              if (parsed.user_code === editingUser.user_code) {
                parsed.modules = selectedModules;
                parsed.departments = selectedDepts;
                localStorage.setItem('sdcp_user_session', JSON.stringify(parsed));
              }
            }
          } catch (e) {}
        }
      })
      .catch(err => {
        setSaving(false);
        setErrorMsg("Failed to save user details.");
      });
  };

  const getRoleBadgeStyle = (code) => {
    switch (code) {
      case 'ADMIN':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'RECEPTIONIST':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      case 'LAB_TECH':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'PATHOLOGIST':
        return { backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' };
      case 'ACCOUNTANT':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>User & Access Control Management</h2>
          <p className={styles.subtitle}>Configure employee accounts, roles, discount caps, clinical department, and module permissions</p>
        </div>
        <button className={styles.addBtn} onClick={handleOpenAddModal}>
          <UserPlus size={16} /> Add New System User
        </button>
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>User Code / ID</th>
              <th className={styles.th}>Username & Full Name</th>
              <th className={styles.th}>Assigned Role</th>
              <th className={styles.th}>Max Discount Cap</th>
              <th className={styles.th}>Access Permissions</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  Loading system users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  No system users created yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className={styles.td} style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                    {u.user_code}
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{u.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--outline)' }}>{u.full_name}</div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.roleBadge} style={getRoleBadgeStyle(u.role_code)}>
                      {u.role_name}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontWeight: '800', color: '#b45309', fontFamily: 'var(--font-mono)' }}>
                    {u.discount_limit_percent}%
                  </td>
                  <td className={styles.td}>
                    {u.role_code === 'ADMIN' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        letterSpacing: '0.4px'
                      }}>
                        <Sparkles size={13} /> FULL SYSTEM ACCESS (All Modules & Departments)
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {u.departments && u.departments.length > 0 && (
                          <div>
                            <strong style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Departments: </strong>
                            {u.departments.map(d => {
                              const code = typeof d === 'object' ? d.dept_code : d;
                              const name = typeof d === 'object' ? d.dept_name : d;
                              return <span key={code} className={styles.deptBadge}>{name}</span>;
                            })}
                          </div>
                        )}
                        {u.modules && u.modules.length > 0 && (
                          <div>
                            <strong style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Modules: </strong>
                            {u.modules.map(m => {
                              const key = typeof m === 'object' ? m.module_key : m;
                              const modObj = availableModules.find(item => item.key === key);
                              const name = typeof m === 'object' ? (m.module_name || modObj?.name || key) : (modObj?.name || m);
                              return <span key={key} className={styles.deptBadge} style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>{name}</span>;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={u.status === 'ACTIVE' ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                      {u.status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button className={styles.editBtn} onClick={() => handleOpenEditModal(u)}>
                      <Edit3 size={14} /> Edit Access
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} /> {editingUser ? 'Edit System User & Access Controls' : 'Create New System User'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>
                    Password {editingUser ? '(Leave blank to keep)' : ''}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>Employee Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma / Sourav Chowdhury"
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>System Role</label>
                  <select
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px' }}
                  >
                    {roles.map(r => (
                      <option key={r.role_code} value={r.role_code}>{r.role_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>Max Discount Cap (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountLimit}
                    onChange={(e) => setDiscountLimit(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              {/* PERMISSION CONTROLS SECTION */}
              {roleCode === 'ADMIN' ? (
                <div style={{ padding: '14px', backgroundColor: '#dcfce7', borderRadius: 'var(--radius-md)', border: '1px solid #86efac', color: '#15803d', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} />
                  <span>Super Administrator has full unrestricted access to all modules and clinical departments. No restrictions required.</span>
                </div>
              ) : (
                <>
                  {/* Section A: Department Access */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={14} /> 1. Clinical Department Access Permissions
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                      {departments.map(d => (
                        <label key={d.Code} style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedDepts.includes(d.Code)}
                            onChange={() => handleToggleDept(d.Code)}
                          />
                          {d.Descr}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Section B: Navigation Module Access */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <LayoutGrid size={14} /> 2. Module & Navigation Menu Permissions
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                      {availableModules.map(m => (
                        <label key={m.key} style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedModules.includes(m.key)}
                            onChange={() => handleToggleModule(m.key)}
                          />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {editingUser && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '13.5px' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE (Blocked)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--outline-variant)', paddingTop: '14px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save User Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
