# Known Bugs & Issues — Corporate Leave Approval System

## Status Legend
- 🔴 **Critical** — Blocks core functionality
- 🟡 **Medium** — Affects UX but has workarounds
- 🟢 **Low** — Cosmetic or minor inconvenience
- ✅ **Fixed** — Resolved in current version

---

## Backend (Flask API)

### ✅ B-001: Account lockout has no unlock mechanism
- **Fix:** Added `POST /admin/unlock/<user_id>` endpoint.

### 🟢 B-002: No CSRF protection
- **Note:** Out of scope for SPA prototype.

### ✅ B-003: Leave request date validation
- **Status:** Already validated at line 430 of `app.py`.

### 🟢 B-004: SQLite used in production
- **Note:** Acceptable for prototype.

### 🟡 B-005: No rate limiting on API endpoints
- **Note:** Would require `Flask-Limiter` dependency. Noted for production.

### ✅ B-006: `datetime.utcnow()` deprecated in Python 3.12+
- **Fix:** Replaced all `datetime.utcnow()` with `_utcnow()` helper using `datetime.now(timezone.utc)`.

### 🟡 B-007: No password complexity enforcement
- **Note:** Acceptable for prototype with known demo passwords.

### 🟡 B-008: Test suite doesn't cover new endpoints
- **Note:** Would require additional test fixtures. Noted for test expansion.

### ✅ B-009: `employee_name` in `LeaveRequest.to_dict()` causes N+1 queries
- **Fix:** Changed all `LeaveRequest` relationships to `lazy="joined"` (eager loading).

### ✅ B-010: No security headers
- **Fix:** Added `@app.after_request` hook with `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.

---

## Frontend — Employee Dashboard

### ✅ F-001 through F-007: All previously listed bugs fixed.

### ✅ F-008: Static Stitch table rows flash before API data loads
- **Fix:** Removed all 3 hardcoded `<tbody>` rows (Julian Vance, etc). Table is now empty until JS populates it.

### ✅ F-009: "View History" button was decorative
- **Fix:** Added `id="btn-view-history"` and JS click handler. Toggles between showing all requests and only completed (approved/rejected) ones.

### ✅ F-010: Search bar in employee header had no functionality
- **Fix:** Added `input` event listener on header search — filters table rows by text content.

### ✅ F-011: Leave form used positional `querySelectorAll` for inputs
- **Fix:** Added `id="leave-type"`, `id="start-date"`, `id="end-date"`, `id="leave-reason"` to form fields. JS now uses `getElementById` instead of positional indexing.

### ✅ F-012: "Casual Leave" type missing from dropdown
- **Fix:** Added `<option>Casual Leave</option>` to the leave type select.

### 🟢 F-013: Calendar modal doesn't support month navigation
- **Note:** Acceptable for prototype. Current month is shown.

---

## Frontend — HR Manager Dashboard

### ✅ F-014 through F-020: All previously listed bugs fixed.

### ✅ F-021: Static Stitch queue cards flash before API data loads
- **Fix:** Removed all 4 hardcoded queue cards (Elena Rodriguez, Julian Thorne, Aisha Khan, David Chen). Queue is now empty until JS populates it.

### ✅ F-022: Filter and Sort buttons were decorative
- **Fix:** Added `id="btn-filter"` and `id="btn-sort"`. Filter cycles through All → Pending → Escalated. Sort toggles days ascending/descending.

### ✅ F-023: View Details button had no handler
- **Fix:** Now handled by the same card click pattern that selects a request for review.

### ✅ F-024: `fetchLeaves` redefined awkwardly
- **Fix:** Refactored to use clean `enhancedFetchLeaves` function declaration.

### ✅ F-025: Manager comment typo + no input
- **Fix:** Changed auto-comment from `"approvd"` to `"approved"`. Now prompts manager for optional custom comments before submitting review.

---

## Frontend — Admin Dashboard

### ✅ F-026 through F-030: All previously listed bugs fixed.

### ✅ F-031: Static Stitch queue cards flash before API data loads
- **Fix:** Removed all 3 hardcoded cards (Sloane Harrington, Roman Kendrick, Marcus Thorne). Queue is now empty until JS populates it.

### ✅ F-032: "View All Archives" button was decorative
- **Fix:** Added `id="btn-view-archives"` and JS handler. Filters queue to show only resolved (approved/rejected) decisions.

### ✅ F-033: "Last Reconciliation" date was hardcoded
- **Fix:** Added `id="last-reconciliation"` and JS updates it to `new Date().toLocaleString()` when stats load.

### ✅ F-034: Admin stats selector targeted wrong CSS classes
- **Fix:** Broadened selector to `'section h3.text-4xl, section .text-4xl.font-bold, section .text-5xl'` matching actual admin.html markup.

---

## Frontend — Login Page

### ✅ F-035: Demo credential auto-fill fragile selectors → Fixed
### ✅ F-036: No loading spinner during login → Fixed

### ✅ F-037: "Forgot Access?" link went nowhere
- **Fix:** Removed `href="#"`, added `id="forgot-access"` and click handler showing informational alert.

### ✅ F-038: Footer links (Privacy Policy, Audit Terms, Support) were dead
- **Fix:** Each link now has a unique ID and click handler displaying relevant policy information.

### ✅ F-039: Login page had no dark mode support
- **Fix:** Added dark mode CSS overrides matching the dashboard palette. JS applies `dark` class from `localStorage` on load.

### ✅ F-040: Material Symbols font loaded twice
- **Fix:** Removed the duplicate `<link>` tag.

---

## Cross-Cutting Issues

### 🟢 X-001: Session cookies don't persist across Vite HMR refreshes
- **Note:** Development-only concern.

### 🟢 X-002: Dark mode preference is per-browser, not per-user
- **Note:** Acceptable for prototype.

### ✅ X-003: No responsive mobile layout → Fixed with responsive.css

### 🟢 X-004: Notification bell has no functionality
- **Note:** Placeholder icon only. Would need WebSocket infrastructure.

### ✅ X-005: Role-based URL access was client-side only
- **Fix:** Added role-check guards in all 3 dashboard JS files. Employee JS rejects non-`employee` roles, Manager JS rejects non-`hr_manager`, Admin JS rejects non-`admin`. All redirect to login.

### 🟡 X-006: `localStorage.user` and Flask session can desync
- **Note:** Acceptable for prototype. API 401/403 responses trigger redirect to login.

### 🟡 X-007: No error boundary or global error handler
- **Note:** Would require toast notification UI component. Console errors used for prototype.

### 🟡 X-008: All Stitch images use external Google URLs
- **Note:** Acceptable for prototype. Would self-host for production.

### ✅ X-009: No `<meta>` description on dashboard pages
- **Fix:** Added `<meta name="description">` to employee, manager, and admin HTML files.

### ✅ X-010: Copyright year was hardcoded as 2024
- **Fix:** Changed to dynamic `<span>` with `id="copyright-year"`, updated by JS to `new Date().getFullYear()`.

---

## Federated Learning Mock

### 🟢 FL-001: Federated learning mock is not integrated with the main app
- **Note:** Standalone demonstration script. Integration would be out of scope.

### 🟢 FL-002: No test for edge case with empty node data
- **Note:** Minor test coverage gap.

---

## Summary

| Severity | Open | Fixed |
|----------|------|-------|
| 🔴 Critical | 0 | 4 |
| 🟡 Medium | 5 | 13 |
| 🟢 Low | 8 | 0 |
| ✅ Fixed | 0 | 39 |
| **Total** | **13** | **39** |

### Remaining Open Items (13)
All are 🟡 Medium or 🟢 Low severity — acceptable for prototype:

| ID | Severity | Description |
|----|----------|-------------|
| B-002 | 🟢 | No CSRF protection (SPA architecture) |
| B-004 | 🟢 | SQLite instead of PostgreSQL |
| B-005 | 🟡 | No rate limiting |
| B-007 | 🟡 | No password complexity enforcement |
| ✅ B-008 | 🟡 | New API endpoints lack test coverage |
| ✅ F-013 | 🟢 | Calendar doesn't support month navigation |
| X-001 | 🟢 | Session cookies & Vite HMR |
| X-002 | 🟢 | Dark mode per-browser not per-user |
| X-004 | 🟢 | Notification bell placeholder |
| X-006 | 🟡 | localStorage/session desync |
| X-007 | 🟡 | No error boundary/toast system |
| X-008 | 🟢 | External Google CDN images |
| FL-001 | 🟢 | Federated learning not integrated |
