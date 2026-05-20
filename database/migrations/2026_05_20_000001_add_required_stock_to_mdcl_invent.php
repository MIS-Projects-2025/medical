<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mdcl_invent', function (Blueprint $table) {
            $table->unsignedInteger('required_stock')->nullable()->default(null)->after('qty');
        });
    }

    public function down(): void
    {
        Schema::table('mdcl_invent', function (Blueprint $table) {
            $table->dropColumn('required_stock');
        });
    }
};
