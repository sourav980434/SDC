'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, CheckCircle, X, ShieldAlert } from 'lucide-react';
import styles from './invoice.module.css';
import PermissionButton from '@/components/PermissionButton';
import { useActionPermission } from '@/hooks/useActionPermission';

import API_BASE from '@/lib/apiConfig';
import { generateA5BillReceiptHTML } from '@/lib/billReceiptTemplate';

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

  const handleOpenDetail = (invRow) => {
    if (!invRow) return;

    // Instantly populate modal from row data
    setSelectedInv({
      invoiceNo: invRow.invoice_no,
      bookingNo: invRow.booking_no,
      patientCode: invRow.patient_code || '',
      prefix: invRow.patient_prefix || invRow.prefix || 'Mr.',
      patientName: invRow.patient_name || invRow.patientName || 'Guest',
      sex: invRow.sex || 'Male',
      age: invRow.age_year || invRow.age || '',
      phone: invRow.mobile_no || invRow.phone || '',
      address: invRow.address || '',
      referredBy: invRow.doctor_name || invRow.referredBy || 'Dr. SELF',
      netAmount: parseFloat(invRow.net_amount || 0),
      paidAmount: parseFloat(invRow.paid_amount || 0),
      dueAmount: parseFloat(invRow.due_amount || 0),
      discountValue: parseFloat(invRow.discount_value || 0),
      status: invRow.invoice_status || (parseFloat(invRow.due_amount || 0) > 0 ? 'PARTIALLY PAID' : 'FULLY PAID'),
      invoiceDate: invRow.invoice_date || '',
      date_formatted: invRow.invoice_date || '',
      items: [],
      payments: []
    });

    // Asynchronously fetch extra items & payment details
    fetch(`${API_BASE}/api/invoice/details?inv_no=${encodeURIComponent(invRow.invoice_no)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSelectedInv(prev => ({
            ...prev,
            ...data,
            invoiceNo: data.invoiceNo || prev.invoiceNo,
            bookingNo: data.bookingNo || prev.bookingNo,
            patientName: data.patientName || prev.patientName,
            items: data.items && data.items.length > 0 ? data.items : prev.items,
            payments: data.payments && data.payments.length > 0 ? data.payments : prev.payments
          }));
        }
      })
      .catch(err => console.error("Error loading extra invoice details:", err));
  };

  const handleSettleBalanceInInvoice = (bookingNo, dueAmt) => {
    const dueVal = parseFloat(dueAmt || 0);
    if (!confirm(`Collect remaining balance ₹ ${dueVal.toFixed(2)} and update invoice to FULLY PAID?`)) return;
    fetch(`${API_BASE}/api/invoice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: bookingNo,
        collectAmount: dueVal,
        paymentMode: 'Cash'
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(`Balance ₹ ${dueVal.toFixed(2)} collected successfully! Invoice is now FULLY PAID.`);
        fetchInvoices(search);
        if (selectedInv) {
          const invKey = selectedInv.invoiceNo || selectedInv.invoice_no;
          fetch(`${API_BASE}/api/invoice/details?inv_no=${encodeURIComponent(invKey)}`)
            .then(r => r.json())
            .then(updated => {
              setSelectedInv(updated);
              handlePrintSelectedTaxInvoice(updated);
            });
        }
      })
      .catch(err => alert("Error updating invoice balance"));
  };

  const handlePrintSelectedTaxInvoice = (targetInv = null) => {
    const isEvent = targetInv && (targetInv.nativeEvent || typeof targetInv.preventDefault === 'function');
    const rawInv = (isEvent ? selectedInv : targetInv) || selectedInv;
    if (!rawInv) {
      alert("No invoice selected for printing.");
      return;
    }

    const invKey = rawInv.invoiceNo || rawInv.invoice_no || rawInv.bookingNo || rawInv.booking_no;
    if (!invKey) {
      alert("Invalid invoice reference number.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the final tax invoice.');
      return;
    }
    printWindow.document.write('<div style="font-family:sans-serif; padding:40px; text-align:center; color:#475569;"><h2>Loading Invoice Receipt...</h2><p>Please wait a moment while details are fetched.</p></div>');

    fetch(`${API_BASE}/api/invoice/details?inv_no=${encodeURIComponent(invKey)}`)
      .then(res => res.json())
      .then(invData => {
        if (invData.error) {
          printWindow.document.open();
          printWindow.document.write(`<h3 style="color:red; padding:20px;">Error loading receipt: ${invData.error}</h3>`);
          printWindow.document.close();
          return;
        }

        const netAmt = parseFloat(invData.netAmount ?? invData.net_amount ?? rawInv.net_amount ?? 0);
        const paidAmt = parseFloat(invData.paidAmount ?? invData.paid_amount ?? rawInv.paid_amount ?? 0);
        const dueAmt = parseFloat(invData.dueAmount ?? invData.due_amount ?? rawInv.due_amount ?? 0);
        const latestPmt = invData.payments && invData.payments.length > 0 ? invData.payments[invData.payments.length - 1].amount : 0;
        const initialAdv = Math.max(0, paidAmt - latestPmt);

        const safeInvoiceNo = invData.invoiceNo || invData.invoice_no || rawInv.invoice_no || 'INV/26-27/01001';
        const safeBookingNo = invData.bookingNo || invData.booking_no || rawInv.booking_no || '';
        const safePatientName = invData.patientName || invData.patient_name || rawInv.patient_name || 'Guest';
        const safePrefix = invData.prefix || invData.bk_prefix || rawInv.prefix || rawInv.patient_prefix || 'Mr.';
        const safeAge = invData.age || invData.bk_age_year || rawInv.age || rawInv.age_year || '';
        const safeSex = invData.sex || invData.bk_sex || rawInv.sex || 'Male';
        const safePhone = invData.phone || invData.bk_mobile_no || rawInv.phone || rawInv.mobile_no || '';
        const safeAddress = invData.address || invData.bk_address || rawInv.address || '';
        const safeReferredBy = invData.referredBy || invData.bk_doctor_name || rawInv.doctor_name || 'Dr. SELF';
        const safeInvoiceDate = invData.date_formatted || invData.invoiceDate || invData.invoice_date || rawInv.invoice_date || new Date().toLocaleString('en-GB');

        const htmlContent = generateA5BillReceiptHTML({
          invoiceNo: safeInvoiceNo,
          invoiceDate: safeInvoiceDate,
          bookingNo: safeBookingNo,
          patientCode: invData.patientCode || invData.patient_code || rawInv.patient_code || '',
          prefix: safePrefix,
          patientName: safePatientName,
          age: safeAge,
          ageUnit: 'Yrs',
          sex: safeSex,
          patientType: invData.patientType || 'GENERAL',
          phone: safePhone,
          address: safeAddress,
          referredBy: safeReferredBy,
          selectedTests: (invData.items || []).map(item => ({
            code: item.code || item.test_code || '',
            name: item.name || item.testName || item.test_name || item.Descr || 'Diagnostic Test',
            test_name: item.name || item.testName || item.test_name || item.Descr || 'Diagnostic Test',
            price: parseFloat(item.price ?? item.amount ?? item.Rate ?? 0),
            delivery_date: item.delivery_date || 'Same Day'
          })),
          totalAmount: netAmt,
          discountAmount: parseFloat(invData.discountValue || invData.discount_value || 0),
          netAmount: netAmt,
          advanceReceived: initialAdv,
          currentPayment: latestPmt,
          totalPaid: paidAmt,
          balanceDue: dueAmt,
          paymentMethod: invData.paymentMethod || invData.payment_mode || 'Cash',
          printedBy: 'Admin',
        });

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      })
      .catch(err => {
        console.error("Print fetch error:", err);
        printWindow.document.open();
        printWindow.document.write('<h3 style="color:red; padding:20px;">Failed to load invoice receipt data.</h3>');
        printWindow.document.close();
      });
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
                    {inv.patient_prefix ? `${inv.patient_prefix} ` : (inv.prefix ? `${inv.prefix} ` : '')}{inv.patient_name}
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
                    <button className={styles.btnView} onClick={() => handleOpenDetail(inv)}>
                      <FileText size={14} style={{ marginRight: '4px' }} /> View & Settle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInv && (() => {
        const invNo = selectedInv.invoiceNo || selectedInv.invoice_no || 'INV/26-27/00001';
        const bkNo = selectedInv.bookingNo || selectedInv.booking_no || '';
        const prefixStr = selectedInv.prefix || 'Mr.';
        const nameStr = selectedInv.patientName || selectedInv.patient_name || 'Guest';
        const ageVal = selectedInv.age || selectedInv.age_year || '';
        const sexVal = selectedInv.sex || 'Male';
        const invDtStr = selectedInv.date_formatted || selectedInv.invoiceDate || selectedInv.invoice_date || '';
        const docNameStr = selectedInv.referredBy || selectedInv.doctorName || selectedInv.doctor_name || 'Dr. SELF';
        const netAmtVal = parseFloat(selectedInv.netAmount ?? selectedInv.net_amount ?? 0);
        const paidAmtVal = parseFloat(selectedInv.paidAmount ?? selectedInv.paid_amount ?? 0);
        const dueAmtVal = parseFloat(selectedInv.dueAmount ?? selectedInv.due_amount ?? 0);

        return (
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
                    Tax Invoice: {invNo}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>Ref Booking: {bkNo}</span>
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
                <div><strong>Patient Name:</strong> {prefixStr} {nameStr}</div>
                <div><strong>Age / Sex:</strong> {ageVal} Yrs / {sexVal}</div>
                <div><strong>Invoice Date:</strong> {invDtStr}</div>
                <div><strong>Doctor:</strong> {docNameStr}</div>
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
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{item.name || item.testName || item.test_name || 'Diagnostic Test'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹ {parseFloat(item.price ?? item.amount ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-container-low)', padding: '12px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: dueAmtVal > 0 ? '#b45309' : '#15803d', fontWeight: '800', fontSize: '14px' }}>
                  <CheckCircle size={18} />
                  <span>STATUS: {selectedInv.status || (dueAmtVal > 0 ? 'PARTIALLY PAID' : 'FULLY PAID')}</span>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--outline)' }}>Net: ₹ {netAmtVal.toFixed(2)} | Paid: ₹ {paidAmtVal.toFixed(2)}</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: dueAmtVal > 0 ? '#b3261e' : '#15803d' }}>
                    {dueAmtVal > 0 ? `Due: ₹ ${dueAmtVal.toFixed(2)}` : 'Balance Due: Nil (Fully Paid)'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                {dueAmtVal > 0 && (
                  <PermissionButton
                    moduleKey="invoice"
                    action="can_add"
                    type="button"
                    onClick={() => handleSettleBalanceInInvoice(bkNo, dueAmtVal)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Collect Balance ₹ {dueAmtVal.toFixed(2)} & Convert to FULLY PAID
                  </PermissionButton>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintSelectedTaxInvoice(selectedInv)}
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
                  <Printer size={16} /> Print Final Tax Invoice (A5)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
