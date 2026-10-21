<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;
use AlfaSix\AlfakitTags\Infolists\Components\SpatieTagsEntry;
use AlfaSix\AlfakitTags\Tables\Columns\SpatieTagsColumn;

class ArticleResource extends Resource
{
    protected static ?string $model = Article::class;

    protected static ?string $slug = 'articles';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('title')->required(),
            SpatieTagsInput::make('categories')->type('categories'),
            SpatieTagsInput::make('labels')->type('labels'),
            SpatieTagsInput::make('keywords')->type('keywords')->separator(','),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            SpatieTagsEntry::make('categories')->type('categories'),
            SpatieTagsEntry::make('tags'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('title'),
            SpatieTagsColumn::make('categories')->type('categories'),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ArticleResource\Pages\ListArticles::route('/'),
            'create' => ArticleResource\Pages\CreateArticle::route('/create'),
            'view' => ArticleResource\Pages\ViewArticle::route('/{record}'),
            'edit' => ArticleResource\Pages\EditArticle::route('/{record}/edit'),
        ];
    }
}
