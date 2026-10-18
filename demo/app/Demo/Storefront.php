<?php

declare(strict_types=1);

namespace App\Demo;

use App\Http\Middleware\SetStorefrontLocale;
use Illuminate\Http\Request;

/**
 * Storefront chrome shared by the three renderers (language menu links).
 */
final class Storefront
{
    /**
     * @return array<int, array{code: string, lang: string, dir: string, label: string, url: string, active: bool}>
     */
    public static function locales(?Request $request = null): array
    {
        $request ??= request();
        $current = app()->getLocale();
        $back = urlencode($request->getRequestUri());

        return array_map(fn (string $code): array => [
            'code' => $code,
            'lang' => str_replace('_', '-', $code),
            'dir' => in_array($code, SetStorefrontLocale::RTL, true) ? 'rtl' : 'ltr',
            'label' => SetStorefrontLocale::NATIVE_NAMES[$code],
            'url' => "/demo/locale/{$code}?back={$back}",
            'active' => $code === $current,
        ], SetStorefrontLocale::LOCALES);
    }
}
