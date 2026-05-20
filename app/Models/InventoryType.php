<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryType extends Model
{
    protected $table = 'inventory_types';

    protected $fillable = ['name', 'color', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Build an id→name map for fast lookups (used in import/export).
     */
    public static function idToNameMap(): array
    {
        return static::active()->pluck('name', 'id')->toArray();
    }

    /**
     * Build a lowercased-name→id map for import row mapping.
     */
    public static function nameToIdMap(): array
    {
        return static::active()
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($t) => [strtolower($t->name) => $t->id])
            ->toArray();
    }
}
