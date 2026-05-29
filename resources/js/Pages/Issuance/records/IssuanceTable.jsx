import { Eye, Package } from 'lucide-react'
import {
    Table, TableHeader, TableBody,
    TableHead, TableRow, TableCell,
} from '@/Components/ui/table'
import { Button }  from '@/Components/ui/button'
import { Badge }   from '@/Components/ui/badge'
import { Skeleton } from '@/Components/ui/skeleton'

function SkeletonRows() {
    return Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
            {Array.from({ length: 6 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full rounded" /></TableCell>
            ))}
        </TableRow>
    ))
}

function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function IssuanceTable({ rows, loading, canViewAll, onView }) {
    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide w-16 pl-4">#</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                        {canViewAll && (
                            <TableHead className="text-xs font-semibold uppercase tracking-wide">Issued By</TableHead>
                        )}
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide w-20 text-center">Items</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide w-20 text-right pr-4">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <SkeletonRows />
                    ) : rows.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={canViewAll ? 6 : 5}
                                className="text-center py-16 text-sm text-muted-foreground"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Package className="h-8 w-8 opacity-20" />
                                    No issuance records found.
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="cursor-pointer hover:bg-muted/40"
                                onClick={() => onView(row)}
                            >
                                <TableCell className="pl-4 text-xs text-muted-foreground font-mono">
                                    #{row.id}
                                </TableCell>
                                <TableCell>
                                    <p className="font-medium text-sm leading-tight">{row.emp_name || '—'}</p>
                                    <p className="text-xs text-muted-foreground">{row.emp_id}</p>
                                </TableCell>
                                {canViewAll && (
                                    <TableCell>
                                        <p className="text-sm leading-tight">{row.issued_by_name || '—'}</p>
                                        <p className="text-xs text-muted-foreground">{row.issued_by_emp_id}</p>
                                    </TableCell>
                                )}
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatDate(row.issue_date)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary" className="tabular-nums text-xs">
                                        {row.items_count}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); onView(row) }}
                                        title="View details"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
