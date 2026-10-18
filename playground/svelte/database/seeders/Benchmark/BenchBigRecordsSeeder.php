<?php

declare(strict_types=1);

namespace Database\Seeders\Benchmark;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Fills bench_big_records with 1,000,000 deterministic rows (BENCH_BIG_ROWS overrides) using
 * chunked multi-row inserts inside transactions, with SQLite's WAL journal and synchronous=OFF
 * while seeding. Idempotent: deletes first. Identical in benchmarks/filament-app.
 *
 *     php artisan db:seed --class="Database\Seeders\Benchmark\BenchBigRecordsSeeder"
 */
class BenchBigRecordsSeeder extends Seeder
{
    private const STATUSES = ['draft', 'active', 'backorder', 'discontinued'];

    private const WORDS = ['Alpha', 'Bravo', 'Cobalt', 'Delta', 'Ember', 'Falcon', 'Granite', 'Harbor', 'Indigo', 'Juniper', 'Kestrel', 'Lumen'];

    public function run(): void
    {
        $rows = (int) (env('BENCH_BIG_ROWS') ?: 1_000_000);
        $pdo = DB::connection()->getPdo();
        $sqlite = DB::connection()->getDriverName() === 'sqlite';
        $started = microtime(true);

        if ($sqlite) {
            $pdo->exec('PRAGMA journal_mode=WAL');
            $pdo->exec('PRAGMA synchronous=OFF');
            $pdo->exec('PRAGMA temp_store=MEMORY');
            $pdo->exec('PRAGMA cache_size=-200000');
        }

        DB::table('bench_big_records')->delete();

        // 8 columns per row; SQLite allows 32,766 bound parameters per statement.
        $perStatement = 500;
        $perTransaction = 50_000;
        $placeholders = implode(',', array_fill(0, $perStatement, '(?,?,?,?,?,?,?,?)'));
        $insert = $pdo->prepare("insert into bench_big_records (id, sku, name, status, quantity, unit_price, created_at, updated_at) values {$placeholders}");
        $base = strtotime('2024-01-01 00:00:00');

        for ($start = 1; $start <= $rows; $start += $perTransaction) {
            $pdo->beginTransaction();
            $end = min($rows, $start + $perTransaction - 1);

            for ($chunk = $start; $chunk <= $end; $chunk += $perStatement) {
                $last = min($end, $chunk + $perStatement - 1);
                $values = [];

                for ($i = $chunk; $i <= $last; $i++) {
                    $stamp = date('Y-m-d H:i:s', $base + (($i * 2654435761) % 63072000));
                    array_push(
                        $values,
                        $i,
                        sprintf('BIG-%07d', $i),
                        self::WORDS[$i % 12].' '.self::WORDS[($i * 7) % 12].' '.$i,
                        self::STATUSES[($i * 31) % 4],
                        ($i * 7919) % 10_000,
                        number_format((($i * 104729) % 100_000) / 100, 2, '.', ''),
                        $stamp,
                        $stamp,
                    );
                }

                if (count($values) === $perStatement * 8) {
                    $insert->execute($values);
                } else {
                    $count = intdiv(count($values), 8);
                    $pdo->prepare('insert into bench_big_records (id, sku, name, status, quantity, unit_price, created_at, updated_at) values '.implode(',', array_fill(0, $count, '(?,?,?,?,?,?,?,?)')))->execute($values);
                }
            }

            $pdo->commit();
        }

        if ($sqlite) {
            $pdo->exec('ANALYZE bench_big_records');
            $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');
            $pdo->exec('PRAGMA journal_mode=DELETE');
            $pdo->exec('PRAGMA synchronous=FULL');
        }

        $this->command?->info(sprintf('bench_big_records: %s rows in %.1fs', number_format($rows), microtime(true) - $started));
    }
}
