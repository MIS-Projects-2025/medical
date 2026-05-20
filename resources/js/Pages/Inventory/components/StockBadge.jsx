import { Badge } from '@/components/ui/badge'
import { getStockStatus, STOCK_STATUS_CONFIG } from '../helpers/inventoryHelpers'

/**
 * Displays a colored badge based on quantity.
 * Uses requiredStock as the low-stock threshold when provided; falls back to 10.
 */
export default function StockBadge({ qty, requiredStock = null, showQty = false, className }) {
    const status = getStockStatus(qty, requiredStock)
    const config = STOCK_STATUS_CONFIG[status]

    return (
        <Badge variant={config.variant} className={className}>
            {showQty ? `${qty} — ${config.label}` : config.label}
        </Badge>
    )
}
