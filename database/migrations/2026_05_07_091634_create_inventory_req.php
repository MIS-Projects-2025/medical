<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')
                ->constrained('mdcl_invent')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->integer('headcount_threshold')
                ->comment('e.g. 600, 2001 — extensible for new thresholds');
            $table->integer('required_qty')->default(0);
            $table->timestamps();

            // Prevent duplicate threshold entries for the same inventory item
            $table->unique(['inventory_id', 'headcount_threshold'], 'uq_inv_threshold');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_requirements');
    }
};
