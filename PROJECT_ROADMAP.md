# Santoshpur Diagnostic Centre & Polyclinic - Application Vision & Future Roadmap

This document records the master roadmap and feature pillars for the Santoshpur Diagnostic Centre Web Application. It will be referenced by the AI assistant in future sessions to suggest next steps, guide module design, and track implementation progress.

---

## 🎯 Master Core Vision

A complete end-to-end **Pathology & Diagnostic Centre ERP & Web Management Portal** covering patient booking, invoicing, diagnostic report generation, doctor & salesman commission/incentive calculations, and comprehensive MIS analytics.

---

## 🗺️ Future Module Roadmap & Feature Pillars

### 1. Pathology Booking & Patient Enrollment (`/booking`) — [STATUS: COMPLETED]
- Patient registration, test search autocomplete, doctor/category selection.
- Financial totals, discount, advance payment, live date/time & saved metadata display.
- Independent database tables (`tbl_web_booking_hdr`, `tbl_web_booking_dtl`, `tbl_web_payments`) starting cleanly at serial `01001` (`BK/26-27/01001`).
- Keyboard-first navigation (Enter key flow, Alt shortcuts).

### 2. Legacy Customer Bills Archive (`/transaction/archive-bills`) — [STATUS: COMPLETED]
- Strict read-only viewer for historical legacy customer invoices (`TBookingHDR`, `TBookingDTL`).
- Patient name, bill no, mobile, and date range search.
- Detail preview modal and legacy receipt printing.
- Strictly isolated from live web billing.

### 3. Part Payment & Final Billing (`/transaction/part-payment`, `/transaction/bill`) — [STATUS: PLANNED]
- Balance due collection against active web bookings.
- Sequential part-payment receipt generation (`RCP/26-27/01001-P1`, `RCP/26-27/01001-P2`).
- Final bill closure and receipt printing.

### 4. Diagnostic Result Entry & Lab Reports (`/lab/result-entry`, `/pending-tests`) — [STATUS: PLANNED]
- Parameter-wise test result entry (Biochemistry, Pathology, Hematology, Microbiology).
- Automatic reference range checking (Normal / High / Low flagging).
- Pathologist digital signature attachment.
- Final clinical diagnostic report printing & PDF export.

### 5. Doctor & Salesman Commission / Percentage System — [STATUS: PLANNED]
- **Doctor Referral Commission:** Test-wise or category-wise percentage calculation for Referred Doctors (`MDoctor`).
- **Salesman / Agent Incentive:** Collector (`MCollector`) & Marketing Executive (`MAgent`) referral volume and percentage tracking.
- Monthly payout register, commission statement, and payout receipt generation.

### 6. Management MIS & Analytics Reports — [STATUS: PLANNED]
- **Userwise Cash Statement:** Daily cash, UPI, card collection per counter operator.
- **Doctorwise Referral Summary:** Total referral volume and business generated per doctor.
- **Department & Category Sales:** Sales volume across Pathology, Radiology, Cardiology, Biochemistry, etc.
- **Pending Test Register:** Laboratory pending work list and dispatch status tracking.

---

## 📌 Note for AI Agent
Whenever the user starts a discussion or asks for suggestions on what to build or refine next, **refer to this roadmap file** and suggest starting with one of the PLANNED modules above (e.g. Doctor Commission Calculation, Diagnostic Result Entry, Part Payment, or MIS Reports).
