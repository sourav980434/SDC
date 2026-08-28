'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, CheckCircle, X, ShieldAlert } from 'lucide-react';
import styles from './invoice.module.css';
import PermissionButton from '@/components/PermissionButton';
import { useActionPermission } from '@/hooks/useActionPermission';

import API_BASE from '@/lib/apiConfig';
export default function InvoicePage() {
  const perms = useActionPermission('invoice');
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInv, setSelectedInv] = useState(null);

  const fetchInvoices = (searchQuery = '') => {
    setLoading(true);
    fetch(`${API_BASE}/api/invoice/list?search=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json())
      .then(data => {
        setInvoices(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching invoices:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchInvoices(val);
  };

  const handleOpenDetail = (invoiceNo) => {
    fetch(`${API_BASE}/api/invoice/by-no/${encodeURIComponent(invoiceNo)}`)
      .then(res => res.json())
      .then(data => {
        setSelectedInv(data);
      })
      .catch(err => alert("Error loading invoice details"));
  };

  const handleSettleBalanceInInvoice = (bookingNo, dueAmt) => {
    if (!confirm(`Collect remaining balance ₹ ${dueAmt.toFixed(2)} and update invoice to FULLY PAID?`)) return;
    fetch(`${API_BASE}/api/invoice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: bookingNo,
        collectAmount: dueAmt,
        paymentMode: 'Cash'
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(`Balance ₹ ${dueAmt.toFixed(2)} collected successfully! Invoice is now FULLY PAID.`);
        fetchInvoices(search);
        fetch(`${API_BASE}/api/invoice/by-no/${encodeURIComponent(selectedInv.invoiceNo)}`)
          .then(r => r.json())
          .then(updated => setSelectedInv(updated));
      })
      .catch(err => alert("Error updating invoice balance"));
  };

  if (perms.isLoaded && perms.can_view === false) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--surface-container-lowest)',
        border: '1px solid #fca5a5',
        borderRadius: 'var(--radius-xl)',
        margin: '40px auto',
        maxWidth: '600px',
        boxShadow: '0 12px 32px rgba(225, 29, 72, 0.1)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#991b1b', margin: '0 0 8px 0' }}>
          Access Denied: Invoice Management Restricted
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--outline)', margin: 0 }}>
          Your role does not have <strong>View</strong> permission for Bill / Final Invoice. Contact Administrator to update Role Permission Matrix.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <div className={styles.topSection}>
        <div className={styles.titleGroup}>
          <h2>Bill / Final Invoice Management</h2>
          <p className={styles.subtitle}>View, search, and print final tax invoices with dedicated invoice numbers (INV/26-27/01001)</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Invoice No (INV/26-27/01001), Ref Booking No, or Patient Name..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Invoice No</th>
              <th className={styles.th}>Ref Booking No</th>
              <th className={styles.th}>Patient Name</th>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Net Total</th>
              <th className={styles.th}>Paid Amount</th>
              <th className={styles.th}>Due Balance</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>Loading invoice records...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>No tax invoice records found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className={styles.td} style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {inv.invoice_no}
                  </td>
                  <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                    {inv.booking_no}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '700' }}>
                    {inv.prefix} {inv.patient_name}
                  </td>
                  <td className={styles.td} style={{ fontSize: '12px' }}>{inv.invoice_date}</td>
                  <td className={styles.td} style={{ fontWeight: '700' }}>₹ {parseFloat(inv.net_amount).toFixed(2)}</td>
                  <td className={styles.td} style={{ color: '#16a34a', fontWeight: '700' }}>₹ {parseFloat(inv.paid_amount).toFixed(2)}</td>
                  <td className={styles.td} style={{ color: parseFloat(inv.due_amount) > 0 ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
                    ₹ {parseFloat(inv.due_amount).toFixed(2)}
                  </td>
                  <td className={styles.td}>
                    {parseFloat(inv.due_amount) > 0 ? (
                      <span className={`${styles.statusBadge} ${styles.badgePending}`}>PART PAID</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.badgePaid}`}>FULLY PAID</span>
                    )}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button className={styles.btnView} onClick={() => handleOpenDetail(inv.invoice_no)}>
                      <FileText size={14} style={{ marginRight: '4px' }} /> View & Settle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInv && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
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
            maxWidth: '650px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                  Tax Invoice: {selectedInv.invoiceNo}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>Ref Booking: {selectedInv.bookingNo}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedInv(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
              <div><strong>Patient Name:</strong> {selectedInv.patientName}</div>
              <div><strong>Age / Sex:</strong> {selectedInv.age} {selectedInv.sex}</div>
              <div><strong>Invoice Date:</strong> {selectedInv.invoiceDate}</div>
              <div><strong>Doctor:</strong> {selectedInv.doctorName || 'Self'}</div>
            </div>

            <div style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-container-high)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Test Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInv.items || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{item.testName}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹ {parseFloat(item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-container-low)', padding: '12px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selectedInv.dueAmount > 0 ? '#b45309' : '#15803d', fontWeight: '800', fontSize: '14px' }}>
                <CheckCircle size={18} />
                <span>STATUS: {selectedInv.status || (selectedInv.dueAmount > 0 ? 'PARTIALLY PAID' : 'FULLY PAID')}</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '12px', color: 'var(--outline)' }}>Net: ₹ {selectedInv.netAmount.toFixed(2)} | Paid: ₹ {selectedInv.paidAmount.toFixed(2)}</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: selectedInv.dueAmount > 0 ? '#b3261e' : '#15803d' }}>
                  {selectedInv.dueAmount > 0 ? `Due: ₹ ${selectedInv.dueAmount.toFixed(2)}` : 'Balance Due: Nil (Fully Paid)'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
              {selectedInv.dueAmount > 0 && (
                <PermissionButton
                  moduleKey="invoice"
                  action="can_add"
                  type="button"
                  onClick={() => handleSettleBalanceInInvoice(selectedInv.bookingNo, selectedInv.dueAmount)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: '800'
                  }}
                >
                  ✓ Collect Balance ₹ {selectedInv.dueAmount.toFixed(2)} & Convert to FULLY PAID
                </PermissionButton>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--secondary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Printer size={16} /> Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
