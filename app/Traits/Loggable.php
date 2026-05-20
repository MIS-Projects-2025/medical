<?php

namespace App\Traits;

use App\Models\MedicalLogs;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\SoftDeletes;

trait Loggable
{
    /**
     * Optional context applied to the next batch of log writes.
     * Set via setLogContext() before a batch operation and clear with clearLogContext().
     */
    protected static array $logContext = [];

    public static function setLogContext(array $context): void
    {
        static::$logContext = $context;
    }

    public static function clearLogContext(): void
    {
        static::$logContext = [];
    }

    public static function bootLoggable()
    {
        static::created(function ($model) {
            $model->writeLog('created');
        });

        static::updated(function ($model) {
            if ($model->isDirty()) {
                $model->writeLog('updated');
            }
        });

        static::deleted(function ($model) {
            $model->writeLog('deleted');
        });

        // Register restored only if SoftDeletes is used
        if (in_array(SoftDeletes::class, class_uses_recursive(static::class))) {
            static::restored(function ($model) {
                $model->writeLog('restored');
            });
        }
    }

    protected function writeLog(string $action): void
    {
        $empData = session('emp_data');
        $context = static::$logContext;

        $dirty = collect($this->getDirty())
            ->except(['updated_at'])
            ->toArray();

        $actionType = $context['action_type'] ?? ($this->currentAction ?? strtoupper($action));

        if ($action === 'updated' && empty($dirty)) return;

        // Format any datetime fields to standard string (local timezone)
        $formatDateFields = function ($array) {
            return collect($array)->map(function ($value, $key) {
                if ($value instanceof Carbon) {
                    return $value->format('Y-m-d H:i:s');
                }
                return $value;
            })->toArray();
        };

        // Build metadata: always include uploader name when available
        $metadata = array_filter(array_merge(
            ['emp_name' => $empData['emp_name'] ?? null],
            $context['metadata'] ?? []
        ));

        MedicalLogs::create([
            'loggable_type' => get_class($this),
            'loggable_id'   => $this->getKey(),
            'action_type'   => $actionType,
            'action_by'     => $empData['emp_id'] ?? $empData['EMPLOYID'] ?? null,
            'action_at'     => now()->format('Y-m-d H:i:s'),
            'old_values'    => $action === 'updated' ? $formatDateFields(array_intersect_key($this->getOriginal(), $dirty)) : null,
            'new_values'    => $action === 'updated' ? $formatDateFields($dirty) : $formatDateFields($this->getAttributes()),
            'related_type'  => $context['related_type'] ?? null,
            'related_id'    => $context['related_id']   ?? ($this->attributes['employid'] ?? null),
            'metadata'      => !empty($metadata) ? $metadata : null,
        ]);
    }

    public function medicalLogs()
    {
        return $this->morphMany(MedicalLogs::class, 'loggable');
    }
}
