<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth;

use Illuminate\Support\ServiceProvider;

class AlfakitHealthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'alfakit-health');
    }
}
