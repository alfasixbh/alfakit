<?php

declare(strict_types=1);

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

/**
 * House-wide settings of Maison Alfa (alfasix/alfakit-settings over spatie/laravel-settings):
 * shared by every store, edited on the "House settings" page. The storefront shows the
 * announcement; the rest drives back-office notifications in a real shop.
 */
class MaisonSettings extends Settings
{
    public string $house_name;

    public ?string $storefront_announcement;

    public string $support_hours;

    public string $price_display;

    public bool $low_stock_alerts;

    public bool $weekly_report;

    /** @var array<int, string> */
    public array $report_recipients;

    public static function group(): string
    {
        return 'maison';
    }
}
