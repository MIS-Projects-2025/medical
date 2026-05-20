<?php

namespace App\Http\Controllers;

use App\Services\InventoryTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class InventoryTypeController extends Controller
{
    public function __construct(
        private readonly InventoryTypeService $service
    ) {}

    /** GET /inventory/types — Inertia page */
    public function index(): InertiaResponse
    {
        return Inertia::render('Inventory/Types/InventoryTypes', [
            'types' => $this->service->all(),
        ]);
    }

    /** POST /inventory/types */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', 'unique:inventory_types,name'],
            'color'      => ['required', 'string', 'in:default,secondary,info,success,warning,destructive,violet'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['boolean'],
        ]);

        $validated['sort_order'] ??= 0;
        $validated['is_active']  ??= true;

        return response()->json($this->service->create($validated), 201);
    }

    /** PUT /inventory/types/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', "unique:inventory_types,name,{$id}"],
            'color'      => ['required', 'string', 'in:default,secondary,info,success,warning,destructive,violet'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['boolean'],
        ]);

        return response()->json($this->service->update($id, $validated));
    }

    /** DELETE /inventory/types/{id} */
    public function destroy(int $id): JsonResponse
    {
        $this->service->delete($id);
        return response()->json(['message' => 'Type deleted.']);
    }
}
