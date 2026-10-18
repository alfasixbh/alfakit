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

/**
 * Runs `backup:run` in the background, with `--only-db` or `--only-files` when asked.
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

        $artisan->call('backup:run', $this->getCommandOptions());
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
