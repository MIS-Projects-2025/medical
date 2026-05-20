<?php

namespace App\Services;

use App\Models\MdclInvent;
use App\Models\UploadSession;
use App\Repositories\MedicalLogRepository;

class MedicalLogService
{
    public function __construct(
        private readonly MedicalLogRepository $repo
    ) {}

    /**
     * Paginated change history for a single inventory item.
     */
    public function getForInventoryItem(int $id, array $filters): array
    {
        $perPage   = max(1, min(50, (int) ($filters['per_page'] ?? 10)));
        $page      = max(1, (int) ($filters['page'] ?? 1));
        $paginator = $this->repo->getForModel(MdclInvent::class, $id, $filters, $perPage, $page);

        return [
            'data' => collect($paginator->items())->map(fn ($log) => $this->formatLog($log))->values()->all(),
            'meta' => $this->paginatorMeta($paginator),
        ];
    }

    /**
     * Paginated list of all upload sessions (for the upload history panel).
     */
    public function getUploadSessions(array $filters): array
    {
        $perPage   = max(1, min(50, (int) ($filters['per_page'] ?? 15)));
        $page      = max(1, (int) ($filters['page'] ?? 1));
        $paginator = $this->repo->getUploadSessions($filters, $perPage, $page);

        return [
            'data' => collect($paginator->items())->map(fn ($s) => [
                'id'                  => $s->id,
                'uploaded_by_emp_id'  => $s->uploaded_by_emp_id,
                'uploaded_by_emp_name'=> $s->uploaded_by_emp_name,
                'file_name'           => $s->file_name,
                'created_count'       => $s->created_count,
                'updated_count'       => $s->updated_count,
                'error_count'         => $s->error_count,
                'errors'              => $s->errors,
                'uploaded_at'         => $s->uploaded_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => $this->paginatorMeta($paginator),
        ];
    }

    /**
     * Paginated item-level changes that belong to a specific upload session.
     */
    public function getForUploadSession(int $sessionId, array $filters): array
    {
        $perPage   = max(1, min(50, (int) ($filters['per_page'] ?? 20)));
        $page      = max(1, (int) ($filters['page'] ?? 1));
        $paginator = $this->repo->getForSession(UploadSession::class, $sessionId, $filters, $perPage, $page);

        return [
            'data' => collect($paginator->items())->map(fn ($log) => $this->formatLog($log))->values()->all(),
            'meta' => $this->paginatorMeta($paginator),
        ];
    }

    /**
     * Paginated quantity transaction history across all inventory items.
     */
    public function getTransactionHistory(array $filters): array
    {
        $perPage   = max(1, min(50, (int) ($filters['per_page'] ?? 20)));
        $page      = max(1, (int) ($filters['page'] ?? 1));
        $paginator = $this->repo->getTransactionHistory($filters, $perPage, $page);

        return [
            'data' => collect($paginator->items())->map(function ($log) {
                $oldQty = isset($log->old_values['qty']) ? (int) $log->old_values['qty'] : null;
                $newQty = isset($log->new_values['qty']) ? (int) $log->new_values['qty'] : null;
                $adjustedQty = ($oldQty !== null && $newQty !== null) ? $newQty - $oldQty : null;

                $itemName = $log->inventory_item_name
                    ?? $log->new_values['item_name']
                    ?? ($log->old_values['item_name'] ?? null);

                return [
                    'id'              => $log->id,
                    'item_id'         => $log->loggable_id,
                    'item_name'       => $itemName,
                    'action_type'     => $log->action_type,
                    'action_by'       => $log->action_by,
                    'action_by_name'  => $log->metadata['emp_name'] ?? null,
                    'action_at'       => $log->action_at?->toIso8601String(),
                    'current_balance' => $oldQty,
                    'adjusted_qty'    => $adjustedQty,
                    'total_balance'   => $newQty,
                ];
            })->values()->all(),
            'meta' => $this->paginatorMeta($paginator),
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function formatLog($log): array
    {
        return [
            'id'            => $log->id,
            'action_type'   => $log->action_type,
            'action_by'     => $log->action_by,
            'action_by_name'=> $log->metadata['emp_name'] ?? null,
            'action_at'     => $log->action_at?->toIso8601String(),
            'old_values'    => $log->old_values,
            'new_values'    => $log->new_values,
            'remarks'       => $log->remarks,
            'metadata'      => $log->metadata,
            'related_type'  => $log->related_type ? class_basename($log->related_type) : null,
            'related_id'    => $log->related_id,
            'loggable_id'   => $log->loggable_id,
        ];
    }

    private function paginatorMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'from'         => $paginator->firstItem() ?? 0,
            'to'           => $paginator->lastItem()  ?? 0,
            'total'        => $paginator->total(),
            'per_page'     => $paginator->perPage(),
        ];
    }
}
