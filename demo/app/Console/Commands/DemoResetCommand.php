<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Demo\ProductArtwork;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

/**
 * Rebuild the demo from scratch: fresh schema, seeded shop, empty upload disk.
 * Scheduled hourly in routes/console.php.
 */
class DemoResetCommand extends Command
{
    protected $signature = 'demo:reset {--keep-uploads : Leave files on the demo disk in place}';

    protected $description = 'Re-seed the Maison Alfa demo and clear demo uploads.';

    public function handle(): int
    {
        // Visitors see the branded 503 page ("Back shortly") for the second or two the reset takes.
        $maintenance = ! $this->laravel->runningUnitTests() && ! $this->laravel->isDownForMaintenance();

        if ($maintenance) {
            Artisan::call('down', ['--retry' => 5]);
        }

        try {
            return $this->reset();
        } finally {
            if ($maintenance) {
                Artisan::call('up');
            }
        }
    }

    private function reset(): int
    {
        if (! $this->option('keep-uploads')) {
            $disk = Storage::disk(ProductArtwork::DISK);

            foreach ($disk->directories() as $directory) {
                $disk->deleteDirectory($directory);
            }

            foreach ($disk->files() as $file) {
                $disk->delete($file);
            }

            Storage::disk((string) config('alfakit.uploads.temporary_disk', 'local'))
                ->deleteDirectory((string) config('alfakit.uploads.temporary_directory', 'alfakit-tmp'));

            $this->components->info('Demo uploads cleared.');
        }

        $this->components->task('Migrating and seeding', function (): void {
            Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true], $this->getOutput());
        });

        if (config('session.driver') === 'file' && ! $this->laravel->runningUnitTests()) {
            // Sessions reference users that no longer exist; drop them so visitors land on the login page.
            foreach (glob(storage_path('framework/sessions/*')) ?: [] as $session) {
                @unlink($session);
            }
        }

        $this->components->info('Demo reset. Sign in with demo@alfakit.dev / password.');

        return self::SUCCESS;
    }
}
