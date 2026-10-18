<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Support;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Str;
use Spatie\Health\ResultStores\ResultStore;
use Spatie\Health\ResultStores\StoredCheckResults\StoredCheckResults;
use Throwable;

/**
 * Reads the latest check results from spatie/laravel-health's first result store
 * (`health.result_stores`), and runs the checks.
 */
final class HealthResults
{
    public static function latest(): ?StoredCheckResults
    {
        try {
            return app(ResultStore::class)->latestResults();
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    /**
     * Run every registered check and store the results (`health:check`).
     */
    public static function run(bool $notify = false): void
    {
        app(Kernel::class)->call('health:check', $notify ? [] : ['--no-notification' => true]);
    }

    /**
     * The latest results as rows, keyed by check name.
     *
     * @return array<string, array{id: string, name: string, label: string, status: string, summary: string, message: string, meta: array<string, mixed>}>
     */
    public static function rows(): array
    {
        $rows = [];

        foreach (self::latest()->storedCheckResults ?? [] as $result) {
            $rows[$result->name] = [
                'id' => $result->name,
                'name' => $result->name,
                'label' => self::checkLabel($result->name, $result->label),
                'status' => $result->status,
                'summary' => $result->shortSummary,
                'message' => (string) $result->notificationMessage,
                'meta' => $result->meta,
            ];
        }

        return $rows;
    }

    /**
     * The label of a check: spatie's checks are named in English ("Debug Mode"), so the
     * default label of a known check is translated (`health.checks.<snake name>`). A label
     * the application set with `->label()` is shown as it is.
     */
    public static function checkLabel(string $name, string $label = ''): string
    {
        $default = (string) Str::of($name)->snake()->replace('_', ' ')->title();

        if ($label !== '' && $label !== $default) {
            return $label;
        }

        $key = 'alfakit-health::health.checks.'.Str::snake($name);

        if ($name !== '' && Lang::has($key)) {
            return (string) __($key);
        }

        return $label !== '' ? $label : $name;
    }

    public static function statusLabel(?string $status): string
    {
        $status = in_array($status, ['ok', 'warning', 'failed', 'crashed', 'skipped'], true) ? $status : 'unknown';

        return (string) __('alfakit-health::health.statuses.'.$status);
    }

    public static function statusColor(?string $status): string
    {
        return match ($status) {
            'ok' => 'success',
            'warning' => 'warning',
            'failed', 'crashed' => 'danger',
            default => 'gray',
        };
    }

    public static function statusIcon(?string $status): string
    {
        return match ($status) {
            'ok' => 'circle-check',
            'warning' => 'triangle-alert',
            'failed', 'crashed' => 'circle-x',
            default => 'circle-minus',
        };
    }

    /**
     * Meta values as "key: value" lines.
     *
     * @param  array<array-key, mixed>  $meta
     * @return array<int, string>
     */
    public static function metaLines(array $meta): array
    {
        $lines = [];

        foreach ($meta as $key => $value) {
            $value = match (true) {
                is_bool($value) => $value ? 'true' : 'false',
                is_scalar($value) || $value === null => (string) $value,
                default => (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            };

            $lines[] = "{$key}: {$value}";
        }

        return $lines;
    }
}
