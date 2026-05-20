<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MdclInvent extends Model
{
    use Loggable;
    /**
     * The table associated with the model.
     */
    protected $table = 'mdcl_invent';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'med_type',
        'uom',
        'brand',
        'item_name',
        'qty',
        'required_stock',
        'date_inserted',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'med_type'       => 'integer',
        'qty'            => 'integer',
        'required_stock' => 'integer',
        'date_inserted'  => 'datetime',
    ];

    /**
     * Med type constants for readability.
     */
    const TYPE_MEDICINE  = 1;
    const TYPE_SUPPLY    = 2;
    const TYPE_EQUIPMENT = 3;

    /**
     * Human-readable labels for med_type.
     */
    public static array $medTypeLabels = [
        self::TYPE_MEDICINE  => 'Medicine',
        self::TYPE_SUPPLY    => 'Supply',
        self::TYPE_EQUIPMENT => 'Equipment',
    ];

    /**
     * Get the human-readable label for this item's med_type.
     */
    public function getMedTypeLabelAttribute(): string
    {
        return self::$medTypeLabels[$this->med_type] ?? 'Unknown';
    }

    /**
     * Scope: filter by medicine type.
     */
    public function scopeMedicines($query)
    {
        return $query->where('med_type', self::TYPE_MEDICINE);
    }

    /**
     * Scope: filter by supply type.
     */
    public function scopeSupplies($query)
    {
        return $query->where('med_type', self::TYPE_SUPPLY);
    }

    /**
     * Scope: filter by equipment type.
     */
    public function scopeEquipment($query)
    {
        return $query->where('med_type', self::TYPE_EQUIPMENT);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * An inventory item has many headcount-based requirements.
     */
    public function requirements(): HasMany
    {
        return $this->hasMany(InventoryRequirement::class, 'inventory_id');
    }

    /**
     * An inventory item can appear in many requests.
     */
    public function requests(): HasMany
    {
        return $this->hasMany(RequestorTbl::class, 'inventory_id');
    }
}
