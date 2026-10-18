<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog;

use Illuminate\Support\ServiceProvider;

class AlfakitActivityLogServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'alfakit-activity-log');
    }
}
