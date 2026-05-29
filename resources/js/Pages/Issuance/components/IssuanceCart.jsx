import { ShoppingCart, Trash2, ClipboardList, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button }   from '@/Components/ui/button'
import { Input }    from '@/Components/ui/input'
import { Label }    from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Separator } from '@/Components/ui/separator'
import { Badge }    from '@/Components/ui/badge'
import { cn } from '@/lib/utils'

const MED_TYPE_COLORS = { 1: 'info', 2: 'success', 3: 'warning' }

// ── Cart item row ─────────────────────────────────────────────────────────────

function CartItem({ item, onRemove, onUpdateQty }) {
    const handleQty = (e) => {
        const v = parseInt(e.target.value, 10)
        if (!isNaN(v)) onUpdateQty(item.id, v)
    }

    const step = (delta) => onUpdateQty(item.id, Math.max(1, Math.min(item.qty, item.qty_issued + delta)))

    return (
        <div className="flex items-start gap-3 py-3">
            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-2">{item.item_name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant={MED_TYPE_COLORS[item.med_type] ?? 'secondary'} className="text-[10px] px-1.5 py-0">
                        {item.med_type_label}
                    </Badge>
                    {item.uom && (
                        <span className="text-[10px] text-muted-foreground">{item.uom}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">max {item.qty}</span>
                </div>
            </div>

            {/* Qty stepper */}
            <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-0.5">
                    <button
                        type="button"
                        onClick={() => step(1)}
                        disabled={item.qty_issued >= item.qty}
                        className="h-4 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                        <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        disabled={item.qty_issued <= 1}
                        className="h-4 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                        <ChevronDown className="h-3 w-3" />
                    </button>
                </div>
                <Input
                    type="number"
                    value={item.qty_issued}
                    onChange={handleQty}
                    min={1}
                    max={item.qty}
                    className="h-8 w-14 text-center text-sm tabular-nums px-1"
                />
            </div>

            {/* Remove */}
            <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 mt-0.5"
                title="Remove"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IssuanceCart({
    cart,
    notes,
    setNotes,
    onRemove,
    onUpdateQty,
    onSubmit,
    submitting,
    employee,
}) {
    const totalItems = cart.reduce((s, c) => s + c.qty_issued, 0)
    const canSubmit  = !!employee && cart.length > 0 && !submitting

    return (
        <div className="rounded-lg border flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Cart</span>
                </div>
                {cart.length > 0 && (
                    <Badge variant="secondary" className="tabular-nums">
                        {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </Badge>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto max-h-[360px]">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground gap-3">
                        <div className="rounded-full bg-muted p-4">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Your cart is empty</p>
                            <p className="text-xs mt-0.5">Add items from the list on the left</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y px-4">
                        {cart.map((item) => (
                            <CartItem
                                key={item.id}
                                item={item}
                                onRemove={onRemove}
                                onUpdateQty={onUpdateQty}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
                <>
                    <Separator />
                    <div className="px-4 py-3 bg-muted/10">
                        <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-muted-foreground">Total units</span>
                            <span className="font-semibold tabular-nums">{totalItems}</span>
                        </div>
                    </div>
                </>
            )}

            {/* Notes */}
            <div className="px-4 pb-3">
                <Label htmlFor="issuance-notes" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    <ClipboardList className="inline h-3.5 w-3.5 mr-1" />
                    Notes <span className="font-normal">(optional)</span>
                </Label>
                <Textarea
                    id="issuance-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Purpose, recipient details…"
                    rows={2}
                    maxLength={500}
                    className="text-sm resize-none"
                />
            </div>

            {/* Submit */}
            <div className="px-4 pb-4">
                {!employee && (
                    <p className="text-xs text-muted-foreground text-center mb-2">
                        Select an employee to issue items
                    </p>
                )}
                <Button
                    className="w-full gap-2"
                    onClick={onSubmit}
                    disabled={!canSubmit}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing…
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="h-4 w-4" />
                            Issue Now
                            {cart.length > 0 && (
                                <Badge variant="secondary" className="ml-1 tabular-nums">
                                    {cart.length}
                                </Badge>
                            )}
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
