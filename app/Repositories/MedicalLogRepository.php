<?php

namespace App\Repositories;

use App\Models\MedicalLogs;
use App\Models\UploadSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class MedicalLogRepository
{
    /**
     * Paginated logs for a specific model instance.
     */
    public function getForModel(
        string $modelClass,
        int|string $id,
        array $filters = [],
        int $perPage = 10,
        int $page = 1
    ): LengthAwarePaginator {
        $q = MedicalLogs::query()
            ->where('loggable_type', $modelClass)
            ->where('loggable_id',   $id)
            ->orderByDesc('action_at')
            ->orderByDesc('id');

        if (!empty($filters['action_type'])) {
            $q->where('action_type', strtoupper($filters['action_type']));
        }

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $q->where(fn ($q) => $q
                ->where('action_type', 'like', $s)
                ->orWhere('action_by',  'like', $s)
                ->orWhere('remarks',    'like', $s)
            );
        }

        return $q->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Paginated list of upload sessions, newest first.
     */
    public function getUploadSessions(array $filters = [], int $perPage = 15, int $page = 1): LengthAwarePaginator
    {
        $q = UploadSession::query()->orderByDesc('uploaded_at')->orderByDesc('id');

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $q->where(fn ($q) => $q
                ->where('uploaded_by_emp_name', 'like', $s)
                ->orWhere('file_name',           'like', $s)
            );
        }

        return $q->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Paginated log entries that belong to a specific upload session.
     * These are the individual item-level changes made during that upload.
     */
    public function getForSession(
        string $relatedClass,
        int $sessionId,
        array $filters = [],
        int $perPage = 20,
        int $page = 1
    ): LengthAwarePaginator {
        $q = MedicalLogs::query()
            ->where('related_type', $relatedClass)
            ->where('related_id',   $sessionId)
            ->orderByDesc('action_at')
            ->orderByDesc('id');

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $q->where(fn ($q) => $q
                ->where('action_by', 'like', $s)
                ->orWhereRaw("JSON_EXTRACT(new_values, '$.item_name') like ?", [$s])
            );
        }

        return $q->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Paginated transaction history — logs where a qty value appears in new_values.
     * Supports server-side search, action_type, date_from, date_to filters.
     */
    public function getTransactionHistory(array $filters = [], int $perPage = 20, int $page = 1): LengthAwarePaginator
    {
        $q = MedicalLogs::query()
            ->where('loggable_type', \App\Models\MdclInvent::class)
            ->whereRaw("JSON_EXTRACT(new_values, '$.qty') IS NOT NULL")
            ->leftJoin('mdcl_invent', 'mdcl_invent.id', '=', 'medical_logs.loggable_id')
            ->select('medical_logs.*', 'mdcl_invent.item_name as inventory_item_name')
            ->orderByDesc('medical_logs.action_at')
            ->orderByDesc('medical_logs.id');

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $q->where(fn ($q) => $q
                ->where('mdcl_invent.item_name', 'like', $s)
                ->orWhere('medical_logs.action_by', 'like', $s)
                ->orWhereRaw("JSON_EXTRACT(medical_logs.metadata, '$.emp_name') like ?", [$s])
            );
        }

        if (!empty($filters['action_type'])) {
            $q->where('medical_logs.action_type', strtoupper($filters['action_type']));
        }

        if (!empty($filters['date_from'])) {
            $q->whereDate('medical_logs.action_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $q->whereDate('medical_logs.action_at', '<=', $filters['date_to']);
        }

        return $q->paginate($perPage, ['*'], 'page', $page);
    }
}
