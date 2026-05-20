<?php

namespace App\Exports;

use App\Models\InventoryType;
use App\Models\MdclInvent;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    private const ALLOWED_SORTS = [
        'id', 'item_name', 'brand', 'uom', 'qty', 'med_type', 'date_inserted',
    ];

    public function __construct(private readonly array $filters = []) {}

    public function query()
    {
        $query = MdclInvent::query();

        if (!empty($this->filters['search'])) {
            $term = $this->filters['search'];
            $query->where(fn($q) => $q
                ->where('item_name', 'like', "%{$term}%")
                ->orWhere('brand',   'like', "%{$term}%")
                ->orWhere('uom',     'like', "%{$term}%")
            );
        }

        if (!empty($this->filters['med_type'])) {
            $query->where('med_type', (int) $this->filters['med_type']);
        }

        if (!empty($this->filters['stock_status'])) {
            match ($this->filters['stock_status']) {
                'out'   => $query->where('qty', '=', 0),
                'low'   => $query->where('qty', '>', 0)->where('qty', '<=', 10),
                'ok'    => $query->where('qty', '>', 10),
                default => null,
            };
        }

        $sortBy  = in_array($this->filters['sort_by'] ?? '', self::ALLOWED_SORTS, true)
                   ? $this->filters['sort_by'] : 'item_name';
        $sortDir = ($this->filters['sort_dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sortBy, $sortDir);
    }

    public function headings(): array
    {
        return ['#', 'Item Name', 'Type', 'Brand', 'UOM', 'Qty', 'Date Added'];
    }

    public function map($item): array
    {
        static $typeLabels = null;
        if ($typeLabels === null) {
            $typeLabels = InventoryType::idToNameMap();
        }

        return [
            $item->id,
            $item->item_name,
            $typeLabels[$item->med_type] ?? '—',
            $item->brand              ?? '—',
            $item->uom                ?? '—',
            $item->qty,
            $item->date_inserted?->format('Y-m-d') ?? '—',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'    => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'    => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF374151']],
            ],
        ];
    }

    public function title(): string
    {
        return 'Inventory';
    }
}
