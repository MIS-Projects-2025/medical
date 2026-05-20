<?php

namespace App\Services;

use App\Imports\InventoryImport;
use App\Models\InventoryType;
use App\Models\MdclInvent;
use App\Models\UploadSession;
use App\Repositories\InventoryRepository;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;

class InventoryService
{
    public function __construct(
        private readonly InventoryRepository $repository
    ) {}

    // ── Read ──────────────────────────────────────────────────────────────────

    public function list(array $filters): array
    {
        $paginator = $this->repository->paginate($filters);

        return [
            'data' => collect($paginator->items())->map(fn($item) => $this->format($item)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
        ];
    }

    public function stats(): array
    {
        return $this->repository->stats();
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public function create(array $data): array
    {
        $item = $this->repository->create($this->sanitize($data));
        return $this->format($item);
    }

    public function update(int $id, array $data): array
    {
        // Handle qty_adjust: add/subtract from current qty
        if (isset($data['qty_adjust']) && $data['qty_adjust'] !== null && $data['qty_adjust'] !== '') {
            $current     = $this->repository->findOrFail($id);
            $data['qty'] = max(0, $current->qty + (int) $data['qty_adjust']);
        }
        unset($data['qty_adjust']);

        $item = $this->repository->update($id, $this->sanitize($data));
        return $this->format($item);
    }

    public function delete(int $id): void
    {
        $this->repository->delete($id);
    }

    public function bulkDelete(array $ids): int
    {
        return $this->repository->bulkDelete(array_map('intval', $ids));
    }

    /**
     * Bulk-update multiple items at once (used by the bulk-edit feature).
     * Each item must have an `id`; other fields are updated as provided.
     */
    public function bulkUpdate(array $items): array
    {
        $updated = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $id = (int) $item['id'];
                unset($item['id']);
                $this->update($id, $item);
                $updated++;
            } catch (\Throwable $e) {
                $errors[] = "Item #{$item['id']}: " . $e->getMessage();
            }
        }

        return ['updated' => $updated, 'errors' => $errors];
    }

    // ── Import ────────────────────────────────────────────────────────────────

    /**
     * Import inventory items from an Excel (.xlsx / .xls) or CSV file.
     * Creates an UploadSession record and tags all log entries with it.
     */
    public function import(UploadedFile $file): array
    {
        $empData = session('emp_data');
        $import  = new InventoryImport();

        Excel::import($import, $file);

        if ($import->rows->isEmpty()) {
            throw new \RuntimeException('No data rows found in the file. Make sure row 1 contains the header.');
        }

        $rows = $import->rows
            ->map(fn($row) => $this->mapImportRow($row->toArray()))
            ->filter(fn($row) => !empty($row['item_name']))
            ->values()
            ->toArray();

        if (empty($rows)) {
            throw new \RuntimeException('No valid rows found. Ensure item_name is filled for each row.');
        }

        // Create the upload session record first so we have an ID to tag logs with
        $session = UploadSession::create([
            'uploaded_by_emp_id'   => $empData['emp_id']   ?? $empData['EMPLOYID'] ?? null,
            'uploaded_by_emp_name' => $empData['emp_name'] ?? null,
            'file_name'            => $file->getClientOriginalName(),
            'created_count'        => 0,
            'updated_count'        => 0,
            'error_count'          => 0,
            'uploaded_at'          => now(),
        ]);

        // Tag all Loggable writes during this batch with the session and IMPORTED action
        MdclInvent::setLogContext([
            'action_type'  => 'IMPORTED',
            'related_type' => UploadSession::class,
            'related_id'   => $session->id,
        ]);

        try {
            $result = $this->repository->upsertBatch($rows);
        } finally {
            MdclInvent::clearLogContext();
        }

        // Update session with final counts
        $session->update([
            'created_count' => $result['created'],
            'updated_count' => $result['updated'],
            'error_count'   => count($result['errors']),
            'errors'        => !empty($result['errors']) ? $result['errors'] : null,
        ]);

        return array_merge($result, ['session_id' => $session->id]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function format($item): array
    {
        return [
            'id'             => $item->id,
            'med_type'       => $item->med_type,
            'med_type_label' => $item->med_type_label,
            'item_name'      => $item->item_name,
            'brand'          => $item->brand,
            'uom'            => $item->uom,
            'qty'            => $item->qty,
            'required_stock' => $item->required_stock,
            'date_inserted'  => $item->date_inserted?->format('Y-m-d'),
            'created_at'     => $item->created_at?->toIso8601String(),
            'updated_at'     => $item->updated_at?->toIso8601String(),
        ];
    }

    private function sanitize(array $data): array
    {
        return array_intersect_key($data, array_flip([
            'med_type', 'uom', 'brand', 'item_name', 'qty', 'required_stock', 'date_inserted',
        ]));
    }

    private function mapImportRow(array $row): array
    {
        // Build name→id map dynamically from DB (cached for the duration of this request)
        static $typeMap = null;
        if ($typeMap === null) {
            $typeMap = InventoryType::nameToIdMap(); // e.g. ['medicine' => 1, 'supply' => 2, ...]
        }
        $validIds   = array_values($typeMap);
        $defaultId  = $validIds[0] ?? 1;

        $medTypeRaw = strtolower(trim((string) ($row['med_type'] ?? $row['type'] ?? '')));
        // Accept the type name (from dropdown) OR a numeric ID
        if (isset($typeMap[$medTypeRaw])) {
            $medType = $typeMap[$medTypeRaw];
        } elseif (is_numeric($medTypeRaw) && in_array((int) $medTypeRaw, $validIds, true)) {
            $medType = (int) $medTypeRaw;
        } else {
            $medType = $defaultId;
        }

        return array_filter([
            'id'            => isset($row['id']) && is_numeric($row['id']) ? (int) $row['id'] : null,
            'med_type'      => $medType,
            'item_name'     => trim((string) ($row['item_name'] ?? '')),
            'brand'         => trim((string) ($row['brand']     ?? '')) ?: null,
            'uom'           => trim((string) ($row['uom']       ?? '')) ?: null,
            'qty'           => max(0, (int) ($row['qty']        ?? 0)),
            'date_inserted' => now()->toDateString(),
        ], fn($v) => $v !== null && $v !== '');
    }
}
