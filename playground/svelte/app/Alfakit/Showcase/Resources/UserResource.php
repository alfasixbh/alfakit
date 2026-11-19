<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Resources;

use AlfaSix\Alfakit\Actions\ImpersonateAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Alfakit\Showcase\Resources\UserResource\Pages;
use App\Models\User;

/**
 * Showcase: the seeded users with an ImpersonateAction (the admin can impersonate the factory users).
 */
class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'users';

    protected static ?int $navigationSort = 6;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label(__('playground.fields.name'))->required()->maxLength(255),
            TextInput::make('email')->label(__('playground.fields.email'))->email()->required()->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label(__('playground.fields.name'))->searchable()->sortable(),
                TextColumn::make('email')->label(__('playground.fields.email'))->searchable(),
                TextColumn::make('created_at')->label(__('playground.fields.created_at'))->dateTime()->sortable(),
            ])
            ->recordActions([
                ImpersonateAction::make(),
            ])
            ->defaultSort('id');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
        ];
    }
}
