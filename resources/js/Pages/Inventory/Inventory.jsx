import { useState, useCallback, useEffect, useRef } from 'react'
import { Head } from '@inertiajs/react'
import { Plus, UploadCloud, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Button }       from '@/components/ui/button'
import { Pagination }   from '@/Components/Pagination'

import InventoryStats     from './components/InventoryStats'
import InventoryFilters   from './components/InventoryFilters'
import InventoryTable     from './components/InventoryTable'
import InventoryFormSheet from './components/InventoryFormSheet'
import BulkUploadModal    from './components/BulkUploadModal'
import BulkActionsBar     from './components/BulkActionsBar'

import { useDebounce }          from './hooks/useDebounce'
import { useInventoryData, useInventoryStats, useInventoryMutations } from './hooks/useInventory'

// ── Default filter state ──────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
    search:       '',
    med_type:     '',
    stock_status: '',
    expiry:       '',
    sort_by:      'id',
    sort_dir:     'desc',
    per_page:     '15',
    page:         1,
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Inventory() {
    // ── Filter state ──────────────────────────────────────────────────────────
    const [rawSearch,  setRawSearch]  = useState('')
    const [filters,    setFilters]    = useState(DEFAULT_FILTERS)
    const debouncedSearch = useDebounce(rawSearch, 400)

    const effectiveFilters = { ...filters, search: debouncedSearch }

    // ── Selection state ───────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(new Set())

    // ── Modal / sheet state ───────────────────────────────────────────────────
    const [sheetOpen,  setSheetOpen]  = useState(false)
    const [editItem,   setEditItem]   = useState(null)
    const [uploadOpen, setUploadOpen] = useState(false)

    // ── Fullscreen (native browser API) ──────────────────────────────────────
    const tableRef = useRef(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) {
            tableRef.current?.requestFullscreen?.()
        } else {
            document.exitFullscreen?.()
        }
    }, [isFullscreen])

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange']
        events.forEach((e) => document.addEventListener(e, handler))
        return () => events.forEach((e) => document.removeEventListener(e, handler))
    }, [])

    // ── Stats refresh key ─────────────────────────────────────────────────────
    const [statsKey, setStatsKey] = useState(0)
    const refreshStats = useCallback(() => setStatsKey((k) => k + 1), [])

    // ── Data hooks ────────────────────────────────────────────────────────────
    const { rows, meta, loading, error, refetch } = useInventoryData(effectiveFilters)
    const { stats, loading: statsLoading }         = useInventoryStats(statsKey)

    const {
        saving, uploading,
        createItem, updateItem, deleteItem, bulkDelete, bulkUpload,
    } = useInventoryMutations({
        rows,
        setRows: () => refetch(),
        onRefreshStats: refreshStats,
    })

    // ── Filter helpers ────────────────────────────────────────────────────────

    const handleFilterChange = (key, value) => {
        if (key === 'search') {
            setRawSearch(value)
            setFilters((f) => ({ ...f, page: 1 }))
        } else {
            setFilters((f) => ({ ...f, [key]: value, page: 1 }))
        }
        setSelectedIds(new Set())
    }

    const handleReset = () => {
        setRawSearch('')
        setFilters(DEFAULT_FILTERS)
        setSelectedIds(new Set())
    }

    const handleSort = (col) => {
        setFilters((f) => ({
            ...f,
            sort_by:  col,
            sort_dir: f.sort_by === col && f.sort_dir === 'asc' ? 'desc' : 'asc',
            page:     1,
        }))
    }

    const handlePageChange = (p) => setFilters((f) => ({ ...f, page: p }))

    const handlePerPageChange = (v) =>
        setFilters((f) => ({ ...f, per_page: v, page: 1 }))

    // ── Selection helpers ─────────────────────────────────────────────────────

    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(rows.map((r) => r.id)) : new Set())
    }

    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            checked ? next.add(id) : next.delete(id)
            return next
        })
    }

    // ── CRUD actions ──────────────────────────────────────────────────────────

    const openAdd = () => { setEditItem(null); setSheetOpen(true) }
    const openEdit = (row) => { setEditItem(row); setSheetOpen(true) }

    const handleFormSubmit = async (data) => {
        if (editItem) await updateItem(editItem.id, data)
        else          await createItem(data)
        refetch()
    }

    const handleDelete = async (id) => {
        await deleteItem(id)
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
        refetch()
    }

    const handleInlineUpdate = async (id, data) => {
        await updateItem(id, data)
        refetch()
    }

    const handleBulkDelete = async () => {
        const ids = [...selectedIds]
        if (!ids.length) return
        if (!confirm(`Delete ${ids.length} selected item(s)?`)) return
        await bulkDelete(ids)
        setSelectedIds(new Set())
        refetch()
    }

    const handleBulkUpload = async (file, onProgress) => {
        const result = await bulkUpload(file, onProgress)
        refetch()
        return result
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout>
            <Head title="Medical Inventory" />

            <div className="space-y-5">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Medical Inventory</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage medicines, supplies, and equipment
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { refetch(); refreshStats() }}
                            className="gap-1.5"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUploadOpen(true)}
                            className="gap-1.5"
                        >
                            <UploadCloud className="h-3.5 w-3.5" />
                            Bulk Upload
                        </Button>

                        <Button size="sm" onClick={openAdd} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Add Item
                        </Button>
                    </div>
                </div>

                {/* ── Stats cards ── */}
                <InventoryStats stats={stats} loading={statsLoading} />

                {/* ── Filters + fullscreen toggle ── */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <InventoryFilters
                            filters={{ ...filters, search: rawSearch }}
                            onChange={handleFilterChange}
                            onReset={handleReset}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen table'}
                        className="shrink-0 h-9 w-9"
                    >
                        {isFullscreen
                            ? <Minimize2 className="h-4 w-4" />
                            : <Maximize2 className="h-4 w-4" />
                        }
                    </Button>
                </div>

                {/* ── Table section ── */}
                <div
                    ref={tableRef}
                    className={isFullscreen
                        ? 'bg-background flex flex-col h-full p-4 gap-3'
                        : 'space-y-3'
                    }
                >
                    {/* Error banner */}
                    {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    <div className={isFullscreen ? 'flex-1 overflow-auto min-h-0' : ''}>
                        <InventoryTable
                            rows={rows}
                            loading={loading}
                            sortBy={filters.sort_by}
                            sortDir={filters.sort_dir}
                            selectedIds={selectedIds}
                            onSort={handleSort}
                            onSelectAll={handleSelectAll}
                            onSelectRow={handleSelectRow}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onUpdate={handleInlineUpdate}
                            saving={saving}
                        />
                    </div>

                    {/* Pagination */}
                    {meta && (
                        <Pagination
                            meta={meta}
                            onPageChange={handlePageChange}
                            perPage={filters.per_page}
                            onPerPageChange={handlePerPageChange}
                        />
                    )}
                </div>

            </div>

            {/* ── Add / Edit sheet ── */}
            <InventoryFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                editItem={editItem}
                onSubmit={handleFormSubmit}
                saving={saving}
            />

            {/* ── Bulk upload modal ── */}
            <BulkUploadModal
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                onUpload={handleBulkUpload}
                uploading={uploading}
            />

            {/* ── Floating bulk action bar ── */}
            <BulkActionsBar
                selectedCount={selectedIds.size}
                onBulkDelete={handleBulkDelete}
                onClear={() => setSelectedIds(new Set())}
                disabled={saving}
            />

        </AuthenticatedLayout>
    )
}
