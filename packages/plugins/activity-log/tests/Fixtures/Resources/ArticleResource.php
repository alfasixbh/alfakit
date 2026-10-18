<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\Infolists\Components\ActivityLogTimelineEntry;
use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Article;

class ArticleResource extends Resource
{
    protected static ?string $model = Article::class;

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('title')->required(), TextInput::make('status')]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            TextEntry::make('title'),
            ActivityLogTimelineEntry::make()->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('title')])
            ->recordActions([EditAction::make()->form([TextInput::make('title')->required()]), DeleteAction::make()]);
    }

    public static function getRelations(): array
    {
        return [ActivitiesRelationManager::class];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListArticles::route('/'),
            'view' => ViewArticle::route('/{record}'),
            'edit' => EditArticle::route('/{record}/edit'),
        ];
    }
}

class ListArticles extends ListRecords
{
    protected static string $resource = ArticleResource::class;
}

class ViewArticle extends ViewRecord
{
    protected static string $resource = ArticleResource::class;
}

class EditArticle extends EditRecord
{
    protected static string $resource = ArticleResource::class;
}
