<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

/**
 * Reads the first sheet of an Excel/CSV file.
 * WithHeadingRow: row 1 becomes the array keys (lowercased + snake_cased).
 * SkipsEmptyRows: blank rows are ignored automatically.
 */
class InventoryImport implements ToCollection, WithHeadingRow, SkipsEmptyRows
{
    public Collection $rows;

    public function collection(Collection $rows): void
    {
        $this->rows = $rows;
    }

    /**
     * Map the heading row key so it matches our column names exactly,
     * regardless of how the user capitalised or spaced the headers.
     */
    public function headingRow(): int
    {
        return 1;
    }
}
