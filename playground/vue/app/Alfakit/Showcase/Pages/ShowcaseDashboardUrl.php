<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Pages\Dashboard\Actions\FilterAction;
use AlfaSix\Alfakit\Pages\Dashboard\Concerns\HasFiltersAction;
use App\Alfakit\Showcase\Widgets\FilteredPostsTable;
use App\Alfakit\Showcase\Widgets\FilteredPostStats;

/**
 * Showcase: a dashboard whose filters are edited in a header action (`HasFiltersAction`)
 * and kept in the page URL instead of the session, so a filtered view can be shared.
 */
class ShowcaseDashboardUrl extends Dashboard
{
    use HasFiltersAction;

    protected static ?string $slug = 'showcase-dashboard-url';

    protected static ?string $navigationIcon = 'link';

    protected static ?int $navigationSort = 91;

    protected static ?string $title = 'Shareable dashboard';

    public function persistsFiltersInSession(): bool
    {
        return false;
    }

    protected function getHeaderActions(): array
    {
        return [
            FilterAction::make()->schema([
                Select::make('status')->options(['draft' => 'Draft', 'review' => 'In review', 'published' => 'Published']),
                TextInput::make('search')->maxLength(60),
            ]),
        ];
    }

    public function getWidgets(): array
    {
        return [FilteredPostStats::class, FilteredPostsTable::class];
    }
}
