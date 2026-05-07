// ── Type constants ────────────────────────────────────────────────────────────

export const MED_TYPES = [
    { value: '1', label: 'Medicine' },
    { value: '2', label: 'Supply' },
    { value: '3', label: 'Equipment' },
]

export const MED_TYPE_LABELS = {
    1: 'Medicine',
    2: 'Supply',
    3: 'Equipment',
}

export const MED_TYPE_COLORS = {
    1: 'info',      // blue  — Medicine
    2: 'success',   // green — Supply
    3: 'warning',   // amber — Equipment
}

// ── Stock status ──────────────────────────────────────────────────────────────

/**
 * Returns 'out' | 'low' | 'ok' based on quantity.
 * Thresholds: 0 = out, 1–10 = low, 11+ = ok
 */
export function getStockStatus(qty) {
    if (qty === 0 || qty === null || qty === undefined) return 'out'
    if (qty <= 10) return 'low'
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

export function isExpired(dateStr) {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

export function isExpiringSoon(dateStr, days = 30) {
    if (!dateStr) return false
    const exp  = new Date(dateStr)
    const now  = new Date()
    const soon = new Date(now.getTime() + days * 86_400_000)
    return exp > now && exp <= soon
}

// ── Excel template ────────────────────────────────────────────────────────────

/**
 * Column definitions — single source of truth used by:
 *   1. downloadExcelTemplate() to build the .xlsx header row
 *   2. BulkUploadModal ColumnReference table
 */
export const TEMPLATE_COLUMNS = [
    { key: 'med_type',   label: 'Type',        required: true,  hint: '1 = Medicine   2 = Supply   3 = Equipment' },
    { key: 'item_name',  label: 'Item Name',   required: true,  hint: 'Full name of the item (e.g. Paracetamol 500mg)' },
    { key: 'brand',      label: 'Brand',       required: false, hint: 'Brand or manufacturer name' },
    { key: 'uom',        label: 'Unit (UOM)',  required: false, hint: 'Unit of measure: tablet, capsule, bottle, box, pcs, ml…' },
    { key: 'qty',        label: 'Quantity',    required: true,  hint: 'Whole number, 0 or more. Do not include commas.' },
    { key: 'expiration', label: 'Expiration',  required: false, hint: 'YYYY-MM-DD format (e.g. 2027-06-30). Leave blank if no expiry.' },
]

const SAMPLE_ROWS = [
    // med_type | item_name                  | brand         | uom      | qty | expiration
    [        1,  'Paracetamol 500mg',          'Biogesic',    'tablet',  200,  '2027-06-30' ],
    [        1,  'Amoxicillin 500mg',          'Generic',     'capsule', 150,  '2026-12-31' ],
    [        1,  'Mefenamic Acid 500mg',       'Ponstan',     'capsule', 100,  '2027-03-15' ],
    [        2,  'Surgical Gloves (Large)',    '3M',          'box',      50,  ''           ],
    [        2,  'Isopropyl Alcohol 70%',      'Green Cross', 'bottle',  100,  '2026-09-15' ],
    [        2,  'Disposable Face Mask',       'Generic',     'box',      80,  ''           ],
    [        3,  'Digital Thermometer',        'B.Well',      'unit',     10,  ''           ],
    [        3,  'Blood Pressure Monitor',     'Omron',       'unit',      5,  '2028-01-01' ],
]

const INSTRUCTIONS_ROWS = [
    ['INVENTORY IMPORT — INSTRUCTIONS'],
    [],
    ['Column',      'Required', 'Description'],
    ['med_type',    'Yes',      '1 = Medicine   2 = Supply   3 = Equipment'],
    ['item_name',   'Yes',      'Full item name. Rows with a blank item_name are skipped.'],
    ['brand',       'No',       'Brand or manufacturer name.'],
    ['uom',         'No',       'Unit of measure — e.g. tablet, capsule, bottle, box, pcs, ml, unit.'],
    ['qty',         'Yes',      'Whole number (0 or more). Do not include commas or unit labels.'],
    ['expiration',  'No',       'Date in YYYY-MM-DD format (e.g. 2027-06-30). Leave blank if no expiry.'],
    [],
    ['IMPORTANT:'],
    ['— Do not rename or reorder the header row.'],
    ['— The first row of the "Inventory Data" sheet must always be the header row.'],
    ['— med_type must be a number (1, 2, or 3), not the label text.'],
]

export async function downloadExcelTemplate() {
    const XLSX = await import('xlsx')

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Inventory Data (headers + sample rows) ──────────────────────
    const headers  = TEMPLATE_COLUMNS.map((c) => c.key)
    const wsData   = XLSX.utils.aoa_to_sheet([headers, ...SAMPLE_ROWS])

    // Column widths
    wsData['!cols'] = [
        { wch: 10 },   // med_type
        { wch: 32 },   // item_name
        { wch: 18 },   // brand
        { wch: 12 },   // uom
        { wch: 10 },   // qty
        { wch: 14 },   // expiration
    ]

    // Freeze header row
    wsData['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, wsData, 'Inventory Data')

    // ── Sheet 2: Instructions ─────────────────────────────────────────────────
    const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS)
    wsInstr['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 70 }]
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions')

    XLSX.writeFile(wb, 'inventory_import_template.xlsx')
}

// ── Form defaults ─────────────────────────────────────────────────────────────

export function emptyFormValues() {
    return {
        item_name:  '',
        brand:      '',
        uom:        '',
        med_type:   '1',
        qty:        0,
        expiration: '',
    }
}

export function itemToFormValues(item) {
    return {
        item_name:  item.item_name  ?? '',
        brand:      item.brand      ?? '',
        uom:        item.uom        ?? '',
        med_type:   String(item.med_type ?? '1'),
        qty:        item.qty        ?? 0,
        expiration: item.expiration ?? '',
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
