<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UploadSession extends Model
{
    protected $table = 'upload_sessions';

    protected $fillable = [
        'uploaded_by_emp_id',
        'uploaded_by_emp_name',
        'file_name',
        'created_count',
        'updated_count',
        'error_count',
        'errors',
        'uploaded_at',
    ];

    protected $casts = [
        'errors'      => 'array',
        'uploaded_at' => 'datetime',
    ];

    /**
     * All medical log entries that were written as part of this upload session.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(MedicalLogs::class, 'related_id')
                    ->where('related_type', self::class);
    }
}
