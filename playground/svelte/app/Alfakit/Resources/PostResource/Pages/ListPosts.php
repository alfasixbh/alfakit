<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Resources\PostResource;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;

class ListPosts extends ListRecords
{
    protected static string $resource = PostResource::class;

    public function getTabs(): array
    {
        return [
            'all' => Tab::make()->label(__('playground.posts.tabs.all')),
            'published' => Tab::make()->label(__('playground.posts.tabs.published'))
                ->badge(fn (): int => Post::query()->where('status', 'published')->count())
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'published')),
            'draft' => Tab::make()->label(__('playground.posts.tabs.drafts'))
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'draft')),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
