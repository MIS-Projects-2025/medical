<?php

namespace App\Exports;

use App\Exports\Sheets\InventoryDataSheet;
use App\Exports\Sheets\InventoryLookupsSheet;
use App\Models\InventoryType;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class InventoryTemplateExport implements WithMultipleSheets
{
    private array $types;

    public function __construct()
    {
        $this->types = InventoryType::active()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['name', 'color'])
            ->all();
    }

    public function sheets(): array
    {
        $typeNames = array_column($this->types, 'name');

        return [
            new InventoryDataSheet($typeNames),         // index 0 — main entry sheet
            new InventoryLookupsSheet($typeNames),      // index 1 — must be visible for cross-sheet dropdown validation
        ];
    }
}
