<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Jobs;

use AlfaSix\AlfakitBackup\Support\BackupOption;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use RuntimeException;

/**
 * Runs `backup:run` in the background, with `--only-db` or `--only-files` when asked. A
 * failed backup (a nonzero exit code) fails the job, so the queue retries it or records it
 * in `failed_jobs`.
 */
class CreateBackupJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** Seconds the job may run; null for the worker's default. */
    public ?int $timeout = null;

    public function __construct(
        public readonly BackupOption $option = BackupOption::All,
        ?int $timeout = null,
    ) {
        $this->timeout = $timeout;
    }

    public function handle(Kernel $artisan): void
    {
        if ($this->timeout === 0) {
            set_time_limit(0);
        }

        $options = $this->getCommandOptions();
        $exitCode = $artisan->call('backup:run', $options);

        if ($exitCode !== 0) {
            // Only the command line and exit code: its output can name hosts or credentials.
            // spatie/laravel-backup logs the reason and sends its BackupHasFailed notification.
            $flags = implode(' ', array_keys(array_filter($options, static fn (bool|int $value): bool => $value === true)));

            throw new RuntimeException(trim("backup:run {$flags}")." failed with exit code {$exitCode}; see the application log or the backup failure notification for the reason.");
        }
    }

    /**
     * @return array<string, bool|int>
     */
    public function getCommandOptions(): array
    {
        return array_filter([
            '--only-db' => $this->option === BackupOption::OnlyDb,
            '--only-files' => $this->option === BackupOption::OnlyFiles,
            '--timeout' => $this->timeout,
        ], static fn (bool|int|null $value): bool => $value !== null && $value !== false);
    }
}
