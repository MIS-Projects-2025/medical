<?php

namespace App\Repositories;

use App\Models\InventoryType;
use Illuminate\Support\Collection;

class InventoryTypeRepository
{
    public function all(): Collection
    {
        return InventoryType::orderBy('sort_order')->orderBy('name')->get();
    }

    public function active(): Collection
    {
        return InventoryType::active()->orderBy('sort_order')->orderBy('name')->get();
    }

    public function findOrFail(int $id): InventoryType
    {
        return InventoryType::findOrFail($id);
    }

    public function create(array $data): InventoryType
    {
        return InventoryType::create($data);
    }

    public function update(int $id, array $data): InventoryType
    {
        $type = $this->findOrFail($id);
        $type->update($data);
        return $type->fresh();
    }

    public function delete(int $id): void
    {
        InventoryType::destroy($id);
    }

    public function activeIds(): array
    {
        return InventoryType::active()->pluck('id')->toArray();
    }
}
