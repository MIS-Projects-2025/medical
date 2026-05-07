import { useState, useRef } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, Pencil, Trash2, Save, X } from 'lucide-react'
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
    MED_TYPES, MED_TYPE_COLORS,
    formatDate, isExpired, isExpiringSoon,
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

function EditCell({ type = 'text', value, onChange, min, className }) {
    if (type === 'select-type') {
        return (
            <Select value={String(value)} onValueChange={onChange}>
                <SelectTrigger className="h-7 text-xs py-0 px-2 w-28">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {MED_TYPES.map((t) => (
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
            min={min}
            onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
            className={cn('h-7 text-xs py-0', className)}
        />
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

// ── Main component ────────────────────────────────────────────────────────────

const COLUMNS = [
    { key: 'item_name',  label: 'Item Name',  sortable: true },
    { key: 'med_type',   label: 'Type',       sortable: true },
    { key: 'brand',      label: 'Brand',      sortable: true },
    { key: 'uom',        label: 'UOM',        sortable: false },
    { key: 'qty',        label: 'Qty',        sortable: true },
    { key: 'expiration', label: 'Expiration', sortable: true },
]

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
    saving,
}) {
    const [editingId,   setEditingId]   = useState(null)
    const [editValues,  setEditValues]  = useState({})
    const saveRef = useRef(false)

    const allSelected  = rows.length > 0 && rows.every((r) => selectedIds.has(r.id))
    const someSelected = rows.some((r) => selectedIds.has(r.id)) && !allSelected

    // ── Inline edit handlers ────────────────────────────────────────────────

    const startEdit = (row) => {
        setEditingId(row.id)
        setEditValues({
            item_name:  row.item_name  ?? '',
            med_type:   String(row.med_type ?? 1),
            brand:      row.brand      ?? '',
            uom:        row.uom        ?? '',
            qty:        row.qty        ?? 0,
            expiration: row.expiration ?? '',
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditValues({})
    }

    const saveEdit = async () => {
        if (saveRef.current) return
        saveRef.current = true
        try {
            await onUpdate(editingId, {
                ...editValues,
                med_type: Number(editValues.med_type),
                qty:      Number(editValues.qty),
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

    const colCount = COLUMNS.length + 2 // checkbox + actions

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
                                onClick={col.sortable ? () => onSort(col.key) : undefined}
                                className={cn(
                                    'whitespace-nowrap text-xs font-semibold uppercase tracking-wide select-none',
                                    col.sortable && 'cursor-pointer hover:text-foreground transition-colors'
                                )}
                            >
                                <span className="inline-flex items-center">
                                    {col.label}
                                    {col.sortable && (
                                        <SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />
                                    )}
                                </span>
                            </TableHead>
                        ))}

                        {/* Actions */}
                        <TableHead className="w-28 text-right pr-3 text-xs font-semibold uppercase tracking-wide">
                            Actions
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
                            const isEditing  = editingId === row.id
                            const isSelected = selectedIds.has(row.id)
                            const expired    = isExpired(row.expiration)
                            const expiring   = !expired && isExpiringSoon(row.expiration)

                            return (
                                <TableRow
                                    key={row.id}
                                    data-state={isSelected ? 'selected' : undefined}
                                    className={cn(
                                        'group',
                                        isEditing  && 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/50',
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
                                                value={editValues.item_name}
                                                onChange={setField('item_name')}
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
                                                value={editValues.med_type}
                                                onChange={setField('med_type')}
                                            />
                                        ) : (
                                            <Badge variant={MED_TYPE_COLORS[row.med_type] ?? 'secondary'}>
                                                {row.med_type_label ?? '—'}
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Brand */}
                                    <TableCell className="text-muted-foreground max-w-36">
                                        {isEditing ? (
                                            <EditCell
                                                value={editValues.brand}
                                                onChange={setField('brand')}
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
                                                value={editValues.uom}
                                                onChange={setField('uom')}
                                                className="w-20"
                                            />
                                        ) : (
                                            row.uom || '—'
                                        )}
                                    </TableCell>

                                    {/* Qty */}
                                    <TableCell>
                                        {isEditing ? (
                                            <div className="flex items-center gap-1.5">
                                                <EditCell
                                                    type="number"
                                                    value={editValues.qty}
                                                    onChange={setField('qty')}
                                                    min={0}
                                                    className="w-20"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium tabular-nums">{row.qty}</span>
                                                <StockBadge qty={row.qty} />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Expiration */}
                                    <TableCell>
                                        {isEditing ? (
                                            <EditCell
                                                type="date"
                                                value={editValues.expiration}
                                                onChange={setField('expiration')}
                                                className="w-36"
                                            />
                                        ) : (
                                            <span className={cn(
                                                'text-sm',
                                                expired  && 'text-destructive font-medium',
                                                expiring && 'text-amber-600 dark:text-amber-400 font-medium'
                                            )}>
                                                {formatDate(row.expiration)}
                                                {expired  && <span className="ml-1 text-xs">(expired)</span>}
                                                {expiring && <span className="ml-1 text-xs">(soon)</span>}
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-3 text-right">
                                        {isEditing ? (
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
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    onClick={() => onEdit(row)}
                                                    title="Open in editor"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
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
        </div>
    )
}
