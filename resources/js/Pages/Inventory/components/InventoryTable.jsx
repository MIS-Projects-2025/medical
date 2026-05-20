import { useState, useRef } from 'react'
import { usePage } from '@inertiajs/react'
import { ArrowUp, ArrowDown, ArrowUpDown, Pencil, SquarePen, Trash2, Save, X, History, LayoutList } from 'lucide-react'
import {
    Table, TableHeader, TableBody,
    TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/components/ui/select'
import StockBadge from './StockBadge'
import {
    typesToSelectOptions, typesToColorMap,
} from '../helpers/inventoryHelpers'
import { cn } from '@/lib/utils'

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, sortDir }) {
    if (sortBy !== col)
        return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 shrink-0" />
    return sortDir === 'asc'
        ? <ArrowUp   className="ml-1 h-3 w-3 shrink-0" />
        : <ArrowDown className="ml-1 h-3 w-3 shrink-0" />
}

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditCell({ type = 'text', value, onChange, placeholder, className, typeOptions = [] }) {
    if (type === 'select-type') {
        return (
            <Select value={String(value)} onValueChange={onChange}>
                <SelectTrigger className="h-7 text-xs py-0 px-2 w-28">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {typeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    return (
        <Input
            type={type}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
            className={cn('h-7 text-xs py-0', className)}
        />
    )
}

// ── Qty adjust preview ────────────────────────────────────────────────────────

function QtyAdjustCell({ currentQty, adjustValue, onChange }) {
    const adj    = adjustValue === '' || adjustValue === null ? null : Number(adjustValue)
    const newQty = adj !== null ? Math.max(0, currentQty + adj) : null

    return (
        <div className="flex flex-col gap-0.5">
            <Input
                type="number"
                value={adjustValue ?? ''}
                placeholder="+/−"
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    'h-7 text-xs py-0 w-20',
                    adj !== null && adj > 0 && 'border-emerald-400 focus-visible:ring-emerald-400',
                    adj !== null && adj < 0 && 'border-red-400 focus-visible:ring-red-400',
                )}
            />
            {newQty !== null && (
                <span className={cn(
                    'text-[10px] tabular-nums',
                    adj > 0  && 'text-emerald-600 dark:text-emerald-400',
                    adj < 0  && 'text-red-600 dark:text-red-400',
                    adj === 0 && 'text-muted-foreground',
                )}>
                    → {newQty}
                </span>
            )}
        </div>
    )
}

// ── Table skeleton rows ───────────────────────────────────────────────────────

function SkeletonRows({ cols }) {
    return Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
            {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}>
                    <Skeleton className="h-4 w-full rounded" />
                </TableCell>
            ))}
        </TableRow>
    ))
}

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
    { key: 'item_name',      label: 'Item Name',  sortable: true },
    { key: 'med_type',       label: 'Type',        sortable: true },
    { key: 'brand',          label: 'Brand',       sortable: true },
    { key: 'uom',            label: 'UOM',         sortable: false },
    { key: 'required_stock', label: 'Req. Stock',  sortable: false },
    { key: 'qty',            label: 'Qty',         sortable: true },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function InventoryTable({
    rows,
    loading,
    sortBy,
    sortDir,
    selectedIds,
    onSort,
    onSelectAll,
    onSelectRow,
    onEdit,
    onDelete,
    onUpdate,
    onBulkUpdate,
    onViewLogs,
    saving,
}) {
    const { inventory_types = [] } = usePage().props
    const typeOptions  = typesToSelectOptions(inventory_types)
    const typeColorMap = typesToColorMap(inventory_types)
    // ── Single-row inline edit ──────────────────────────────────────────────
    const [editingId,  setEditingId]  = useState(null)
    const [editValues, setEditValues] = useState({})
    const saveRef = useRef(false)

    // ── Bulk edit mode ──────────────────────────────────────────────────────
    const [bulkEditMode,   setBulkEditMode]   = useState(false)
    const [bulkEditValues, setBulkEditValues] = useState({}) // keyed by row.id
    const [bulkSaving,     setBulkSaving]     = useState(false)

    const allSelected  = rows.length > 0 && rows.every((r) => selectedIds.has(r.id))
    const someSelected = rows.some((r) => selectedIds.has(r.id)) && !allSelected

    // ── Helpers ─────────────────────────────────────────────────────────────

    const rowInitValues = (row) => ({
        item_name:      row.item_name      ?? '',
        med_type:       String(row.med_type ?? 1),
        brand:          row.brand          ?? '',
        uom:            row.uom            ?? '',
        required_stock: row.required_stock != null ? String(row.required_stock) : '',
        qty_adjust:     '',
    })

    // ── Single-row handlers ─────────────────────────────────────────────────

    const startEdit = (row) => {
        if (bulkEditMode) return
        setEditingId(row.id)
        setEditValues(rowInitValues(row))
    }

    const cancelEdit = () => { setEditingId(null); setEditValues({}) }

    const saveEdit = async () => {
        if (saveRef.current) return
        saveRef.current = true
        try {
            await onUpdate(editingId, {
                item_name:      editValues.item_name,
                med_type:       Number(editValues.med_type),
                brand:          editValues.brand,
                uom:            editValues.uom,
                required_stock: editValues.required_stock !== '' ? Number(editValues.required_stock) : null,
                qty_adjust:     editValues.qty_adjust !== '' ? Number(editValues.qty_adjust) : null,
            })
            setEditingId(null)
            setEditValues({})
        } catch {
            // toast shown in hook
        } finally {
            saveRef.current = false
        }
    }

    const setField = (field) => (val) =>
        setEditValues((prev) => ({ ...prev, [field]: val }))

    // ── Bulk edit handlers ──────────────────────────────────────────────────

    const enterBulkEdit = () => {
        cancelEdit()
        const initial = {}
        rows.forEach((row) => { initial[row.id] = rowInitValues(row) })
        setBulkEditValues(initial)
        setBulkEditMode(true)
    }

    const cancelBulkEdit = () => {
        setBulkEditMode(false)
        setBulkEditValues({})
    }

    const setBulkField = (id, field) => (val) => {
        setBulkEditValues((prev) => ({
            ...prev,
            [id]: { ...prev[id], [field]: val },
        }))
    }

    const saveBulkEdit = async () => {
        if (bulkSaving) return
        setBulkSaving(true)
        try {
            const items = rows
                .map((row) => {
                    const v = bulkEditValues[row.id]
                    if (!v) return null

                    const rowReqStock = row.required_stock != null ? String(row.required_stock) : ''
                    const hasFieldChange =
                        v.item_name      !== (row.item_name ?? '') ||
                        v.med_type       !== String(row.med_type ?? 1) ||
                        v.brand          !== (row.brand ?? '') ||
                        v.uom            !== (row.uom ?? '') ||
                        v.required_stock !== rowReqStock

                    const hasQtyAdjust = v.qty_adjust !== '' && Number(v.qty_adjust) !== 0
                    if (!hasFieldChange && !hasQtyAdjust) return null

                    return {
                        id:             row.id,
                        item_name:      v.item_name,
                        med_type:       Number(v.med_type),
                        brand:          v.brand,
                        uom:            v.uom,
                        required_stock: v.required_stock !== '' ? Number(v.required_stock) : null,
                        qty_adjust:     hasQtyAdjust ? Number(v.qty_adjust) : null,
                    }
                })
                .filter(Boolean)

            if (items.length === 0) {
                cancelBulkEdit()
                return
            }

            await onBulkUpdate(items)
            setBulkEditMode(false)
            setBulkEditValues({})
        } catch {
            // toast shown in hook
        } finally {
            setBulkSaving(false)
        }
    }

    // ── Column count ────────────────────────────────────────────────────────

    // Columns: checkbox + item_name + med_type + brand + uom + req_stock + qty + qty_adjust + actions
    const colCount = COLUMNS.length + 3 // +checkbox, +qty_adjust, +actions

    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                        {/* Select-all checkbox */}
                        <TableHead className="w-10 pl-3">
                            <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                onCheckedChange={onSelectAll}
                                aria-label="Select all"
                            />
                        </TableHead>

                        {COLUMNS.map((col) => (
                            <TableHead
                                key={col.key}
                                onClick={col.sortable && !bulkEditMode ? () => onSort(col.key) : undefined}
                                className={cn(
                                    'whitespace-nowrap text-xs font-semibold uppercase tracking-wide select-none',
                                    col.sortable && !bulkEditMode && 'cursor-pointer hover:text-foreground transition-colors'
                                )}
                            >
                                <span className="inline-flex items-center">
                                    {col.label}
                                    {col.sortable && !bulkEditMode && (
                                        <SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />
                                    )}
                                </span>
                            </TableHead>
                        ))}

                        {/* Qty Adjust — always present as its own column */}
                        <TableHead className="w-32 text-xs font-semibold uppercase tracking-wide">
                            <span className="inline-flex flex-col leading-tight">
                                <span>Qty Adj</span>
                                <span className="text-[9px] font-normal text-muted-foreground normal-case tracking-normal">+/− to adjust</span>
                            </span>
                        </TableHead>

                        {/* Actions */}
                        <TableHead className="w-36 text-right pr-3 text-xs font-semibold uppercase tracking-wide">
                            {bulkEditMode ? (
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs px-2 gap-1 border-muted-foreground/30"
                                        onClick={cancelBulkEdit}
                                        disabled={bulkSaving}
                                    >
                                        <X className="h-3 w-3" /> Cancel
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs px-2 gap-1"
                                        onClick={enterBulkEdit}
                                        title="Edit all rows at once"
                                    >
                                        <LayoutList className="h-3 w-3" />
                                        Bulk Edit
                                    </Button>
                                </div>
                            )}
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <SkeletonRows cols={colCount} />
                    ) : rows.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={colCount}
                                className="text-center py-16 text-muted-foreground text-sm"
                            >
                                No inventory items found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => {
                            const isSingleEdit = !bulkEditMode && editingId === row.id
                            const isBulkRow    = bulkEditMode
                            const isEditing    = isSingleEdit || isBulkRow
                            const isSelected   = selectedIds.has(row.id)
                            const v            = isBulkRow ? (bulkEditValues[row.id] ?? rowInitValues(row)) : editValues

                            return (
                                <TableRow
                                    key={row.id}
                                    data-state={isSelected ? 'selected' : undefined}
                                    className={cn(
                                        'group',
                                        isBulkRow   && 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/50',
                                        isSingleEdit && 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/50',
                                        isSelected && !isEditing && 'bg-muted/60'
                                    )}
                                >
                                    {/* Checkbox */}
                                    <TableCell className="pl-3 w-10">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => onSelectRow(row.id, checked)}
                                            aria-label={`Select ${row.item_name}`}
                                        />
                                    </TableCell>

                                    {/* Item Name */}
                                    <TableCell className="font-medium max-w-52">
                                        {isEditing ? (
                                            <EditCell
                                                value={isBulkRow ? v.item_name : editValues.item_name}
                                                onChange={isBulkRow ? setBulkField(row.id, 'item_name') : setField('item_name')}
                                                className="w-48"
                                            />
                                        ) : (
                                            <span className="truncate block">{row.item_name}</span>
                                        )}
                                    </TableCell>

                                    {/* Type */}
                                    <TableCell>
                                        {isEditing ? (
                                            <EditCell
                                                type="select-type"
                                                value={isBulkRow ? v.med_type : editValues.med_type}
                                                onChange={isBulkRow ? setBulkField(row.id, 'med_type') : setField('med_type')}
                                                typeOptions={typeOptions}
                                            />
                                        ) : (
                                            <Badge variant={typeColorMap[row.med_type] ?? 'secondary'}>
                                                {row.med_type_label ?? '—'}
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Brand */}
                                    <TableCell className="text-muted-foreground max-w-36">
                                        {isEditing ? (
                                            <EditCell
                                                value={isBulkRow ? v.brand : editValues.brand}
                                                onChange={isBulkRow ? setBulkField(row.id, 'brand') : setField('brand')}
                                                className="w-32"
                                            />
                                        ) : (
                                            <span className="truncate block">{row.brand || '—'}</span>
                                        )}
                                    </TableCell>

                                    {/* UOM */}
                                    <TableCell className="text-muted-foreground">
                                        {isEditing ? (
                                            <EditCell
                                                value={isBulkRow ? v.uom : editValues.uom}
                                                onChange={isBulkRow ? setBulkField(row.id, 'uom') : setField('uom')}
                                                className="w-20"
                                            />
                                        ) : (
                                            row.uom || '—'
                                        )}
                                    </TableCell>

                                    {/* Required Stock */}
                                    <TableCell>
                                        {isEditing ? (
                                            <EditCell
                                                type="number"
                                                value={isBulkRow ? v.required_stock : editValues.required_stock}
                                                onChange={isBulkRow ? setBulkField(row.id, 'required_stock') : setField('required_stock')}
                                                placeholder="—"
                                                className="w-20"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground text-sm tabular-nums">
                                                {row.required_stock ?? '—'}
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Qty — always read-only display */}
                                    <TableCell>
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="font-medium tabular-nums w-10 text-right shrink-0">{row.qty}</span>
                                            <StockBadge
                                                qty={row.qty}
                                                requiredStock={row.required_stock}
                                                className="shrink-0"
                                            />
                                        </div>
                                    </TableCell>

                                    {/* Qty Adjust */}
                                    <TableCell>
                                        {isEditing ? (
                                            <QtyAdjustCell
                                                currentQty={row.qty}
                                                adjustValue={isBulkRow ? v.qty_adjust : editValues.qty_adjust}
                                                onChange={isBulkRow ? setBulkField(row.id, 'qty_adjust') : setField('qty_adjust')}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground text-xs">—</span>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-3 text-right">
                                        {isSingleEdit ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="default"
                                                    className="h-7 w-7"
                                                    onClick={saveEdit}
                                                    disabled={saving}
                                                    title="Save"
                                                >
                                                    <Save className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={cancelEdit}
                                                    title="Cancel"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : isBulkRow ? null : (
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                                                    onClick={() => onViewLogs?.(row)}
                                                    title="View history"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    onClick={() => onEdit(row)}
                                                    title="Open in editor"
                                                >
                                                    <SquarePen className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    onClick={() => {
                                                        if (confirm(`Delete "${row.item_name}"?`)) {
                                                            onDelete(row.id)
                                                        }
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                    onClick={() => startEdit(row)}
                                                    title="Quick edit (inline)"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>

            {/* ── Bulk edit save bar ── */}
            {bulkEditMode && !loading && rows.length > 0 && (
                <div className="border-t bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        Bulk edit active — {rows.length} rows editable. Only changed rows will be saved.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelBulkEdit}
                            disabled={bulkSaving}
                            className="gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={saveBulkEdit}
                            disabled={bulkSaving}
                            className="gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {bulkSaving ? 'Saving…' : 'Save All Changes'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
