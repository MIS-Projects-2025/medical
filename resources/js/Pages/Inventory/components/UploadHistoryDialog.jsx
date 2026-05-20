import { useState, useEffect, useCallback, useRef } from 'react'
import { usePage } from '@inertiajs/react'
import { History, Search, X, Upload, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Plus, Pencil } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge }    from '@/components/ui/badge'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/Components/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '@/lib/utils'

// ── Format helpers ────────────────────────────────────────────────────────────

function formatDateTime(iso) {
    if (!iso) return { date: '—', time: '' }
    const d = new Date(iso)
    return {
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    }
}

const FIELD_LABELS = {
    item_name: 'Item Name', med_type: 'Type', brand: 'Brand',
    uom: 'UOM', qty: 'Quantity', date_inserted: 'Date Added',
}

function fieldLabel(k) { return FIELD_LABELS[k] ?? k.replace(/_/g, ' ') }
function fmtVal(k, v, typeLabelMap = {}) {
    if (v === null || v === undefined || v === '') return '—'
    if (k === 'med_type') return typeLabelMap[Number(v)] ?? String(v)
    return String(v)
}

// ── Session-level changes list ────────────────────────────────────────────────

function SessionChangesPanel({ sessionId, onBack, typeLabelMap }) {
    const [logs,    setLogs]    = useState([])
    const [meta,    setMeta]    = useState(null)
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState(null)
    const [rawSearch, setRawSearch] = useState('')
    const [page,    setPage]    = useState(1)
    const debouncedSearch = useDebounce(rawSearch, 350)
    const abortRef = useRef(null)

    const fetchLogs = useCallback(async () => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true); setError(null)
        try {
            const params = new URLSearchParams({ page, per_page: 20, ...(debouncedSearch && { search: debouncedSearch }) })
            const res = await window.axios.get(
                route('inventory.uploadSessionLogs', { sessionId }) + '?' + params.toString(),
                { signal: ctrl.signal }
            )
            setLogs(res.data.data)
            setMeta(res.data.meta)
        } catch (err) {
            if (!window.axios.isCancel(err)) setError('Failed to load changes.')
        } finally {
            setLoading(false)
        }
    }, [sessionId, page, debouncedSearch])

    useEffect(() => { setPage(1) }, [debouncedSearch])
    useEffect(() => { fetchLogs() }, [fetchLogs])

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Sub-header */}
            <div className="px-6 py-3 border-b flex items-center gap-2 shrink-0 bg-muted/20">
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">Changes in Upload #{sessionId}</span>
                <div className="relative flex-1 min-w-0 ml-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search items…"
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        className="h-8 pl-8 text-sm bg-background"
                    />
                    {rawSearch && (
                        <button onClick={() => setRawSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 px-6 py-3">
                            <Skeleton className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48 rounded" />
                                <Skeleton className="h-3 w-64 rounded" />
                            </div>
                        </div>
                    ))
                ) : error ? (
                    <p className="text-sm text-destructive text-center py-10 px-6">{error}</p>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 px-6">
                        <History className="h-10 w-10 opacity-20" />
                        <p className="text-sm">No changes found.</p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const isCreate  = log.action_type === 'IMPORTED' || log.action_type === 'CREATED'
                        const isUpdate  = log.action_type === 'UPDATED'
                        const name      = log.new_values?.item_name ?? log.old_values?.item_name ?? `Item #${log.loggable_id}`
                        const changedFields = isUpdate && log.old_values ? Object.keys(log.old_values) : []

                        return (
                            <div key={log.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/20">
                                <div className={cn(
                                    'flex items-center justify-center w-7 h-7 rounded-full ring-2 shrink-0 mt-0.5',
                                    isCreate  && 'bg-emerald-100 ring-emerald-200 dark:bg-emerald-950 dark:ring-emerald-800',
                                    isUpdate  && 'bg-blue-100 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800',
                                    !isCreate && !isUpdate && 'bg-muted ring-border',
                                )}>
                                    {isCreate  && <Plus   className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                                    {isUpdate  && <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                                    {!isCreate && !isUpdate && <History className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">{name}</span>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[10px] px-1.5 py-0 shrink-0',
                                                isCreate && 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/40',
                                                isUpdate && 'text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/40',
                                            )}
                                        >
                                            {isCreate ? 'Created' : isUpdate ? 'Updated' : log.action_type}
                                        </Badge>
                                    </div>
                                    {isCreate && log.new_values && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {[
                                                log.new_values.med_type && typeLabelMap[log.new_values.med_type],
                                                log.new_values.brand,
                                                log.new_values.uom,
                                                log.new_values.qty != null && `Qty: ${log.new_values.qty}`,
                                            ].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    {isUpdate && changedFields.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {changedFields.map((f) => (
                                                <p key={f} className="text-xs text-muted-foreground">
                                                    <span className="font-medium">{fieldLabel(f)}:</span>{' '}
                                                    <span className="line-through text-destructive/60">{fmtVal(f, log.old_values[f], typeLabelMap)}</span>
                                                    {' → '}
                                                    <span className="text-foreground font-medium">{fmtVal(f, log.new_values?.[f], typeLabelMap)}</span>
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {meta && (
                <div className="border-t px-4 shrink-0 bg-muted/10">
                    <Pagination meta={meta} onPageChange={setPage} />
                </div>
            )}
        </div>
    )
}

// ── Session list row ──────────────────────────────────────────────────────────

function SessionRow({ session, onClick }) {
    const dt = formatDateTime(session.uploaded_at)
    const hasErrors = session.error_count > 0

    return (
        <button
            onClick={onClick}
            className="w-full flex items-start gap-4 px-6 py-4 hover:bg-muted/30 text-left transition-colors border-b last:border-b-0"
        >
            {/* Icon */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-950 ring-4 ring-cyan-200 dark:ring-cyan-800 shrink-0 mt-0.5">
                <Upload className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium truncate">
                        {session.file_name ?? 'Unknown file'}
                    </span>
                    {hasErrors && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/40 shrink-0">
                            {session.error_count} error{session.error_count !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    {session.uploaded_by_emp_name || session.uploaded_by_emp_id || 'Unknown user'}
                    {session.uploaded_by_emp_id && session.uploaded_by_emp_name && (
                        <span className="ml-1 opacity-60">({session.uploaded_by_emp_id})</span>
                    )}
                </p>

                <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {session.created_count} created
                    </span>
                    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Pencil className="h-3 w-3" />
                        {session.updated_count} updated
                    </span>
                    {hasErrors && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            {session.error_count} skipped
                        </span>
                    )}
                </div>
            </div>

            {/* Date + chevron */}
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-medium text-foreground">{dt.date}</span>
                <span className="text-xs text-muted-foreground">{dt.time}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
        </button>
    )
}

// ── Skeleton session rows ─────────────────────────────────────────────────────

function SkeletonSessions() {
    return Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-6 py-4 border-b last:border-b-0">
            <Skeleton className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
            </div>
            <div className="space-y-1.5 shrink-0">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
            </div>
        </div>
    ))
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UploadHistoryDialog({ open, onClose }) {
    const { inventory_types = [] } = usePage().props
    const typeLabelMap = Object.fromEntries(inventory_types.map((t) => [t.id, t.name]))
    const [sessions,   setSessions]   = useState([])
    const [meta,       setMeta]       = useState(null)
    const [loading,    setLoading]    = useState(false)
    const [error,      setError]      = useState(null)
    const [rawSearch,  setRawSearch]  = useState('')
    const [page,       setPage]       = useState(1)
    const [activeSession, setActiveSession] = useState(null) // null = list view

    const debouncedSearch = useDebounce(rawSearch, 350)
    const abortRef = useRef(null)

    const fetchSessions = useCallback(async () => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true); setError(null)
        try {
            const params = new URLSearchParams({ page, per_page: 10, ...(debouncedSearch && { search: debouncedSearch }) })
            const res = await window.axios.get(
                route('inventory.uploadHistory') + '?' + params.toString(),
                { signal: ctrl.signal }
            )
            setSessions(res.data.data)
            setMeta(res.data.meta)
        } catch (err) {
            if (!window.axios.isCancel(err)) setError('Failed to load upload history.')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch])

    useEffect(() => { if (open && !activeSession) fetchSessions() }, [fetchSessions, open, activeSession])
    useEffect(() => { setPage(1) }, [debouncedSearch])

    const handleClose = () => {
        setActiveSession(null)
        setRawSearch('')
        setPage(1)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
            <DialogContent className="max-w-2xl w-full max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

                {/* ── Header ── */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-950 ring-4 ring-cyan-200 dark:ring-cyan-800">
                            <Upload className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">Upload History</DialogTitle>
                            <DialogDescription className="text-xs">
                                All bulk inventory imports — click any session to see what changed.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {activeSession ? (
                    <SessionChangesPanel
                        sessionId={activeSession}
                        onBack={() => setActiveSession(null)}
                        typeLabelMap={typeLabelMap}
                    />
                ) : (
                    <>
                        {/* ── Search ── */}
                        <div className="px-6 py-3 border-b shrink-0 bg-muted/20">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Search by uploader or file name…"
                                    value={rawSearch}
                                    onChange={(e) => setRawSearch(e.target.value)}
                                    className="h-8 pl-8 text-sm bg-background"
                                />
                                {rawSearch && (
                                    <button onClick={() => setRawSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Session list ── */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {loading ? (
                                <SkeletonSessions />
                            ) : error ? (
                                <p className="text-sm text-destructive text-center py-10 px-6">{error}</p>
                            ) : sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 px-6">
                                    <Upload className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">No uploads found.</p>
                                </div>
                            ) : (
                                sessions.map((s) => (
                                    <SessionRow
                                        key={s.id}
                                        session={s}
                                        onClick={() => setActiveSession(s.id)}
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
                    </>
                )}

            </DialogContent>
        </Dialog>
    )
}
