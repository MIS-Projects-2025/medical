<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestorTbl extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'requestor_tbl';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'med_no',
        'emp_no',
        'emp_name',
        'emp_dept',
        'inventory_id',
        'curr_qty',
        'issued_qty',
        'date_issued',
        'ack_by',
        'assist_by',
        'process_status',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'emp_no'         => 'integer',
        'inventory_id'   => 'integer',
        'curr_qty'       => 'integer',
        'issued_qty'     => 'integer',
        'date_issued'    => 'datetime',
        'ack_by'         => 'integer',
        'assist_by'      => 'integer',
        'process_status' => 'integer',
    ];

    /**
     * Process status constants.
     */
    const STATUS_PENDING   = 0;
    const STATUS_APPROVED  = 1;
    const STATUS_ISSUED    = 2;
    const STATUS_CANCELLED = 3;

    /**
     * Human-readable labels for process_status.
     */
    public static array $statusLabels = [
        self::STATUS_PENDING   => 'Pending',
        self::STATUS_APPROVED  => 'Approved',
        self::STATUS_ISSUED    => 'Issued',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    /**
     * Get the human-readable label for this request's process_status.
     */
    public function getProcessStatusLabelAttribute(): string
    {
        return self::$statusLabels[$this->process_status] ?? 'Unknown';
    }

    /**
     * Scope: filter by process status.
     */
    public function scopeWithStatus($query, int $status)
    {
        return $query->where('process_status', $status);
    }

    /**
     * Scope: pending requests only.
     */
    public function scopePending($query)
    {
        return $query->where('process_status', self::STATUS_PENDING);
    }

    /**
     * Scope: issued requests only.
     */
    public function scopeIssued($query)
    {
        return $query->where('process_status', self::STATUS_ISSUED);
    }

    /**
     * Scope: filter by employee number.
     */
    public function scopeForEmployee($query, int $empNo)
    {
        return $query->where('emp_no', $empNo);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * A request is linked to one inventory item.
     */
    public function inventory(): BelongsTo
    {
        return $this->belongsTo(MdclInvent::class, 'inventory_id');
    }
}
