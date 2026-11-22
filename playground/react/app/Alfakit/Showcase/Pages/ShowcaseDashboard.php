<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Pages\Dashboard\Concerns\HasFiltersForm;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Showcase\Widgets\FilteredPostsTable;
use App\Alfakit\Showcase\Widgets\FilteredPostStats;

/**
 * Showcase: a second dashboard with a filter form above its widgets (`HasFiltersForm`).
 * "Status" waits for "Apply filters"; "Search" is `live()` and applies as it changes. The
 * applied values are kept in the session.
 */
class ShowcaseDashboard extends Dashboard
{
    use HasFiltersForm;

    protected static ?string $slug = 'showcase-dashboard';

    protected static ?string $navigationIcon = 'filter';

    protected static ?int $navigationSort = 90;

    protected static ?string $title = 'Filtered dashboard';

    public function filtersForm(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('status')->options(['draft' => 'Draft', 'review' => 'In review', 'published' => 'Published']),
            TextInput::make('search')->maxLength(60)->live(debounce: 300),
        ])->columns(2);
    }

    public function getWidgets(): array
    {
        return [FilteredPostStats::class, FilteredPostsTable::class];
    }
}
