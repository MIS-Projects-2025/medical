import { useState, useEffect, useCallback, useRef } from 'react'
import { usePage } from '@inertiajs/react'
import { History, Search, X, Plus, Pencil, Trash2, PackageMinus, RotateCcw, Upload } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge }   from '@/components/ui/badge'
import { Input }   from '@/components/ui/input'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/Components/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '@/lib/utils'

// ── Action type config ────────────────────────────────────────────────────────

const ACTION_CONFIG = {
    CREATED:  { label: 'Created',  Icon: Plus,         dot: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800', iconBg: 'bg-emerald-100 dark:bg-emerald-950', iconColor: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800' },
    UPDATED:  { label: 'Updated',  Icon: Pencil,       dot: 'bg-blue-500',    ring: 'ring-blue-200 dark:ring-blue-800',    iconBg: 'bg-blue-100 dark:bg-blue-950',    iconColor: 'text-blue-600 dark:text-blue-400',    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'    },
    DELETED:  { label: 'Deleted',  Icon: Trash2,       dot: 'bg-red-500',     ring: 'ring-red-200 dark:ring-red-800',     iconBg: 'bg-red-100 dark:bg-red-950',     iconColor: 'text-red-600 dark:text-red-400',     badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800'     },
    ISSUED:   { label: 'Issued',   Icon: PackageMinus, dot: 'bg-amber-500',   ring: 'ring-amber-200 dark:ring-amber-800', iconBg: 'bg-amber-100 dark:bg-amber-950', iconColor: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800' },
    RESTORED: { label: 'Restored', Icon: RotateCcw,    dot: 'bg-violet-500',  ring: 'ring-violet-200 dark:ring-violet-800', iconBg: 'bg-violet-100 dark:bg-violet-950', iconColor: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800' },
    IMPORTED: { label: 'Imported', Icon: Upload,       dot: 'bg-cyan-500',    ring: 'ring-cyan-200 dark:ring-cyan-800',   iconBg: 'bg-cyan-100 dark:bg-cyan-950',   iconColor: 'text-cyan-600 dark:text-cyan-400',   badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800'   },
}

const DEFAULT_CONFIG = { label: '—', Icon: History, dot: 'bg-muted-foreground', ring: 'ring-border', iconBg: 'bg-muted', iconColor: 'text-muted-foreground', badge: '' }

function getConfig(type) { return ACTION_CONFIG[type] ?? DEFAULT_CONFIG }

// ── Format datetime ───────────────────────────────────────────────────────────

function formatDateTime(iso) {
    if (!iso) return { date: '—', time: '' }
    const d = new Date(iso)
    return {
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    }
}

// ── Human-readable field name ────────────────────────────────────────────────

const FIELD_LABELS = {
    item_name:      'Item Name',
    med_type:       'Type',
    brand:          'Brand',
    uom:            'UOM',
    qty:            'Quantity',
    required_stock: 'Req. Stock',
    date_inserted:  'Date Added',
}

function fieldLabel(key) {
    return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

// ── Format a single value for display ────────────────────────────────────────

function formatValue(key, val, typeLabelMap = {}) {
    if (val === null || val === undefined || val === '') return '—'
    if (key === 'med_type') return typeLabelMap[Number(val)] ?? String(val)
    return String(val)
}

// ── Changes section inside a log entry ───────────────────────────────────────

function ChangesBlock({ oldValues, newValues, actionType, typeLabelMap }) {
    if (actionType === 'CREATED' || actionType === 'IMPORTED') {
        if (!newValues || !Object.keys(newValues).length) return null
        const displayFields = Object.keys(newValues).filter(
            (k) => !['created_at', 'updated_at', 'date_inserted', 'loggable_type', 'loggable_id'].includes(k)
        )
        if (!displayFields.length) return null
        return (
            <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">
                    {actionType === 'IMPORTED' ? 'Imported values' : 'Initial values'}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {displayFields.map((k) => (
                        <div key={k} className="flex gap-1.5">
                            <span className="text-muted-foreground shrink-0">{fieldLabel(k)}:</span>
                            <span className="font-medium truncate">{formatValue(k, newValues[k], typeLabelMap)}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (actionType === 'UPDATED' && oldValues && typeof oldValues === 'object') {
        const fields = Object.keys(oldValues).filter(
            (k) => !['updated_at'].includes(k)
        )
        if (!fields.length) return null
        return (
            <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
                <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">Changes</p>
                {fields.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 flex-wrap">
                        <span className="text-muted-foreground capitalize shrink-0 min-w-20">{fieldLabel(f)}:</span>
                        <span className="line-through text-destructive/70 dark:text-red-400/70">{formatValue(f, oldValues[f], typeLabelMap)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">{formatValue(f, newValues?.[f], typeLabelMap)}</span>
                    </div>
                ))}
            </div>
        )
    }

    if (actionType === 'ISSUED') {
        const from = oldValues?.qty
        const to   = newValues?.qty
        if (from == null && to == null) return null
        const diff = (typeof from === 'number' && typeof to === 'number') ? from - to : null
        return (
            <div className="mt-2 rounded-md border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 p-3 text-xs">
                <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">Stock change</p>
                <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold text-sm">{from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="tabular-nums font-semibold text-sm">{to}</span>
                    {diff !== null && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] px-1.5 py-0">
                            −{diff} issued
                        </Badge>
                    )}
                </div>
            </div>
        )
    }

    return null
}

// ── Single timeline entry ─────────────────────────────────────────────────────

function TimelineEntry({ log, isLast, typeLabelMap }) {
    const cfg = getConfig(log.action_type)
    const { Icon } = cfg
    const dt = formatDateTime(log.action_at)

    // Display name: prefer metadata.emp_name, fall back to action_by (emp_id)
    const displayName = log.action_by_name || log.action_by

    // Upload session reference
    const isFromUpload = log.related_type === 'UploadSession' && log.related_id

    return (
        <div className="flex gap-4">
            {/* Left: icon + line */}
            <div className="flex flex-col items-center shrink-0 w-10">
                <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full ring-4 shrink-0 z-10',
                    cfg.iconBg, cfg.ring
                )}>
                    <Icon className={cn('h-4 w-4', cfg.iconColor)} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-0 min-h-4" />}
            </div>

            {/* Right: card */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-2')}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            variant="outline"
                            className={cn('text-xs font-semibold border px-2 py-0.5', cfg.badge)}
                        >
                            {cfg.label}
                        </Badge>
                        {displayName && (
                            <div className="flex flex-col leading-tight">
                                <span className="text-sm font-medium text-foreground">{displayName}</span>
                                {log.action_by_name && log.action_by && (
                                    <span className="text-[10px] text-muted-foreground">{log.action_by}</span>
                                )}
                            </div>
                        )}
                        {isFromUpload && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-cyan-600 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800">
                                Upload #{log.related_id}
                            </Badge>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-foreground">{dt.date}</p>
                        <p className="text-xs text-muted-foreground">{dt.time}</p>
                    </div>
                </div>

                {/* Remarks */}
                {log.remarks && (
                    <p className="text-sm text-muted-foreground mt-1">{log.remarks}</p>
                )}

                {/* Changes */}
                <ChangesBlock
                    oldValues={log.old_values}
                    newValues={log.new_values}
                    actionType={log.action_type}
                    typeLabelMap={typeLabelMap}
                />
            </div>
        </div>
    )
}

// ── Skeleton entries ──────────────────────────────────────────────────────────

function SkeletonEntries() {
    return Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0 w-10">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                {i < 4 && <div className="w-px flex-1 bg-border mt-1 min-h-8" />}
            </div>
            <div className="flex-1 pb-6 space-y-2">
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-12 w-full rounded-md" />
            </div>
        </div>
    ))
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogsDialog({ item, onClose }) {
    const open = !!item
    const { inventory_types = [] } = usePage().props
    const typeLabelMap = Object.fromEntries(inventory_types.map((t) => [t.id, t.name]))

    const [logs,       setLogs]       = useState([])
    const [meta,       setMeta]       = useState(null)
    const [loading,    setLoading]    = useState(false)
    const [error,      setError]      = useState(null)

    const [rawSearch,  setRawSearch]  = useState('')
    const [actionType, setActionType] = useState('')
    const [page,       setPage]       = useState(1)

    const debouncedSearch = useDebounce(rawSearch, 350)
    const abortRef = useRef(null)

    const fetchLogs = useCallback(async () => {
        if (!item) return
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl

        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({
                page,
                per_page: 10,
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(actionType      && { action_type: actionType }),
            })

            const res = await window.axios.get(
                route('inventory.logs', { id: item.id }) + '?' + params.toString(),
                { signal: ctrl.signal }
            )
            setLogs(res.data.data)
            setMeta(res.data.meta)
        } catch (err) {
            if (!window.axios.isCancel(err)) setError('Failed to load history.')
        } finally {
            setLoading(false)
        }
    }, [item, page, debouncedSearch, actionType])

    // Reset when a new item is opened
    useEffect(() => {
        if (open) { setRawSearch(''); setActionType(''); setPage(1) }
    }, [item?.id])

    useEffect(() => { if (open) fetchLogs() }, [fetchLogs, open])

    // Reset page on filter change
    useEffect(() => { setPage(1) }, [debouncedSearch, actionType])

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-2xl w-full max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

                {/* ── Header ── */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950 ring-4 ring-violet-200 dark:ring-violet-800">
                            <History className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">Item History</DialogTitle>
                            <DialogDescription className="text-xs truncate max-w-80">
                                {item?.item_name}{item?.brand ? ` · ${item.brand}` : ''}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* ── Filters ── */}
                <div className="px-6 py-3 border-b flex items-center gap-2 shrink-0 bg-muted/20">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search by user or remarks…"
                            value={rawSearch}
                            onChange={(e) => setRawSearch(e.target.value)}
                            className="h-8 pl-8 text-sm bg-background"
                        />
                        {rawSearch && (
                            <button
                                onClick={() => setRawSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <Select value={actionType || 'all'} onValueChange={(v) => setActionType(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-8 w-36 text-sm shrink-0 bg-background">
                            <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All actions</SelectItem>
                            <SelectItem value="CREATED">Created</SelectItem>
                            <SelectItem value="UPDATED">Updated</SelectItem>
                            <SelectItem value="IMPORTED">Imported</SelectItem>
                            <SelectItem value="DELETED">Deleted</SelectItem>
                            <SelectItem value="ISSUED">Issued</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* ── Timeline ── */}
                <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5">
                    {error ? (
                        <p className="text-sm text-destructive text-center py-10">{error}</p>
                    ) : loading ? (
                        <SkeletonEntries />
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <History className="h-10 w-10 opacity-20" />
                            <p className="text-sm">No history found.</p>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <TimelineEntry
                                key={log.id}
                                log={log}
                                isLast={i === logs.length - 1}
                                typeLabelMap={typeLabelMap}
                            />
                        ))
                    )}
                </div>

                {/* ── Pagination ── */}
                {meta && (
                    <div className="border-t px-4 shrink-0 bg-muted/10">
                        <Pagination meta={meta} onPageChange={setPage} />
                    </div>
                )}

            </DialogContent>
        </Dialog>
    )
}
