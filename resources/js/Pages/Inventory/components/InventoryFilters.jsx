import { usePage } from '@inertiajs/react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/components/ui/select'
import { typesToSelectOptions } from '../helpers/inventoryHelpers'

const STOCK_OPTIONS = [
    { value: '',    label: 'All Stock' },
    { value: 'ok',  label: 'In Stock' },
    { value: 'low', label: 'Low Stock' },
    { value: 'out', label: 'Out of Stock' },
]

export default function InventoryFilters({ filters, onChange, onReset }) {
    const { inventory_types = [] } = usePage().props
    const typeOptions = typesToSelectOptions(inventory_types)

    const hasActiveFilters =
        filters.search       !== '' ||
        filters.med_type     !== '' ||
        filters.stock_status !== ''

    return (
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search item, brand, UOM…"
                    value={filters.search}
                    onChange={(e) => onChange('search', e.target.value)}
                    className="pl-8"
                />
                {filters.search && (
                    <button
                        type="button"
                        onClick={() => onChange('search', '')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Type filter */}
            <div className="w-full sm:w-40">
                <Select
                    value={filters.med_type}
                    onValueChange={(v) => onChange('med_type', v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        {typeOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stock status filter */}
            <div className="w-full sm:w-40">
                <Select
                    value={filters.stock_status}
                    onValueChange={(v) => onChange('stock_status', v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Stock" />
                    </SelectTrigger>
                    <SelectContent>
                        {STOCK_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-3 gap-1">
                    <X className="h-4 w-4" />
                    Clear
                </Button>
            )}
        </div>
    )
}
