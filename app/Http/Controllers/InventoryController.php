<?php

namespace App\Http\Controllers;

use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class InventoryController extends Controller
{
    public function __construct(
        private readonly InventoryService $service
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
            'search', 'med_type', 'stock_status', 'expiry',
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
        $validated = $request->validate([
            'item_name'  => ['required', 'string', 'max:255'],
            'med_type'   => ['required', 'integer', 'in:1,2,3'],
            'qty'        => ['required', 'integer', 'min:0'],
            'uom'        => ['nullable', 'string', 'max:50'],
            'brand'      => ['nullable', 'string', 'max:255'],
            'expiration' => ['nullable', 'date'],
        ]);

        $validated['date_inserted'] = now()->toDateString();

        return response()->json($this->service->create($validated), 201);
    }

    /** PUT /inventory/{id} — update a single item */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'item_name'  => ['required', 'string', 'max:255'],
            'med_type'   => ['required', 'integer', 'in:1,2,3'],
            'qty'        => ['required', 'integer', 'min:0'],
            'uom'        => ['nullable', 'string', 'max:50'],
            'brand'      => ['nullable', 'string', 'max:255'],
            'expiration' => ['nullable', 'date'],
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
