// ── Type helpers ──────────────────────────────────────────────────────────────
// Types are loaded from the DB via Inertia shared props (inventory_types).
// These helpers convert the array of { id, name, color } objects into the
// shapes each component needs.

/**
 * Convert inventory_types prop to a Select-compatible array:
 *   [{ value: '1', label: 'Medicine' }, ...]
 */
export function typesToSelectOptions(inventoryTypes = []) {
    return inventoryTypes.map((t) => ({ value: String(t.id), label: t.name }))
}

/**
 * Build an id → label lookup object:
 *   { 1: 'Medicine', 2: 'Supply', ... }
 */
export function typesToLabelMap(inventoryTypes = []) {
    return Object.fromEntries(inventoryTypes.map((t) => [t.id, t.name]))
}

/**
 * Build an id → badge-color lookup object:
 *   { 1: 'info', 2: 'success', ... }
 */
export function typesToColorMap(inventoryTypes = []) {
    return Object.fromEntries(inventoryTypes.map((t) => [t.id, t.color ?? 'secondary']))
}

// ── Stock status ──────────────────────────────────────────────────────────────

/**
 * Returns 'out' | 'low' | 'ok' based on quantity.
 * Thresholds: 0 = out, 1–10 = low, 11+ = ok
 */
export function getStockStatus(qty, requiredStock = null) {
    if (qty === 0 || qty === null || qty === undefined) return 'out'
    if (requiredStock != null && requiredStock > 0) {
        // Low stock = at or below 50% of the required quantity
        if (qty <= requiredStock * 0.5) return 'low'
    }
    // No required_stock set (or qty > 50% threshold) — in stock
    return 'ok'
}

export const STOCK_STATUS_CONFIG = {
    out: { label: 'Out of Stock', variant: 'destructive', color: 'text-red-600 dark:text-red-400' },
    low: { label: 'Low Stock',    variant: 'warning',     color: 'text-amber-600 dark:text-amber-400' },
    ok:  { label: 'In Stock',     variant: 'success',     color: 'text-emerald-600 dark:text-emerald-400' },
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric', month: 'short', day: '2-digit',
        }).format(new Date(dateStr))
    } catch {
        return dateStr
    }
}

// ── Excel template ────────────────────────────────────────────────────────────

/**
 * Column definitions — single source of truth used by:
 *   1. downloadExcelTemplate() to build the .xlsx header row
 *   2. BulkUploadModal ColumnReference table
 */
export const TEMPLATE_COLUMNS = [
    { key: 'type',      label: 'Type',       required: true,  hint: 'Select from the dropdown — valid types are set by your administrator.' },
    { key: 'item_name', label: 'Item Name',  required: true,  hint: 'Full name of the item (e.g. Paracetamol 500mg)' },
    { key: 'brand',     label: 'Brand',      required: false, hint: 'Brand or manufacturer name' },
    { key: 'uom',       label: 'Unit (UOM)', required: false, hint: 'Unit of measure: tablet, capsule, bottle, box, pcs, ml…' },
    { key: 'qty',       label: 'Quantity',   required: true,  hint: 'Whole number, 0 or more. Do not include commas.' },
]

/**
 * Download template from the server — includes dropdown validation for the Type column
 * populated from the current active inventory types in the database.
 */
export function downloadExcelTemplate() {
    window.location.href = route('inventory.template')
}

// ── Form defaults ─────────────────────────────────────────────────────────────

export function emptyFormValues(defaultTypeValue = '1') {
    return {
        item_name:      '',
        brand:          '',
        uom:            '',
        med_type:       String(defaultTypeValue),
        qty:            0,
        required_stock: '',
    }
}

export function itemToFormValues(item) {
    return {
        item_name:      item.item_name      ?? '',
        brand:          item.brand          ?? '',
        uom:            item.uom            ?? '',
        med_type:       String(item.med_type ?? '1'),
        qty:            item.qty            ?? 0,
        required_stock: item.required_stock ?? '',
        qty_adjust:     '',
    }
}

// ── Axios helpers ─────────────────────────────────────────────────────────────

/** Extract a user-friendly error message from an axios error response */
export function extractApiError(err) {
    if (err?.response?.data) {
        const data = err.response.data
        if (data.message) return data.message
        if (data.errors) {
            return Object.values(data.errors).flat().join(' ')
        }
    }
    return err?.message ?? 'An unexpected error occurred.'
}
