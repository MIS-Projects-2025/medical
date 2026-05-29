import { Package, Pill, Wrench, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/Components/ui/card'
import { Skeleton } from '@/Components/ui/skeleton'

const STAT_CARDS = [
    {
        key:   'total',
        label: 'Total Items',
        icon:  Package,
        color: 'text-blue-600 dark:text-blue-400',
        bg:    'bg-blue-50 dark:bg-blue-950/30',
    },
    {
        key:   'medicine',
        label: 'Medicines',
        icon:  Pill,
        color: 'text-violet-600 dark:text-violet-400',
        bg:    'bg-violet-50 dark:bg-violet-950/30',
    },
    {
        key:   'supply',
        label: 'Supplies',
        icon:  Package,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg:    'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
        key:   'equipment',
        label: 'Equipment',
        icon:  Wrench,
        color: 'text-amber-600 dark:text-amber-400',
        bg:    'bg-amber-50 dark:bg-amber-950/30',
    },
    {
        key:   'low_stock',
        label: 'Low Stock',
        icon:  AlertTriangle,
        color: 'text-orange-600 dark:text-orange-400',
        bg:    'bg-orange-50 dark:bg-orange-950/30',
    },
    {
        key:   'out_stock',
        label: 'Out of Stock',
        icon:  XCircle,
        color: 'text-red-600 dark:text-red-400',
        bg:    'bg-red-50 dark:bg-red-950/30',
    },
]

export default function InventoryStats({ stats, loading }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
                <Card key={key}>
                    <CardContent className="px-4 py-3">
                        {loading || !stats ? (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <Skeleton className="h-6 w-6 rounded-md" />
                                    <Skeleton className="h-5 w-10" />
                                </div>
                                <Skeleton className="h-3 w-full" />
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`rounded-md p-1 ${bg} shrink-0`}>
                                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                                    </div>
                                    <p className="text-xl font-bold leading-none tabular-nums">
                                        {stats[key] ?? 0}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    {label}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
