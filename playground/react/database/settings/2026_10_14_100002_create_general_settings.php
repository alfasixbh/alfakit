<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

/** alfasix/alfakit-settings: the values edited on System › General settings. */
return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.site_name', 'AlfaKit Playground');
        $this->migrator->add('general.tagline', 'Admin panels for Laravel, rendered with Inertia');
        $this->migrator->add('general.support_email', 'support@example.com');
        $this->migrator->add('general.posts_per_page', 12);
        $this->migrator->add('general.maintenance_mode', false);
        $this->migrator->add('general.allowed_locales', ['en', 'ar', 'fr']);
    }
};
