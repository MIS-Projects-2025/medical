<?php

namespace App\Services;

use App\Imports\InventoryImport;
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

    // ── Import ────────────────────────────────────────────────────────────────

    /**
     * Import inventory items from an Excel (.xlsx / .xls) or CSV file.
     * Uses Maatwebsite\Excel which auto-detects the format from the extension.
     * Row 1 must be the header row with column names matching TEMPLATE_COLUMNS.
     */
    public function import(UploadedFile $file): array
    {
        $import = new InventoryImport();

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

        return $this->repository->upsertBatch($rows);
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
            'expiration'     => $item->expiration?->format('Y-m-d'),
            'date_inserted'  => $item->date_inserted?->format('Y-m-d'),
            'created_at'     => $item->created_at?->toIso8601String(),
            'updated_at'     => $item->updated_at?->toIso8601String(),
        ];
    }

    private function sanitize(array $data): array
    {
        return array_intersect_key($data, array_flip([
            'med_type', 'uom', 'brand', 'item_name', 'qty', 'expiration', 'date_inserted',
        ]));
    }

    private function mapImportRow(array $row): array
    {
        static $typeMap = ['medicine' => 1, 'supply' => 2, 'equipment' => 3];

        // WithHeadingRow lowercases keys; handle both "med_type" and "type"
        $medTypeRaw = strtolower(trim((string) ($row['med_type'] ?? '')));
        $medType    = $typeMap[$medTypeRaw] ?? (is_numeric($medTypeRaw) ? (int) $medTypeRaw : 1);

        // Excel serial dates: PhpSpreadsheet returns them as integers — convert
        $expiration = $row['expiration'] ?? null;
        if (is_numeric($expiration) && $expiration > 1000) {
            $expiration = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $expiration)
                ->format('Y-m-d');
        } elseif (!empty($expiration)) {
            $expiration = trim((string) $expiration);
        } else {
            $expiration = null;
        }

        return array_filter([
            'id'            => isset($row['id']) && is_numeric($row['id']) ? (int) $row['id'] : null,
            'med_type'      => in_array($medType, [1, 2, 3], true) ? $medType : 1,
            'item_name'     => trim((string) ($row['item_name'] ?? '')),
            'brand'         => trim((string) ($row['brand']     ?? '')) ?: null,
            'uom'           => trim((string) ($row['uom']       ?? '')) ?: null,
            'qty'           => max(0, (int) ($row['qty']        ?? 0)),
            'expiration'    => $expiration,
            'date_inserted' => now()->toDateString(),
        ], fn($v) => $v !== null && $v !== '');
    }
}
