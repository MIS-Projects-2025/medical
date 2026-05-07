<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryRequirement extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'inventory_requirements';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'inventory_id',
        'headcount_threshold',
        'required_qty',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'inventory_id'        => 'integer',
        'headcount_threshold' => 'integer',
        'required_qty'        => 'integer',
    ];

    /**
     * Scope: filter by a specific headcount threshold.
     */
    public function scopeForHeadcount($query, int $threshold)
    {
        return $query->where('headcount_threshold', $threshold);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * A requirement belongs to an inventory item.
     */
    public function inventory(): BelongsTo
    {
        return $this->belongsTo(MdclInvent::class, 'inventory_id');
    }
}
