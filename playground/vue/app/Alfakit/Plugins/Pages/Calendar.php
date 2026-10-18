<?php

declare(strict_types=1);

namespace App\Alfakit\Plugins\Pages;

use AlfaSix\Alfakit\Pages\Page;
use App\Alfakit\Plugins\Widgets\EventsCalendar;

/** alfasix/alfakit-calendar: a page around the EventsCalendar widget. */
class Calendar extends Page
{
    protected static ?string $navigationIcon = 'calendar';

    protected static ?int $navigationSort = 30;

    protected static ?string $slug = 'calendar';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.blog');
    }

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.calendar');
    }

    protected function getHeaderWidgets(): array
    {
        return [EventsCalendar::class];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }
}
