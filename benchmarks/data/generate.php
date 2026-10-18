<?php

declare(strict_types=1);

/*
 * Deterministic data set shared by the AlfaKit (playground/react) and Filament
 * (benchmarks/filament-app) benchmark apps. Run `php benchmarks/data/generate.php`
 * to (re)write the CSV files next to this script; both seeders read them.
 *
 * 50 vendors, 12 regions, 10,000 records. Same seed => same bytes.
 */

mt_srand(20261011);

/** @param array<int, string|int|float|null> $row */
function csv(mixed $handle, array $row): void
{
    fputcsv($handle, $row, escape: '');
}

$dir = __DIR__;

$words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu'];
$nouns = ['valve', 'bracket', 'sensor', 'cable', 'module', 'housing', 'gasket', 'rotor', 'panel', 'coupler', 'bearing', 'filter', 'spindle', 'relay', 'adapter', 'manifold'];
$statuses = ['draft', 'active', 'backorder', 'discontinued'];
$regionNames = ['North America', 'South America', 'Western Europe', 'Eastern Europe', 'Middle East', 'North Africa', 'Sub-Saharan Africa', 'South Asia', 'East Asia', 'South-East Asia', 'Oceania', 'Central Asia'];

$vendors = fopen("{$dir}/benchmark_vendors.csv", 'w');
csv($vendors, ['id', 'name', 'email']);
for ($i = 1; $i <= 50; $i++) {
    $name = ucfirst($words[($i - 1) % 26]).' '.ucfirst($nouns[($i - 1) % 16]).' Co '.$i;
    csv($vendors, [$i, $name, 'vendor'.$i.'@example.com']);
}
fclose($vendors);

$regions = fopen("{$dir}/benchmark_regions.csv", 'w');
csv($regions, ['id', 'name', 'code']);
foreach ($regionNames as $index => $name) {
    csv($regions, [$index + 1, $name, 'R'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)]);
}
fclose($regions);

$records = fopen("{$dir}/benchmark_records.csv", 'w');
csv($records, ['id', 'vendor_id', 'region_id', 'sku', 'name', 'status', 'is_active', 'quantity', 'unit_price', 'weight', 'rating', 'shipped_at', 'created_at', 'updated_at']);

$base = strtotime('2024-01-01 00:00:00 UTC');

for ($i = 1; $i <= 10000; $i++) {
    $created = $base + mt_rand(0, 730 * 86400);
    $shipped = mt_rand(0, 9) < 8 ? $created + mt_rand(3600, 30 * 86400) : null;

    csv($records, [
        $i,
        mt_rand(1, 50),
        mt_rand(1, 12),
        'SKU-'.str_pad((string) $i, 5, '0', STR_PAD_LEFT),
        ucfirst($words[mt_rand(0, 25)]).' '.$nouns[mt_rand(0, 15)].' '.mt_rand(100, 999),
        $statuses[mt_rand(0, 3)],
        mt_rand(0, 4) < 4 ? 1 : 0,
        mt_rand(0, 5000),
        number_format(mt_rand(100, 250000) / 100, 2, '.', ''),
        number_format(mt_rand(50, 50000) / 100, 2, '.', ''),
        number_format(mt_rand(10, 50) / 10, 1, '.', ''),
        $shipped === null ? '' : gmdate('Y-m-d H:i:s', $shipped),
        gmdate('Y-m-d H:i:s', $created),
        gmdate('Y-m-d H:i:s', $created),
    ]);
}
fclose($records);

echo "Wrote benchmark_vendors.csv (50), benchmark_regions.csv (12), benchmark_records.csv (10000) to {$dir}\n";
