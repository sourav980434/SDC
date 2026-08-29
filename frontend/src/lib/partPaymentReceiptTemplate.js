import { numberToWords, generateReportPin } from './numberToWords';

export function generateA5PartPaymentReceiptHTML(data) {
  const {
    receiptNo = 'RCP/26-27/00001-P2',
    receiptDate = new Date().toLocaleString('en-GB'),
    bookingNo = 'BK/26-27/00001',
    patientCode = '',
    prefix = 'Mr.',
    patientName = 'GUEST PATIENT',
    age = '',
    ageUnit = 'Yrs',
    sex = 'Male',
    patientType = 'GENERAL',
    phone = '',
    address = '',
    referredBy = 'Dr. SELF',
    selectedTests = [],
    collectionCharge = 0,
    procedureCharge = 0,
    grandTotal = 0,
    previousPaid = 0,
    currentPayment = 0,
    totalPaid = 0,
    balanceDue = 0,
    paymentMethod = 'Cash',
    partSeq = 2,
    printedBy = 'Admin',
  } = data;

  const actualTotalPaid = totalPaid > 0 ? totalPaid : previousPaid + currentPayment;
  const actualBalanceDue = grandTotal - actualTotalPaid;
  const currentPaymentInWords = numberToWords(currentPayment);
  const reportPin = generateReportPin(bookingNo);

  const isFullyPaid = actualBalanceDue <= 0;
  let paymentStatusBadge = `PART PAYMENT #${partSeq}`;
  let badgeColor = '#b45309'; // Amber
  let badgeBg = '#fef3c7';

  if (isFullyPaid) {
    paymentStatusBadge = 'FULL PAYMENT';
    badgeColor = '#15803d'; // Green
    badgeBg = '#dcfce7';
  }

  // QR Code URL for Live Payment & Report Audit
  const qrTrackingUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    `http://192.168.0.11:3000/report-status?bk=${bookingNo}`
  )}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Part Payment Money Receipt - ${receiptNo}</title>
  <style>
    @page {
      size: A5 landscape;
      margin: 4mm 6mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    }

    html, body {
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.35;
      padding: 6px 10px;
      width: 210mm;
      margin: 0 auto;
    }

    /* Outer Border Box matching classic clinical receipt structure */
    .receipt-container {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 10px 14px;
      position: relative;
    }

    /* Circular Rubber Stamp Seal Watermark */
    .watermark-stamp {
      position: absolute;
      top: 52%;
      left: 48%;
      transform: translate(-50%, -50%) rotate(-14deg);
      width: 150px;
      height: 150px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      user-select: none;
      opacity: 0.25;
    }

    .stamp-paid {
      border: 4px double #15803d;
      color: #15803d;
      box-shadow: inset 0 0 0 2px #15803d;
    }

    .stamp-due {
      border: 4px double #b91c1c;
      color: #b91c1c;
      box-shadow: inset 0 0 0 2px #b91c1c;
    }

    .stamp-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.1;
      padding: 4px;
    }

    .stamp-org {
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .stamp-text {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 4px 0;
      border-top: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      padding: 2px 6px;
      white-space: nowrap;
    }

    .stamp-date {
      font-size: 8px;
      font-weight: 800;
      font-family: monospace;
    }

    /* Header Section */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }

    .org-title {
      font-size: 16px;
      font-weight: 900;
      color: #070a61;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }

    .org-subtitle {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }

    .voucher-title-box {
      text-align: right;
    }

    .voucher-title {
      font-size: 13px;
      font-weight: 900;
      color: #070a61;
      background: #e0e7ff;
      border: 1px solid #c7d2fe;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      text-transform: uppercase;
    }

    .qr-box {
      width: 52px;
      height: 52px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px;
    }

    /* Meta Info Grid */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    .meta-table td {
      padding: 4px 8px;
      font-size: 10.5px;
      vertical-align: top;
    }

    .meta-label {
      color: #64748b;
      font-weight: 600;
      width: 85px;
    }

    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }

    .status-stamp {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8.5px;
      font-weight: 800;
      background: ${badgeBg};
      color: ${badgeColor};
      border: 1px solid ${badgeColor};
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* Itemized Test Table */
    .test-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }

    .test-table th {
      background: #070a61;
      color: #ffffff;
      padding: 5px 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: left;
      border: 1px solid #070a61;
    }

    .test-table td {
      padding: 5px 8px;
      font-size: 10.5px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .test-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* Financial Summary Section */
    .summary-wrapper {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 8px;
    }

    .summary-left {
      width: 52%;
      vertical-align: top;
      padding-right: 12px;
    }

    .summary-right {
      width: 48%;
      vertical-align: top;
    }

    .words-box {
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 10px;
      color: #334155;
      margin-bottom: 6px;
    }

    .pin-badge {
      display: inline-block;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
    }

    .calc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .calc-table td {
      padding: 2.5px 6px;
      font-size: 10px;
    }

    .calc-label {
      color: #475569;
      font-weight: 600;
      text-align: right;
    }

    .calc-val {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
      font-size: 10.5px;
    }

    .calc-current {
      background: #dcfce7;
      border-top: 1.5px solid #15803d;
      border-bottom: 1.5px solid #15803d;
    }

    .calc-due {
      color: #b91c1c;
      font-size: 11.5px;
      font-weight: 900;
    }

    /* Footer Notes */
    .footer-section {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      color: #64748b;
    }

    .footer-notice {
      font-weight: 700;
      color: #0f172a;
    }

    .operator-info {
      text-align: right;
      font-weight: 700;
      color: #070a61;
    }

    @media print {
      @page {
        size: A5 landscape;
        margin: 4mm 6mm;
      }
      html, body {
        width: 210mm;
        height: 148mm;
        padding: 0;
      }
      .receipt-container {
        border-color: #000000;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="receipt-container">

    <!-- Circular Rubber Stamp Seal Watermark -->
    <div class="watermark-stamp ${isFullyPaid ? 'stamp-paid' : 'stamp-due'}">
      <div class="stamp-inner">
        <div class="stamp-org">SANTOSHPUR DIAGNOSTIC</div>
        <div class="stamp-text">${isFullyPaid ? 'FULLY PAID' : 'BALANCE DUE'}</div>
        <div class="stamp-date">${receiptDate ? receiptDate.split(' ')[0] : ''}</div>
      </div>
    </div>
    
    <!-- Top Header -->
    <table class="header-table">
      <tr>
        <td>
          <div class="org-title">Santoshpur Diagnostic Centre & Polyclinic</div>
          <div class="org-subtitle">Santoshpur, South 24 Parganas, WB • Phone: +91 9804349061</div>
        </td>
        <td class="voucher-title-box">
          <div class="voucher-title">MONEY RECEIPT (PART PAYMENT #${partSeq})</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 4px; font-weight: 700;">Page 1 of 1</div>
        </td>
        <td style="width: 60px; text-align: right; vertical-align: middle;">
          <img src="${qrTrackingUrl}" class="qr-box" alt="Report QR" />
        </td>
      </tr>
    </table>

    <!-- Meta Info Block -->
    <table class="meta-table">
      <tr>
        <td class="meta-label">Receipt No:</td>
        <td class="meta-val" style="color: #070a61; font-size: 12px; font-family: monospace;">${receiptNo}</td>
        <td class="meta-label">Receipt Date:</td>
        <td class="meta-val">${receiptDate}</td>
        <td class="meta-label">Booking No:</td>
        <td class="meta-val" style="font-family: monospace;">${bookingNo}</td>
      </tr>
      <tr>
        <td class="meta-label">Patient Name:</td>
        <td class="meta-val">${prefix} ${patientName} ${patientCode ? `(${patientCode})` : ''}</td>
        <td class="meta-label">Age / Sex:</td>
        <td class="meta-val">${age} ${ageUnit} / ${sex}</td>
        <td class="meta-label">Status:</td>
        <td><span class="status-stamp">${paymentStatusBadge}</span></td>
      </tr>
      <tr>
        <td class="meta-label">Address / Mob:</td>
        <td class="meta-val" colspan="3">${address || 'N/A'} ${phone ? `• Mob: +91 ${phone}` : ''}</td>
        <td class="meta-label">Ref. Doctor:</td>
        <td class="meta-val" style="color: #0284c7;">${referredBy || 'Dr. SELF'}</td>
      </tr>
    </table>

    <!-- Test Itemized Table -->
    <table class="test-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Srl</th>
          <th style="width: 80px;">Test Code</th>
          <th>Test Description</th>
          <th style="width: 100px; text-align: right;">Amount (₹)</th>
          <th style="width: 100px; text-align: center;">Delivery Date</th>
        </tr>
      </thead>
      <tbody>
        ${
          selectedTests.length > 0
            ? selectedTests
                .map(
                  (t, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td style="font-family: monospace; font-size: 10px; color: #475569;">${t.test_code || t.code || `T${1000 + idx}`}</td>
            <td style="font-weight: 600;">${t.name || t.test_name || t.testName || t.Descr || 'Diagnostic Test'}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700;">₹ ${parseFloat(t.price || t.Rate || 0).toFixed(2)}</td>
            <td style="text-align: center; font-weight: 600; color: #475569;">${t.delivery_date || 'Same Day'}</td>
          </tr>
        `
                )
                .join('')
            : `
          <tr>
            <td colspan="5" style="text-align: center; padding: 12px; color: #94a3b8;">No test items found</td>
          </tr>
        `
        }
      </tbody>
    </table>

    <!-- Summary & Installment Audit Block -->
    <table class="summary-wrapper">
      <tr>
        <!-- Left Column: Words & Security PIN -->
        <td class="summary-left">
          <div class="words-box">
            <strong>Current Installment Received:</strong> ${currentPaymentInWords}
          </div>

          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <div class="pin-badge">🔒 REPORT ACCESS PIN: ${reportPin}</div>
            <div style="font-size: 9px; color: #64748b;">(Use for Online Download)</div>
          </div>

          <div style="margin-top: 6px; font-size: 9.5px; color: #475569;">
            * Received with thanks towards Part Payment #${partSeq} against Booking No ${bookingNo}.
          </div>
        </td>

        <!-- Right Column: Audit Calculation Table -->
        <td class="summary-right">
          <table class="calc-table">
            <tr>
              <td class="calc-label">Net Payable Charge:</td>
              <td class="calc-val">₹ ${parseFloat(grandTotal).toFixed(2)}</td>
            </tr>
            ${
              collectionCharge > 0
                ? `
            <tr>
              <td class="calc-label">Collection Charge:</td>
              <td class="calc-val">₹ ${parseFloat(collectionCharge).toFixed(2)}</td>
            </tr>
            `
                : ''
            }
            ${
              procedureCharge > 0
                ? `
            <tr>
              <td class="calc-label">Dr. Procedure Charge:</td>
              <td class="calc-val">₹ ${parseFloat(procedureCharge).toFixed(2)}</td>
            </tr>
            `
                : ''
            }
            <tr>
              <td class="calc-label">Previous Paid:</td>
              <td class="calc-val" style="color: #475569;">₹ ${parseFloat(previousPaid).toFixed(2)}</td>
            </tr>
            <tr class="calc-current">
              <td class="calc-label" style="color: #15803d; font-weight: 800;">⚡ RECEIVED NOW (#${partSeq}):</td>
              <td class="calc-val" style="color: #15803d; font-weight: 900; font-size: 11px;">₹ ${parseFloat(currentPayment).toFixed(2)} (${paymentMethod})</td>
            </tr>
            <tr>
              <td class="calc-label" style="color: #070a61; font-weight: 800;">Total Paid to Date:</td>
              <td class="calc-val" style="color: #070a61; font-weight: 900;">₹ ${parseFloat(actualTotalPaid).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="calc-label" style="font-weight: 800;">Balance Due:</td>
              <td class="calc-val calc-due">
                ${actualBalanceDue > 0 ? `₹ ${parseFloat(actualBalanceDue).toFixed(2)}` : 'NIL (FULLY PAID)'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer Notice -->
    <div class="footer-section">
      <div>
        <div class="footer-notice">Pls. produce this receipt at the time of report delivery.</div>
        <div style="margin-top: 2px; color: #475569;">* Report Delivery From 7 P.M - 8 P.M. And Next Day After 12 Noon. *</div>
      </div>
      <div class="operator-info">
        <div>Printed By: ${printedBy}</div>
        <div style="font-size: 8px; color: #94a3b8; font-weight: 500;">SDC Clinical Web Portal</div>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 600);
    };
  </script>
</body>
</html>
  `;
}
