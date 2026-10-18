<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Plugins;

/** The full store calendar on the Calendar page: month, week, day and list views. */
class PromotionsCalendarWidget extends StoreCalendar
{
    protected static ?string $libraryLabel = 'Store calendar';

    protected ?string $initialView = 'dayGridMonth';

    /** @return array<int, string> */
    protected function getViews(): array
    {
        return ['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek'];
    }

    public static function canView(): bool
    {
        return alfakit()->getTenant() !== null;
    }
}
