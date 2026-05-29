import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Head } from '@inertiajs/react'
import { ClipboardList, User, Calendar, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Button }    from '@/Components/ui/button'
import { Label }     from '@/Components/ui/label'
import { Input }     from '@/Components/ui/input'
import { Combobox }  from '@/Components/ui/combobox'

import ItemPicker    from './components/ItemPicker'
import IssuanceCart  from './components/IssuanceCart'

import { useDebounce } from './hooks/useDebounce'

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

// ─────────────────────────────────────────────────────────────────────────────

export default function Issuance() {
    // ── Employee state ────────────────────────────────────────────────────────
    // Combobox gives us the raw value (emp_id string); we cache options to resolve emp_name
    const [employeeId,   setEmployeeId]   = useState(null)
    const [employeeName, setEmployeeName] = useState('')
    const employeeOptionsRef = useRef([])   // cache to resolve emp_name on selection

    // ── Form state ────────────────────────────────────────────────────────────
    const [issueDate, setIssueDate] = useState(today)
    const [notes,     setNotes]     = useState('')

    // ── Item picker state ─────────────────────────────────────────────────────
    const [typeFilter,   setTypeFilter]   = useState('')
    const [search,       setSearch]       = useState('')
    const [items,        setItems]        = useState([])
    const [itemsMeta,    setItemsMeta]    = useState(null)
    const [itemsPage,    setItemsPage]    = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState('15')
    const [itemsLoading, setItemsLoading] = useState(false)

    // ── Cart state ────────────────────────────────────────────────────────────
    const [cart,       setCart]       = useState([])
    const [submitting, setSubmitting] = useState(false)

    const debouncedSearch = useDebounce(search, 350)

    // ── Employee loadOptions (for Combobox) ───────────────────────────────────
    const loadEmployees = useCallback(async (search, page) => {
        const res = await window.axios.get(route('issuance.employees'), {
            params: { search, page },
        })
        const { data, hasMore } = res.data   // { value, label, emp_name }[]
        const options = data.map((e) => ({ value: e.value, label: e.label, emp_name: e.emp_name }))

        // Cache for name resolution when onChange fires
        if (page === 1) employeeOptionsRef.current = options
        else employeeOptionsRef.current = [...employeeOptionsRef.current, ...options]

        return { options, hasMore }
    }, [])

    const handleEmployeeChange = useCallback((val) => {
        setEmployeeId(val || null)
        if (val) {
            const opt = employeeOptionsRef.current.find((o) => String(o.value) === String(val))
            setEmployeeName(opt?.emp_name ?? '')
        } else {
            setEmployeeName('')
        }
    }, [])

    // ── Fetch available items ─────────────────────────────────────────────────
    const fetchItems = useCallback((page = itemsPage, perPage = itemsPerPage) => {
        setItemsLoading(true)
        window.axios
            .get(route('issuance.items'), {
                params: { med_type: typeFilter, search: debouncedSearch, page, per_page: perPage },
            })
            .then((res) => { setItems(res.data.data); setItemsMeta(res.data.meta) })
            .catch(() => { setItems([]); setItemsMeta(null) })
            .finally(() => setItemsLoading(false))
    }, [typeFilter, debouncedSearch, itemsPage, itemsPerPage]) // eslint-disable-line

    // Reset to page 1 when filters change
    useEffect(() => { setItemsPage(1) }, [typeFilter, debouncedSearch])

    useEffect(() => { fetchItems(itemsPage, itemsPerPage) }, [typeFilter, debouncedSearch, itemsPage, itemsPerPage]) // eslint-disable-line

    // ── Cart helpers ──────────────────────────────────────────────────────────
    const cartIds = useMemo(() => new Set(cart.map((c) => c.id)), [cart])

    const addToCart = useCallback((item) => {
        if (cartIds.has(item.id)) return
        setCart((prev) => [...prev, { ...item, qty_issued: 1 }])
        toast.success(`${item.item_name} added to cart`)
    }, [cartIds])

    const removeFromCart = useCallback((id) => {
        setCart((prev) => prev.filter((c) => c.id !== id))
    }, [])

    const updateCartQty = useCallback((id, qty) => {
        setCart((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, qty_issued: Math.max(1, Math.min(c.qty, qty)) } : c
            )
        )
    }, [])

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!employeeId || cart.length === 0) return
        setSubmitting(true)
        try {
            await window.axios.post(route('issuance.store'), {
                emp_id:     employeeId,
                emp_name:   employeeName,
                issue_date: issueDate,
                notes:      notes.trim() || null,
                items:      cart.map((c) => ({
                    inventory_id: c.id,
                    qty_issued:   c.qty_issued,
                })),
            })
            toast.success('Issuance recorded successfully.')
            setCart([])
            setEmployeeId(null)
            setEmployeeName('')
            setNotes('')
            setIssueDate(today)
            fetchItems(itemsPage, itemsPerPage)
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to record issuance.')
        } finally {
            setSubmitting(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout>
            <Head title="Issuance" />

            <div className="space-y-5">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Issue Items</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Dispense medicines, supplies, and equipment to employees
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchItems} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh Items
                    </Button>
                </div>

                {/* ── Issuance details ── */}
                <div className="rounded-lg border">
                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Issuance Details</span>
                    </div>
                    <div className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Employee */}
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm font-medium">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    Employee <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    value={employeeId}
                                    onChange={handleEmployeeChange}
                                    loadOptions={loadEmployees}
                                    placeholder="Search by ID or name…"
                                    disabled={submitting}
                                    clearable
                                />
                            </div>

                            {/* Issue date */}
                            <div className="space-y-1.5">
                                <Label htmlFor="issue-date" className="flex items-center gap-1.5 text-sm font-medium">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    Issue Date <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="issue-date"
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── Main content (item picker + cart) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                    {/* Item picker — 2/3 width */}
                    <div className="lg:col-span-2 rounded-lg border">
                        <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
                            <span className="font-semibold text-sm">Available Items</span>
                            <span className="text-xs text-muted-foreground">(in-stock only)</span>
                        </div>
                        <div className="p-5">
                            <ItemPicker
                                items={items}
                                meta={itemsMeta}
                                loading={itemsLoading}
                                typeFilter={typeFilter}
                                setTypeFilter={(v) => { setTypeFilter(v); setItemsPage(1) }}
                                search={search}
                                setSearch={setSearch}
                                perPage={itemsPerPage}
                                onPageChange={(p) => setItemsPage(p)}
                                onPerPageChange={(v) => { setItemsPerPage(v); setItemsPage(1) }}
                                cartIds={cartIds}
                                onAdd={addToCart}
                            />
                        </div>
                    </div>

                    {/* Cart — 1/3 width, sticky */}
                    <div className="lg:col-span-1 lg:sticky lg:top-4">
                        <IssuanceCart
                            cart={cart}
                            notes={notes}
                            setNotes={setNotes}
                            onRemove={removeFromCart}
                            onUpdateQty={updateCartQty}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                            employee={employeeId}
                        />
                    </div>

                </div>

            </div>
        </AuthenticatedLayout>
    )
}
