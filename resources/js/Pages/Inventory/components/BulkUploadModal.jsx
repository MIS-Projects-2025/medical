import { useState, useRef } from 'react'
import { UploadCloud, FileText, Download, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { downloadExcelTemplate, TEMPLATE_COLUMNS } from '../helpers/inventoryHelpers'
import { cn } from '@/lib/utils'

const ACCEPTED = '.xlsx,.xls,.csv'
const MAX_MB   = 10

// ── Column reference table ────────────────────────────────────────────────────

function ColumnReference() {
    const [open, setOpen] = useState(false)

    return (
        <div className="rounded-lg border text-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
            >
                <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Column Reference
                </span>
                {open
                    ? <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                }
            </button>

            {open && (
                <div className="divide-y">
                    {TEMPLATE_COLUMNS.map((col) => (
                        <div key={col.key} className="flex gap-3 px-3 py-2 items-start">
                            <div className="w-24 shrink-0 flex items-center gap-1.5 pt-0.5">
                                <code className="text-xs font-mono font-semibold text-foreground">
                                    {col.key}
                                </code>
                                {col.required && (
                                    <span className="text-destructive text-xs">*</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {col.hint}
                                </p>
                            </div>
                            <Badge
                                variant={col.required ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                                {col.required ? 'required' : 'optional'}
                            </Badge>
                        </div>
                    ))}

                    {/* Quick example row */}
                    <div className="px-3 py-2 bg-muted/20">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                            Example row
                        </p>
                        <div className="overflow-x-auto">
                            <table className="text-[10px] font-mono w-full">
                                <thead>
                                    <tr>
                                        {TEMPLATE_COLUMNS.map((c) => (
                                            <th key={c.key} className="text-left pr-3 pb-1 text-muted-foreground font-normal">
                                                {c.key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="text-foreground">
                                        <td className="pr-3">1</td>
                                        <td className="pr-3">Paracetamol 500mg</td>
                                        <td className="pr-3">Biogesic</td>
                                        <td className="pr-3">tablet</td>
                                        <td className="pr-3">200</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BulkUploadModal({ open, onOpenChange, onUpload, uploading }) {
    const [file,      setFile]      = useState(null)
    const [progress,  setProgress]  = useState(0)
    const [result,    setResult]    = useState(null)
    const [fileError, setFileError] = useState(null)
    const [dragging,  setDragging]  = useState(false)
    const inputRef = useRef(null)

    const resetState = () => {
        setFile(null)
        setProgress(0)
        setResult(null)
        setFileError(null)
    }

    const handleClose = () => {
        if (!uploading) {
            resetState()
            onOpenChange(false)
        }
    }

    const validateFile = (f) => {
        if (!f) return 'No file selected.'
        if (f.size > MAX_MB * 1024 * 1024) return `File is too large (max ${MAX_MB} MB).`
        const ext = f.name.split('.').pop()?.toLowerCase()
        if (!['xlsx', 'xls', 'csv'].includes(ext)) return 'Only Excel (.xlsx, .xls) or CSV files are accepted.'
        return null
    }

    const pickFile = (f) => {
        const err = validateFile(f)
        setFileError(err)
        setResult(null)
        setFile(err ? null : f)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) pickFile(f)
    }

    const handleUpload = async () => {
        if (!file || uploading) return
        setResult(null)
        try {
            const res = await onUpload(file, setProgress)
            setResult(res)
            setFile(null)
        } catch {
            // Error toast handled in hook
        } finally {
            setProgress(0)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5" />
                        Bulk Upload Inventory
                    </DialogTitle>
                    <DialogDescription>
                        Import multiple items from an Excel (.xlsx) or CSV file.
                        Rows with an existing <code className="text-xs bg-muted px-1 rounded">id</code> are updated; rows without one are created.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-1">

                    {/* Template download */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadExcelTemplate}
                        className="w-full gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Download Sample Template (.xlsx)
                    </Button>

                    {/* Column reference — collapsible */}
                    <ColumnReference />

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={cn(
                            'border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-colors',
                            dragging
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/60 hover:bg-muted/30',
                            uploading && 'pointer-events-none opacity-60'
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ACCEPTED}
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files[0])}
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-primary" />
                                <p className="text-sm font-medium truncate max-w-full px-4">
                                    {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                                {!uploading && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); resetState() }}
                                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"
                                    >
                                        <X className="h-3 w-3" /> Remove
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <UploadCloud className="h-10 w-10" />
                                <p className="text-sm font-medium">
                                    Drop your file here, or{' '}
                                    <span className="text-primary">browse</span>
                                </p>
                                <p className="text-xs">Excel (.xlsx, .xls) or CSV · max {MAX_MB} MB</p>
                            </div>
                        )}
                    </div>

                    {/* File validation error */}
                    {fileError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{fileError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Upload progress */}
                    {uploading && progress > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Uploading…</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    )}

                    {/* Result summary */}
                    {result && (
                        <Alert variant={result.errors?.length ? 'warning' : 'success'}>
                            {result.errors?.length
                                ? <AlertCircle  className="h-4 w-4" />
                                : <CheckCircle2 className="h-4 w-4" />
                            }
                            <AlertTitle>
                                {result.errors?.length ? 'Import completed with warnings' : 'Import successful'}
                            </AlertTitle>
                            <AlertDescription className="space-y-1">
                                <p>
                                    <strong>{result.created}</strong> created,{' '}
                                    <strong>{result.updated}</strong> updated
                                    {result.session_id && (
                                        <span className="text-muted-foreground text-xs ml-1">(Session #{result.session_id})</span>
                                    )}
                                </p>
                                {result.errors?.length > 0 && (
                                    <ul className="list-disc pl-4 text-xs space-y-0.5 mt-1">
                                        {result.errors.slice(0, 5).map((e, i) => (
                                            <li key={i}>{e}</li>
                                        ))}
                                        {result.errors.length > 5 && (
                                            <li>…and {result.errors.length - 5} more</li>
                                        )}
                                    </ul>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={uploading}
                    >
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={!file || uploading || !!fileError}
                            className="gap-2"
                        >
                            <UploadCloud className="h-4 w-4" />
                            {uploading ? 'Uploading…' : 'Upload'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
