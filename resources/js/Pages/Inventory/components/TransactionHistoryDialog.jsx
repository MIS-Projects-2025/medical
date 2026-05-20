import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { TrendingUp, Search, X, ArrowUp, ArrowDown, Minus, SlidersHorizontal, CalendarDays } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input }     from '@/components/ui/input'
import { Badge }     from '@/components/ui/badge'
import { Button }    from '@/components/ui/button'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/components/ui/select'
import { DatePicker } from '@/Components/ui/date-picker'
import { Pagination }  from '@/Components/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '@/lib/utils'

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
    CREATED:  { label: 'Created',  badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800' },
    UPDATED:  { label: 'Updated',  badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800' },
    IMPORTED: { label: 'Imported', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800' },
    ISSUED:   { label: 'Issued',   badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800' },
    DELETED:  { label: 'Deleted',  badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' },
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toYMD(date) {
    return date ? format(date, 'yyyy-MM-dd') : null
}

function toDateKey(iso) {
    return iso ? iso.slice(0, 10) : null
}

function friendlyDateLabel(dateKey) {
    if (!dateKey) return 'Unknown date'
    const today     = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    if (dateKey === today)     return 'Today'
    if (dateKey === yesterday) return 'Yesterday'
    return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-PH', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
}

function formatTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

// ── Group flat rows by calendar date ─────────────────────────────────────────

function groupByDate(rows) {
    const groups = []
    const seen   = {}
    for (const row of rows) {
        const key = toDateKey(row.action_at) ?? 'unknown'
        if (!seen[key]) { seen[key] = []; groups.push({ key, rows: seen[key] }) }
        seen[key].push(row)
    }
    return groups
}

// ── Adjustment pill ───────────────────────────────────────────────────────────

function AdjPill({ value }) {
    if (value == null) return <span className="text-muted-foreground text-xs">—</span>
    const up = value > 0
    const dn = value < 0
    return (
        <span className={cn(
            'inline-flex items-center gap-0.5 tabular-nums font-semibold text-sm',
            up && 'text-emerald-600 dark:text-emerald-400',
            dn && 'text-red-600 dark:text-red-400',
            !up && !dn && 'text-muted-foreground',
        )}>
            {up && <ArrowUp   className="h-3 w-3 shrink-0" />}
            {dn && <ArrowDown className="h-3 w-3 shrink-0" />}
            {!up && !dn && <Minus className="h-3 w-3 shrink-0" />}
            {up ? '+' : ''}{value}
        </span>
    )
}

// ── Skeleton placeholder ──────────────────────────────────────────────────────

function SkeletonGroup() {
    return (
        <div className="px-5 py-4 space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                    <Skeleton className="h-3.5 w-12 rounded shrink-0" />
                    <Skeleton className="h-3.5 flex-1 rounded" />
                    <Skeleton className="h-3.5 w-20 rounded shrink-0" />
                    <Skeleton className="h-3.5 w-12 rounded shrink-0" />
                    <Skeleton className="h-3.5 w-12 rounded shrink-0" />
                    <Skeleton className="h-3.5 w-12 rounded shrink-0" />
                </div>
            ))}
        </div>
    )
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TxRow({ row }) {
    const cfg = ACTION_CONFIG[row.action_type]
    return (
        <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors">
            {/* Time */}
            <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-14 text-right">
                {formatTime(row.action_at)}
            </span>

            {/* Item + badge */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                    {row.item_name ?? <span className="italic text-muted-foreground">(deleted)</span>}
                </span>
                {cfg && (
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border shrink-0', cfg.badge)}>
                        {cfg.label}
                    </Badge>
                )}
            </div>

            {/* By */}
            <span className="text-xs text-muted-foreground shrink-0 max-w-28 truncate hidden sm:block">
                {row.action_by_name || row.action_by || '—'}
            </span>

            {/* 3 qty columns */}
            <div className="flex items-center shrink-0">
                <div className="w-24 text-right pr-3">
                    <span className="tabular-nums text-sm text-muted-foreground">{row.current_balance ?? '—'}</span>
                </div>
                <div className="w-20 text-right pr-3">
                    <AdjPill value={row.adjusted_qty} />
                </div>
                <div className="w-20 text-right">
                    <span className="tabular-nums font-bold text-sm">{row.total_balance ?? '—'}</span>
                </div>
            </div>
        </div>
    )
}

// ── Date group ────────────────────────────────────────────────────────────────

function DateGroup({ dateKey, rows }) {
    return (
        <div>
            <div className="flex items-center gap-2.5 px-5 py-2 sticky top-0 bg-muted/70 backdrop-blur-sm border-y z-10">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">{friendlyDateLabel(dateKey)}</span>
                <span className="text-xs text-muted-foreground">
                    · {rows.length} transaction{rows.length !== 1 ? 's' : ''}
                </span>
                {/* Column labels aligned to TxRow */}
                <div className="ml-auto flex items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                    <div className="w-24 text-right pr-3">Balance</div>
                    <div className="w-20 text-right pr-3">Adj. Qty</div>
                    <div className="w-20 text-right">After</div>
                </div>
            </div>
            {rows.map((row) => <TxRow key={row.id} row={row} />)}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TransactionHistoryDialog({ open, onClose }) {
    const [rows,    setRows]    = useState([])
    const [meta,    setMeta]    = useState(null)
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState(null)
    const [page,    setPage]    = useState(1)

    // Filter state
    const [rawSearch,  setRawSearch]  = useState('')
    const [actionType, setActionType] = useState('')
    const [dateFrom,   setDateFrom]   = useState(undefined) // Date | undefined
    const [dateTo,     setDateTo]     = useState(undefined) // Date | undefined

    const debouncedSearch = useDebounce(rawSearch, 350)
    const abortRef = useRef(null)

    const activeFilterCount = [debouncedSearch, actionType, dateFrom, dateTo].filter(Boolean).length

    const clearFilters = () => {
        setRawSearch('')
        setActionType('')
        setDateFrom(undefined)
        setDateTo(undefined)
    }

    // Reset on open
    useEffect(() => {
        if (open) { clearFilters(); setPage(1) }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1) }, [debouncedSearch, actionType, dateFrom, dateTo])

    const fetchData = useCallback(async () => {
        if (!open) return
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl

        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({ page, per_page: 25 })
            if (debouncedSearch)    params.set('search',      debouncedSearch)
            if (actionType)         params.set('action_type', actionType)
            if (dateFrom)           params.set('date_from',   toYMD(dateFrom))
            if (dateTo)             params.set('date_to',     toYMD(dateTo))

            const res = await window.axios.get(
                route('inventory.transactionHistory') + '?' + params.toString(),
                { signal: ctrl.signal }
            )
            setRows(res.data.data)
            setMeta(res.data.meta)
        } catch (err) {
            if (!window.axios.isCancel(err)) setError('Failed to load transaction history.')
        } finally {
            setLoading(false)
        }
    }, [open, page, debouncedSearch, actionType, dateFrom, dateTo])

    useEffect(() => { if (open) fetchData() }, [fetchData, open])

    const groups = groupByDate(rows)

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

                {/* ── Header ── */}
                <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 ring-4 ring-emerald-200 dark:ring-emerald-800 shrink-0">
                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-base">Transaction History</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Quantity adjustments across all inventory items
                                </DialogDescription>
                            </div>
                        </div>
                        {meta && (
                            <span className="text-xs text-muted-foreground shrink-0 mt-1">
                                {meta.total.toLocaleString()} record{meta.total !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </DialogHeader>

                {/* ── Single-row filter bar ── */}
                <div className="px-4 py-2.5 border-b shrink-0 bg-muted/20 flex items-center gap-2 overflow-x-auto">

                    {/* Search */}
                    <div className="relative flex-1 min-w-40">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search item or user…"
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

                    {/* Action type */}
                    <Select value={actionType || 'all'} onValueChange={(v) => setActionType(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-8 w-32 text-sm shrink-0 bg-background gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All actions</SelectItem>
                            <SelectItem value="CREATED">Created</SelectItem>
                            <SelectItem value="UPDATED">Updated</SelectItem>
                            <SelectItem value="IMPORTED">Imported</SelectItem>
                            <SelectItem value="ISSUED">Issued</SelectItem>
                            <SelectItem value="DELETED">Deleted</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date from */}
                    <DatePicker
                        value={dateFrom}
                        onChange={setDateFrom}
                        placeholder="From"
                        displayFormat="MMM d, yy"
                        className="h-8 w-28 text-xs shrink-0"
                        disabled={dateTo ? { after: dateTo } : undefined}
                    />

                    <span className="text-xs text-muted-foreground shrink-0">–</span>

                    {/* Date to */}
                    <DatePicker
                        value={dateTo}
                        onChange={setDateTo}
                        placeholder="To"
                        displayFormat="MMM d, yy"
                        className="h-8 w-28 text-xs shrink-0"
                        disabled={dateFrom ? { before: dateFrom } : undefined}
                    />

                    {/* Clear */}
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0 px-2"
                        >
                            <X className="h-3 w-3" />
                            Clear
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
                                {activeFilterCount}
                            </Badge>
                        </Button>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <>
                            <SkeletonGroup />
                            <Separator />
                            <SkeletonGroup />
                        </>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20 text-sm text-destructive">
                            {error}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <TrendingUp className="h-10 w-10 opacity-20" />
                            <p className="text-sm">No transactions found.</p>
                            {activeFilterCount > 0 && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        groups.map((group, gi) => (
                            <div key={group.key}>
                                <DateGroup dateKey={group.key} rows={group.rows} />
                                {gi < groups.length - 1 && <Separator />}
                            </div>
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
