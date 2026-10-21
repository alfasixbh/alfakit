<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Plugins;

use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Widgets\Plugins\PromotionsCalendarWidget;
use App\Alfakit\Widgets\Plugins\StoreCalendar;
use App\Demo\Nav;
use Illuminate\Support\HtmlString;

/**
 * The store calendar (alfasix/alfakit-calendar): promotions, shipments and deliveries, and
 * scheduled storefront pages, with a legend. Drag a promotion to move it, resize it to
 * change how long it runs, click it to edit, select days to plan a new one.
 */
class PromotionsCalendar extends Page
{
    protected static ?string $slug = 'calendar';

    protected static ?string $navigationIcon = 'calendar-days';

    protected static ?int $navigationSort = 1;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::MARKETING);
    }

    public static function getNavigationLabel(): string
    {
        return __('plugins.calendar.title');
    }

    public function getTitle(): string
    {
        return __('plugins.calendar.title');
    }

    public function getSubheading(): ?string
    {
        return __('plugins.calendar.subheading');
    }

    public function content(Schema $schema): Schema
    {
        $items = '';

        foreach (StoreCalendar::COLORS as $key => $color) {
            $items .= '<li class="inline-flex items-center gap-2"><span aria-hidden="true" class="inline-block size-3 rounded-full" style="background-color: '.e($color).'"></span>'
                .e(__('plugins.calendar.legend.'.$key)).'</li>';
        }

        return $schema->components([
            Html::make(new HtmlString(
                '<div data-slot="calendar-legend" class="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">'
                .'<ul aria-label="'.e(__('plugins.calendar.legend.label')).'" class="flex flex-wrap items-center gap-x-4 gap-y-1.5">'.$items.'</ul>'
                .'<p class="text-xs">'.e(__('plugins.calendar.hint')).'</p></div>',
            )),
        ]);
    }

    protected function getFooterWidgets(): array
    {
        return [PromotionsCalendarWidget::class];
    }

    public function getFooterWidgetsColumns(): int|array
    {
        return 1;
    }
}
