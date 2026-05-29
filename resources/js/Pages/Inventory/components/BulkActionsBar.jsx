import { Trash2, X } from 'lucide-react'
import { Button } from '@/Components/ui/button'

/**
 * Sticky bar that appears at the bottom when rows are selected.
 * Provides bulk-delete and clear-selection actions.
 */
export default function BulkActionsBar({ selectedCount, onBulkDelete, onClear, disabled }) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm px-5 py-3 animate-in slide-in-from-bottom-4 duration-200">
            <span className="text-sm font-medium text-foreground">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>

            <div className="h-4 w-px bg-border" />

            <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                disabled={disabled}
                className="gap-1.5"
            >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="gap-1"
            >
                <X className="h-3.5 w-3.5" />
                Clear
            </Button>
        </div>
    )
}
