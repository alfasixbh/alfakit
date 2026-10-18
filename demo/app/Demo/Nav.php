<?php

declare(strict_types=1);

namespace App\Demo;

/**
 * Navigation group keys shared by the panel and every resource/page.
 *
 * In a resource: `public static function getNavigationGroup(): ?string { return Nav::group(Nav::CATALOG); }`
 */
final class Nav
{
    public const CATALOG = 'demo.navigation.catalog';

    public const SALES = 'demo.navigation.sales';

    public const CUSTOMERS = 'demo.navigation.customers';

    public const MARKETING = 'demo.navigation.marketing';

    public const REPORTS = 'demo.navigation.reports';

    public const SETTINGS = 'demo.navigation.settings';

    public const SHOWCASE = 'demo.navigation.showcase';

    public const SUPPORT = 'demo.navigation.support';

    public const CONTENT = 'demo.navigation.content';

    public const SYSTEM = 'demo.navigation.system';

    /** @var array<string, string> key => Lucide icon or icon alias */
    public const ICONS = [
        self::CATALOG => 'package',
        self::SALES => 'shopping-bag',
        self::CUSTOMERS => 'users',
        self::MARKETING => 'megaphone',
        self::REPORTS => 'demo::reports', // an icon alias (PlatformServiceProvider::ICONS)
        self::SETTINGS => 'settings',
        self::SHOWCASE => 'layout-grid',
        self::SUPPORT => 'life-buoy',
        self::CONTENT => 'newspaper',
        self::SYSTEM => 'server-cog',
    ];

    /** The translated label a resource or page returns from `getNavigationGroup()`. */
    public static function group(string $key): string
    {
        return __($key);
    }
}
