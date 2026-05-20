<?php


use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryTypeController;
use App\Http\Middleware\AuthMiddleware;
use Illuminate\Support\Facades\Route;


$app_name = env('APP_NAME', '');

Route::redirect('/', "/$app_name");

Route::prefix($app_name)->middleware(AuthMiddleware::class)->group(function () {
    // ── Inventory item types (CRUD) ───────────────────────────────────────────
    Route::prefix('inventory/types')->name('inventory.types.')->group(function () {
        Route::get('/',      [InventoryTypeController::class, 'index'])->name('index');
        Route::post('/',     [InventoryTypeController::class, 'store'])->name('store');
        Route::put('/{id}',  [InventoryTypeController::class, 'update'])->name('update');
        Route::delete('/{id}', [InventoryTypeController::class, 'destroy'])->name('destroy');
    });

    // ── Inventory items ───────────────────────────────────────────────────────
    Route::prefix('inventory')->name('inventory.')->group(function () {
        // Inertia page
        Route::get('/',                                  [InventoryController::class, 'index'])->name('index');

        // JSON API — data, stats, CRUD, bulk ops
        Route::get('/data',                              [InventoryController::class, 'data'])->name('data');
        Route::get('/stats',                             [InventoryController::class, 'stats'])->name('stats');
        Route::get('/export',                            [InventoryController::class, 'export'])->name('export');
        Route::get('/template',                          [InventoryController::class, 'downloadTemplate'])->name('template');
        Route::get('/upload-history',                    [InventoryController::class, 'uploadHistory'])->name('uploadHistory');
        Route::get('/upload-history/{sessionId}/logs',   [InventoryController::class, 'uploadSessionLogs'])->name('uploadSessionLogs');
        Route::get('/transaction-history',               [InventoryController::class, 'transactionHistory'])->name('transactionHistory');
        Route::post('/',                                 [InventoryController::class, 'store'])->name('store');
        Route::post('/bulk-update',                      [InventoryController::class, 'bulkUpdate'])->name('bulkUpdate');
        Route::post('/bulk-upload',                      [InventoryController::class, 'bulkUpload'])->name('bulkUpload');
        Route::get('/{id}/logs',                         [InventoryController::class, 'logs'])->name('logs');
        Route::put('/{id}',                              [InventoryController::class, 'update'])->name('update');
        Route::delete('/bulk',                           [InventoryController::class, 'bulkDelete'])->name('bulkDelete');
        Route::delete('/{id}',                           [InventoryController::class, 'destroy'])->name('destroy');
    });
});
