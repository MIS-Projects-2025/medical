import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Button }   from '@/Components/ui/button'
import { Badge }    from '@/Components/ui/badge'
import { Input }    from '@/Components/ui/input'
import { Label }    from '@/Components/ui/label'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter,
} from '@/Components/ui/dialog'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from '@/Components/ui/select'
import {
    Table, TableHeader, TableBody,
    TableHead, TableRow, TableCell,
} from '@/Components/ui/table'
import { extractApiError } from '../helpers/inventoryHelpers'

const axios = window.axios

// ── Color options ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
    { value: 'default',     label: 'Neutral' },
    { value: 'secondary',   label: 'Gray' },
    { value: 'info',        label: 'Blue' },
    { value: 'success',     label: 'Green' },
    { value: 'warning',     label: 'Amber' },
    { value: 'destructive', label: 'Red' },
    { value: 'violet',      label: 'Violet' },
]

// ── Type form dialog ──────────────────────────────────────────────────────────

function TypeFormDialog({ open, onOpenChange, editType, onSaved }) {
    const isEdit = !!editType

    const [name,      setName]      = useState(editType?.name       ?? '')
    const [color,     setColor]     = useState(editType?.color      ?? 'secondary')
    const [sortOrder, setSortOrder] = useState(String(editType?.sort_order ?? 0))
    const [saving,    setSaving]    = useState(false)
    const [errors,    setErrors]    = useState({})

    // Reset when dialog opens with new data
    const handleOpen = (v) => {
        if (v) {
            setName(editType?.name       ?? '')
            setColor(editType?.color     ?? 'secondary')
            setSortOrder(String(editType?.sort_order ?? 0))
            setErrors({})
        }
        onOpenChange(v)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setErrors({})

        const payload = { name: name.trim(), color, sort_order: Number(sortOrder), is_active: editType?.is_active ?? true }

        try {
            if (isEdit) {
                const { data } = await axios.put(route('inventory.types.update', { id: editType.id }), payload)
                toast.success(`"${data.name}" updated.`)
                onSaved(data, 'update')
            } else {
                const { data } = await axios.post(route('inventory.types.store'), payload)
                toast.success(`"${data.name}" created.`)
                onSaved(data, 'create')
            }
            onOpenChange(false)
        } catch (err) {
            const apiErrors = err?.response?.data?.errors ?? {}
            setErrors(apiErrors)
            if (!Object.keys(apiErrors).length) {
                toast.error(extractApiError(err))
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Type' : 'Add Item Type'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? `Editing: ${editType?.name}` : 'Define a new category for inventory items.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="type-name">
                            Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="type-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Medicine"
                            autoFocus
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
                    </div>

                    {/* Color + Sort row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Badge Color</Label>
                            <Select value={color} onValueChange={setColor}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COLOR_OPTIONS.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={c.value} className="text-[10px] px-1.5 py-0">
                                                    {c.label}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="sort-order">Sort Order</Label>
                            <Input
                                id="sort-order"
                                type="number"
                                min={0}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground text-xs">Preview:</span>
                        <Badge variant={color}>{name || 'Type Name'}</Badge>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving || !name.trim()}>
                            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save' : 'Add Type')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryTypes({ types: initialTypes }) {
    const [types,      setTypes]      = useState(initialTypes ?? [])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editType,   setEditType]   = useState(null)

    const openAdd = () => { setEditType(null); setDialogOpen(true) }
    const openEdit = (t) => { setEditType(t); setDialogOpen(true) }

    const handleSaved = (savedType, mode) => {
        if (mode === 'create') {
            setTypes((prev) => [...prev, savedType].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
        } else {
            setTypes((prev) => prev.map((t) => (t.id === savedType.id ? savedType : t)))
        }
    }

    const handleToggleActive = async (type) => {
        const newActive = !type.is_active
        setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, is_active: newActive } : t)))
        try {
            await axios.put(route('inventory.types.update', { id: type.id }), {
                name:       type.name,
                color:      type.color,
                sort_order: type.sort_order,
                is_active:  newActive,
            })
            toast.success(`"${type.name}" ${newActive ? 'activated' : 'deactivated'}.`)
        } catch (err) {
            // Revert on failure
            setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, is_active: !newActive } : t)))
            toast.error(extractApiError(err))
        }
    }

    const handleDelete = async (type) => {
        if (!confirm(`Delete type "${type.name}"?\n\nExisting items using this type will retain their current type value.`)) return
        try {
            await axios.delete(route('inventory.types.destroy', { id: type.id }))
            setTypes((prev) => prev.filter((t) => t.id !== type.id))
            toast.success(`"${type.name}" deleted.`)
        } catch (err) {
            toast.error(extractApiError(err))
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title="Inventory Item Types" />

            <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Item Types</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage inventory categories (e.g. Medicine, Supply, Equipment)
                        </p>
                    </div>
                    <Button size="sm" onClick={openAdd} className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add Type
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/30">
                                <TableHead className="w-10 pl-3" />
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">Badge</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide w-24">Sort</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide w-24">Status</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right pr-3 w-28">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                                        No item types defined yet. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                types.map((type) => (
                                    <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                                        <TableCell className="pl-3 text-muted-foreground">
                                            <GripVertical className="h-4 w-4" />
                                        </TableCell>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={type.color ?? 'secondary'}>{type.name}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm tabular-nums">
                                            {type.sort_order}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleToggleActive(type)}
                                                className="flex items-center gap-1.5 text-xs"
                                                title={type.is_active ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                {type.is_active ? (
                                                    <>
                                                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                                                        <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Inactive</span>
                                                    </>
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-right pr-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    onClick={() => openEdit(type)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    onClick={() => handleDelete(type)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-xs text-muted-foreground">
                    Deactivating a type hides it from dropdowns but does not affect existing inventory items.
                </p>
            </div>

            <TypeFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editType={editType}
                onSaved={handleSaved}
            />
        </AuthenticatedLayout>
    )
}
