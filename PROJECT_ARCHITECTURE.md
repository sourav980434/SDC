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

## 🎨 Frontend Architecture & Layout Guidelines (`frontend/src/`)

### 1. Root Layout Management (`DashboardLayout`)
- `DashboardLayout` in `frontend/src/app/dashboard/layout.js` manages:
  - `<Sidebar>` (Left navigation accordion menu)
  - `<Header>` (Top search bar, title, user menu)
  - `<main className={styles.content}>{children}</main>`
  - `<Footer>` (System online status footer)
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

---

## 📝 MAINTENANCE & UPDATE LOGGING RULES

Any developer or AI agent modifying or extending this application MUST:
1. Update `e:\SANTOSHPUR\PROJECT_ARCHITECTURE.md` with any new tables, APIs, or architectural decisions.
2. Update `e:\SANTOSHPUR\DEVELOPMENT_LOG.md` with a summary of changes made.
3. Maintain exact adherence to the **Strict Database Isolation Strategy** (New web app = `tbl_web_*` starting at 1001; Old archive = `TBookingHDR`).
