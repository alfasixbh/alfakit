<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Showcase\Resources\CommentResource\Pages;
use App\Models\Comment;

/**
 * Showcase: a resource nested under PostResource (`/admin/posts/{post}/comments/...`).
 * The post's comments relation manager links here instead of opening modals.
 */
class CommentResource extends Resource
{
    protected static ?string $model = Comment::class;

    protected static ?string $parentResource = PostResource::class;

    protected static ?string $recordTitleAttribute = 'author_name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('author_name')->label(__('playground.fields.author_name'))->required()->maxLength(255),
            Toggle::make('is_approved')->label(__('playground.fields.approved')),
            Textarea::make('body')->label(__('playground.fields.body'))->required()->rows(4)->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('author_name')->label(__('playground.fields.author_name'))->searchable()->sortable(),
                TextColumn::make('body')->label(__('playground.fields.body'))->limit(60)->wrap(),
                IconColumn::make('is_approved')->label(__('playground.fields.approved'))->boolean(),
                TextColumn::make('created_at')->label(__('playground.fields.created_at'))->since()->sortable(),
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

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListComments::route('/'),
            'create' => Pages\CreateComment::route('/create'),
            'edit' => Pages\EditComment::route('/{record}/edit'),
        ];
    }
}
