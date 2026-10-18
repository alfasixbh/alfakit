<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitKanban\Card;
use AlfaSix\AlfakitKanban\CardAssignee;
use AlfaSix\AlfakitKanban\CardBadge;
use AlfaSix\AlfakitKanban\Column;
use AlfaSix\AlfakitKanban\Pages\KanbanPage;
use App\Alfakit\Resources\PostResource;
use App\Models\Post;
use Illuminate\Database\Eloquent\Model;

/**
 * alfasix/alfakit-kanban: the posts as cards in draft / review / published columns.
 * Dragging a card (or Space + arrows) changes the post's status on the server.
 */
class PostBoard extends KanbanPage
{
    protected static string $resource = PostResource::class;

    // Posts have no order column: cards stay in key order and only move between columns.
    protected static ?string $orderAttribute = null;

    protected static ?string $descriptionAttribute = 'excerpt';

    protected static array $with = ['author', 'category'];

    protected static array $searchableAttributes = ['title'];

    protected static ?int $cardsPerColumn = 25;

    public function getTitle(): string
    {
        return __('playground.nav.posts_board');
    }

    protected function getColumns(): array
    {
        return [
            Column::make('draft')->label(__('playground.status.draft'))->icon('file-pen')->color('gray'),
            Column::make('review')->label(__('playground.status.review'))->icon('eye')->color('warning')->wipLimit(30),
            Column::make('published')->label(__('playground.status.published'))->icon('circle-check')->color('success')->collapsible(),
        ];
    }

    public function getCard(Model $record): Card
    {
        /** @var Post $record */
        return parent::getCard($record)
            ->badges(array_filter([
                $record->category ? CardBadge::make($record->category->name)->color('info') : null,
                $record->is_featured ? CardBadge::make(__('playground.fields.featured'))->color('warning')->icon('star') : null,
            ]))
            ->assignees($record->author ? [CardAssignee::make($record->author->name)] : []);
    }

    public function getFormSchema(): array
    {
        return [
            TextInput::make('title')->label(__('playground.fields.title'))->required()->maxLength(255),
            TextInput::make('slug')->label(__('playground.fields.slug'))->required()->maxLength(255),
            Select::make('author_id')->label(__('playground.fields.author'))->relationship('author', 'name')->searchable()->preload()->required(),
            Select::make('status')->label(__('playground.fields.status'))->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')])->required(),
        ];
    }
}
