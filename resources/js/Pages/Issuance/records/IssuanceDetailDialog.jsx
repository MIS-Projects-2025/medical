import { Package, User, CalendarDays, FileText, X } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from '@/Components/ui/dialog'
import { Badge }     from '@/Components/ui/badge'
import { Separator } from '@/Components/ui/separator'
import {
    Table, TableHeader, TableBody,
    TableHead, TableRow, TableCell,
} from '@/Components/ui/table'

const MED_TYPE_BADGE = {
    1: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400',
    2: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400',
    3: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400',
}

function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function IssuanceDetailDialog({ record, onClose }) {
    const open = !!record

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-2xl w-full max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 ring-4 ring-emerald-200 dark:ring-emerald-800">
                            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">Issuance #{record?.id}</DialogTitle>
                            <DialogDescription className="text-xs">
                                {formatDate(record?.issue_date)}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Meta info */}
                <div className="px-6 py-4 border-b shrink-0 bg-muted/20">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Issued to</p>
                                <p className="font-medium">{record?.emp_name || '—'}</p>
                                <p className="text-xs text-muted-foreground">{record?.emp_id}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Issued by</p>
                                <p className="font-medium">{record?.issued_by_name || '—'}</p>
                                <p className="text-xs text-muted-foreground">{record?.issued_by_emp_id}</p>
                            </div>
                        </div>
                        {record?.notes && (
                            <div className="col-span-2 flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Notes</p>
                                    <p className="text-sm">{record.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items table */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                            Items issued — {record?.items?.length ?? 0}
                        </p>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/30">
                                <TableHead className="text-xs font-semibold uppercase tracking-wide pl-6">Item</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">UOM</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right pr-6">Qty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(record?.items ?? []).length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                                        No items.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                record.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="pl-6">
                                            <p className="font-medium text-sm">{item.item_name}</p>
                                            {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${MED_TYPE_BADGE[item.med_type] ?? ''}`}>
                                                {item.med_type_label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.uom || '—'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-semibold tabular-nums">
                                            {item.qty_issued}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

            </DialogContent>
        </Dialog>
    )
}
