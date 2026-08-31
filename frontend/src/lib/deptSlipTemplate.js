

import { getCachedLabSettings } from './labSettings';

function getSpecimenGuidance(testName = '') {
  const name = testName.toUpperCase();
  if (name.includes('SUGAR') || name.includes('FBS') || name.includes('PPBS')) {
    return 'Fluoride Tube (Gray Cap)';
  }
  if (name.includes('CBC') || name.includes('HEMOGRAM') || name.includes('HAEMOGLOBIN') || name.includes('ESR') || name.includes('BLOOD GROUP')) {
    return 'EDTA Tube (Lavender Cap)';
  }
  if (name.includes('LIPID') || name.includes('LFT') || name.includes('KFT') || name.includes('CREATININE') || name.includes('SERUM') || name.includes('ADA') || name.includes('TSH') || name.includes('THYROID')) {
    return 'Plain Serum Tube (Red / Gel Cap)';
  }
  if (name.includes('URINE')) {
    return 'Sterile Urine Container';
  }
  if (name.includes('USG') || name.includes('ULTRASOUND') || name.includes('ABDOMEN')) {
    return 'USG Room #1 (Gel Prep)';
  }
  if (name.includes('X-RAY') || name.includes('CHEST') || name.includes('PA') || name.includes('BONE')) {
    return 'X-Ray Room (Cassette Prep)';
  }
  return 'Standard Specimen Container';
}

function getDeptTheme(deptName = '') {
  const dept = deptName.toUpperCase();
  if (dept.includes('PATHOLOGY')) {
    return { mainColor: '#070a61', bgLight: '#e0e7ff', borderColor: '#c7d2fe' };
  }
  if (dept.includes('ULTRASONO') || dept.includes('USG')) {
    return { mainColor: '#581c87', bgLight: '#f3e8ff', borderColor: '#e9d5ff' };
  }
  if (dept.includes('X-RAY') || dept.includes('XRAY') || dept.includes('RADIOLOGY')) {
    return { mainColor: '#0f766e', bgLight: '#ccfbf1', borderColor: '#99f6e4' };
  }
  return { mainColor: '#1e293b', bgLight: '#f1f5f9', borderColor: '#cbd5e1' };
}

export function generateA5DepartmentSlipsHTML(data) {
  const labConfig = getCachedLabSettings() || {};
  const printLabName = data.labName || labConfig.lab_name || 'Santoshpur Diagnostic Centre & Polyclinic';
  const printLabAddress = data.labAddress || labConfig.lab_address || '286, S.N. Roy Road, Santoshpur, Kolkata - 700075';
  const printLabPhone = data.labPhone || labConfig.lab_phone || '+91 33 2400 0000 / 2400 1111';
  const printLabSubtitle = `${printLabAddress} • Phone: ${printLabPhone}`;

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
    printedBy = 'Admin',
  } = data;

  // Group tests by department
  const deptGroups = {};
  selectedTests.forEach((t) => {
    const dept = (t.dept_name || 'PATHOLOGY').toUpperCase();
    if (!deptGroups[dept]) {
      deptGroups[dept] = [];
    }
    deptGroups[dept].push(t);
  });

  const deptKeys = Object.keys(deptGroups);
  const totalPages = deptKeys.length > 0 ? deptKeys.length : 1;

  // QR Code URL for Live Department Audit
  const qrTrackingUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    `http://192.168.0.11:3000/report-status?bk=${bookingNo}`
  )}`;

  const slipPagesHTML = deptKeys
    .map((deptName, pageIdx) => {
      const testsInDept = deptGroups[deptName];
      const theme = getDeptTheme(deptName);
      const isLastPage = pageIdx === totalPages - 1;

      return `
    <div class="dept-slip-page ${!isLastPage ? 'page-break' : ''}">
      <div class="receipt-container">
        
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td>
              <div class="org-title">${printLabName}</div>
              <div class="org-subtitle">${printLabSubtitle}</div>
            </td>
            <td class="voucher-title-box">
              <div class="voucher-title" style="color: ${theme.mainColor}; background: ${theme.bgLight}; border-color: ${theme.borderColor};">
                ${deptName} DEPARTMENT [SLIP]
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px; font-weight: 700;">Page ${pageIdx + 1} of ${totalPages}</div>
            </td>
            <td style="width: 54px; text-align: right; vertical-align: middle;">
              <img src="${qrTrackingUrl}" class="qr-box" alt="Dept QR" />
            </td>
          </tr>
        </table>

        <!-- Meta Info -->
        <table class="meta-table">
          <tr>
            <td class="meta-label">Booking No:</td>
            <td class="meta-val" style="color: ${theme.mainColor}; font-size: 12px; font-family: monospace;">${bookingNo}</td>
            <td class="meta-label">Booking Date:</td>
            <td class="meta-val">${bookingDate}</td>
            <td class="meta-label">Department:</td>
            <td class="meta-val" style="color: ${theme.mainColor}; text-transform: uppercase;">${deptName}</td>
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

        <!-- Dept Test Table -->
        <table class="test-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; background: ${theme.mainColor}; border-color: ${theme.mainColor};">Srl</th>
              <th style="width: 85px; background: ${theme.mainColor}; border-color: ${theme.mainColor};">Test Code</th>
              <th style="background: ${theme.mainColor}; border-color: ${theme.mainColor};">Test Description</th>
              <th style="width: 180px; background: ${theme.mainColor}; border-color: ${theme.mainColor};">Specimen / Lab Room Advice</th>
              <th style="width: 100px; text-align: center; background: ${theme.mainColor}; border-color: ${theme.mainColor};">Delivery Date</th>
            </tr>
          </thead>
          <tbody>
            ${testsInDept
              .map(
                (t, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="font-family: monospace; font-size: 10px; color: #475569;">${t.code || t.test_code || `T${1000 + idx}`}</td>
                <td style="font-weight: 700; color: #0f172a;">${t.name || t.test_name || t.testName || t.Descr || 'Diagnostic Investigation'}</td>
                <td style="font-size: 10px; font-weight: 600; color: #0284c7; background: #f0f9ff;">
                  🧪 ${getSpecimenGuidance(t.name || t.test_name || t.Descr || '')}
                </td>
                <td style="text-align: center; font-weight: 600; color: #475569;">${t.delivery_date || 'Same Day'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Lab Technician Notes & Signatures -->
        <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">
              DEPARTMENT TRANSFER SLIP
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
              * Internal slip for Lab Technician & Department processing.
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 10px; color: #475569; font-weight: 700; border-bottom: 1.5px dashed #94a3b8; padding-bottom: 4px; width: 180px; text-align: center; margin-left: auto; margin-bottom: 4px;">
              Technician Signature
            </div>
            <div style="font-size: 8.5px; color: #64748b;">Printed By: <strong>${printedBy}</strong> • SDC Web Portal</div>
          </div>
        </div>

        <!-- Footer Notice -->
        <div class="footer-section">
          <div>
            <div class="footer-notice">Santoshpur Diagnostic Centre & Polyclinic • Departmental Work Slip</div>
            <div style="margin-top: 2px; color: #475569;">* Pls process sample according to protocol. *</div>
          </div>
          <div style="font-size: 8.5px; color: #94a3b8; font-weight: 600;">
            ${deptName} SLIP • ${bookingNo}
          </div>
        </div>

      </div>
    </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Department Work Slips - ${bookingNo}</title>
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
      width: 210mm;
      margin: 0 auto;
    }

    .page-break {
      page-break-after: always !important;
      break-after: page !important;
    }

    .dept-slip-page {
      padding: 6px 10px;
      min-height: 140mm;
    }

    /* Outer Border Box matching rptbookingslip_dep transfer */
    .receipt-container {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 10px 14px;
      position: relative;
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
      font-size: 12px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
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

    /* Itemized Test Table */
    .test-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }

    .test-table th {
      color: #ffffff;
      padding: 5px 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: left;
    }

    .test-table td {
      padding: 5.5px 8px;
      font-size: 10.5px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .test-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* Footer Notes */
    .footer-section {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      margin-top: 10px;
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

    @media print {
      @page {
        size: A5 landscape;
        margin: 4mm 6mm;
      }
      html, body {
        width: 210mm;
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

  ${slipPagesHTML}

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
