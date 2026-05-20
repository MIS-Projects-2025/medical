<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class InventoryLookupsSheet implements WithTitle, WithEvents
{
    public function __construct(private readonly array $typeNames) {}

    public function title(): string
    {
        return 'Lookups';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $sheet->setCellValue('A1', 'Inventory Type');

                foreach ($this->typeNames as $i => $name) {
                    $sheet->setCellValue('A' . ($i + 2), $name);
                }

                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '374151']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $sheet->getColumnDimension('A')->setWidth(24);

                // NOTE: Do NOT hide this sheet. Excel blocks dropdown validation
                // from referencing hidden sheets. Keep it visible but last in tab order.
            },
        ];
    }
}
