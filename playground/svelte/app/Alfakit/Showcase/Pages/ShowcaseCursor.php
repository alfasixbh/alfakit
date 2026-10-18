<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Models\Post;

/**
 * Showcase: cursor pagination (previous / next by an opaque cursor, plain-column sorts).
 */
class ShowcaseCursor extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'arrow-right-left';

    protected static ?int $navigationSort = 4;

    protected static ?string $slug = 'cursor';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.cursor.title');
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(Post::query())
            ->columns([
                TextColumn::make('id')->label(__('playground.fields.id'))->sortable(),
                TextColumn::make('title')->label(__('playground.fields.title'))->searchable()->sortable(),
                TextColumn::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => PostResource::statusLabel($state))->badge(),
                TextColumn::make('views')->label(__('playground.fields.views'))->numeric()->sortable()->alignEnd(),
            ])
            ->paginationMode(PaginationMode::Cursor)
            ->defaultPaginationPageOption(10)
            ->paginationPageOptions([10, 25])
            ->defaultSort('id', 'asc');
    }
}
