<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Widgets;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Widgets\Concerns\InteractsWithPageFilters;
use AlfaSix\Alfakit\Widgets\TableWidget;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Showcase dashboards: a table widget with actions of its own (a modal form, a direct
 * action and a bulk action) that follows the dashboard's filters.
 */
class FilteredPostsTable extends TableWidget
{
    use InteractsWithPageFilters;

    protected ?string $heading = 'Filtered posts';

    /**
     * The dashboard filters are user input (they may come from the URL): only known
     * statuses and a plain search string are used.
     *
     * @param  Builder<Post>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Post>
     */
    public static function filtered(Builder $query, array $filters): Builder
    {
        $status = $filters['status'] ?? null;
        $search = $filters['search'] ?? null;

        return $query
            ->when(in_array($status, ['draft', 'review', 'published'], true), fn (Builder $query) => $query->where('status', $status))
            ->when(is_string($search) && $search !== '', fn (Builder $query) => $query->where('title', 'like', '%'.addcslashes((string) $search, '%_\\').'%'));
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(self::filtered(Post::query(), $this->pageFilters))
            ->defaultSort('id', 'desc')
            ->paginationPageOptions([5, 10, 25])->defaultPaginationPageOption(5)
            ->columns([
                TextColumn::make('title'),
                TextColumn::make('status')->badge(),
                IconColumn::make('is_featured')->label('Featured')->boolean(),
            ])
            ->recordActions([
                Action::make('rename')
                    ->label('Rename')
                    ->icon('pencil')
                    ->modalHeading('Rename post')
                    ->fillForm(fn (Post $record): array => ['title' => $record->title])
                    ->form([TextInput::make('title')->required()->maxLength(120)])
                    ->action(function (Post $record, array $data): void {
                        $record->update(['title' => $data['title']]);

                        Notification::make()->success()->title('Renamed')->send();
                    }),
                Action::make('toggleFeatured')
                    ->label(fn (Post $record): string => $record->is_featured ? 'Unfeature' : 'Feature')
                    ->icon('star')
                    ->action(function (Post $record): void {
                        $record->update(['is_featured' => ! $record->is_featured]);

                        Notification::make()->success()->title($record->is_featured ? 'Featured' : 'Unfeatured')->send();
                    }),
            ])
            ->bulkActions([
                BulkAction::make('sendToReview')
                    ->label('Send to review')
                    ->requiresConfirmation()
                    ->action(function (Collection $records): void {
                        $records->each->update(['status' => 'review']);

                        Notification::make()->success()->title('Sent to review')->send();
                    }),
            ]);
    }
}
