<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class InventoryDataSheet implements FromArray, WithTitle, ShouldAutoSize, WithEvents
{
    private const DATA_ROWS = 1000;

    public function __construct(private readonly array $typeNames) {}

    public function title(): string
    {
        return 'Inventory Data';
    }

    /**
     * Row 1 — instruction note (merged banner).
     * Row 2 — column headers.
     * Rows 3+ — data.
     */
    public function array(): array
    {
        return [
            // Row 1: instruction note
            ['Fill in your inventory below. Select a type from the dropdown in the "type" column.', '', '', '', ''],

            // Row 2: column headers
            ['type', 'item_name', 'brand', 'uom', 'qty'],

            // Sample rows (rows 3–4)
            [$this->typeNames[0] ?? '',                'Sample Item Name', 'Brand Name', 'pcs',    100],
            [$this->typeNames[1] ?? ($this->typeNames[0] ?? ''), 'Another Item', '', 'tablet', 50],
        ];
    }

    public function registerEvents(): array
    {
        $typeNames = $this->typeNames;

        return [
            AfterSheet::class => function (AfterSheet $event) use ($typeNames) {
                $sheet   = $event->sheet->getDelegate();
                $lastRow = self::DATA_ROWS + 2; // 2 header rows, data starts at row 3

                // ── Row 1: instruction banner ─────────────────────────────────
                $sheet->mergeCells('A1:E1');
                $sheet->getStyle('A1:E1')->applyFromArray([
                    'font'      => ['bold' => false, 'italic' => true, 'size' => 10, 'color' => ['argb' => 'FF92400E']],
                    'fill'      => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFFEF3C7']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT,
                                    'vertical'   => Alignment::VERTICAL_CENTER,
                                    'wrapText'   => true],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(28);

                // ── Row 2: column header bar ──────────────────────────────────
                $sheet->getStyle('A2:E2')->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill'      => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF374151']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                    'vertical'   => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getRowDimension(2)->setRowHeight(20);

                // ── Data area border (rows 3+) ────────────────────────────────
                $sheet->getStyle("A3:E{$lastRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color'       => ['argb' => 'FFE5E7EB'],
                        ],
                    ],
                ]);

                // ── Column A: dropdown referencing Lookups sheet ──────────────
                $endRow  = count($typeNames) + 1; // +1 because row 1 is the header in Lookups
                $formula = "Lookups!\$A\$2:\$A\${$endRow}";

                $validation = new DataValidation();
                $validation->setType(DataValidation::TYPE_LIST)
                    ->setErrorStyle(DataValidation::STYLE_STOP)
                    ->setAllowBlank(true)
                    ->setShowDropDown(true)   // true = show dropdown arrow (PhpSpreadsheet inverts this when writing OOXML)
                    ->setShowErrorMessage(true)
                    ->setErrorTitle('Invalid type')
                    ->setError('Please select a type from the dropdown list.')
                    ->setFormula1($formula);

                $sheet->setDataValidation("A3:A{$lastRow}", $validation);

                // Freeze row 1-2 so headers stay visible while scrolling
                $sheet->freezePane('A3');
            },
        ];
    }
}
