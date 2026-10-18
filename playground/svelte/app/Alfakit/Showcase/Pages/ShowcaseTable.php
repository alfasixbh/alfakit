<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\FiltersLayout;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\BooleanConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\DateConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\NumberConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\RelationshipConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\SelectConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\TextConstraint;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Models\Post;

/**
 * Showcase: summaries, row grouping, the query builder in a deferred modal filter form,
 * and user column reordering, over the seeded posts.
 */
class ShowcaseTable extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'table';

    protected static ?int $navigationSort = 2;

    protected static ?string $slug = 'table';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.table.title');
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(Post::query()->with(['author', 'category']))
            ->columns([
                TextColumn::make('title')->label(__('playground.fields.title'))->searchable()->sortable()->summarize(Count::make()),
                TextColumn::make('author.name')->label(__('playground.fields.author'))->sortable(),
                TextColumn::make('category.name')->label(__('playground.fields.category'))->badge()->color('info'),
                TextColumn::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => PostResource::statusLabel($state))->badge()->sortable(),
                TextColumn::make('views')->label(__('playground.fields.views'))->numeric()->sortable()->alignEnd()->summarize(Sum::make()),
                TextColumn::make('rating')->label(__('playground.fields.rating'))->numeric(decimalPlaces: 1)->alignEnd()->summarize(Average::make()),
                TextColumn::make('published_at')->label(__('playground.fields.published_at'))->date()->sortable(),
            ])
            ->groups([
                Group::make('status')->label(__('playground.fields.status'))->getTitleFromRecordUsing(fn (Post $record): ?string => PostResource::statusLabel($record->status))->collapsible(),
                Group::make('author.name')->label(__('playground.fields.author')),
                Group::make('published_at')->label(__('playground.fields.published_at'))->date()->titlePrefixedWithLabel(false),
            ])
            ->filters([
                SelectFilter::make('status')->label(__('playground.fields.status'))->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')])->multiple(),
                QueryBuilder::make()
                    ->constraints([
                        TextConstraint::make('title')->label(__('playground.fields.title')),
                        TextConstraint::make('author.name')->label(__('playground.fields.author')),
                        NumberConstraint::make('views')->label(__('playground.fields.views'))->integer(),
                        DateConstraint::make('published_at')->label(__('playground.fields.published_at')),
                        BooleanConstraint::make('is_featured')->label(__('playground.fields.is_featured')),
                        SelectConstraint::make('status')
                            ->label(__('playground.fields.status'))
                            ->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')])
                            ->multiple(),
                        RelationshipConstraint::make('topics')->label(__('playground.fields.topics'))->titleAttribute('name')->multiple(),
                    ])
                    ->maxDepth(2),
            ], layout: FiltersLayout::Modal)
            ->deferFilters()
            ->reorderableColumns()
            ->defaultSort('published_at', 'desc')
            ->paginationPageOptions([10, 25, 50])
            ->defaultPaginationPageOption(10);
    }
}
