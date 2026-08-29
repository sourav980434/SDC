import { numberToWords, generateReportPin } from './numberToWords';

export function generateA5BookingReceiptHTML(data) {
  const {
    bookingNo = 'BK/26-27/00001',
    bookingDate = new Date().toLocaleString('en-GB'),
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
    totalAmount = 0,
    discountAmount = 0,
    collectionCharge = 0,
    procedureCharge = 0,
    grandTotal = 0,
    advanceReceived = 0,
    balanceDue = 0,
    paymentMethod = 'Cash',
    printedBy = 'Admin',
  } = data;

  const amountInWords = numberToWords(advanceReceived > 0 ? advanceReceived : grandTotal);
  const reportPin = generateReportPin(bookingNo);

  // Check if any selected test requires fasting prep
  const hasFastingTest = selectedTests.some((t) => {
    const name = (t.name || t.test_name || t.testName || t.Descr || '').toUpperCase();
    return (
      name.includes('FASTING') ||
      name.includes('SUGAR') ||
      name.includes('LIPID') ||
      name.includes('TRIGLYCERIDE') ||
      name.includes('FBS')
    );
  });

  const isFullyPaid = balanceDue <= 0;
  const isUnpaid = advanceReceived <= 0;
  let paymentStatusBadge = 'FULL PAYMENT';
  let badgeColor = '#15803d'; // Green
  let badgeBg = '#dcfce7';

  if (!isFullyPaid && !isUnpaid) {
    paymentStatusBadge = 'PARTIAL PAYMENT';
    badgeColor = '#b45309'; // Amber
    badgeBg = '#fef3c7';
  } else if (isUnpaid) {
    paymentStatusBadge = 'UNPAID';
    badgeColor = '#b91c1c'; // Red
    badgeBg = '#fee2e2';
  }

  // QR Code URL for Live Report Tracking
  const qrTrackingUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    `http://192.168.0.11:3000/report-status?bk=${bookingNo}`
  )}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Receipt - ${bookingNo}</title>
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
      font-size: 17px;
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
      font-size: 14px;
      font-weight: 900;
      color: #070a61;
      background: #e0e7ff;
      border: 1px solid #c7d2fe;
      padding: 3px 10px;
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
      width: 58%;
      vertical-align: top;
      padding-right: 12px;
    }

    .summary-right {
      width: 42%;
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

    .prep-note {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      margin-top: 4px;
    }

    .calc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .calc-table td {
      padding: 3px 6px;
      font-size: 10.5px;
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
      font-size: 11px;
    }

    .calc-highlight {
      background: #e0e7ff;
      border-top: 1px solid #070a61;
      border-bottom: 1px solid #070a61;
    }

    .calc-due {
      color: #b91c1c;
      font-size: 12px;
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

    .footer-timing {
      margin-top: 2px;
      color: #475569;
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
        <div class="stamp-date">${bookingDate ? bookingDate.split(' ')[0] : ''}</div>
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
          <div class="voucher-title">BOOKING RECEIPT</div>
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
        <td class="meta-label">Booking No:</td>
        <td class="meta-val" style="color: #070a61; font-size: 12px; font-family: monospace;">${bookingNo}</td>
        <td class="meta-label">Booking Date:</td>
        <td class="meta-val">${bookingDate}</td>
        <td class="meta-label">Status:</td>
        <td><span class="status-stamp">${paymentStatusBadge}</span></td>
      </tr>
      <tr>
        <td class="meta-label">Patient Name:</td>
        <td class="meta-val">${prefix} ${patientName} ${patientCode ? `(${patientCode})` : ''}</td>
        <td class="meta-label">Age / Sex:</td>
        <td class="meta-val">${age} ${ageUnit} / ${sex}</td>
        <td class="meta-label">Patient Type:</td>
        <td class="meta-val">${patientType}</td>
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
          <th>Test Description</th>
          <th style="width: 100px; text-align: right;">Amount (₹)</th>
          <th style="width: 110px; text-align: center;">Delivery Date</th>
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
            <td style="font-weight: 600;">${t.name || t.test_name || t.testName || t.Descr || t.code || 'Diagnostic Test'}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700;">₹ ${parseFloat(t.price || t.Rate || 0).toFixed(2)}</td>
            <td style="text-align: center; font-weight: 600; color: #475569;">${t.delivery_date || 'Same Day'}</td>
          </tr>
        `
                )
                .join('')
            : `
          <tr>
            <td colspan="4" style="text-align: center; padding: 12px; color: #94a3b8;">No tests selected</td>
          </tr>
        `
        }
      </tbody>
    </table>

    <!-- Summary & Financial Calculations -->
    <table class="summary-wrapper">
      <tr>
        <!-- Left Column: Words, PIN, Prep Notes -->
        <td class="summary-left">
          <div class="words-box">
            <strong>Received in Words:</strong> ${amountInWords}
          </div>

          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <div class="pin-badge">🔒 REPORT ACCESS PIN: ${reportPin}</div>
            <div style="font-size: 9px; color: #64748b;">(Use for Online Download)</div>
          </div>

          ${
            hasFastingTest
              ? `
            <div class="prep-note">
              ⚠️ Fasting Test Reminder: 8-12 hrs overnight fasting required before sample collection.
            </div>
          `
              : ''
          }
        </td>

        <!-- Right Column: Financial Calculation -->
        <td class="summary-right">
          <table class="calc-table">
            <tr>
              <td class="calc-label">Total Test Charge:</td>
              <td class="calc-val">₹ ${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
            ${
              discountAmount > 0
                ? `
              <tr>
                <td class="calc-label" style="color: #b58900;">Discount (-):</td>
                <td class="calc-val" style="color: #b58900;">₹ ${parseFloat(discountAmount).toFixed(2)}</td>
              </tr>
            `
                : ''
            }
            ${
              collectionCharge > 0
                ? `
              <tr>
                <td class="calc-label" style="color: #475569;">Collection Charge:</td>
                <td class="calc-val" style="color: #475569;">₹ ${parseFloat(collectionCharge).toFixed(2)}</td>
              </tr>
            `
                : ''
            }
            ${
              procedureCharge > 0
                ? `
              <tr>
                <td class="calc-label" style="color: #475569;">Dr. Procedure Charge:</td>
                <td class="calc-val" style="color: #475569;">₹ ${parseFloat(procedureCharge).toFixed(2)}</td>
              </tr>
            `
                : ''
            }
            <tr class="calc-highlight">
              <td class="calc-label" style="color: #070a61; font-weight: 800; font-size: 11px;">Amount Payable:</td>
              <td class="calc-val" style="color: #070a61; font-weight: 900; font-size: 12px;">₹ ${parseFloat(grandTotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="calc-label" style="color: #15803d; font-weight: 700;">Advance Received:</td>
              <td class="calc-val" style="color: #15803d; font-weight: 800;">₹ ${parseFloat(advanceReceived).toFixed(2)} (${paymentMethod})</td>
            </tr>
            <tr>
              <td class="calc-label" style="font-weight: 800;">Balance Due:</td>
              <td class="calc-val calc-due">
                ${balanceDue > 0 ? `₹ ${parseFloat(balanceDue).toFixed(2)}` : 'NIL (FULLY PAID)'}
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
        <div class="footer-timing">* Report Delivery From 7 P.M - 8 P.M. And Next Day After 12 Noon. Sunday Open (7.30 AM to 4 P.M.) *</div>
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
