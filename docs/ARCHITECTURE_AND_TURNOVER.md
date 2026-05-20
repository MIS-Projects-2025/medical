# Medical Inventory System — Architecture & Turnover Documentation

> **Last Updated:** 2026-05-20
> **Stack:** Laravel 12 + React 18 + Inertia.js
> **Primary Database:** `medical` | **Auth:** Authify SSO | **HRIS:** External API

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Database Schema](#4-database-schema)
5. [Authentication & Session Flow](#5-authentication--session-flow)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Route Structure](#7-route-structure)
8. [Backend Architecture: Controller → Service → Repository](#8-backend-architecture-controller--service--repository)
9. [Feature Workflows (Process Flows)](#9-feature-workflows-process-flows)
   - [9.1 Inventory Management](#91-inventory-management)
   - [9.2 Issuance](#92-issuance)
   - [9.3 Admin Management](#93-admin-management)
   - [9.4 Audit Logs](#94-audit-logs)
   - [9.5 System Maintenance Mode](#95-system-maintenance-mode)
10. [Frontend Architecture](#10-frontend-architecture)
11. [External Service Dependencies](#11-external-service-dependencies)
12. [Environment & Configuration](#12-environment--configuration)
13. [Deployment Checklist](#13-deployment-checklist)
14. [Known Limitations](#14-known-limitations)

---

## 1. System Overview

The **Medical Inventory System** is a web-based internal tool for managing the medical clinic's supply inventory and tracking item issuances to employees. It is built as a single-application system — no separate frontend or mobile app — and is accessed through a browser after authenticating via the company's centralized SSO service (Authify).

**Core capabilities:**
- Track medicines, supplies, and equipment with quantities, brands, units of measure
- Define a **required stock** threshold per item — drives low-stock detection (items at or below 50% of required stock are flagged)
- **Inline and bulk quantity adjustment** (±) directly in the inventory table or via the edit sheet
- Issue items to employees and reduce stock automatically
- View and search full issuance history
- **Bulk Excel/CSV import** with per-session upload tracking and error reporting
- **Export inventory** to Excel (all items or filtered by type)
- **Download import template** pre-populated with valid type values
- **Transaction history** — global log of all quantity changes, grouped by date, filterable by item/user/action/date range (server-side)
- **Per-item change history** — full timeline of every create/update/delete action on a single item
- **Upload history** — record of every bulk import session with item-level drill-down
- **Inventory type management** — admin-configurable item types (Medicine, Supply, Equipment) with badge colors
- Manage admin users who can operate the system
- Audit trail of all inventory changes via the `Loggable` trait
- Maintenance mode to block access during updates

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend framework | Laravel 12 (PHP) | Routes, controllers, services, repositories |
| Frontend framework | React 18 (JSX) | No TypeScript |
| Server-client bridge | Inertia.js | No separate REST API for page rendering |
| Build tool | Vite | Hot module replacement in dev |
| UI components | ShadCN (New York style) + Tailwind CSS + DaisyUI | Custom select/checkbox |
| Date picker | `date-fns` + `@radix-ui/react-popover` + ShadCN Calendar | `DatePicker` component in `Components/ui/` |
| Global state | Zustand | Shared UI state |
| Form handling | react-hook-form | |
| Toasts | Sonner | |
| Excel import/export | Maatwebsite\Excel | |
| Database | MySQL | Three separate logical databases |
| Authentication | Authify (external SSO service) | No local login |
| HTTP client (frontend) | Axios (window.axios) | CSRF auto-handled |
| URL generation | Ziggy | `route('name')` available in React |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│  React 18 + Inertia.js + ShadCN + Tailwind + Zustand           │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP (Inertia / Axios)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LARAVEL APPLICATION                          │
│                                                                  │
│  ┌──────────────┐   ┌────────────────────┐  ┌───────────────┐  │
│  │  Middleware  │   │    Controllers      │  │  Inertia SSR  │  │
│  │  Auth        │──▶│  Inventory         │─▶│  React Pages  │  │
│  │  Admin       │   │  InventoryType     │  └───────────────┘  │
│  │  Inertia     │   │  Issuance          │                      │
│  └──────────────┘   │  Admin / Profile   │                      │
│                     │  Auth              │                      │
│                     └────────┬───────────┘                      │
│                              │                                   │
│                     ┌────────▼───────────┐                      │
│                     │      Services       │                      │
│                     │  InventoryService   │                      │
│                     │  InventoryTypeService│                     │
│                     │  MedicalLogService  │                      │
│                     │  IssuanceService    │                      │
│                     │  SystemStatusService│                      │
│                     │  HrisApiService     │                      │
│                     └────────┬───────────┘                      │
│                              │                                   │
│                     ┌────────▼───────────┐                      │
│                     │    Repositories     │                      │
│                     │  InventoryRepository│                      │
│                     │  InventoryTypeRepo  │                      │
│                     │  MedicalLogRepo     │                      │
│                     │  IssuanceRepository │                      │
│                     │  SystemStatusRepo   │                      │
│                     └────────┬───────────┘                      │
└────────────────────────────┬─┘                                   │
                             │                                     │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌───────────────┐ ┌──────────────────┐
│  MySQL: medical  │ │MySQL:masterlist│ │  MySQL: authify  │
│                  │ │               │ │                  │
│  mdcl_invent    │ │ employee_      │ │ authify_sessions │
│  inventory_types│ │ masterlist     │ │                  │
│  upload_sessions│ └───────────────┘ └──────────────────┘
│  issuances      │
│  issuance_items │         ┌───────────────────┐
│  inventory_reqs │         │  External Services │
│  requestor_tbl  │         │                   │
│  medical_logs   │         │  Authify SSO API  │
│  system_status  │         │  HRIS API         │
│  admin          │         └───────────────────┘
└─────────────────┘
```

### Request Lifecycle

```
Browser Request
      │
      ▼
[AuthMiddleware]
  ├── Has SSO token? ──No──▶ Redirect to Authify login
  ├── Maintenance active? ──Yes──▶ Render Maintenance page (503)
  └── Valid session ──▶ Continue
      │
      ▼
[AdminMiddleware] (admin routes only)
  ├── emp_id in admin table? ──No──▶ Redirect to dashboard
  └── Yes ──▶ Continue
      │
      ▼
[Controller]
  ├── Inertia page request ──▶ Inertia::render() ──▶ React page in browser
  └── JSON data request ──▶ response()->json() ──▶ Axios in React
```

---

## 4. Database Schema

### 4.1 Primary Database (`medical`)

#### `mdcl_invent` — Inventory items
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | Auto-increment |
| med_type | TINYINT | FK to `inventory_types.id` (1=Medicine, 2=Supply, 3=Equipment by default) |
| item_name | VARCHAR | Required |
| brand | VARCHAR | Nullable |
| uom | VARCHAR | Unit of measure (box, vial, piece…) |
| qty | INT | Current stock quantity |
| required_stock | INT (unsigned) | Nullable — minimum stock threshold; drives low-stock badge (low = qty ≤ 50% of this value) |
| date_inserted | DATETIME | Set on creation |
| created_at | TIMESTAMP | Laravel auto |
| updated_at | TIMESTAMP | Laravel auto |

**Triggers audit:** Yes — uses `Loggable` trait

**Stock status logic:**
- `qty = 0` → **Out of Stock**
- `required_stock` is set AND `qty ≤ floor(required_stock × 0.5)` → **Low Stock**
- All other cases (no required_stock, or qty above 50%) → **In Stock**

#### `inventory_types` — Configurable item type definitions
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | Auto-increment |
| name | VARCHAR | e.g. "Medicine", "Supply", "Equipment" |
| color | VARCHAR | Badge variant: `info`, `success`, `warning`, `secondary`… |
| sort_order | INT | Display order |
| is_active | BOOLEAN | Inactive types hidden from UI and validation |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Seeded with 3 defaults: Medicine (info, sort 1), Supply (success, sort 2), Equipment (warning, sort 3).
Shared to all Inertia pages as `inventory_types` via `HandleInertiaRequests`.

#### `upload_sessions` — Bulk import session records
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | Auto-increment |
| uploaded_by_emp_id | VARCHAR | emp_id of uploader |
| uploaded_by_emp_name | VARCHAR | Cached name at upload time |
| file_name | VARCHAR | Original filename |
| created_count | INT | Number of new items created |
| updated_count | INT | Number of existing items updated |
| error_count | INT | Number of rows that failed |
| errors | JSON | Array of error messages per row |
| uploaded_at | DATETIME | When the import ran |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Each log entry created during an import has `related_type = UploadSession::class` and `related_id = session.id`, linking item-level changes back to the upload session.

#### `issuances` — Issuance header records
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | Auto-increment |
| emp_id | VARCHAR | Employee receiving the items |
| emp_name | VARCHAR | Cached name at time of issuance |
| issued_by_emp_id | VARCHAR | Employee who recorded the issuance |
| issued_by_name | VARCHAR | Cached name of issuer |
| issue_date | DATE | Date of issuance |
| notes | TEXT | Nullable remarks |
| status | TINYINT | 1 = completed |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Triggers audit:** Yes

#### `issuance_items` — Line items per issuance
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | |
| issuance_id | BIGINT (FK) | → issuances, cascade delete |
| inventory_id | BIGINT | Soft reference (no FK constraint — preserves history if item deleted) |
| item_name | VARCHAR | Snapshot from inventory at time of issuance |
| brand | VARCHAR | Snapshot |
| uom | VARCHAR | Snapshot |
| med_type | TINYINT | Snapshot |
| qty_issued | INT | Quantity given out |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Triggers audit:** Yes

#### `inventory_requirements` — Headcount-based stock thresholds
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | |
| inventory_id | BIGINT (FK) | → mdcl_invent, cascade delete |
| headcount_threshold | INT | e.g. 600, 2001 |
| required_qty | INT | Minimum stock at this headcount level |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Unique constraint:** (inventory_id, headcount_threshold)

#### `requestor_tbl` — Legacy request/issuance records
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | |
| med_no | VARCHAR | |
| emp_no | INT | Employee number |
| emp_name | VARCHAR | |
| emp_dept | VARCHAR | |
| inventory_id | BIGINT (FK) | → mdcl_invent, restrict delete |
| curr_qty | INT | Stock at time of request |
| issued_qty | INT | Quantity requested |
| date_issued | DATETIME | |
| ack_by | INT | Employee ID who acknowledged |
| assist_by | INT | Employee ID who assisted |
| process_status | TINYINT | 0=Pending, 1=Approved, 2=Issued, 3=Cancelled |

**Triggers audit:** Yes

#### `medical_logs` — Universal audit trail
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | |
| loggable_type | VARCHAR | Fully qualified model class name |
| loggable_id | BIGINT | ID of the affected model |
| action_type | VARCHAR | CREATED, UPDATED, DELETED, RESTORED, **IMPORTED** |
| action_by | VARCHAR | emp_id of the user who triggered the action |
| action_at | DATETIME | Timestamp of the action |
| old_values | JSON | Previous field values (updates only) |
| new_values | JSON | New/full row values |
| remarks | TEXT | Nullable |
| metadata | JSON | Extensible extra context (e.g. `emp_name`) |
| related_type | VARCHAR | Nullable — e.g. `UploadSession` for imported rows |
| related_id | BIGINT | Nullable — e.g. `upload_sessions.id` |

**Action types:**
| Type | When |
|---|---|
| CREATED | Item created individually |
| UPDATED | Any field changed (incl. qty adjustment) |
| DELETED | Item deleted |
| RESTORED | Soft-deleted item restored (if SoftDeletes used) |
| IMPORTED | Item created or updated via bulk upload — always has `related_type/id` pointing to the `UploadSession` |

**Transaction history query:** The transaction history feature filters `medical_logs` where `JSON_EXTRACT(new_values, '$.qty') IS NOT NULL`, joined with `mdcl_invent` for the current item name. This surfaces every qty-changing event across all items.

#### `system_status` — Maintenance mode flag
| Column | Type | Notes |
|---|---|---|
| id | BIGINT (PK) | Always = 1 (single row) |
| status | VARCHAR | `'online'` or `'maintenance'` |
| message | TEXT | Shown to users during maintenance |
| updated_at | TIMESTAMP | |

#### `admin` — Users with admin privileges
| Column | Type | Notes |
|---|---|---|
| emp_id | VARCHAR (PK) | Employee ID from Authify/Masterlist |
| emp_name | VARCHAR | |
| emp_role | VARCHAR | Custom role label |
| last_updated_by | VARCHAR | emp_id of who last modified this record |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### 4.2 External Database: `masterlist`

#### `employee_masterlist` — HR master records (read-only)
| Column | Notes |
|---|---|
| EMPLOYID | Primary key |
| EMPNAME | Full name |
| JOB_TITLE | Job title |
| DEPARTMENT | Department name |
| PRODLINE | Production line |
| STATION | Station ID (station 39 = medical/clinic) |
| DATEHIRED | Hire date |
| EMAIL | Work email |
| PASSWRD | Password (currently plaintext) |
| ACCSTATUS | 1=Active, 2=Inactive |

---

### 4.3 External Database: `authify`

#### `authify_sessions` — SSO session tokens (read-only)
| Column | Notes |
|---|---|
| token | Session token (used as key to verify login) |
| emp_id | Authenticated employee ID |
| emp_name | Full name |
| emp_firstname | First name |
| emp_dept_id | Department ID |
| emp_jobtitle_id | Job title ID |
| emp_prodline_id | Production line ID |
| emp_position_id | Position ID |
| emp_station_id | Station ID — **39 = medical staff** |
| shift_type | Nullable |
| team | Nullable |
| generated_at | Token creation timestamp |
| emp_from | Nullable — if set, access to this app is restricted |

---

## 5. Authentication & Session Flow

This system has **no local login**. Authentication is entirely handled by the external **Authify SSO service**.

### Step-by-Step Flow

```
1. User visits /Medical
        │
        ▼
2. AuthMiddleware checks for token
   Priority: ?key= query param  →  sso_token cookie  →  session
        │
        ├─── No token found
        │         │
        │         ▼
        │    Redirect to: http://127.0.0.1:8001/login?redirect={current_url}
        │    (User logs in on Authify, which redirects back with ?key={token})
        │
        └─── Token found
                  │
                  ▼
3. If token came from session → allow through immediately
        │
        ▼
4. If token came from cookie or query string → validate against authify DB
   SELECT * FROM authify.authify_sessions WHERE token = ?
        │
        ├─── Not found or emp_from is set → Redirect to /unauthorized
        │
        └─── Valid session found
                  │
                  ▼
5. Populate session['emp_data']:
   {
     token, emp_id, emp_name, emp_firstname,
     emp_dept_id, emp_jobtitle_id, emp_prodline_id,
     emp_position_id, emp_station_id,
     shift_type, team, generated_at
   }
        │
        ▼
6. If ?key= was in URL → redirect to clean URL (remove query param)
   Set 7-day sso_token cookie
        │
        ▼
7. Check maintenance mode (system_status table)
   ├── maintenance → render Maintenance page (503)
   └── online → continue to route
        │
        ▼
8. Route accessed. emp_data available in session and Inertia shared props.
```

### Session Data Access in React

Every React page receives `emp_data` and `inventory_types` as shared Inertia props via `HandleInertiaRequests`:

```js
import { usePage } from '@inertiajs/react';

const { emp_data, inventory_types } = usePage().props;

// emp_data.emp_id         → e.g. "10123"
// emp_data.emp_name       → e.g. "Juan Dela Cruz"
// emp_data.emp_station_id → 39 means medical staff

// inventory_types → [{ id: 1, name: 'Medicine', color: 'info', ... }, ...]
```

### Logout Flow

```
User clicks Logout
      │
      ▼
POST /Medical/logout → AuthenticationController@logout
      │
      ├── Read SSO token from cookie or session
      ├── session()->forget() → clear local emp_data
      ├── session()->flush() → destroy entire session
      ├── session()->invalidate() + regenerateToken()
      └── Redirect to: http://127.0.0.1:8001/logout
                (Authify destroys the token server-side)
```

---

## 6. Role-Based Access Control

There are **two dimensions** of access control in this system:

### Dimension 1: Station-Based Access (from SSO)

Determined by `emp_data.emp_station_id` from the Authify session.

| emp_station_id | Role | Capabilities |
|---|---|---|
| **39** | Medical / Clinic Staff | Full access: inventory CRUD, issuance, all records |
| **Other** | General Employee | Read-only: can only view their own issuance records |

### Dimension 2: Admin Role (from `admin` table)

| User Type | Who | Access |
|---|---|---|
| Regular User | Any authenticated employee | Dashboard + station-based access above |
| Admin | emp_id present in `admin` table | + Admin panel: add/remove/edit admins |

### Access Matrix

| Feature | Guest | Non-Station-39 | Station-39 | Admin |
|---|---|---|---|---|
| View dashboard | No | Yes | Yes | Yes |
| View own issuance records | No | Yes | Yes | Yes |
| View all issuance records | No | No | Yes | Yes |
| Create issuance | No | No | Yes | Yes |
| View / manage inventory | No | No | Yes | Yes |
| Qty adjust / bulk edit | No | No | Yes | Yes |
| Import / export inventory | No | No | Yes | Yes |
| View item logs / history | No | No | Yes | Yes |
| View transaction history | No | No | Yes | Yes |
| Manage inventory types | No | No | Yes | Yes |
| Access admin panel | No | No | No | Yes |
| Add/remove/edit admins | No | No | No | Yes |

---

## 7. Route Structure

All routes are prefixed with the value of `APP_NAME` env variable (currently `Medical`).

### Authentication Routes (`routes/auth.php`)

```
POST   /Medical/logout                              auth.logout
GET    /Medical/unauthorized                        auth.unauthorized
```

### General Routes (`routes/general.php`)

```
GET    /                                            → redirect to /Medical
GET    /Medical                                     dashboard.index
GET    /Medical/profile                             profile.index
POST   /Medical/change-password                     profile.changePassword

--- Admin only (AdminMiddleware) ---
GET    /Medical/admin                               admin.index
GET    /Medical/new-admin                           admin.new
POST   /Medical/add-admin                           admin.add
POST   /Medical/remove-admin                        admin.remove
PATCH  /Medical/change-admin-role                   admin.changeRole
```

### Inventory Type Routes (`routes/inventory.php`)

```
GET    /Medical/inventory/types                     inventory.types.index
POST   /Medical/inventory/types                     inventory.types.store
PUT    /Medical/inventory/types/{id}                inventory.types.update
DELETE /Medical/inventory/types/{id}                inventory.types.destroy
```

### Inventory Routes (`routes/inventory.php`)

```
--- Inertia page ---
GET    /Medical/inventory                           inventory.index

--- JSON data endpoints ---
GET    /Medical/inventory/data                      inventory.data
GET    /Medical/inventory/stats                     inventory.stats
GET    /Medical/inventory/export                    inventory.export
GET    /Medical/inventory/template                  inventory.template
GET    /Medical/inventory/upload-history            inventory.uploadHistory
GET    /Medical/inventory/upload-history/{id}/logs  inventory.uploadSessionLogs
GET    /Medical/inventory/transaction-history       inventory.transactionHistory
GET    /Medical/inventory/{id}/logs                 inventory.logs

POST   /Medical/inventory                           inventory.store
POST   /Medical/inventory/bulk-update               inventory.bulkUpdate
POST   /Medical/inventory/bulk-upload               inventory.bulkUpload
PUT    /Medical/inventory/{id}                      inventory.update
DELETE /Medical/inventory/bulk                      inventory.bulkDelete
DELETE /Medical/inventory/{id}                      inventory.destroy
```

### Issuance Routes (`routes/issuance.php`)

```
--- Inertia pages ---
GET    /Medical/issuance                            issuance.index
GET    /Medical/issuance/records                    issuance.records

--- JSON data endpoints ---
GET    /Medical/issuance/employees                  issuance.employees
GET    /Medical/issuance/items                      issuance.items
GET    /Medical/issuance/records/data               issuance.recordsData
POST   /Medical/issuance                            issuance.store
```

---

## 8. Backend Architecture: Controller → Service → Repository

Every feature follows the same three-layer pattern:

```
HTTP Request
    │
    ▼
[Controller]          — Validates request, calls service, returns response
    │
    ▼
[Service]             — Business logic, data transformation, orchestration
    │
    ▼
[Repository]          — All Eloquent queries, no business logic
    │
    ▼
[Model / DB]          — Data, relationships, Loggable trait fires audit logs
```

### Controllers

| Controller | Purpose |
|---|---|
| AuthenticationController | Logout + SSO redirect |
| DashboardController | Dashboard page |
| InventoryController | Full inventory CRUD, import/export, logs, upload history, transaction history |
| InventoryTypeController | CRUD for configurable inventory types |
| IssuanceController | Issuance form, records, employee search |
| AdminController | Admin user management |
| ProfileController | Profile view + password change |

### Services

| Service | Purpose |
|---|---|
| InventoryService | Format items, handle qty adjustments, import orchestration, bulk operations |
| InventoryTypeService | CRUD for inventory types |
| MedicalLogService | Format and paginate logs per item, per upload session, and transaction history |
| IssuanceService | Issue items, search employees, scope records by station |
| SystemStatusService | Read and toggle maintenance mode |
| HrisApiService | HTTP calls to external HRIS API |
| DataTableService | Generic server-side datatable for admin pages |

### Repositories

| Repository | Purpose |
|---|---|
| InventoryRepository | Paginate (with required_stock-aware stock filter), CRUD, upsert batch |
| InventoryTypeRepository | Type list, active types, name-to-id map for imports |
| MedicalLogRepository | Logs per model, logs per upload session, transaction history query |
| IssuanceRepository | Available items, create issuance in a DB transaction |
| SystemStatusRepository | Read/write single `system_status` row |

### Models

| Model | Table | Key Traits | Notes |
|---|---|---|---|
| MdclInvent | mdcl_invent | Loggable | Has `required_stock`; `med_type_label` accessor; stock scopes |
| InventoryType | inventory_types | — | Active scope; `nameToIdMap()` / `idToNameMap()` helpers |
| UploadSession | upload_sessions | — | Has `logs()` relation to MedicalLogs via `related_type/id` |
| Issuance | issuances | Loggable | hasMany IssuanceItem |
| IssuanceItem | issuance_items | Loggable | belongsTo Issuance |
| InventoryRequirement | inventory_requirements | Loggable | belongsTo MdclInvent |
| RequestorTbl | requestor_tbl | Loggable | belongsTo MdclInvent |
| MedicalLogs | medical_logs | — | Polymorphic target for all Loggable models |
| SystemStatus | system_status | — | Single-row maintenance flag |

### The Loggable Trait

Any model that uses `Loggable` automatically writes to `medical_logs` on every create/update/delete/restore. No explicit logging call is needed in controllers or services.

```
Model::create() / update() / delete() called
      │
      ▼
Eloquent fires the corresponding event
      │
      ▼
Loggable::bootLoggable() listener catches it
      │
      ▼
Writes to medical_logs:
  - loggable_type = "App\Models\MdclInvent"
  - loggable_id   = item's ID
  - action_type   = "CREATED" | "UPDATED" | "DELETED"
  - action_by     = session('emp_data.emp_id')
  - action_at     = now()
  - old_values    = changed fields BEFORE (updates only)
  - new_values    = new values / full row
  - metadata      = { emp_name: "..." }
```

**Context injection for batch operations:**

```php
// Before a bulk import batch:
MdclInvent::setLogContext([
    'action_type'  => 'IMPORTED',
    'related_type' => UploadSession::class,
    'related_id'   => $session->id,
]);

// ... upsert rows (each triggers Loggable with the context above)

MdclInvent::clearLogContext();
```

### Quantity Adjustment Logic

When updating an item, callers can send either `qty` (absolute) or `qty_adjust` (relative):

```php
// In InventoryService::update():
if (isset($data['qty_adjust']) && $data['qty_adjust'] !== null) {
    $current     = $this->repository->findOrFail($id);
    $data['qty'] = max(0, $current->qty + (int) $data['qty_adjust']);
}
unset($data['qty_adjust']);
// qty is then written normally, triggering a Loggable UPDATED log
```

This applies to both single-item updates (`PUT /inventory/{id}`) and bulk updates (`POST /inventory/bulk-update`).

### Stock Status Logic

Both the frontend helper and the DB queries use the same rule:

| Condition | Status |
|---|---|
| `qty = 0` | Out of Stock |
| `required_stock` is set AND `qty ≤ floor(required_stock × 0.5)` | Low Stock |
| Everything else (no threshold, or above 50%) | In Stock |

DB equivalent used in `InventoryRepository`:
```sql
-- low:
qty > 0 AND required_stock IS NOT NULL AND qty <= FLOOR(required_stock * 0.5)

-- ok:
qty > 0 AND (required_stock IS NULL OR qty > FLOOR(required_stock * 0.5))
```

---

## 9. Feature Workflows (Process Flows)

### 9.1 Inventory Management

#### 9.1.1 View Inventory

```
User opens /Medical/inventory
      │
      ▼
InventoryController@index → Inertia::render('Inventory/Inventory')
  (inventory_types shared via HandleInertiaRequests)
      │
      ▼
React page mounts → useInventoryData + useInventoryStats hooks run in parallel
      │
      ▼
GET /Medical/inventory/data?page=1&per_page=15
  └── InventoryService::list(filters)
        └── InventoryRepository::paginate(filters)
              ├── search: item_name / brand / uom LIKE
              ├── med_type filter
              ├── stock_status filter (out / low / ok) — uses required_stock-aware SQL
              └── sort + paginate

GET /Medical/inventory/stats (parallel)
  └── InventoryRepository::stats()
        Returns: total, medicine, supply, equipment, low_stock, out_stock
```

**Available filters:**
| Filter | Values | Description |
|---|---|---|
| search | string | Searches item_name, brand, uom |
| med_type | type id | Filters by inventory type |
| stock_status | out, low, ok | Uses `required_stock`-aware threshold |
| sort_by | column name | Any whitelisted column |
| sort_dir | asc, desc | Sort direction |
| per_page | 5–100 | Rows per page |

#### 9.1.2 Add Inventory Item

```
User clicks "Add Item" → InventoryFormSheet opens (empty)
      │
      ▼
Fields: item_name*, type* (dynamic from inventory_types), brand, uom,
        qty* (required on create), required_stock (optional)
      │
      ▼
POST /Medical/inventory
  Body: { item_name, med_type, qty, brand, uom, required_stock }
      │
      ▼
InventoryController@store → validates → InventoryService::create()
  └── MdclInvent::create() → Loggable: CREATED log
      │
      ▼
201 JSON → React: table refetches, stats refresh, sheet closes, toast
```

#### 9.1.3 Edit Inventory Item (Form Sheet)

```
User clicks pencil (amber) icon → InventoryFormSheet opens pre-filled
      │
      ▼
Edit mode shows:
  - Current quantity (read-only display with stock badge)
  - Qty Adjustment field (+/- with live preview of new qty)
  - required_stock field
  - item_name, type, brand, uom fields
      │
      ▼
PUT /Medical/inventory/{id}
  Body: { item_name, med_type, brand, uom, required_stock, qty_adjust? }
      │
      ▼
InventoryService::update() → if qty_adjust provided: new_qty = max(0, current + adj)
  └── MdclInvent::update() → Loggable: UPDATED log (only changed fields)
      │
      ▼
200 JSON → row updated in-place, sheet closes, toast
```

#### 9.1.4 Inline Quick Edit (Table)

```
User clicks blue pencil icon on a row → row enters inline edit mode
      │
      ▼
Editable cells: item_name, type (dropdown), brand, uom, required_stock, qty_adjust
qty column remains read-only (use qty_adjust to modify)
      │
      ▼
User clicks Save (✓) icon
      │
      ▼
PUT /Medical/inventory/{id} → same as form sheet edit
```

#### 9.1.5 Bulk Edit

```
User clicks "Bulk Edit" button in table header
      │
      ▼
All rows enter edit mode simultaneously (blue tint)
Each row has editable cells: item_name, type, brand, uom, required_stock, qty_adjust
      │
      ▼
User edits one or more rows → clicks "Save All Changes"
      │
      ▼
Only rows with actual changes are sent:

POST /Medical/inventory/bulk-update
  Body: { items: [{ id, item_name, med_type, brand, uom, required_stock, qty_adjust? }] }
      │
      ▼
InventoryController@bulkUpdate → InventoryService::bulkUpdate()
  For each item: calls update() individually, collecting errors
      │
      ▼
200 JSON: { updated: N, errors: [...] }
React: table refetches, stats refresh, toast (warning if partial failures)
```

#### 9.1.6 Delete Item(s)

```
Single: click red trash icon → confirm dialog → DELETE /inventory/{id}
Bulk:   select checkboxes → floating BulkActionsBar → "Delete N items"
        → confirm → DELETE /inventory/bulk  Body: { ids: [...] }
```

#### 9.1.7 Bulk Upload (Excel/CSV Import)

```
User clicks Upload icon → BulkUploadModal opens
      │
      ▼
User selects .xlsx / .xls / .csv file (max 10 MB)
      │
      ▼
POST /Medical/inventory/bulk-upload  (multipart/form-data)
      │
      ▼
InventoryController@bulkUpload → InventoryService::import(file)
  ├── InventoryImport (Maatwebsite) reads all rows
  ├── mapImportRow(): maps type name → id, normalises qty / brand / uom
  ├── UploadSession::create() — session record saved first
  ├── MdclInvent::setLogContext({ action_type: 'IMPORTED', related_id: session.id })
  ├── InventoryRepository::upsertBatch(rows)
  │     ├── row has id AND exists → update
  │     └── otherwise → create
  │     Each write fires Loggable with IMPORTED context
  └── MdclInvent::clearLogContext()
  └── UploadSession::update(created, updated, error counts)
      │
      ▼
200 JSON: { created, updated, errors, session_id }
React: table + stats refetch, toast with summary
```

**Expected import columns:** `id` (optional, for updates), `type`, `item_name`, `brand`, `uom`, `qty`

#### 9.1.8 Download Import Template

```
GET /Medical/inventory/template
      │
      ▼
InventoryTemplateExport → generates .xlsx with:
  - Header row with all column names
  - Type column has dropdown validation populated from active inventory_types
      │
      ▼
BinaryFileResponse: inventory_import_template.xlsx
```

#### 9.1.9 Export to Excel

```
User clicks Export icon → dropdown: All Items / Medicine / Supply / Equipment
      │
      ▼
GET /Medical/inventory/export?{current filters + optional med_type override}
      │
      ▼
InventoryExport applies same filters, builds styled Excel
      │
      ▼
Medical_inventory_{type}_{YYYYMMDD}.xlsx downloaded
```

#### 9.1.10 View Change History for an Item

```
User clicks History (violet) icon → LogsDialog opens
      │
      ▼
GET /Medical/inventory/{id}/logs?page=1&per_page=10
  └── MedicalLogService::getForInventoryItem(id, filters)
        └── MedicalLogRepository::getForModel(MdclInvent::class, id)
              Filter: search (user/remarks), action_type
      │
      ▼
Timeline view: CREATED / UPDATED / DELETED / IMPORTED entries
Each shows: action badge, who, when, old→new field values
IMPORTED entries show an "Upload #N" badge linking to the upload session
```

#### 9.1.11 Upload History

```
User clicks Upload History icon (header)
      │
      ▼
UploadHistoryDialog opens
      │
      ▼
GET /Medical/inventory/upload-history?page=1
  └── MedicalLogService::getUploadSessions(filters)
        Returns: session list with created/updated/error counts, uploader, filename

User clicks a session → drill-down
      │
      ▼
GET /Medical/inventory/upload-history/{id}/logs
  └── MedicalLogService::getForUploadSession(id, filters)
        Filters medical_logs WHERE related_type=UploadSession AND related_id={id}
```

#### 9.1.12 Transaction History

```
User clicks Transactions icon (header) → TransactionHistoryDialog opens
      │
      ▼
GET /Medical/inventory/transaction-history?page=1&per_page=25
      │
      ▼
MedicalLogService::getTransactionHistory(filters)
  └── MedicalLogRepository::getTransactionHistory(filters)
        WHERE loggable_type = MdclInvent::class
          AND JSON_EXTRACT(new_values, '$.qty') IS NOT NULL
        LEFT JOIN mdcl_invent for current item_name
        Filters: search (item/user), action_type, date_from, date_to
      │
      ▼
Each record formatted as:
  { item_name, action_type, action_by_name, action_at,
    current_balance (old qty), adjusted_qty (new - old), total_balance (new qty) }
      │
      ▼
Dialog groups results by calendar date (client-side, within paginated page)
Date group header is sticky, shows: date label, transaction count, column labels
Columns: Balance Before → Adjusted Qty → Balance After
```

**Filters (all server-side):**
| Filter | Description |
|---|---|
| search | Matches item name or user name |
| action_type | CREATED / UPDATED / IMPORTED / ISSUED / DELETED |
| date_from | `>=` date (YYYY-MM-DD) |
| date_to | `<=` date (YYYY-MM-DD) |

---

### 9.2 Issuance

#### 9.2.1 Record a New Issuance

```
User navigates to /Medical/issuance (Station-39 only)
      │
      ▼
User selects employee via combobox (debounced search → HRIS API)
User sets Issue Date, optional Notes
User searches available items (qty > 0 only) and adds to cart with qty
User clicks "Submit Issuance"
      │
      ▼
POST /Medical/issuance
  Body: { emp_id, emp_name, issue_date, notes, items: [{inventory_id, qty_issued}] }
      │
      ▼
IssuanceRepository::createIssuance() — inside DB::transaction():
  1. INSERT issuances header
  2. Per item: SELECT FOR UPDATE, check stock, UPDATE qty, INSERT issuance_item
  3. Loggable fires for each write
      │
      ├── Success: 201 → cart clears, toast
      └── Insufficient stock: 422 → error toast, form stays
```

#### 9.2.2 View Issuance Records

```
GET /Medical/issuance/records/data
  └── IssuanceService::listRecords(filters, emp_data)
        Station-39 → all records
        Other      → only records WHERE emp_id = current user
```

---

### 9.3 Admin Management

```
GET  /Medical/admin           → list admins (DataTableService)
GET  /Medical/new-admin       → list employees from masterlist DB
POST /Medical/add-admin       → INSERT into admin table
POST /Medical/remove-admin    → DELETE from admin table
PATCH /Medical/change-admin-role → UPDATE emp_role; refreshes session if self
```

---

### 9.4 Audit Logs

Audit logging is **automatic** via the `Loggable` trait — no controller or service code triggers it.

| Action | old_values | new_values |
|---|---|---|
| CREATED | null | Full row |
| UPDATED | Changed fields before | Changed fields after |
| DELETED | null | null |
| IMPORTED | null (create) or changed fields (update) | New/changed values |

Models with automatic audit logging: `MdclInvent`, `Issuance`, `IssuanceItem`, `InventoryRequirement`, `RequestorTbl`

---

### 9.5 System Maintenance Mode

```
Admin enables maintenance → SystemStatusService::setMaintenance(message)
  └── UPDATE system_status SET status='maintenance', message=?

Next request by any user:
  AuthMiddleware → isInMaintenance() = true → Inertia::render('Maintenance') 503

Bypass routes: /Medical/logout, system-status.online, system-status.maintenance

Admin re-enables → SystemStatusService::setOnline()
  └── UPDATE system_status SET status='online'
```

---

## 10. Frontend Architecture

### File Structure

```
resources/js/
├── app.jsx                              ← App entry, ThemeProvider, Inertia setup
├── bootstrap.js                         ← Axios setup, CSRF, window.axios
├── Components/
│   ├── ui/                              ← ShadCN + custom components
│   │   ├── alert.jsx
│   │   ├── avatar.jsx
│   │   ├── badge.jsx
│   │   ├── button.jsx
│   │   ├── calendar.jsx                 ← Used by DatePicker
│   │   ├── card.jsx
│   │   ├── checkbox.jsx                 ← Custom (no Radix)
│   │   ├── date-picker.jsx              ← DatePicker + MultiDatePicker (date-fns + Popover)
│   │   ├── dialog.jsx
│   │   ├── dropdown-menu.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── popover.jsx                  ← Used by DatePicker
│   │   ├── progress.jsx
│   │   ├── select.jsx                   ← Custom (no Radix)
│   │   ├── separator.jsx
│   │   ├── sheet.jsx                    ← Built on @radix-ui/react-dialog
│   │   ├── skeleton.jsx
│   │   ├── sonner.jsx
│   │   ├── table.jsx
│   │   ├── textarea.jsx
│   │   └── tooltip.jsx
│   ├── sidebar/
│   │   └── Navigation.jsx               ← Nav links (station-aware visibility)
│   ├── AuthenticatedLayout.jsx          ← Shell wrapping all authenticated pages
│   └── Pagination.jsx                   ← Reusable pagination + per-page selector
├── Pages/
│   ├── Dashboard.jsx
│   ├── Inventory/
│   │   ├── Inventory.jsx                ← Main inventory page
│   │   │   Header buttons: icon-only with Tooltip (Refresh, Transactions,
│   │   │   Upload History, Bulk Upload, Export dropdown) + "Add Item" with text
│   │   ├── components/
│   │   │   ├── InventoryStats.jsx       ← Stat cards (total, low, out, by type)
│   │   │   ├── InventoryFilters.jsx     ← Search, type, stock_status filters
│   │   │   ├── InventoryTable.jsx       ← Table with inline edit, bulk edit,
│   │   │   │                              required_stock column, qty_adjust column
│   │   │   ├── StockBadge.jsx           ← Coloured badge (out/low/ok), accepts requiredStock
│   │   │   ├── InventoryFormSheet.jsx   ← Right-side sheet: add/edit form
│   │   │   │                              Edit mode: current qty display + qty_adjust + preview
│   │   │   │                              Both modes: required_stock field
│   │   │   ├── BulkUploadModal.jsx      ← File upload modal with progress
│   │   │   ├── BulkActionsBar.jsx       ← Floating bar when rows are selected
│   │   │   ├── LogsDialog.jsx           ← Per-item change history timeline
│   │   │   ├── UploadHistoryDialog.jsx  ← List of upload sessions + drill-down
│   │   │   └── TransactionHistoryDialog.jsx  ← Global qty transaction history
│   │   │                                 Filters: search, action type, date range (DatePicker)
│   │   │                                 Grouped by date (client), paginated (server)
│   │   ├── hooks/
│   │   │   ├── useInventory.js          ← useInventoryData, useInventoryStats, useInventoryMutations
│   │   │   └── useDebounce.js
│   │   ├── helpers/
│   │   │   └── inventoryHelpers.js      ← getStockStatus, typesToSelectOptions,
│   │   │                                  emptyFormValues, itemToFormValues, etc.
│   │   └── Types/                       ← Inventory type management pages
│   ├── Issuance/
│   │   ├── Issuance.jsx
│   │   ├── IssuanceRecords.jsx
│   │   ├── components/
│   │   │   ├── ItemPicker.jsx
│   │   │   ├── IssuanceCart.jsx
│   │   │   ├── IssuanceTable.jsx
│   │   │   └── IssuanceDetailDialog.jsx
│   │   └── hooks/
│   │       └── useIssuanceRecords.js
│   ├── Admin/
│   │   ├── Admin.jsx
│   │   └── NewAdmin.jsx
│   ├── Profile.jsx
│   ├── Maintenance.jsx
│   └── Unauthorized.jsx
```

### Data Fetching Pattern

Pages render their shell via Inertia, then fetch table data via axios after mount:

```js
// Inside a custom hook
const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
        const { data } = await window.axios.get(route('inventory.data'), {
            params: cleanFilters,
            signal: ctrl.signal,
        })
        setRows(data.data)
        setMeta(data.meta)
    } catch (err) {
        if (!window.axios.isCancel(err)) setError(extractApiError(err))
    }
}, [JSON.stringify(filters)])

useEffect(() => { fetchData() }, [fetchData])
```

**Rules:**
- Always use `window.axios` (never raw `fetch`) — CSRF handled automatically
- Always use Ziggy `route('name')` — never hardcode URL strings
- Always pass `AbortController.signal` to cancel stale requests on filter change

### Stock Status Helper

```js
// inventoryHelpers.js
export function getStockStatus(qty, requiredStock = null) {
    if (qty === 0 || qty == null) return 'out'
    if (requiredStock != null && requiredStock > 0) {
        if (qty <= requiredStock * 0.5) return 'low'
    }
    return 'ok'
}
```

- No `required_stock` set → only `out` (qty=0) or `ok` (qty>0); never `low`
- `required_stock` set → `low` when at or below 50% of threshold

### Shared Inertia Props

`HandleInertiaRequests` shares to every page:

| Prop | Type | Description |
|---|---|---|
| `emp_data` | object | Authenticated employee (id, name, station, dept, etc.) |
| `inventory_types` | array | Active types `[{ id, name, color, sort_order }]` — used in Select options, badge colors, import/export |

### Available ShadCN Components

Only these are installed. Do not import others without first running the ShadCN install command.

`alert` `avatar` `badge` `button` `calendar` `card` `checkbox` `dialog` `dropdown-menu` `input` `label` `popover` `progress` `select` `separator` `sheet` `skeleton` `sonner` `table` `textarea` `tooltip`

> `select.jsx` and `checkbox.jsx` are **custom implementations** — they do not use `@radix-ui/react-select` or `@radix-ui/react-checkbox`.
> `date-picker.jsx` is a custom component built on ShadCN Calendar + Popover with `date-fns`.

---

## 11. External Service Dependencies

### Authify SSO (http://127.0.0.1:8001)

| Endpoint | Used by | Purpose |
|---|---|---|
| /login?redirect= | AuthMiddleware | Redirect unauthenticated users |
| /logout | AuthenticationController | Destroy server-side session token |
| authify DB (direct) | AuthMiddleware | Validate token, read emp_data |

### HRIS API ({HRIS_API_URL})

All calls use the `X-Internal-Key` header for authentication.

| Endpoint | Used by | Purpose |
|---|---|---|
| GET /api/employees/active | IssuanceService | Search active employees for issuance form |
| GET /api/employees/{id} | HrisApiService | Fetch employee name |
| GET /api/employees/{id}/work | HrisApiService | Fetch work details + approvers |
| POST /api/employees/bulk | HrisApiService | Bulk fetch employee info by emp_no |
| POST /api/employees/names/bulk | HrisApiService | Bulk fetch names by emp_id |
| GET /api/employees/direct-reports/{id} | HrisApiService | Fetch direct reports |
| GET /api/employees/operation-director | HrisApiService | Fetch ops director |

---

## 12. Environment & Configuration

### Required `.env` Variables

```env
# Application
APP_NAME=Medical                        # Route prefix (e.g., /Medical/...)
APP_DISPLAY_NAME="Medical Inventory"    # Displayed in UI
APP_TIMEZONE=Asia/Manila                # All timestamps use this timezone
APP_KEY=                                # Laravel app key (php artisan key:generate)

# Primary database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=medical
DB_USERNAME=
DB_PASSWORD=

# Employee masterlist database
MDB_HOST=127.0.0.1
MDB_PORT=3306
MDB_DATABASE=masterlist
MDB_USERNAME=
MDB_PASSWORD=

# Authify SSO database
ADB_HOST=127.0.0.1
ADB_PORT=3306
ADB_DATABASE=authify
ADB_USERNAME=
ADB_PASSWORD=

# SSO
SSO_COOKIE_NAME=sso_token               # Cookie name for persisting SSO token

# External HRIS API
HRIS_API_URL=http://...                 # Base URL of HRIS service
HRIS_API_KEY=                           # Auth key for HRIS API calls
INTERNAL_KEY=                           # Key for service-to-service bypass
```

### Running the Application

```bash
# Install dependencies (first time)
composer install
npm install

# Setup
cp .env.example .env
php artisan key:generate
php artisan migrate

# Start all services (dev)
composer run dev
# This starts: Laravel server + queue worker + log watcher + Vite

# Frontend only
npm run dev

# Build for production
npm run build

# Run tests
php artisan test
```

---

## 13. Deployment Checklist

### First-Time Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Fill all database credentials (mysql, masterlist, authify)
- [ ] Fill `HRIS_API_URL` and `HRIS_API_KEY`
- [ ] Run `php artisan key:generate`
- [ ] Run `composer install --no-dev`
- [ ] Run `npm install && npm run build`
- [ ] Run `php artisan migrate`
- [ ] Ensure Authify service is running on port 8001
- [ ] Ensure HRIS API is reachable at configured URL
- [ ] Manually insert first admin: `INSERT INTO admin (emp_id, emp_name, emp_role, last_updated_by) VALUES (?, ?, 'Admin', ?)`

### Application Server Requirements

- PHP 8.2+
- Composer 2+
- Node.js 18+ / npm
- MySQL 8+
- Web server: Nginx or Apache pointing to `/public`
- `storage/` and `bootstrap/cache/` writable by web server

### Verifying Auth Works

1. Visit `/Medical` in browser
2. Should redirect to `http://127.0.0.1:8001/login?redirect=...`
3. After login, should return with `?key={token}` and land on dashboard
4. `session('emp_data')` should be populated

---

## 14. Known Limitations

| # | Limitation | Impact | Suggested Fix |
|---|---|---|---|
| 1 | No local login — fully dependent on Authify | App unusable if Authify is down | Add fallback local auth or health check page |
| 2 | Masterlist password stored plaintext | Security risk | Migrate to bcrypt hashing |
| 3 | Admin status checked per-request (no cache) | Minor DB overhead | Cache admin list in Redis with TTL |
| 4 | `issuance_items.inventory_id` is a soft reference (no FK) | Orphaned references possible | Acceptable trade-off — preserves history |
| 5 | No soft deletes on inventory | Deleted items unrecoverable | Add `deleted_at` column + SoftDeletes trait |
| 6 | Single maintenance flag — no per-feature flags | Cannot do partial maintenance | Add feature flag table |
| 7 | Excel import date parsing relies on PhpSpreadsheet serial format | Edge cases with non-standard dates | Add explicit date format validation |
| 8 | No automated tests for services/repositories | Regressions harder to catch | Add PHPUnit feature tests |
| 9 | `requestor_tbl` appears to be a legacy table | Unclear if still actively used | Confirm and either document or deprecate |
| 10 | Issuance records non-station-39 scoping only in service layer | If service bypassed, data leaks | Add query scope at model level |
| 11 | `required_stock` is a flat per-item threshold | Does not account for headcount-based requirements already in `inventory_requirements` | Consider consolidating or linking both threshold systems |
| 12 | Transaction history groups by date client-side within a paginated page | A date group can be split across pages | Acceptable for current scale; re-evaluate if per-page grouping becomes confusing |

---

*End of Documentation*
