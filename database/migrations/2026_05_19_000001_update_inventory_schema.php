<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove expiration — quantity alone tracks stock; expiry is inaccurate after restocking
        Schema::table('mdcl_invent', function (Blueprint $table) {
            $table->dropColumn('expiration');
        });

        // Upload sessions — tracks each bulk import event for history/audit
        Schema::create('upload_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('uploaded_by_emp_id', 50)->nullable();
            $table->string('uploaded_by_emp_name', 255)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->json('errors')->nullable();
            $table->timestamp('uploaded_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('mdcl_invent', function (Blueprint $table) {
            $table->dateTime('expiration')->nullable()->after('qty');
        });

        Schema::dropIfExists('upload_sessions');
    }
};
