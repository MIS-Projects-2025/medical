import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { usePage } from '@inertiajs/react'
import {
    Sheet, SheetContent, SheetHeader,
    SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/components/ui/select'
import StockBadge from './StockBadge'
import { typesToSelectOptions, emptyFormValues, itemToFormValues } from '../helpers/inventoryHelpers'
import { cn } from '@/lib/utils'

function FieldError({ message }) {
    if (!message) return null
    return <p className="text-xs text-destructive mt-1">{message}</p>
}

function FormField({ label, required, error, hint, children }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <FieldError message={error} />
        </div>
    )
}

export default function InventoryFormSheet({ open, onOpenChange, editItem, onSubmit, saving }) {
    const isEdit = !!editItem
    const { inventory_types = [] } = usePage().props
    const typeOptions = typesToSelectOptions(inventory_types)
    const firstTypeValue = typeOptions[0]?.value ?? '1'

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: emptyFormValues(firstTypeValue),
    })

    // Populate form when editing, reset when adding
    useEffect(() => {
        if (open) {
            reset(isEdit ? itemToFormValues(editItem) : emptyFormValues(firstTypeValue))
        }
    }, [open, editItem, isEdit, reset, firstTypeValue])

    const medType      = watch('med_type')
    const qtyAdjust    = watch('qty_adjust')

    // Preview of new qty after adjustment
    const currentQty   = editItem?.qty ?? 0
    const adjNum       = qtyAdjust !== '' && qtyAdjust !== undefined && qtyAdjust !== null
                         ? Number(qtyAdjust)
                         : null
    const previewQty   = adjNum !== null && !isNaN(adjNum)
                         ? Math.max(0, currentQty + adjNum)
                         : null

    const onFormSubmit = async (data) => {
        try {
            const payload = {
                item_name:      data.item_name,
                med_type:       Number(data.med_type),
                brand:          data.brand,
                uom:            data.uom,
                required_stock: data.required_stock !== '' && data.required_stock !== null
                                ? Number(data.required_stock)
                                : null,
            }

            if (isEdit) {
                // Send qty_adjust if the user filled it; otherwise no qty change
                if (data.qty_adjust !== '' && data.qty_adjust !== undefined && data.qty_adjust !== null) {
                    payload.qty_adjust = Number(data.qty_adjust)
                }
            } else {
                payload.qty = Number(data.qty)
            }

            await onSubmit(payload)
            onOpenChange(false)
        } catch {
            // Error toast shown in hook
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle>{isEdit ? 'Edit Inventory Item' : 'Add New Item'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? `Editing: ${editItem?.item_name}`
                            : 'Fill in the details to add a new item to the inventory.'}
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={handleSubmit(onFormSubmit)}
                    className="flex flex-col flex-1 overflow-y-auto"
                >
                    <div className="flex-1 py-6 space-y-5">

                        {/* Item Name */}
                        <FormField label="Item Name" required error={errors.item_name?.message}>
                            <Input
                                placeholder="e.g. Paracetamol 500mg"
                                {...register('item_name', { required: 'Item name is required.' })}
                            />
                        </FormField>

                        {/* Type */}
                        <FormField label="Type" required error={errors.med_type?.message}>
                            <Select
                                value={medType}
                                onValueChange={(v) => setValue('med_type', v, { shouldValidate: true })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input
                                type="hidden"
                                {...register('med_type', { required: 'Type is required.' })}
                            />
                        </FormField>

                        {/* Brand + UOM row */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Brand" error={errors.brand?.message}>
                                <Input
                                    placeholder="e.g. Generic"
                                    {...register('brand')}
                                />
                            </FormField>

                            <FormField label="Unit of Measure" error={errors.uom?.message}>
                                <Input
                                    placeholder="e.g. tablet, ml, pcs"
                                    {...register('uom')}
                                />
                            </FormField>
                        </div>

                        {/* Quantity section */}
                        {isEdit ? (
                            <div className="space-y-3">
                                {/* Current qty display */}
                                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border">
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-0.5">Current Quantity</p>
                                        <p className="text-xl font-bold tabular-nums">{currentQty}</p>
                                    </div>
                                    <StockBadge
                                        qty={currentQty}
                                        requiredStock={editItem?.required_stock}
                                    />
                                </div>

                                {/* Qty Adjust */}
                                <FormField
                                    label="Quantity Adjustment"
                                    error={errors.qty_adjust?.message}
                                    hint="Enter a positive number to add stock, negative to reduce. Leave blank to keep current quantity."
                                >
                                    <Input
                                        type="number"
                                        placeholder="+10 or −5 (optional)"
                                        {...register('qty_adjust')}
                                    />
                                    {previewQty !== null && (
                                        <p className={cn(
                                            'text-xs font-medium mt-1',
                                            adjNum > 0  && 'text-emerald-600 dark:text-emerald-400',
                                            adjNum < 0  && 'text-red-600 dark:text-red-400',
                                            adjNum === 0 && 'text-muted-foreground',
                                        )}>
                                            New quantity after adjustment: {previewQty}
                                        </p>
                                    )}
                                </FormField>
                            </div>
                        ) : (
                            <FormField label="Quantity" required error={errors.qty?.message}>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    {...register('qty', {
                                        required: 'Quantity is required.',
                                        min: { value: 0, message: 'Quantity cannot be negative.' },
                                        valueAsNumber: true,
                                    })}
                                />
                            </FormField>
                        )}

                        {/* Required Stock */}
                        <FormField
                            label="Required Stock"
                            error={errors.required_stock?.message}
                            hint="Minimum quantity before the item is flagged as low stock."
                        >
                            <Input
                                type="number"
                                min={0}
                                placeholder="e.g. 20 (optional)"
                                {...register('required_stock', {
                                    min: { value: 0, message: 'Cannot be negative.' },
                                })}
                            />
                        </FormField>

                    </div>

                    {/* Footer */}
                    <SheetFooter className="pt-4 border-t gap-2">
                        <SheetClose asChild>
                            <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                            {saving
                                ? (isEdit ? 'Saving…' : 'Adding…')
                                : (isEdit ? 'Save Changes' : 'Add Item')}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
