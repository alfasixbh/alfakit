<?php

namespace App\Providers;

use App\Support\Documentation;
use App\Support\Examples;
use App\Support\Site\Blog;
use App\Support\Site\Dogfood;
use App\Support\Site\Plugins;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(Documentation::class, fn () => new Documentation(realpath(base_path('content')) ?: base_path('content')));
        $this->app->singleton(Examples::class, fn () => new Examples(app_path('Examples')));
        $this->app->singleton(Blog::class, fn () => new Blog(base_path('content/blog')));
        $this->app->singleton(Plugins::class, fn () => new Plugins(base_path('content/plugins.json')));

        // AlfaKit plugins the site runs on (config/docs.php `dogfood`): registered only when
        // turned on, so the site works without their tables or routes.
        foreach (Dogfood::providers() as $provider) {
            $this->app->register($provider);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
