'use client';

import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';
import { Building2, FileText, Save, CheckCircle2, AlertCircle, Plus, Trash2, ShieldCheck } from 'lucide-react';
import API_BASE from '@/lib/apiConfig';
import { DEFAULT_LAB_CONFIG } from '@/lib/labSettings';

export default function SettingsPage() {
  const [form, setForm] = useState(DEFAULT_LAB_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/setup/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.settings) {
          const merged = { ...DEFAULT_LAB_CONFIG };
          Object.keys(data.settings).forEach(key => {
            if (data.settings[key] && data.settings[key].value !== undefined && data.settings[key].value !== null) {
              merged[key] = data.settings[key].value;
            }
          });
          setForm(merged);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching settings:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSignatoryChange = (index, field, value) => {
    const list = [...(form.report_signatories || [])];
    list[index] = { ...list[index], [field]: value };
    setForm(prev => ({ ...prev, report_signatories: list }));
  };

  const handleAddSignatory = () => {
    const list = [...(form.report_signatories || [])];
    list.push({ name: '', designation: '', isDoctor: true });
    setForm(prev => ({ ...prev, report_signatories: list }));
  };

  const handleRemoveSignatory = (index) => {
    const list = [...(form.report_signatories || [])];
    list.splice(index, 1);
    setForm(prev => ({ ...prev, report_signatories: list }));
  };

  const handleSave = () => {
    setSaving(true);
    setMessage(null);

    fetch(`${API_BASE}/api/setup/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: form })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save settings");
        return res.json();
      })
      .then(() => {
        setMessage({ type: 'success', text: 'Lab settings updated successfully!' });
        setSaving(false);
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: err.message || 'Error saving settings.' });
        setSaving(false);
      });
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center' }}>Loading system settings...</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleGroup}>
          <h2>Lab Identity & Report Configuration</h2>
          <p>Manage clinic details, header information, and report signatories dynamically.</p>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div className={`${styles.alertBanner} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Form Grid */}
      <div className={styles.grid}>
        {/* Card 1: Clinic / Organization Identity */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <Building2 size={20} color="#0284c7" />
            Clinic Identity & Address
          </h3>

          <div className={styles.formGroup}>
            <label>Lab / Clinic Full Name</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_name || ''}
              onChange={e => handleChange('lab_name', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Short Name / Abbreviation</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_short_name || ''}
              onChange={e => handleChange('lab_short_name', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Full Address</label>
            <textarea
              className={styles.textarea}
              value={form.lab_address || ''}
              onChange={e => handleChange('lab_address', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Phone Numbers</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_phone || ''}
              onChange={e => handleChange('lab_phone', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input
              type="email"
              className={styles.input}
              value={form.lab_email || ''}
              onChange={e => handleChange('lab_email', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Website URL</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_website || ''}
              onChange={e => handleChange('lab_website', e.target.value)}
            />
          </div>
        </div>

        {/* Card 2: Report Footer & Signatories */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <FileText size={20} color="#0284c7" />
            Report Badges & Signatories
          </h3>

          <div className={styles.formGroup}>
            <label>Accreditation Tag</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_accreditation || ''}
              onChange={e => handleChange('lab_accreditation', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>ISO Certification Tag</label>
            <input
              type="text"
              className={styles.input}
              value={form.lab_certification || ''}
              onChange={e => handleChange('lab_certification', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Report Footer Disclaimer</label>
            <textarea
              className={styles.textarea}
              value={form.report_disclaimer || ''}
              onChange={e => handleChange('report_disclaimer', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Report Signatories (Sign-off List)</label>
            {(form.report_signatories || []).map((sig, idx) => (
              <div key={idx} className={styles.signatoryRow}>
                <input
                  type="text"
                  placeholder="Name (e.g. Dr. A. K. Roy)"
                  className={styles.input}
                  value={sig.name || ''}
                  onChange={e => handleSignatoryChange(idx, 'name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Designation (e.g. Consultant Pathologist)"
                  className={styles.input}
                  value={sig.designation || ''}
                  onChange={e => handleSignatoryChange(idx, 'designation', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveSignatory(idx)}
                  title="Remove Signatory"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button type="button" className={styles.addBtn} onClick={handleAddSignatory}>
              <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Add Report Signatory
            </button>
          </div>
        </div>

        {/* Card 3: Login Portal & 3D Visual Customization */}
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <h3 className={styles.cardTitle}>
            <ShieldCheck size={20} color="#0284c7" />
            Login Screen 3D Visual Customization
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div className={styles.formGroup}>
                <label>Login Background Theme Preset</label>
                <select
                  className={styles.input}
                  value={form.login_theme_preset || 'light_soft'}
                  onChange={e => handleChange('login_theme_preset', e.target.value)}
                >
                  <option value="light_soft">Light Soft Gradient (Default Porcelain Light)</option>
                  <option value="medical_blue">Medical Clinical Blue Gradient</option>
                  <option value="clean_white">Clean Minimalist White</option>
                  <option value="custom_image">Custom Background Image URL</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                <label>Custom Background Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/background.jpg"
                  className={styles.input}
                  value={form.login_bg_image_url || ''}
                  onChange={e => handleChange('login_bg_image_url', e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                <label>Logo Animation Style</label>
                <select
                  className={styles.input}
                  value={form.login_logo_animation || 'pulse'}
                  onChange={e => handleChange('login_logo_animation', e.target.value)}
                >
                  <option value="pulse">Pulse Heartbeat (Medical Pulsing)</option>
                  <option value="spin">Glowing Ring Spin</option>
                  <option value="float">3D Floating Bounce</option>
                </select>
              </div>
            </div>

            {/* Live Mini Preview Box */}
            <div style={{
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: form.login_theme_preset === 'clean_white' ? '#ffffff' : (form.login_theme_preset === 'medical_blue' ? '#0f172a' : '#f0f4f9'),
              backgroundImage: (form.login_theme_preset === 'custom_image' && form.login_bg_image_url) ? `url(${form.login_bg_image_url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '180px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                marginBottom: '8px'
              }}>
                <Building2 size={20} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: form.login_theme_preset === 'medical_blue' ? '#ffffff' : '#0f172a' }}>
                {form.lab_name || 'Santoshpur Diagnostic Centre'}
              </span>
              <span style={{ fontSize: '10px', color: form.login_theme_preset === 'medical_blue' ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                3D Light Theme Live Preview
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
