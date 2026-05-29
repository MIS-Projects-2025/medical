import { Search, ShoppingCart, Package, Pill, Wrench, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Input }    from '@/Components/ui/input'
import { Button }   from '@/Components/ui/button'
import { Badge }    from '@/Components/ui/badge'
import { cn }       from '@/lib/utils'
import ServerTable  from '@/Components/ServerTable'
import { Pagination } from '@/Components/Pagination'

// ── Type tabs ─────────────────────────────────────────────────────────────────

const TYPE_TABS = [
    { value: '',  label: 'All',       icon: Package },
    { value: '1', label: 'Medicine',  icon: Pill },
    { value: '2', label: 'Supply',    icon: Package },
    { value: '3', label: 'Equipment', icon: Wrench },
]

// ── Stock cell ────────────────────────────────────────────────────────────────

function StockCell({ qty }) {
    if (qty === 0)  return <span className="flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="h-3 w-3" /> Out</span>
    if (qty <= 10)  return <span className="flex items-center gap-1 text-xs font-medium text-amber-500"><AlertTriangle className="h-3 w-3" /> {qty}</span>
    return <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {qty}</span>
}

const TYPE_BADGE_VARIANTS = { 1: 'info', 2: 'success', 3: 'warning' }

// ── Main component ────────────────────────────────────────────────────────────

export default function ItemPicker({
    items,
    meta,
    loading,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    perPage,
    onPageChange,
    onPerPageChange,
    cartIds,
    onAdd,
}) {
    const columns = [
        {
            key:   'item_name',
            label: 'Item',
            render: (row) => (
                <div>
                    <p className="font-medium text-sm leading-snug">{row.item_name}</p>
                    {row.brand && <p className="text-xs text-muted-foreground mt-0.5">{row.brand}</p>}
                </div>
            ),
        },
        {
            key:   'med_type',
            label: 'Type',
            render: (row) => (
                <Badge variant={TYPE_BADGE_VARIANTS[row.med_type] ?? 'secondary'} className="text-[10px]">
                    {row.med_type_label}
                </Badge>
            ),
        },
        {
            key:   'uom',
            label: 'UOM',
            render: (row) => <span className="text-sm text-muted-foreground">{row.uom || '—'}</span>,
        },
        {
            key:   'qty',
            label: 'Stock',
            render: (row) => <StockCell qty={row.qty} />,
        },
        {
            key:            'action',
            label:          '',
            headerClassName: 'w-20 text-right',
            className:       'text-right',
            render: (row) => {
                const inCart  = cartIds.has(row.id)
                const inStock = row.qty > 0
                return (
                    <Button
                        size="sm"
                        variant={inCart ? 'secondary' : 'default'}
                        className="h-7 px-3 text-xs gap-1"
                        disabled={!inStock || inCart}
                        onClick={() => onAdd(row)}
                    >
                        <ShoppingCart className="h-3 w-3" />
                        {inCart ? 'Added' : 'Add'}
                    </Button>
                )
            },
        },
    ]

    return (
        <div className="space-y-4">
            {/* Type tabs */}
            <div className="flex flex-wrap gap-2">
                {TYPE_TABS.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => setTypeFilter(value)}
                        className={cn(
                            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                            typeFilter === value
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by item name or brand…"
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <ServerTable
                columns={columns}
                data={items}
                orderBy=""
                orderDir="asc"
                onSort={() => {}}
                emptyMessage={loading ? 'Loading items…' : 'No items found.'}
            />

            {/* Pagination */}
            {meta && (
                <Pagination
                    meta={meta}
                    onPageChange={onPageChange}
                    perPage={perPage}
                    onPerPageChange={onPerPageChange}
                    perPageOptions={['10', '15', '25', '50']}
                />
            )}
        </div>
    )
}
