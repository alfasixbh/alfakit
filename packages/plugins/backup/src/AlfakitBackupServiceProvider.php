<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup;

use Illuminate\Support\ServiceProvider;

class AlfakitBackupServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'alfakit-backup');
    }
}
