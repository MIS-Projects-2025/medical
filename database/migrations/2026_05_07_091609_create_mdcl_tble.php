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
        Schema::create('mdcl_invent', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('med_type')
                ->comment('1 = medicine, 2 = supply, 3 = equipment');
            $table->string('uom');
            $table->string('brand')->nullable();
            $table->string('item_name')
                ->comment('Replaces the old medicines / supplies / equipment columns');
            $table->integer('qty')->default(0);
            $table->datetime('date_inserted')->useCurrent();
            $table->datetime('expiration')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mdcl_invent');
    }
};
