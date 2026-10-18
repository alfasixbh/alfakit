<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates;

use AlfaSix\Alfakit\Mail\Contracts\MailTemplateRepository;
use AlfaSix\AlfakitMailTemplates\Support\DatabaseMailTemplateRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Edited templates are read from the database for every mail that opts in
 * (`UsesEditableTemplate`), on any panel or queue worker; the admin resource is added
 * by `MailTemplatesPlugin`.
 */
class AlfakitMailTemplatesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MailTemplateRepository::class, DatabaseMailTemplateRepository::class);
    }

    public function boot(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'alfakit-mail-templates');

        if ($this->app->runningInConsole()) {
            $this->publishesMigrations([
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'alfakit-mail-templates-migrations');

            $this->publishes([
                __DIR__.'/../resources/lang' => $this->app->langPath('vendor/alfakit-mail-templates'),
            ], 'alfakit-mail-templates-translations');
        }
    }
}
