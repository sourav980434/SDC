'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  Printer, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Lock,
  FileText,
  X
} from 'lucide-react';
import styles from './archive.module.css';

import API_BASE from '@/lib/apiConfig';
export default function ArchiveBillsPage() {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchArchiveBills = (pageNo = 1) => {
    setLoading(true);
    let url = `${API_BASE}/api/booking/archive?page=${pageNo}&per_page=25`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    if (fromDate) {
      url += `&from_date=${fromDate}`;
    }
    if (toDate) {
      url += `&to_date=${toDate}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setBills(data.data || []);
        setPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        setTotalRecords(data.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching archive bills:", err);
        setBills([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchArchiveBills(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArchiveBills(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setTimeout(() => {
      fetch(`${API_BASE}/api/booking/archive?page=1&per_page=25`)
        .then(res => res.json())
        .then(data => {
          setBills(data.data || []);
          setPage(data.current_page || 1);
          setTotalPages(data.last_page || 1);
          setTotalRecords(data.total || 0);
        });
    }, 50);
  };

  const handleViewBillDetail = (bookingNo) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    
    fetch(`${API_BASE}/api/booking/archive/${bookingNo}`)
      .then(res => res.json())
      .then(data => {
        setSelectedBill(data);
        setLoadingDetail(false);
      })
      .catch(err => {
        console.error("Error fetching bill detail:", err);
        setLoadingDetail(false);
      });
  };

  const handlePrintReceipt = (bill) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }

    const netAmt = bill.netAmount || 0;
    const advAmt = bill.advAmount || 0;
    const dueAmt = netAmt - advAmt;

    printWindow.document.write(`
      <html>
        <head>
          <title>Archive Receipt - ${bill.bookingNo}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              color: #333;
              max-width: 550px;
              margin: auto;
              border: 1px solid #ddd;
              box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
            .archive-badge {
              background-color: #0284c7;
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 4px 10px;
              border-radius: 4px;
              display: inline-block;
              margin-bottom: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #070a61;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              color: #070a61;
              font-size: 22px;
            }
            .header p {
              margin: 4px 0 0 0;
              font-size: 12px;
              color: #666;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 13.5px;
            }
            .row label {
              color: #666;
            }
            .row span {
              font-weight: 600;
            }
            .divider {
              border-top: 1px solid #ddd;
              margin: 15px 0;
            }
            .test-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .test-table th, .test-table td {
              border-bottom: 1px solid #eee;
              padding: 8px 4px;
              text-align: left;
              font-size: 13px;
            }
            .test-table th {
              color: #070a61;
              font-size: 12px;
              text-transform: uppercase;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 11px;
              color: #888;
            }
            @media print {
              body {
                border: none;
                box-shadow: none;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center;">
            <span class="archive-badge">Legacy Archive Invoice (Read-Only)</span>
          </div>
          <div class="header">
            <h2>Santoshpur Diagnostic Centre</h2>
            <p>SANTOSHPUR, SOUTH 24 PARGANAS, WEST BENGAL</p>
          </div>
          
          <div class="row">
            <label>Booking No:</label>
            <span>${bill.bookingNo}</span>
          </div>
          <div class="row">
            <label>Date & Time:</label>
            <span>${bill.date || ''}</span>
          </div>
          <div class="row">
            <label>Patient Name:</label>
            <span>${bill.prefix || ''} ${bill.patientName || ''} (${bill.sex || ''}, ${bill.age || ''} ${bill.ageUnit || ''})</span>
          </div>
          <div class="row">
            <label>Contact / Address:</label>
            <span>${bill.phone || 'N/A'} • ${bill.address || ''}</span>
          </div>
          <div class="row">
            <label>Referred Doctor:</label>
            <span>${bill.referredBy || 'Self'}</span>
          </div>

          <div class="divider"></div>

          <table class="test-table">
            <thead>
              <tr>
                <th>Test Code</th>
                <th>Test Name</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${(bill.selectedTests || []).map(t => `
                <tr>
                  <td>${t.code}</td>
                  <td>${t.name}</td>
                  <td style="text-align: right;">₹ ${t.price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="row">
            <label>Total Amount:</label>
            <span>₹ ${(bill.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="row">
            <label>Discount Amount:</label>
            <span>₹ ${(bill.discountValue || 0).toFixed(2)}</span>
          </div>
          <div class="row" style="font-size: 15px; color: #070a61;">
            <label style="font-weight: bold; color: #070a61;">Net Amount:</label>
            <span style="font-weight: bold;">₹ ${netAmt.toFixed(2)}</span>
          </div>
          <div class="row">
            <label>Paid Amount:</label>
            <span style="color: #2e7d32;">₹ ${advAmt.toFixed(2)}</span>
          </div>
          <div class="row">
            <label>Balance Due:</label>
            <span style="color: ${dueAmt > 0 ? '#b3261e' : '#2e7d32'}; font-weight: bold;">
              ${dueAmt > 0 ? `₹ ${dueAmt.toFixed(2)}` : 'Nil (Fully Paid)'}
            </span>
          </div>

          <div class="footer">
            <p>This is a read-only archived bill from the legacy diagnostic database.</p>
            <p>Thank you for choosing Santoshpur Diagnostic Centre.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Top Breadcrumb & Page Info */}
      <div className={styles.pageHeader}>
        <div>
          <nav className={styles.breadcrumb}>
            <span>Transaction</span>
            <span>/</span>
            <span className={styles.breadcrumbActive}>Archive Bills</span>
          </nav>
          <div className={styles.titleRow}>
            <Archive className={styles.titleIcon} size={26} />
            <h2>Archive Bills (Legacy System)</h2>
            <span className={styles.readOnlyBadge}>
              <Lock size={12} style={{ marginRight: '4px' }} />
              Strictly Read-Only Archive
            </span>
          </div>
        </div>
        <div className={styles.totalBadge}>
          Total Legacy Bills: <strong>{totalRecords.toLocaleString()}</strong>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className={styles.infoBanner}>
        <FileText size={18} />
        <span>
          These records are imported from the customer&apos;s legacy desktop software database. They are kept for historical reference only (View & Print Receipt). No edits or modifications are allowed.
        </span>
      </div>

      {/* Search & Filter Bar */}
      <form className={styles.filterCard} onSubmit={handleSearchSubmit}>
        <div className={styles.filterGroup}>
          <label>Search Patient / Bill No / Phone</label>
          <div className={styles.inputWrapper}>
            <Search size={16} className={styles.inputIcon} />
            <input 
              type="text"
              className={styles.filterInput}
              placeholder="Enter name, booking no (e.g. H1823), or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>From Date</label>
          <input 
            type="date"
            className={styles.filterInput}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>To Date</label>
          <input 
            type="date"
            className={styles.filterInput}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.btnSearch}>
            <Search size={16} /> Search
          </button>
          <button type="button" className={styles.btnReset} onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      </form>

      {/* Archive Bills Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableResponsive}>
          <table className={styles.archiveTable}>
            <thead>
              <tr>
                <th>Booking No</th>
                <th>Date & Time</th>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Mobile No</th>
                <th>Referred Doctor</th>
                <th style={{ textAlign: 'right' }}>Net Amount</th>
                <th style={{ textAlign: 'right' }}>Paid Amount</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className={styles.loadingCell}>
                    Loading historical archive bills from database...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.emptyCell}>
                    No archive bill records found matching your search.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.BookingNo}>
                    <td className={styles.bookingCell}>{b.BookingNo}</td>
                    <td className={styles.dateCell}>
                      {b.AddDate ? new Date(b.AddDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td className={styles.patientCell}>
                      <strong>{b.PPrefix} {b.PName}</strong>
                      {b.Address1 && <div className={styles.subAddress}>{b.Address1}</div>}
                    </td>
                    <td>
                      {b.AgeYear ? `${b.AgeYear} Yrs` : (b.AgeMonth ? `${b.AgeMonth} Mo` : (b.AgeDay ? `${b.AgeDay} Days` : 'N/A'))} • {b.Sex || 'N/A'}
                    </td>
                    <td className={styles.monoCell}>{b.MobileNo || 'N/A'}</td>
                    <td>{b.DoctorName || 'Self'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>
                      ₹ {floatVal(b.NetAmount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#2e7d32' }}>
                      ₹ {floatVal(b.AdvAmount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        className={styles.btnView}
                        onClick={() => handleViewBillDetail(b.BookingNo)}
                        title="View Read-Only Archive Details"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className={styles.paginationBar}>
            <span>Showing page {page} of {totalPages} ({totalRecords.toLocaleString()} records)</span>
            <div className={styles.paginationControls}>
              <button 
                disabled={page <= 1} 
                onClick={() => fetchArchiveBills(page - 1)}
                className={styles.btnPage}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className={styles.currentPageBadge}>{page}</span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => fetchArchiveBills(page + 1)}
                className={styles.btnPage}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Read-Only Bill Detail Modal */}
      {showDetailModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <Archive size={20} />
                <h3>Legacy Archive Bill Details</h3>
                <span className={styles.archiveBadgeModal}>Read-Only Archive</span>
              </div>
              <button 
                type="button" 
                className={styles.btnCloseModal}
                onClick={() => setShowDetailModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingDetail || !selectedBill ? (
                <div className={styles.loadingModal}>Loading archive bill details...</div>
              ) : (
                <>
                  <div className={styles.billMetaGrid}>
                    <div>
                      <label>Booking Number</label>
                      <strong className={styles.monoTitle}>{selectedBill.bookingNo}</strong>
                    </div>
                    <div>
                      <label>Booking Date</label>
                      <span>{selectedBill.date}</span>
                    </div>
                    <div>
                      <label>Patient Name</label>
                      <span><strong>{selectedBill.prefix} {selectedBill.patientName}</strong></span>
                    </div>
                    <div>
                      <label>Age / Sex</label>
                      <span>{selectedBill.age} {selectedBill.ageUnit} • {selectedBill.sex}</span>
                    </div>
                    <div>
                      <label>Contact Number</label>
                      <span>{selectedBill.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Address</label>
                      <span>{selectedBill.address || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Referred Doctor</label>
                      <span>{selectedBill.referredBy || 'Self'}</span>
                    </div>
                    <div>
                      <label>Payment Method</label>
                      <span>{selectedBill.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>

                  <h4 className={styles.sectionHeading}>Test Line Items</h4>
                  <table className={styles.modalTestTable}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Test Description</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBill.selectedTests || []).map((t, i) => (
                        <tr key={i}>
                          <td className={styles.monoCell}>{t.code}</td>
                          <td>{t.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>₹ {t.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={styles.financialSummaryBox}>
                    <div className={styles.sumRow}>
                      <label>Subtotal Amount:</label>
                      <span>₹ {(selectedBill.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className={styles.sumRow}>
                      <label>Discount Amount:</label>
                      <span>₹ {(selectedBill.discountValue || 0).toFixed(2)}</span>
                    </div>
                    <div className={`${styles.sumRow} ${styles.netRow}`}>
                      <label>Net Payable Amount:</label>
                      <span>₹ {(selectedBill.netAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className={styles.sumRow}>
                      <label>Amount Paid:</label>
                      <span style={{ color: '#2e7d32' }}>₹ {(selectedBill.advAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.noticeText}>
                <Lock size={14} /> Historical archive record. Modifying or editing is disabled.
              </div>
              <div className={styles.modalFooterBtns}>
                {selectedBill && (
                  <button 
                    type="button" 
                    className={styles.btnPrint}
                    onClick={() => handlePrintReceipt(selectedBill)}
                  >
                    <Printer size={16} /> Print Archive Receipt
                  </button>
                )}
                <button 
                  type="button" 
                  className={styles.btnClose}
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function floatVal(val) {
  return parseFloat(val) || 0;
}
