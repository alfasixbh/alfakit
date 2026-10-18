<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SupplierResource;

use AlfaSix\Alfakit\Resources\Api\HttpDataSource;
use AlfaSix\Alfakit\Resources\Api\RecordsQuery;
use App\Demo\SupplierApi;
use Illuminate\Http\Client\PendingRequest;

/**
 * Suppliers over HTTP from the demo's fake supplier API (`App\Demo\SupplierApi`), as they
 * would come from an ERP: bearer token, the store (panel tenant) in a header, rows under
 * `data` and the total under `meta.total`.
 */
class SupplierDataSource extends HttpDataSource
{
    protected string $endpoint = '/suppliers';

    protected ?string $recordKey = 'data';

    protected ?string $totalKey = 'meta.total';

    protected int $timeout = 5;

    protected function getBaseUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/demo-api';
    }

    protected function request(): PendingRequest
    {
        return parent::request()
            ->withToken(SupplierApi::TOKEN)
            ->withHeaders(['X-Store' => (string) $this->getTenant()?->getAttribute('slug')]);
    }

    public function search(string $search, int $limit): iterable
    {
        return $this->records(new RecordsQuery(search: $search, perPage: $limit));
    }
}
