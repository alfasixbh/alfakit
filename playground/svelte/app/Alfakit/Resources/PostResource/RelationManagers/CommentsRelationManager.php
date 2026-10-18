<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\RelationManagers;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Table;

class CommentsRelationManager extends RelationManager
{
    protected static string $relationship = 'comments';

    protected static ?string $recordTitleAttribute = 'body';

    public static function getTitle(): string
    {
        return __('playground.posts.comments');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('author_name')->label(__('playground.fields.author_name'))->required()->maxLength(255),
            Toggle::make('is_approved')->label(__('playground.fields.approved')),
            Textarea::make('body')->label(__('playground.fields.body'))->required()->rows(3)->columnSpanFull(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('author_name')->label(__('playground.fields.author_name'))->searchable()->sortable(),
                TextColumn::make('body')->label(__('playground.fields.body'))->limit(60)->wrap(),
                ToggleColumn::make('is_approved')->label(__('playground.fields.approved')),
                TextColumn::make('created_at')->label(__('playground.fields.created_at'))->since()->sortable(),
            ])
            ->headerActions([
                CreateAction::make(),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
