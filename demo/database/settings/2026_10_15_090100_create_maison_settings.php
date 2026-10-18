<?php

declare(strict_types=1);

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('maison.house_name', 'Maison Alfa');
        $this->migrator->add('maison.storefront_announcement', 'Complimentary gift wrapping on every order this month.');
        $this->migrator->add('maison.support_hours', 'Sun–Thu, 09:00–18:00 (Bahrain time)');
        $this->migrator->add('maison.price_display', 'tax_inclusive');
        $this->migrator->add('maison.low_stock_alerts', true);
        $this->migrator->add('maison.weekly_report', true);
        $this->migrator->add('maison.report_recipients', ['owners@example.com']);
    }
};
