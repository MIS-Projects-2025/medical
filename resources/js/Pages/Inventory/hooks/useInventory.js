import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { extractApiError } from '../helpers/inventoryHelpers'

const axios = window.axios

// ── useInventoryData ──────────────────────────────────────────────────────────

export function useInventoryData(filters) {
    const [rows,    setRows]    = useState([])
    const [meta,    setMeta]    = useState(null)
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState(null)

    const cancelRef = useRef(null)

    const fetchData = useCallback(async () => {
        cancelRef.current?.abort()
        cancelRef.current = new AbortController()

        setLoading(true)
        setError(null)

        try {
            const clean = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
            )
            const { data } = await axios.get(route('inventory.data'), {
                params: clean,
                signal: cancelRef.current.signal,
            })
            setRows(data.data)
            setMeta(data.meta)
        } catch (err) {
            if (!axios.isCancel(err)) {
                setError(extractApiError(err))
            }
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData() }, [fetchData])

    return { rows, meta, loading, error, refetch: fetchData }
}

// ── useInventoryStats ─────────────────────────────────────────────────────────

export function useInventoryStats(refreshKey = 0) {
    const [stats,   setStats]   = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        axios.get(route('inventory.stats'))
            .then(({ data }) => setStats(data))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [refreshKey])

    return { stats, loading }
}

// ── useInventoryMutations ─────────────────────────────────────────────────────

export function useInventoryMutations({ setRows, onRefreshStats }) {
    const [saving,    setSaving]    = useState(false)
    const [uploading, setUploading] = useState(false)

    // ── Create ──────────────────────────────────────────────────────────────
    const createItem = useCallback(async (formData) => {
        setSaving(true)
        try {
            const { data: item } = await axios.post(route('inventory.store'), formData)
            onRefreshStats?.()
            toast.success('Item added successfully.')
            return item
        } catch (err) {
            toast.error(extractApiError(err))
            throw err
        } finally {
            setSaving(false)
        }
    }, [onRefreshStats])

    // ── Update ──────────────────────────────────────────────────────────────
    const updateItem = useCallback(async (id, formData) => {
        setSaving(true)
        try {
            const { data: updated } = await axios.put(route('inventory.update', { id }), formData)
            setRows?.((prev) => prev.map((r) => (r.id === id ? updated : r)))
            onRefreshStats?.()
            toast.success('Item updated.')
            return updated
        } catch (err) {
            toast.error(extractApiError(err))
            throw err
        } finally {
            setSaving(false)
        }
    }, [setRows, onRefreshStats])

    // ── Bulk Update (bulk edit mode) ─────────────────────────────────────────
    const bulkUpdateItems = useCallback(async (items) => {
        setSaving(true)
        try {
            const { data } = await axios.post(route('inventory.bulkUpdate'), { items })
            onRefreshStats?.()
            if (data.errors?.length) {
                toast.warning(`${data.updated} updated, ${data.errors.length} failed.`)
            } else {
                toast.success(`${data.updated} item(s) updated.`)
            }
            return data
        } catch (err) {
            toast.error(extractApiError(err))
            throw err
        } finally {
            setSaving(false)
        }
    }, [onRefreshStats])

    // ── Delete ──────────────────────────────────────────────────────────────
    const deleteItem = useCallback(async (id) => {
        setRows?.((prev) => prev.filter((r) => r.id !== id))
        try {
            await axios.delete(route('inventory.destroy', { id }))
            onRefreshStats?.()
            toast.success('Item deleted.')
        } catch (err) {
            toast.error(extractApiError(err))
            throw err
        }
    }, [setRows, onRefreshStats])

    // ── Bulk Delete ──────────────────────────────────────────────────────────
    const bulkDelete = useCallback(async (ids) => {
        setRows?.((prev) => prev.filter((r) => !ids.includes(r.id)))
        try {
            const { data } = await axios.delete(route('inventory.bulkDelete'), { data: { ids } })
            onRefreshStats?.()
            toast.success(data.message)
        } catch (err) {
            toast.error(extractApiError(err))
            throw err
        }
    }, [setRows, onRefreshStats])

    // ── Bulk Upload ──────────────────────────────────────────────────────────
    const bulkUpload = useCallback(async (file, onProgress) => {
        setUploading(true)
        const form = new FormData()
        form.append('file', file)

        try {
            const { data } = await axios.post(route('inventory.bulkUpload'), form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total))
                },
            })
            onRefreshStats?.()
            toast.success(data.message)
            return data
        } catch (err) {
            onProgress?.(0)
            toast.error(extractApiError(err))
            throw err
        } finally {
            setUploading(false)
        }
    }, [onRefreshStats])

    return { saving, uploading, createItem, updateItem, bulkUpdateItems, deleteItem, bulkDelete, bulkUpload }
}
