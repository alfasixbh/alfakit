<?php

declare(strict_types=1);

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

/** Edited by App\Alfakit\Pages\ManageGeneralSettings (alfasix/alfakit-settings). */
class GeneralSettings extends Settings
{
    public string $site_name;

    public ?string $tagline;

    public string $support_email;

    public int $posts_per_page;

    public bool $maintenance_mode;

    /** @var array<int, string> */
    public array $allowed_locales;

    public static function group(): string
    {
        return 'general';
    }
}
