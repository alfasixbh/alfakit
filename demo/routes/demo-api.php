<?php

declare(strict_types=1);

use App\Http\Controllers\DemoApi\SupplierApiController;
use Illuminate\Support\Facades\Route;

/*
 * The fake JSON API behind the Suppliers ApiResource (App\Demo\SupplierApi). Stateless:
 * no session, cookies or CSRF, like a third-party service.
 */
Route::prefix('demo-api')->name('demo-api.')->middleware('throttle:120,1')->group(function (): void {
    Route::match(['GET', 'POST'], 'suppliers', SupplierApiController::class)->name('suppliers');
    Route::match(['GET', 'PATCH', 'PUT', 'DELETE'], 'suppliers/{id}', SupplierApiController::class)->name('suppliers.show')->where('id', 'sup_[a-z0-9]+');
});
