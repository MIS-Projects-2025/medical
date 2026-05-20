<?php

namespace App\Http\Controllers;

use App\Exports\InventoryExport;
use App\Exports\InventoryTemplateExport;
use App\Models\InventoryType;
use App\Services\InventoryService;
use App\Services\MedicalLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryController extends Controller
{
    public function __construct(
        private readonly InventoryService    $service,
        private readonly MedicalLogService   $logService,
    ) {}

    // ── Page ──────────────────────────────────────────────────────────────────

    public function index(): InertiaResponse
    {
        return Inertia::render('Inventory/Inventory');
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /** GET /inventory/data — paginated list with search/filter/sort */
    public function data(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search', 'med_type', 'stock_status',
            'sort_by', 'sort_dir', 'per_page', 'page',
        ]);

        return response()->json($this->service->list($filters));
    }

    /** GET /inventory/stats — aggregate counts for the stat cards */
    public function stats(): JsonResponse
    {
        return response()->json($this->service->stats());
    }

    /** POST /inventory — create a new inventory item */
    public function store(Request $request): JsonResponse
    {
        $activeTypeIds = InventoryType::active()->pluck('id')->toArray();

        $validated = $request->validate([
            'item_name'      => ['required', 'string', 'max:255'],
            'med_type'       => ['required', 'integer', Rule::in($activeTypeIds)],
            'qty'            => ['required', 'integer', 'min:0'],
            'uom'            => ['nullable', 'string', 'max:50'],
            'brand'          => ['nullable', 'string', 'max:255'],
            'required_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['date_inserted'] = now()->toDateString();

        return response()->json($this->service->create($validated), 201);
    }

    /** PUT /inventory/{id} — update a single item; supports qty_adjust */
    public function update(Request $request, int $id): JsonResponse
    {
        $activeTypeIds = InventoryType::active()->pluck('id')->toArray();

        $validated = $request->validate([
            'item_name'      => ['required', 'string', 'max:255'],
            'med_type'       => ['required', 'integer', Rule::in($activeTypeIds)],
            'qty'            => ['nullable', 'integer', 'min:0'],
            'qty_adjust'     => ['nullable', 'integer'],
            'uom'            => ['nullable', 'string', 'max:50'],
            'brand'          => ['nullable', 'string', 'max:255'],
            'required_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        return response()->json($this->service->update($id, $validated));
    }

    /** DELETE /inventory/{id} — remove a single item */
    public function destroy(int $id): JsonResponse
    {
        $this->service->delete($id);
        return response()->json(['message' => 'Item deleted successfully.']);
    }

    /** POST /inventory/bulk-delete — remove multiple items */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $count = $this->service->bulkDelete($request->ids);
        return response()->json(['deleted' => $count, 'message' => "{$count} item(s) deleted."]);
    }

    /** POST /inventory/bulk-update — update multiple items at once (bulk edit) */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $activeTypeIds = InventoryType::active()->pluck('id')->toArray();

        $request->validate([
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.id'              => ['required', 'integer'],
            'items.*.item_name'       => ['required', 'string', 'max:255'],
            'items.*.med_type'        => ['required', 'integer', Rule::in($activeTypeIds)],
            'items.*.qty'             => ['nullable', 'integer', 'min:0'],
            'items.*.qty_adjust'      => ['nullable', 'integer'],
            'items.*.uom'             => ['nullable', 'string', 'max:50'],
            'items.*.brand'           => ['nullable', 'string', 'max:255'],
            'items.*.required_stock'  => ['nullable', 'integer', 'min:0'],
        ]);

        $result = $this->service->bulkUpdate($request->items);

        return response()->json([
            'message' => "{$result['updated']} item(s) updated.",
            ...$result,
        ]);
    }

    /** GET /inventory/export — download full inventory as .xlsx (filters respected) */
    public function export(Request $request): BinaryFileResponse
    {
        $filters = $request->only(['search', 'med_type', 'stock_status', 'sort_by', 'sort_dir']);

        $typeLabel = InventoryType::find((int) ($filters['med_type'] ?? 0))?->name ?? 'all';
        $filename  = "Medical_inventory_{$typeLabel}_" . now()->format('Ymd') . '.xlsx';

        return Excel::download(new InventoryExport($filters), $filename);
    }

    /** GET /inventory/template — download import template with type dropdown */
    public function downloadTemplate(): BinaryFileResponse
    {
        return Excel::download(new InventoryTemplateExport(), 'inventory_import_template.xlsx');
    }

    /** GET /inventory/{id}/logs — paginated change history for one item */
    public function logs(Request $request, int $id): JsonResponse
    {
        $filters = $request->only('search', 'action_type', 'page', 'per_page');
        return response()->json($this->logService->getForInventoryItem($id, $filters));
    }

    /** GET /inventory/upload-history — paginated list of bulk upload sessions */
    public function uploadHistory(Request $request): JsonResponse
    {
        $filters = $request->only('search', 'page', 'per_page');
        return response()->json($this->logService->getUploadSessions($filters));
    }

    /** GET /inventory/upload-history/{sessionId}/logs — item-level changes for one upload session */
    public function uploadSessionLogs(Request $request, int $sessionId): JsonResponse
    {
        $filters = $request->only('search', 'page', 'per_page');
        return response()->json($this->logService->getForUploadSession($sessionId, $filters));
    }

    /** GET /inventory/transaction-history — qty adjustment transaction history across all items */
    public function transactionHistory(Request $request): JsonResponse
    {
        $filters = $request->only('search', 'action_type', 'date_from', 'date_to', 'page', 'per_page');
        return response()->json($this->logService->getTransactionHistory($filters));
    }

    /** POST /inventory/bulk-upload — import from Excel (.xlsx/.xls) or CSV */
    public function bulkUpload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240'],
        ]);

        try {
            $result = $this->service->import($request->file('file'));
            return response()->json([
                'message' => "Import complete: {$result['created']} created, {$result['updated']} updated.",
                ...$result,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to read file: ' . $e->getMessage()], 422);
        }
    }
}
