# Santoshpur Diagnostic Centre & Polyclinic - Project Memory (Shared Conventions)

This file records reusable **conventions and patterns** that every new or refactored module MUST follow. Developers and AI coding agents should read it together with [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) (technical rules) and [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) (module plan).

When you introduce a new shared component or pattern, add a numbered section below and a row to the index.

---

## 📑 Index

| # | Convention | Applies to | Added |
|---|---|---|---|
| 1 | [Alert Dialog instead of `window.alert()`](#1-alert-dialog-instead-of-windowalert) | All frontend pages | 13-Sep-2026 |
| 2 | [Backend Performance Rules](#2-backend-performance-rules) | All APIs & data-loading pages | 13-Sep-2026 |
| 3 | [Keyboard Shortcut Buttons (underline + flash)](#3-keyboard-shortcut-buttons-underline--flash) | Any button / link with a shortcut | 13-Sep-2026 |

---

## 1. Alert Dialog instead of `window.alert()`

### Rule
**Do not use the browser `alert()`** for validation, success, or error messages. Use the shared modern dialog `showAlert()`.

### Files
- Component: [frontend/src/components/AlertDialog.js](frontend/src/components/AlertDialog.js)
- Styles: [frontend/src/components/AlertDialog.module.css](frontend/src/components/AlertDialog.module.css)
- Mounted once as `<AlertProvider>` (outermost wrapper) in [frontend/src/app/layout.js](frontend/src/app/layout.js) — do not mount it again in pages or route layouts.

### Usage
```jsx
import { useAlert } from '@/components/AlertDialog';

export default function MyPage() {
  const { showAlert } = useAlert();
  const searchRef = useRef(null);

  const showNoTestAlert = () => {
    showAlert({
      type: 'warning',
      title: 'No test selected',
      message: 'Please select at least one test to continue.',
    }).then(() => searchRef.current?.focus());
  };
}
```

### Options
| Option | Values | Default |
|---|---|---|
| `type` | `'warning'` (amber) · `'error'` (red) · `'success'` (green) · `'info'` (blue) | `'info'` |
| `title` | Short heading | Per type (e.g. "Attention required") |
| `message` | Body text | — |
| `okText` | Button label | `'OK'` |

A plain string also works: `showAlert('Saved.')`.

`showAlert()` returns a **Promise** that resolves when the dialog is dismissed — chain `.then()` to move focus to the next field (operators work keyboard-first).

### Built-in behaviour
- **Enter / Esc / Space** dismiss; holding Enter does not auto-dismiss.
- Keystrokes are captured while open, so page-level Enter traversal and Alt+hotkeys do **not** fire behind the dialog.
- Focus moves to OK on open and returns to the previously focused element on close.
- Clicking the dimmed backdrop also dismisses.
- Multiple calls are queued and shown one at a time.
- Uses `globals.css` tokens (`--primary`, `--error`, `--font-sans`, …), so it follows the theme and `.dark` mode; z-index `10000`, rendered via portal to `document.body`.
- `role="alertdialog"` with ARIA labels; animations disabled for `prefers-reduced-motion`.

### Guidelines
- Wrap a message that repeats in several handlers in a small helper — see [booking/page.js](frontend/src/app/booking/page.js): `showNoTestAlert()`, `showNoNameAlert()` (both refocus the field), `showPopupBlockedAlert(documentName)`.
- Pick the type by meaning: missing/invalid input or pop-up blocked → `warning`, failed API call → `error`, saved/updated/collected → `success`.
- Title = short summary (e.g. "Required field", "Save failed", "Booking saved"); message = the detail.
- Do **not** put code that must run *after* the user reads the message directly below `showAlert()` — put it in `.then()` (unlike native `alert()`, it does not block).
- `confirm()` dialogs are not covered yet; keep them native until a shared confirm dialog is added here.

### Note: lucide-react icon names
The project uses **lucide-react v1.23**. Its canonical names are the new ones — `TriangleAlert`, `CircleCheck`, `CircleX`, `CircleAlert`, `Info` — and **new code should use these**. Older names already used in some pages (`AlertTriangle`, `CheckCircle`, `CheckCircle2`, `AlertCircle`) still resolve as aliases, so existing imports do not need changing.

### Conversion status
**✅ Complete (13-Sep-2026)** — all 41 `window.alert()` calls in the app were converted.

| Area | Calls | Types used |
|---|---|---|
| Booking (`/booking`) | 20 | warning (no test / no name / pop-up blocked / no booking), error (load, save, invoice), success (booking saved / updated) |
| Final Invoice (`/transaction/invoice`) | 5 | success (balance collected), warning, error |
| Archive Bills (`/transaction/archive-bills`) | 1 | warning (pop-up blocked) |
| Masters (doctors, tests, categories, departments, sub-departments, patients, collectors, marketing executives) | 9 | warning (required field) |
| Lab (sample tracking, verification) & Pending Test Register | 5 | error |
| Session (`AuthContext` inactivity logout) | 1 | warning ("Signed out") |

The only remaining `window.alert()` is the fallback inside `AlertDialog.js`, used if a component renders outside `<AlertProvider>`. Do not add new `alert()` calls.

---

## 2. Backend Performance Rules

### Why these rules exist
- The backend runs on `php artisan serve` (PHP built-in server), which handles **one request at a time** — multiple workers (`PHP_CLI_SERVER_WORKERS`) are not supported on Windows. Parallel requests from a page **queue behind each other**.
- The SQL Server database is **remote** (reached over the internet). Every SQL query costs **≈ 80 ms** of round-trip time, even a `SELECT 1`.
- So response time ≈ PHP overhead + (number of queries × ~80 ms), and page load ≈ sum of all its requests.

### Rules
1. **OPcache must be enabled** in the PHP used by the backend (`D:\php84\php.ini` on the office PC). Without it PHP recompiles Laravel on every request (~600 ms each).
   ```ini
   zend_extension=opcache
   opcache.enable=1
   opcache.enable_cli=1          ; required - artisan serve is the CLI SAPI
   opcache.memory_consumption=256
   opcache.interned_strings_buffer=32
   opcache.max_accelerated_files=30000
   opcache.validate_timestamps=1
   opcache.revalidate_freq=2     ; code edits are picked up within 2 s
   realpath_cache_ttl = 600
   ```
2. **One bootstrap request per screen.** Combine the data a page needs on load into a single endpoint (pattern: `GET /api/booking/init`) instead of firing several requests from `useEffect`.
3. **Minimise queries per request.**
   - Do not run `count()` and then `first()` — fetch `take(2)` once when you only need none / single / multiple.
   - Do not use `COUNT(*)` to test for existence — use `SELECT TOP 1 1`.
   - Cache rarely-changing checks with Laravel `Cache` (file store). Example: `patientTableReady()` in `routes/web.php` (positive result cached 10 min, cleared by the patient migration routes).
4. **Small, rarely-changing lists → load once, filter in the browser.** Example: the test catalogue (`GET /api/tests/catalogue`, 1,283 rows) is cached server-side for 60 s, loaded once by the Booking page, refreshed every 5 min, and searched instantly client-side, with `/api/tests?search=` as fallback. Large tables (patients 162k, doctors 11k) stay server-side.
5. **Every debounced search must use `AbortController`** and ignore `AbortError`, so a slow older response cannot overwrite newer results.
6. **No DDL on the customer database without approval** (indexes, table changes). With ~80 ms network latency per query, reducing round-trips gives far more benefit than indexes.

### Measured results — Booking page (13-Sep-2026)
| Request | Before | After |
|---|---|---|
| Backend baseline `/up` (no DB) | 625 ms | **80 ms** (OPcache) |
| Page-load data (was 4 queued requests) | ~3,000 ms | **~400 ms** (`/api/booking/init`) |
| Test search while typing | 912 ms per search | **instant** (client-side catalogue) |
| Patient name search | 1,003 ms | **~370 ms** |
| Patient phone search | 1,471 ms | **~270 ms** |
| Load booking by number | 956 ms | **~440 ms** |

### Further options (not done — need a decision)
- Run the frontend as a production build (`next build` + `next start`) instead of `next dev`: pages compile once instead of on demand. Requires a build step after every code update.
- Replace `php artisan serve` with a multi-process server (e.g. Apache/Nginx + PHP-FPM/CGI) so requests no longer queue.

---

## 3. Keyboard Shortcut Buttons (underline + flash)

### Rule
Every button or link that has a keyboard shortcut must:
1. **Underline the shortcut letter** in its label with `<ShortcutLabel>` — no "ALT+S" badges (removed earlier at the user's request).
2. **Flash when the shortcut is pressed** — tag the element with `data-shortcut="<ID>"` and call `flashShortcut('<ID>')` in the key handler. A mouse click does not flash (the click is its own feedback).

### Files
- Helpers: [frontend/src/components/ShortcutLabel.js](frontend/src/components/ShortcutLabel.js) — `ShortcutLabel`, `flashShortcut`, `formatShortcut`, `getShortcutLetter`
- Animation: `.shortcut-flash` in [frontend/src/app/globals.css](frontend/src/app/globals.css) (yellow burst, 0.7 s; outline only for `prefers-reduced-motion`)
- Shortcut definitions: `DEFAULT_SHORTCUTS` in [frontend/src/context/HotkeyContext.js](frontend/src/context/HotkeyContext.js) (customisable ones can be changed on `/shortcuts`)

### Usage
```jsx
import { ShortcutLabel, flashShortcut, formatShortcut } from '@/components/ShortcutLabel';
const { shortcuts } = useHotkeys();

// Label follows the configured key (Alt+s -> "Save Booking" with S underlined)
<button data-shortcut="SAVE_VOUCHER" title={`Save Booking (${formatShortcut(shortcuts.SAVE_VOUCHER.key)})`}>
  <ShortcutLabel text="Save Booking" combo={shortcuts.SAVE_VOUCHER.key} />
</button>

// In the keydown handler
if (combo === shortcuts.SAVE_VOUCHER.key) {
  e.preventDefault();
  flashShortcut('SAVE_VOUCHER');
  handleSave();
}
```

### Guidelines
- Use the configured key (`shortcuts.X.key`) for customisable shortcuts so the underline moves if the shortcut is changed; fixed shortcuts may pass a literal combo (`combo="Alt+n"`). If the letter is not in the label, no underline is shown (the tooltip still shows the combo).
- Put `data-shortcut` on an element whose **className does not change** as a result of the same action — React re-render resets `className` and would cut the flash. For conditional styling use a `data-*` attribute (example: New button pulse uses `data-attention`).
- Use the `DEFAULT_SHORTCUTS` action key as the `data-shortcut` ID. A new page shortcut should be added to `DEFAULT_SHORTCUTS` (`locked: false`) so it appears on `/shortcuts` and can be re-assigned — do not hard-code `e.altKey && e.key === 'x'` checks.
- Shortcut IDs in use:

  | ID | Default | Target |
  |---|---|---|
  | `NEW_BOOKING` | Alt+N | Booking → **New** button |
  | `OPEN_BOOKING_LIST` | Alt+L | Booking → **Booking List** button |
  | `SAVE_VOUCHER` | Alt+S | Booking → **Save Booking** |
  | `PRINT_INVOICE` | Alt+P | Booking → **Print Receipt** |
  | `CLEAR_FORM` | Alt+C | Booking → **Clear Form** |
  | `FOCUS_TEST_SEARCH` | Alt+F | Booking → test search box wrapper |
  | `GOTO_DASHBOARD` | Alt+D (locked) | Sidebar → **Dashboard** menu item (and the logo link) |
  | `GOTO_BOOKING` | Alt+B (locked) | Sidebar → **Booking / Advance** |
  | `GOTO_PENDING` | Alt+T (locked) | Sidebar → **Pending Test Register** |
  | `MENU_MASTER` | Alt+M (locked) | Sidebar → opens **Master** menu (letter mode) |
  | `MENU_TRANSACTION` | Alt+R (locked) | Sidebar → opens **Transaction** menu |
  | `MENU_SETUP` | Alt+U (locked) | Sidebar → opens **SetUp** menu |
  | `MENU_PRINT` | Alt+O (locked) | Sidebar → opens **Report Print** menu |
  | `MENU_QUERY` | Alt+Q (locked) | Sidebar → opens **Report/Query** menu |

### Sidebar menu accelerators (menu key, then letter)
Like the customer's old desktop software (`&Master`, `&Transaction`): press the menu key to open a sidebar menu — its header flashes, the items' letters are highlighted and a hint shows — then press the underlined letter to open that page (the item flashes). **Esc** or a mouse click cancels. Letter mode captures keys, so the letter is not typed into a focused input; it does nothing while a dialog is open.

| Menu (key) | Items → letter |
|---|---|
| **Dashboard** (Alt+D) | Direct link at the top of the sidebar — opens the Dashboard immediately (no letter step) |
| **Master** (Alt+M) | Doctor List **D** · Test Rate List **T** · Category List **C** · Patient List **P** · Department Details **E** · Sub Department **S** · Marketing Executive **M** · Collector Details **L** |
| **Transaction** (Alt+R) | Booking / Advance **B** · Archive Bills **A** · Bill / Invoice **I** |
| **SetUp** (Alt+U) | Lab & Report Settings **L** · User Management **U** · Permission Matrix **P** · System Audit Trail **A** · Configure Shortcuts **C** |
| **Report Print** (Alt+O) | (coming soon — no letters yet) |
| **Report/Query** (Alt+Q) | Sample Tracking **S** · Lab Result Entry **R** · Pathology Verification **V** · Pending Test Register **T** |

**Adding a sidebar page:** add it to `MENU_GROUPS` in [components/Sidebar.js](frontend/src/components/Sidebar.js) with a `letter` that is unique inside its group and appears in the label (and `module` for permission). The expanded menu, collapsed flyout, underline, tooltip and keyboard handling all come from that one entry.
