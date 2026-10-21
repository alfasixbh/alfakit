<?php

declare(strict_types=1);

namespace App\Demo;

use Closure;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The demo's stand-in for a supplier management API (an ERP, say): a small JSON REST API
 * served by the demo itself at `/demo-api/suppliers` (routes/demo-api.php) and stored in a
 * JSON file that `demo:reset` re-seeds. `SupplierResource` reads it over HTTP through an
 * `HttpDataSource`, like it would a remote service.
 *
 * Suppliers belong to a store: requests name it in the `X-Store` header (the panel tenant).
 * Requests need `Authorization: Bearer {TOKEN}`. The API validates on its own, including a
 * rule the admin form doesn't know about (unique names per store), so the panel shows API
 * validation errors on its fields.
 */
final class SupplierApi
{
    /** Not a secret: the API only serves seeded demo data. */
    public const TOKEN = 'maison-alfa-demo-api';

    public const CATEGORIES = ['oud', 'florals', 'resins', 'citrus', 'packaging'];

    public const STATUSES = ['active', 'paused'];

    /** @var array<int, array{name: string, email: string, country: string, category: string, status: string, lead_time_days: int, rating: int, notes: string}> */
    private const SEED = [
        ['name' => 'Assam Oud Collective', 'email' => 'orders@assam-oud.example', 'country' => 'IN', 'category' => 'oud', 'status' => 'active', 'lead_time_days' => 45, 'rating' => 5, 'notes' => 'Aged agarwood oil, minimum order 250 ml.'],
        ['name' => 'Grasse Absolutes', 'email' => 'sales@grasse-absolutes.example', 'country' => 'FR', 'category' => 'florals', 'status' => 'active', 'lead_time_days' => 21, 'rating' => 5, 'notes' => 'Rose de mai and jasmine absolutes.'],
        ['name' => 'Dhofar Frankincense Co.', 'email' => 'hello@dhofar-frankincense.example', 'country' => 'OM', 'category' => 'resins', 'status' => 'active', 'lead_time_days' => 14, 'rating' => 4, 'notes' => 'Hojari resin and CO2 extracts.'],
        ['name' => 'Calabria Bergamot', 'email' => 'export@calabria-bergamot.example', 'country' => 'IT', 'category' => 'citrus', 'status' => 'paused', 'lead_time_days' => 30, 'rating' => 4, 'notes' => 'Paused until the winter harvest.'],
        ['name' => 'Taif Rose Farms', 'email' => 'farms@taif-rose.example', 'country' => 'SA', 'category' => 'florals', 'status' => 'active', 'lead_time_days' => 28, 'rating' => 5, 'notes' => 'Taif rose oil, spring harvest only.'],
        ['name' => 'Verrerie du Nord', 'email' => 'atelier@verrerie-nord.example', 'country' => 'FR', 'category' => 'packaging', 'status' => 'active', 'lead_time_days' => 60, 'rating' => 3, 'notes' => 'Flacons and stoppers, custom moulds.'],
        ['name' => 'Somali Myrrh Traders', 'email' => 'trade@somali-myrrh.example', 'country' => 'SO', 'category' => 'resins', 'status' => 'active', 'lead_time_days' => 35, 'rating' => 4, 'notes' => 'Myrrh and opoponax resins.'],
        ['name' => 'Kyoto Paper Boxes', 'email' => 'order@kyoto-boxes.example', 'country' => 'JP', 'category' => 'packaging', 'status' => 'paused', 'lead_time_days' => 50, 'rating' => 4, 'notes' => 'Washi gift boxes for the oud line.'],
        ['name' => 'Seville Neroli', 'email' => 'info@seville-neroli.example', 'country' => 'ES', 'category' => 'citrus', 'status' => 'active', 'lead_time_days' => 18, 'rating' => 4, 'notes' => 'Neroli and petitgrain from bitter orange.'],
        ['name' => 'Cambodian Oud House', 'email' => 'house@khmer-oud.example', 'country' => 'KH', 'category' => 'oud', 'status' => 'active', 'lead_time_days' => 40, 'rating' => 3, 'notes' => 'Sweet Cambodi oud, sustainably cultivated.'],
    ];

    /**
     * Answer the data source's HTTP calls from `respond()` without a network round trip
     * (tests: see `Tests\TestCase`).
     */
    public static function fake(): void
    {
        Http::fake(['*/demo-api/suppliers*' => static function (Request $request) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $id = preg_match('#/demo-api/suppliers/([^/?]+)#', $request->url(), $matches) === 1 ? rawurldecode($matches[1]) : null;
            $token = preg_replace('/^Bearer\s+/', '', $request->header('Authorization')[0] ?? '');

            [$status, $body] = self::respond($request->method(), $id, $query, $request->method() === 'GET' ? [] : $request->data(), $request->header('X-Store')[0] ?? null, $token);

            return Http::response($body, $status);
        }]);
    }

    /**
     * The key of a store's first seeded supplier.
     */
    public static function seededId(string $store, int $index = 0): string
    {
        return 'sup_'.Str::lower(Str::substr(md5($store.$index), 0, 8));
    }

    public static function path(): string
    {
        return storage_path('app/demo-api/'.(app()->runningUnitTests() ? 'testing-' : '').'suppliers.json');
    }

    /**
     * Re-seed every store's suppliers (demo:reset).
     *
     * @param  array<int, string>  $stores
     */
    public static function reset(array $stores = ['manama', 'dubai', 'london']): void
    {
        $data = [];

        foreach ($stores as $store) {
            foreach (self::SEED as $index => $supplier) {
                $id = self::seededId($store, $index);
                $data[$store][$id] = ['id' => $id, ...$supplier, 'updated_at' => now()->subDays(count(self::SEED) - $index)->toIso8601String()];
            }
        }

        self::write($data);
    }

    /**
     * Answer an API request: `[status, body]`. The controller and the demo's tests share it.
     *
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>  $body
     * @return array{0: int, 1: array<string, mixed>|null}
     */
    public static function respond(string $method, ?string $id, array $query, array $body, ?string $store, ?string $token): array
    {
        if ($token !== self::TOKEN) {
            return [401, ['message' => 'Unauthenticated.']];
        }

        $data = self::read();

        if ($store === null || ! isset($data[$store])) {
            return [404, ['message' => 'Unknown store.']];
        }

        $suppliers = $data[$store];

        if ($id !== null && ! isset($suppliers[$id])) {
            return [404, ['message' => 'Supplier not found.']];
        }

        return match (true) {
            $method === 'GET' && $id === null => [200, self::list($suppliers, $query)],
            $method === 'GET' => [200, ['data' => $suppliers[$id]]],
            $method === 'POST' && $id === null => self::save($data, $store, null, $body),
            in_array($method, ['PATCH', 'PUT'], true) && $id !== null => self::save($data, $store, $id, $body),
            $method === 'DELETE' && $id !== null => self::destroy($data, $store, $id),
            default => [405, ['message' => 'Method not allowed.']],
        };
    }

    /**
     * @param  array<string, array<string, mixed>>  $suppliers
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private static function list(array $suppliers, array $query): array
    {
        $rows = collect($suppliers)->values();
        $search = trim((string) ($query['search'] ?? ''));

        if ($search !== '') {
            $rows = $rows->filter(static fn (array $row): bool => Str::contains($row['name'].' '.$row['email'].' '.$row['notes'], $search, ignoreCase: true));
        }

        foreach (['category', 'status', 'country'] as $filter) {
            if (is_string($query[$filter] ?? null) && $query[$filter] !== '') {
                $rows = $rows->where($filter, $query[$filter]);
            }
        }

        $sort = in_array($query['sort'] ?? null, ['name', 'country', 'category', 'lead_time_days', 'rating', 'updated_at'], true) ? $query['sort'] : 'name';
        $rows = $rows->sortBy($sort, SORT_NATURAL | SORT_FLAG_CASE, ($query['direction'] ?? 'asc') === 'desc')->values();

        $perPage = max(1, min(100, (int) ($query['per_page'] ?? 10)));
        $page = max(1, (int) ($query['page'] ?? 1));

        return [
            'data' => $rows->forPage($page, $perPage)->values()->all(),
            'meta' => ['total' => $rows->count(), 'page' => $page, 'per_page' => $perPage],
        ];
    }

    /**
     * @param  array<string, array<string, array<string, mixed>>>  $data
     * @param  array<string, mixed>  $body
     * @return array{0: int, 1: array<string, mixed>}
     */
    private static function save(array $data, string $store, ?string $id, array $body): array
    {
        $names = collect($data[$store])->except($id === null ? [] : [$id])->pluck('name')->map(static fn (string $name): string => Str::lower($name))->all();
        $required = $id === null ? 'required' : 'sometimes';

        $validator = Validator::make($body, [
            'name' => [$required, 'string', 'max:80', static function (string $attribute, mixed $value, Closure $fail) use ($names): void {
                if (in_array(Str::lower((string) $value), $names, true)) {
                    $fail('A supplier with this name already exists in this store.');
                }
            }],
            'email' => [$required, 'email', 'max:120'],
            'country' => [$required, 'string', 'size:2'],
            'category' => [$required, Rule::in(self::CATEGORIES)],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'lead_time_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
            'rating' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:5'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if ($validator->fails()) {
            return [422, ['message' => 'The given data was invalid.', 'errors' => $validator->errors()->toArray()]];
        }

        $id ??= 'sup_'.Str::lower(Str::random(8));
        $supplier = [
            'id' => $id,
            'status' => 'active',
            ...($data[$store][$id] ?? []),
            ...Arr::only($validator->validated(), ['name', 'email', 'country', 'category', 'status', 'lead_time_days', 'rating', 'notes']),
            'updated_at' => now()->toIso8601String(),
        ];
        $supplier['country'] = Str::upper((string) $supplier['country']);

        $created = ! isset($data[$store][$id]);
        $data[$store][$id] = $supplier;
        self::write($data);

        return [$created ? 201 : 200, ['data' => $supplier]];
    }

    /**
     * @param  array<string, array<string, array<string, mixed>>>  $data
     * @return array{0: int, 1: null}
     */
    private static function destroy(array $data, string $store, string $id): array
    {
        unset($data[$store][$id]);
        self::write($data);

        return [204, null];
    }

    /**
     * @return array<string, array<string, array<string, mixed>>>
     */
    private static function read(): array
    {
        if (! is_file(self::path())) {
            self::reset();
        }

        $decoded = json_decode((string) file_get_contents(self::path()), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, array<string, array<string, mixed>>>  $data
     */
    private static function write(array $data): void
    {
        if (! is_dir(dirname(self::path()))) {
            mkdir(dirname(self::path()), 0755, true);
        }

        file_put_contents(self::path(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    }
}
