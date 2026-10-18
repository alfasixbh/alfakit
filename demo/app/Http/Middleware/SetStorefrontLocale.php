<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use AlfaSix\Alfakit\Localization\LocaleResolver;
use App\Demo\DemoPlugins;
use App\Demo\Renderer;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The storefront follows the language chosen in the admin panel's locale switcher (same
 * session key), or the one picked with the storefront's own language menu. It offers the same
 * 13 locales as the panels.
 */
class SetStorefrontLocale
{
    public const LOCALES = DemoPlugins::LOCALES;

    /** Each language in its own name and script, so the menu reads the same in every locale. */
    public const NATIVE_NAMES = [
        'en' => 'English',
        'ar' => 'العربية',
        'fr' => 'Français',
        'de' => 'Deutsch',
        'es' => 'Español',
        'it' => 'Italiano',
        'nl' => 'Nederlands',
        'pt_BR' => 'Português (Brasil)',
        'ru' => 'Русский',
        'tr' => 'Türkçe',
        'fa' => 'فارسی',
        'ja' => '日本語',
        'zh_CN' => '简体中文',
    ];

    /** Locales written right to left (the storefront layout sets `dir` from this). */
    public const RTL = ['ar', 'fa'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = (string) $request->session()->get(LocaleResolver::SESSION_KEY, '');

        if (! in_array($locale, self::LOCALES, true)) {
            $locale = in_array($request->getPreferredLanguage(self::LOCALES), self::LOCALES, true)
                ? (string) $request->getPreferredLanguage(self::LOCALES)
                : 'en';
        }

        app()->setLocale($locale);
        Carbon::setLocale($locale);

        // Remember the storefront renderer for the shared plugin pages (/support, /forms).
        $request->session()->put(Renderer::SESSION_KEY, Renderer::current($request));

        return $next($request);
    }
}
