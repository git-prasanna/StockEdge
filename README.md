# StockSense — Modular Inventory Management System (IMS)

StockSense is an enterprise-grade, modular web application designed to replace fragile paper registers and spreadsheets with a centralized, real-time stock tracker. It provides multi-facility tracking, discrete storage bay topologies, order workflows (Receipts, Deliveries, Transfers, Adjustments), and an immutable, append-only **Stock Ledger** as the single source of truth for all quantity variances.

---

## Key Features

1. **Enterprise Authentication & Account Management**
   - User signup and login with role/department attribution.
   - OTP-based password reset workflow with security expiration.
   - Session persistence and one-click demo credentials for evaluation.

2. **Real-Time Operational Dashboard**
   - KPI metrics: Total Catalog Items, Low/Out of Stock alerts, Pending Goods Inward Receipts, Pending Outbound Deliveries, and Scheduled Internal Transfers.
   - Dynamic document filters: Filter by document type (`RECEIPT`, `DELIVERY`, `INTERNAL_TRANSFER`, `ADJUSTMENT`), status (`Draft`, `Waiting`, `Ready`, `Done`, `Canceled`), warehouse facility, and category.
   - Live activity stream powered directly by the append-only stock ledger.

3. **Product Master & Reordering Rules**
   - SKU, barcode/EAN, category, unit of measure, cost/sale valuation.
   - Reordering rules: Min Safety Stock, Reorder Point, Max Bay Capacity, Supplier Lead Time.
   - Per-location availability breakdown across all warehouses, zones, racks, and shelves.
   - Automatic low-stock alerting with 1-click replenishment receipt generation.

4. **Inbound Receipts (Goods In)**
   - Draft receipts with vendor details and line item quantities.
   - Validation automatically receives items into the target bay and appends an audit record to the Stock Ledger.

5. **Outbound Delivery Orders (Goods Out)**
   - Full logistics lifecycle: `Draft` → `Waiting` → `Pick Items` → `Pack & Stage` → `Validate & Dispatch`.
   - Strict availability guardrails: prevents negative stock allocations without explicit physical adjustments.

6. **Internal Stock Transfers**
   - Relocate inventory between warehouses or between racks within the same facility.
   - Preserves total company stock while updating per-location balances and writing movement logs.

7. **Physical Stock Adjustments (Cycle Count Reconciliation)**
   - Selects facility and rack location, automatically retrieves theoretical ledger balance.
   - User inputs physical counted count; system auto-computes the variance delta (`+` surplus or `-` deficit).
   - Enforces an explicit adjustment reason (e.g., Cycle Count, Damaged Scrap, Found Stock, Shrinkage).

8. **Append-Only Stock Ledger (Audit Trail)**
   - The authoritative single source of truth for every stock variance.
   - Tracks timestamp, reference #, SKU, source/target bay, quantity delta, balance after, operator, and reason.
   - 1-click CSV audit export for compliance reporting.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│             StockSense React 19 Frontend               │
│  (Tailwind CSS v4, Lucide Icons, Modular Components)   │
└───────────────────────────┬────────────────────────────┘
                            │ /api/* REST Requests
┌───────────────────────────▼────────────────────────────┐
│              Express.js Application Server             │
│        (Vite Middleware in Dev / Static in Prod)       │
└───────────────────────────┬────────────────────────────┘
                            │ SQL Queries & Persistence
┌───────────────────────────▼────────────────────────────┐
│               Local SQLite Database Engine             │
│            (sql.js WebAssembly / Disk Synced)          │
│               File: data/stocksense.sqlite             │
└────────────────────────────────────────────────────────┘
```

---

## Database Schema (Normalized Relational Model)

### 1. `users`
- `id` (TEXT, PK): Unique user identifier (`usr_...`).
- `name` (TEXT): Operator's full name.
- `email` (TEXT, UNIQUE): Login email address.
- `password_hash` (TEXT): Password string / hash.
- `role` (TEXT): e.g., 'Head of Logistics', 'Inventory Manager'.
- `department` (TEXT): Department name.
- `created_at` (TEXT): ISO 8601 timestamp.

### 2. `password_resets`
- `id` (TEXT, PK): Unique reset identifier.
- `email` (TEXT): Associated account email.
- `otp` (TEXT): 6-digit numeric verification code.
- `expires_at` (TEXT): Expiration timestamp (15 min window).
- `used` (INTEGER): Flag (0 or 1).
- `created_at` (TEXT): ISO 8601 timestamp.

### 3. `warehouses`
- `id` (TEXT, PK): Unique warehouse identifier (`wh_main`, `wh_north`, etc.).
- `code` (TEXT, UNIQUE): Facility code (`WH-MAIN`, `WH-NORTH`).
- `name` (TEXT): Facility name.
- `address` (TEXT): Physical location.
- `contact_person` (TEXT): Facility manager name.
- `phone` (TEXT): Contact phone.
- `is_active` (INTEGER): Active flag (1 or 0).
- `created_at` (TEXT): ISO 8601 timestamp.

### 4. `locations`
- `id` (TEXT, PK): Bay identifier (`loc_...`).
- `warehouse_id` (TEXT, FK): Warehouse reference.
- `code` (TEXT): Bay code (`MAIN/STORAGE-A1`, `MAIN/INBOUND`).
- `name` (TEXT): Descriptive bay name.
- `type` (TEXT): `internal`, `inbound`, `outbound`, `transit`, `scrap`.
- `zone` (TEXT): Facility zone.
- `rack` (TEXT): Storage rack code.
- `shelf` (TEXT): Shelf level.
- `created_at` (TEXT): ISO 8601 timestamp.

### 5. `products`
- `id` (TEXT, PK): Unique product identifier (`prod_...`).
- `name` (TEXT): Commercial product name.
- `sku` (TEXT, UNIQUE): Unique Stock Keeping Unit (`SKU-IOT-8802`).
- `barcode` (TEXT): EAN-13 / UPC barcode.
- `category` (TEXT): Product classification category.
- `unit_of_measure` (TEXT): Units, Boxes, Rolls, Kg, Meters.
- `cost_price` (REAL): Procurement / manufacturing cost.
- `sale_price` (REAL): Outbound catalog price.
- `min_stock` (REAL): Minimum safety stock buffer.
- `reorder_point` (REAL): Level triggering automatic replenishment alert.
- `max_stock` (REAL): Maximum bay storage ceiling.
- `lead_time_days` (INTEGER): Vendor fulfillment lead time.
- `description` (TEXT): Specs and storage notes.
- `created_at`, `updated_at` (TEXT): Timestamps.

### 6. `stock_levels`
- `id` (TEXT, PK): Stock level cache ID.
- `product_id` (TEXT, FK): Product reference.
- `warehouse_id` (TEXT, FK): Warehouse reference.
- `location_id` (TEXT, FK): Location bay reference.
- `quantity` (REAL): Physical quantity on hand in this bay.
- `reserved_quantity` (REAL): Quantity allocated to pending deliveries.
- `updated_at` (TEXT): Last variance timestamp.
- *UNIQUE constraint on `(product_id, warehouse_id, location_id)`.*

### 7. `operations`
- `id` (TEXT, PK): Document identifier (`op_rec_...`, `op_del_...`).
- `op_type` (TEXT): `RECEIPT`, `DELIVERY`, `INTERNAL_TRANSFER`, `ADJUSTMENT`.
- `reference_no` (TEXT, UNIQUE): e.g. `REC-2026-0001`, `DEL-2026-0001`.
- `partner_name` (TEXT): Supplier (Receipt) or Customer (Delivery).
- `source_warehouse_id`, `source_location_id` (TEXT, FK).
- `dest_warehouse_id`, `dest_location_id` (TEXT, FK).
- `status` (TEXT): `Draft`, `Waiting`, `Ready`, `Done`, `Canceled`.
- `picking_status` (TEXT): `Pending`, `Picked`, `Packed`, `Dispatched`.
- `scheduled_date` (TEXT): Planned execution date.
- `adjustment_reason` (TEXT): Reason code for physical count audits.
- `notes` (TEXT): Operator notes / tracking info.
- `created_by` (TEXT): Operator username.
- `validated_at` (TEXT): Completion timestamp.
- `created_at`, `updated_at` (TEXT): Timestamps.

### 8. `operation_lines`
- `id` (TEXT, PK): Line item identifier.
- `operation_id` (TEXT, FK): Parent operation.
- `product_id` (TEXT, FK): Product reference.
- `demand_qty` (REAL): Requested / ordered quantity.
- `done_qty` (REAL): Processed / received / counted quantity.
- `unit_price` (REAL): Line unit cost or price.
- `notes` (TEXT): Line notes.

### 9. `stock_ledger` (Append-Only Immutable Ledger)
- `id` (TEXT, PK): Ledger transaction identifier (`led_...`).
- `timestamp` (TEXT): Exact execution timestamp.
- `operation_id` (TEXT, FK): Originating operation document.
- `op_type` (TEXT): Transaction type.
- `reference_no` (TEXT): Operation reference number.
- `product_id`, `product_name`, `sku` (TEXT).
- `source_warehouse_id`, `source_location_id` (TEXT).
- `dest_warehouse_id`, `dest_location_id` (TEXT).
- `quantity_delta` (REAL): Variance (+ for receipt/surplus, - for delivery/shortage).
- `balance_after` (REAL): Resulting physical inventory balance.
- `reason` (TEXT): Human-readable audit context.
- `performed_by` (TEXT): Operator identity.
- `created_at` (TEXT): Timestamp.

---

## Local Development & Setup

### Prerequisites
- Node.js $\ge 18$
- npm or bun

### Setup Steps
```bash
# 1. Clone repository
git clone <repo-url>
cd stocksense

# 2. Install dependencies
npm install

# 3. Start development server (serves Express API + Vite Frontend on port 3000)
npm run dev

# 4. Access the web app
Open http://localhost:3000 in your browser
```

### Production Build & Launch
```bash
# Build frontend bundle
npm run build

# Start production server
npm start
```

---

## Default Credentials for Local Testing

- **Email**: `alex@stocksense.io`
- **Password**: `stocksense123`
- *Alternatively, click the **1-Click Test Login** button on the sign-in modal for immediate access.*
