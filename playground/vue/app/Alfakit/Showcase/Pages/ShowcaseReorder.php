<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Models\Comment;

/**
 * Showcase: drag-and-drop row ordering (`reorderable()`), over the comments of the post
 * that has the most of them. The new order is saved to the `sort` column.
 */
class ShowcaseReorder extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'grip-vertical';

    protected static ?int $navigationSort = 8;

    protected static ?string $slug = 'reorder';

    public static function getNavigationLabel(): string
    {
        return 'Reorder';
    }

    public function getTitle(): string
    {
        return 'Reorder';
    }

    public function table(Table $table): Table
    {
        $post = Comment::query()
            ->selectRaw('post_id')
            ->groupBy('post_id')
            ->orderByRaw('count(*) desc')
            ->orderBy('post_id')
            ->limit(1);

        return $table
            ->query(Comment::query()->whereIn('post_id', $post))
            ->columns([
                TextColumn::make('sort')->label('Position'),
                TextColumn::make('author_name')->label('Author'),
                TextColumn::make('body')->label('Comment')->limit(60),
            ])
            ->reorderable('sort')
            ->defaultSort('sort', 'asc')
            ->paginated(false);
    }
}
