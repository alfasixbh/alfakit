<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Plugins;

/** The dashboard's "This week" card: the same events as the Calendar page, as a week list. */
class ThisWeekCalendar extends StoreCalendar
{
    protected static ?string $libraryLabel = 'This week';

    protected ?string $initialView = 'listWeek';

    protected int|string|array $columnSpan = 'full';

    protected static ?int $sort = 6;

    protected function getHeading(): ?string
    {
        return __('plugins.calendar.this_week');
    }

    /** @return array<int, string> */
    protected function getViews(): array
    {
        return ['listWeek', 'timeGridWeek', 'dayGridMonth'];
    }

    public static function canView(): bool
    {
        return alfakit()->getTenant() !== null;
    }
}
