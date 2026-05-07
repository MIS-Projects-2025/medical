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
        Schema::create('requestor_tbl', function (Blueprint $table) {
            $table->id();
            $table->string('med_no');
            $table->unsignedInteger('emp_no');
            // Employee fields retained as-is (already normalized)
            $table->string('emp_name');
            $table->string('emp_dept');
            $table->foreignId('inventory_id')
                ->constrained('mdcl_invent')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->integer('curr_qty')->default(0);
            $table->integer('issued_qty')->default(0);
            $table->datetime('date_issued')->nullable();
            $table->unsignedInteger('ack_by')->nullable();
            $table->unsignedInteger('assist_by')->nullable();
            $table->unsignedSmallInteger('process_status')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requestor_tbl');
    }
};
