<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Standalone\Table;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table as TableBuilder;
use App\Alfakit\Resources\PostResource;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * The signed-in author's posts on /posts, outside the admin panel.
 */
class MyPostsTable extends Table
{
    public User $author;

    public function table(TableBuilder $table): TableBuilder
    {
        return $table
            ->query(Post::query()->where('author_id', $this->author->getKey()))
            ->columns([
                TextColumn::make('title')->label(__('playground.fields.title'))->searchable()->sortable()->wrap(),
                TextColumn::make('category.name')->label(__('playground.fields.category'))->badge()->color('info'),
                TextColumn::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => PostResource::statusLabel($state))->badge()->sortable()->color(fn (string $state): string => match ($state) {
                    'published' => 'success',
                    'review' => 'warning',
                    default => 'gray',
                }),
                ToggleColumn::make('is_featured')->label(__('playground.fields.featured')),
                TextColumn::make('published_at')->label(__('playground.fields.published_at'))->since()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->label(__('playground.fields.status'))->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')]),
            ])
            ->recordActions([
                Action::make('publish')
                    ->label(__('playground.my_posts.publish'))
                    ->icon('send')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Post $record): bool => $record->status !== 'published')
                    ->action(function (Post $record): void {
                        $record->update(['status' => 'published', 'published_at' => now()]);

                        Notification::make()->success()->title(__('playground.my_posts.published'))->send();
                    }),
            ])
            ->bulkActions([
                BulkAction::make('feature')
                    ->label(__('playground.my_posts.feature'))
                    ->icon('star')
                    ->action(fn (Collection $records) => $records->each->update(['is_featured' => true]))
                    ->deselectRecordsAfterCompletion(),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginated();
    }
}
