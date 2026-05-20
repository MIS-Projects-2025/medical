<?php

namespace App\Services;

use App\Repositories\InventoryTypeRepository;

class InventoryTypeService
{
    public function __construct(
        private readonly InventoryTypeRepository $repository
    ) {}

    public function all(): array
    {
        return $this->repository->all()->map(fn ($t) => $this->format($t))->values()->all();
    }

    public function create(array $data): array
    {
        $type = $this->repository->create($this->sanitize($data));
        return $this->format($type);
    }

    public function update(int $id, array $data): array
    {
        $type = $this->repository->update($id, $this->sanitize($data));
        return $this->format($type);
    }

    public function delete(int $id): void
    {
        $this->repository->delete($id);
    }

    private function format($type): array
    {
        return [
            'id'         => $type->id,
            'name'       => $type->name,
            'color'      => $type->color,
            'sort_order' => $type->sort_order,
            'is_active'  => $type->is_active,
            'created_at' => $type->created_at?->toIso8601String(),
            'updated_at' => $type->updated_at?->toIso8601String(),
        ];
    }

    private function sanitize(array $data): array
    {
        return array_intersect_key($data, array_flip(['name', 'color', 'sort_order', 'is_active']));
    }
}
