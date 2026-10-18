<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\Layout\Panel;
use AlfaSix\Alfakit\Tables\Columns\Layout\Split;
use AlfaSix\Alfakit\Tables\Columns\Layout\Stack;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Models\Post;

/**
 * Showcase: Split / Stack / Panel column layouts, laid out as a card grid with
 * "Load more" pagination.
 */
class ShowcaseCards extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'layout-grid';

    protected static ?int $navigationSort = 3;

    protected static ?string $slug = 'cards';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.cards.title');
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(Post::query()->with(['author', 'category']))
            ->columns([
                Split::make([
                    Stack::make([
                        TextColumn::make('title')->label(__('playground.fields.title'))->weight('bold')->searchable()->sortable(),
                        TextColumn::make('author.name')->label(__('playground.fields.author'))->icon('user'),
                    ])->space(1),
                    TextColumn::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => PostResource::statusLabel($state))->badge()->grow(false),
                ])->from('md'),
                Panel::make([
                    TextColumn::make('excerpt')->label(__('playground.fields.excerpt'))->wrap(),
                    TextColumn::make('views')->label(__('playground.fields.views'))->numeric()->sortable(),
                ])->collapsible(),
            ])
            ->contentGrid(['md' => 2, 'xl' => 3])
            ->paginationMode(PaginationMode::LoadMore)
            ->defaultPaginationPageOption(6)
            ->paginationPageOptions([6, 12])
            ->defaultSort('created_at', 'desc');
    }
}
