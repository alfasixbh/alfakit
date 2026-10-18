<?php

declare(strict_types=1);

namespace App\Http\Controllers\DemoApi;

use App\Demo\SupplierApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `/demo-api/suppliers[/{id}]`: the fake supplier API (see `App\Demo\SupplierApi`).
 */
class SupplierApiController
{
    public function __invoke(Request $request, ?string $id = null): JsonResponse
    {
        [$status, $body] = SupplierApi::respond(
            $request->method(),
            $id,
            $request->query(),
            $request->isMethod('GET') ? [] : $request->json()->all(),
            $request->header('X-Store'),
            $request->bearerToken(),
        );

        return response()->json($body, $status);
    }
}
