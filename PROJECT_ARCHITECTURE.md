# Santoshpur Diagnostic Centre & Polyclinic - Application Architecture & Technical Documentation

This document serves as the authoritative architectural blueprint and technical guide for the Santoshpur Diagnostic Centre Web Application. All future developers and AI coding agents working on this codebase **MUST** strictly adhere to the patterns, rules, and database isolation strategies documented herein.

---

## 🏛️ System Architecture Overview

- **Backend Framework:** Laravel (PHP 8.2+) running on `http://127.0.0.1:8000`
- **Database Engine:** Microsoft SQL Server 2012 Database `DIAGMS`
- **Application Timezone:** `Asia/Kolkata` (`+05:30` IST) — set in `config/app.php` and `.env`
- **Frontend Framework:** Next.js (App Router) running on `http://localhost:3000`
- **Styling Strategy:** Vanilla CSS / CSS Modules with Modern Glassmorphic Design System (No Tailwind CSS)

---

## 🛡️ STRICT DATABASE ISOLATION STRATEGY (CRITICAL RULE)

The application operates with a **strict separation** between the historical legacy customer database and the new live web application billing system:

### 1. New Live Web Billing System
- **Database Tables:** `tbl_web_booking_hdr`, `tbl_web_booking_dtl`, `tbl_web_payments`
- **Serial Numbering:** Starts cleanly at **`1001`** (formatted display: `BK/26-27/01001`).
- **UI Access:** Exclusive to **Booking / Advance** page (`/booking`).
- **CRITICAL RULE:** The `/booking` page and its backend API (`/api/booking/by-no/{serial}`) query **ONLY** `tbl_web_booking_hdr`. They **MUST NEVER** fall back to or query legacy tables (`TBookingHDR`/`TBookingDTL`). If a serial is not found in `tbl_web_booking_hdr`, the API returns a 404 response.

### 2. Legacy Customer Archive System
- **Database Tables:** `TBookingHDR`, `TBookingDTL` (imported from customer's previous software).
- **Serial Format:** Legacy alphanumeric formats (e.g. `H1818`, `F0291`).
- **UI Access:** Exclusive to **Transaction ➔ Archive Bills** (`/transaction/archive-bills`).
- **CRITICAL RULE:** Strictly **Read-Only Archive**. Users can search, view details, and print receipts. No editing, modification, or deletion is permitted.

---

## 🔌 API Routes Reference (`backend/routes/web.php`)

### 1. Web Billing APIs
- `GET /api/booking/init`
  - **Booking page bootstrap — one request instead of four.** Returns `next` (serial, booking_no, fin_year, next_num), `patient_implemented`, `categories` (MCategory), and active `collectors` (MCollector `Status = 1`).
- `GET /api/tests/catalogue`
  - Full test list with GENERAL (`CG1`) rates, same shape as `/api/tests`. Cached server-side for 60 s; the Booking page loads it once, filters in the browser, and refreshes every 5 min.
- `GET /api/booking/next-no`
  - Calculates max `serial_no` from `tbl_web_booking_hdr`.
  - Returns `01001` (`BK/26-27/01001`) if table is empty, or increments by 1.
- `POST /api/booking/save`
  - Inserts new web booking into `tbl_web_booking_hdr`, `tbl_web_booking_dtl`, and `tbl_web_payments`.
- `GET /api/booking/by-no/{serial}`
  - Searches `tbl_web_booking_hdr` for matching serial.
  - Returns line items, net amount, paid amount, `created_at_formatted` (e.g. `21-Aug-2026 07:07 PM`), and `created_by_user`.
  - Returns 404 if not found in web database (Zero legacy fallback).
- `GET /api/booking/recent`
  - Retrieves top 5 recent web bookings from `tbl_web_booking_hdr`.

### 2. Archive Bills APIs
- `GET /api/booking/archive`
  - Paginated search (`search`, `from_date`, `to_date`, `per_page`) across legacy `TBookingHDR`.
- `GET /api/booking/archive/{bookingNo}`
  - Retrieves read-only details of legacy bill from `TBookingHDR` for modal preview and receipt printing.

### 3. Master Data APIs
- `GET/POST/PUT/DELETE /api/master/doctors` (`MDoctor`)
- `GET/POST/PUT/DELETE /api/master/tests` (`MTest`)
- `GET/POST/PUT/DELETE /api/master/categories` (`MCategory`)
- `GET/POST/PUT/DELETE /api/master/patients` (`MPatient`)
- `GET/POST/PUT/DELETE /api/master/departments` (`MDepartment`)
- `GET/POST/PUT/DELETE /api/master/subdepartments` (`MSubDepartment`)
- `GET/POST/PUT/DELETE /api/master/marketing-executives` (`MAgent`)
- `GET/POST/PUT/DELETE /api/master/collectors` (`MCollector`)

---

### 4. Word Report Template APIs (`App\Services\ReportTemplateService`)
- Templates live in `REPORT_TEMPLATE_PATH` (default `backend/storage/app/REPORT_MASTER`, not in git) and are linked to tests by file name (`T<test>_D<variant>_<stamp>.dot`, `U<user>_T<test>_<stamp>.dot`).
- Converted to HTML **once** (MS Word if available, else LibreOffice) and cached in `REPORT_MASTER/_html`, keyed by file content — so the converted copies travel with the folder (git / copy) and **a cloud server needs no Word or LibreOffice to open reports**. Pre-convert all: `php artisan report-templates:warm`.
- Converter chain (best layout first), used **only** when a template has no converted copy yet:
  1. **MS Word** (COM, Windows) — best fidelity, reads legacy `.dot`
  2. **LibreOffice** (`soffice --headless`) — Linux / cloud, reads legacy `.dot`
  3. **PHPWord** (`phpoffice/phpword`) — pure PHP, no OS dependency; `.docx` / `.rtf` well, legacy `.doc`/`.dot` roughly
  A file that one converter cannot handle is retried with the next.
- `GET /api/report-templates/status` reports `converter`, `converters` and `coverage`.
  `php artisan report-templates:check` prints the same on the console; `report-templates:warm` converts what is pending.
- **Uploading or replacing a template converts it immediately** (`convertTemplateNow()`), so the report editor never waits for a converter and never fails later. The response carries `converted` / `convert_error`, and the page warns when the server has no converter.
- `GET /api/report-templates/status` — `word_installed`, `folder_exists`, `linked_tests`.
- `GET /api/report-templates/lookup?codes=T1,T2` — template count per test code.
- `GET /api/report-templates?test_code=` — templates for one test, default first.
- `GET /api/report-templates/content?file=` — `{scope, css, html, page}`; `503 WORD_NOT_INSTALLED` when Word is missing.
- `POST /api/sample-tracking/save-narrative` — saves the filled report to `tbl_web_booking_dtl.narrative_html` **and writes a PDF copy** (see below).

### 5. Report PDF files (`App\Services\ReportPdfService`)
- Every saved report is rendered to PDF with **mpdf/mpdf** (pure PHP — no Word, no wkhtmltopdf, works on a cloud server) and stored at `storage/app/reports/<yyyy-mm>/<booking no>/<test code>_<detail id>.pdf` (never committed to git — patient data).
- Recorded in **`tbl_web_report_files`** (booking id/no, patient code, patient name, mobile no, test, file path/size, created by) and on `tbl_web_booking_dtl.report_pdf_path` / `report_pdf_at`. Table and columns are created automatically on first save.
- `GET /api/lab/report-pdf/{dtlId}` — opens the PDF (`?download=1` to download); generates it on the fly if it is missing.
- **Doctor copy** (the signed hard copy, uploaded from the report editor): `POST /api/lab/doctor-copy` (`id`, `file`) — images are converted to **WebP** and compressed until at least **25% smaller** than the upload (max side 2200 px); PDFs are kept as-is up to **3 MB**. Stored beside the report PDF as `DOCTOR_COPY_<test>_<detail id>.webp|pdf` and recorded in `tbl_web_report_files` with `file_type = DOCTOR_COPY`.
- `GET /api/lab/doctor-copy/{dtlId}` — opens it (`?download=1` to download).
- **The doctor copy is mandatory:** `save-narrative` returns `422 DOCTOR_COPY_REQUIRED` when no `DOCTOR_COPY` row exists for that test line, and the editor blocks Save / Save & Print with the same message.
- `GET /api/lab/report-files?booking_no=&patient_code=&mobile_no=` — every stored file (both types) for a bill or a patient; the list a WhatsApp / email sender will use later.
- PHP needs `extension=gd` (WebP) and `upload_max_filesize` ≥ 4M for the 3 MB PDF limit.

### 5.1 Report letterhead (`App\Services\LetterheadService`)
- One full **A4 portrait image** uploaded in **SetUp → Lab & Report Settings** is the letterhead every report PDF / print is produced on; the app's own header block is then left out.
- Any image format is converted to **WebP** (max 2480 px wide) and stored as `storage/app/settings/letterhead.webp`; the file name is kept in `tbl_web_settings.letterhead_image`, with a disk fallback when the database is unreachable.
- `letterhead_top_mm` / `letterhead_bottom_mm` leave room for the printed header and footer (defaults 45 / 25 mm).
- `GET /api/setup/letterhead`, `POST /api/setup/letterhead`, `POST /api/setup/letterhead/remove`.

### 6. Report Approval (`/lab/report-approval`, module `report_approval`)
- Every written report is shown **next to its doctor copy** (report PDF in one pane, the uploaded WebP/PDF in the other) so they can be matched before approval.
- `GET /api/lab/approval-queue?status=pending|approved|all&search=` — reports with a saved narrative, with `hasDoctorCopy` / `approvedAt`.
- `POST /api/lab/approve-report` (`id`, `approve`, `note`) — approving sets `report_approved_at/by`, the optional note and `test_status = VERIFIED`; `approve=false` sends it back (`RESULT_ENTERED`). Approving without a doctor copy is refused (`422 DOCTOR_COPY_REQUIRED`).
- `GET /api/lab/approval-item/{dtlId}` — one report for the full-tab review page `/lab/report-approval/review?id=`.
- Sending back **requires a comment** (`422` without it); it sets `report_sent_back_at/by` and the comment is shown on the test card in Lab Result Entry, so the report can be corrected and the doctor copy re-uploaded.
- Columns `report_approved_at`, `report_approved_by`, `report_approval_note`, `report_sent_back_at`, `report_sent_back_by` are created automatically on first use.

---

### 8. Notifications (`App\\Services\\NotificationService`, bell + `/notifications`)
- One row per receiver in **`tbl_web_notifications`** (created on first use), so "read" is per user.
- Sent when work moves between people: **REPORT_READY** (a report was saved — to everyone with the `report_approval` module and admins), **REPORT_RESUBMITTED** (a report sent back was corrected and saved again — same receivers), **REPORT_SENT_BACK** (to the user who wrote the report), **REPORT_APPROVED** (to the writer). Nobody is notified about their own action, and `dedupe` stops repeated saves from repeating an unread notification.
- `GET /api/notifications` (`unread=1` for the bell, else a paged list), `POST /api/notifications/read` (`id` for one, empty for all).
- The header bell shows the unread count, refreshes every 60 s, and opening a notification marks it read and jumps to its page. Read ones stay on `/notifications`.
- A report saved after being sent back sets `report_resubmitted_at/by`; the approval list shows a **Corrected** badge and a "corrected and saved again" bar.

---

### 7. Department-wise lab access (server side)
- A user works only in the departments given in **User Management → Departments** (`tbl_web_user_dept_access`); users with role `ADMIN` see everything.
- `userDeptCodes($request)` reads them from the `X-User-Code` header (cached 60 s, cleared when the user is saved); `canWorkOnDtl($request, $dtlId)` compares them with the test's department (`MTest.DeptCode`, else `tbl_web_booking_dtl.dept_code`).
- Enforced on: `sample-tracking/queue` (list), `save-result`, `save-parameter-results`, `save-narrative`, `verify`, `lab/doctor-copy`, `lab/approval-queue` and `lab/approve-report`. A test from another department returns `403 DEPARTMENT_NOT_ALLOWED`.
- A user with **no** department assigned gets an empty worklist and cannot save anything.

---

## 🎨 Frontend Architecture & Layout Guidelines (`frontend/src/`)

### 1. Root Layout Management (`DashboardLayout`)
- `DashboardLayout` in `frontend/src/app/dashboard/layout.js` manages:
  - `<Sidebar>` (Left navigation accordion menu)
  - `<Header>` (Top search bar, title, user menu)
  - `<main className={styles.content}>{children}</main>`
  - `<Footer>` (System online status footer)
- **Sidebar menu** starts with a **Dashboard** direct link (Alt+D, active on `/dashboard`), followed by the groups defined once in `MENU_GROUPS` (`frontend/src/components/Sidebar.js`) — groups, items, permission module keys, badges and keyboard accelerators. Keyboard: menu key (Alt+M Master, Alt+R Transaction, Alt+U SetUp, Alt+O Report Print, Alt+Q Report/Query) opens the menu, then the item's underlined letter opens the page. Letter table: PROJECT_MEMORY.md §3.
- **RULE FOR NEW PAGES:** Route group layouts (e.g. `frontend/src/app/transaction/layout.js`, `master/layout.js`) MUST export `DashboardLayout`. Individual `page.js` files **MUST NOT** render `<Sidebar>`, `<Header>`, or `<Footer>` inside `page.js` to avoid duplicate layout overlays.

### 2. Booking Page Header & Saved Metadata Display
- In `/booking` (`frontend/src/app/booking/page.js`), when an existing booking is loaded:
  - Saved Date, Time, and User details are displayed in **plain white text** right beside **`Booking Summary`** inside `<div className={styles.billingHeader}>`:
    ```jsx
    <div className={styles.billingHeader}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Wallet size={18} />
        <h4>Booking Summary</h4>
      </div>
      {savedBillInfo && (
        <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: '500', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          ( Saved: {savedBillInfo.date} | By: {savedBillInfo.user} )
        </span>
      )}
    </div>
    ```
  - When clicking **Clear Form** or creating a new bill, `savedBillInfo` is reset to `null` so the text disappears.
  - **After Save / Update the page stays on the saved booking** (it does NOT auto-clear). The booking is reloaded from the database via `handleLoadBookingFromExplorer()` — saved date/user, payment receipts, and an empty Received Amount — so the operator can print the receipt or save it as PDF. Focus moves to **Print Receipt**; **New** (`Alt+N`) or **Clear Form** starts the next booking. While a saved booking is on screen the **New** button pulses (`.newBtn[data-attention="true"]`), and it flashes when Alt+N starts a new booking (shared shortcut flash — see PROJECT_MEMORY.md §3). (Replaces the earlier auto-clear behaviour, DEVELOPMENT_LOG §16.)
  - **Save also opens the Booking Receipt in a new tab** with on-screen **Print** / **Close** buttons (hidden when printing; Esc closes). The tab is opened synchronously inside the Save click / shortcut (so pop-up blockers allow it), shows "Saving booking…", and is filled from the saved DB record (`writeSavedBookingReceipt()` → `generateA5BookingReceiptHTML({ ..., autoPrint: false })`). If the save fails the tab is closed. The manual **Print Receipt** button keeps the default `autoPrint: true` (print dialog immediately, tab closes after).

### 3. Alerts & Messages (`AlertDialog`)
- **RULE:** Never use the browser `window.alert()` in pages. Use the shared `showAlert()` from `frontend/src/components/AlertDialog.js` (mounted once as `<AlertProvider>` in `frontend/src/app/layout.js`).
- Types: `warning` · `error` · `success` · `info`. `showAlert()` returns a Promise — chain `.then()` to restore keyboard focus.
- Full usage, options, and conversion status: see [PROJECT_MEMORY.md → Alert Dialog](PROJECT_MEMORY.md#1-alert-dialog-instead-of-windowalert).

---

## 📝 MAINTENANCE & UPDATE LOGGING RULES

Any developer or AI agent modifying or extending this application MUST:
1. Update `e:\SANTOSHPUR\PROJECT_ARCHITECTURE.md` with any new tables, APIs, or architectural decisions.
2. Update `e:\SANTOSHPUR\DEVELOPMENT_LOG.md` with a summary of changes made.
3. Maintain exact adherence to the **Strict Database Isolation Strategy** (New web app = `tbl_web_*` starting at 1001; Old archive = `TBookingHDR`).
4. Follow the shared conventions in [PROJECT_MEMORY.md](PROJECT_MEMORY.md), and record any new reusable component or pattern there.
