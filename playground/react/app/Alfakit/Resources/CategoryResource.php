<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Actions\ExportBulkAction;
use AlfaSix\Alfakit\Actions\ImportAction;
use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\IconPicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\ColorColumn;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Exports\CategoryExporter;
use App\Alfakit\Imports\CategoryImporter;
use App\Alfakit\Resources\CategoryResource\Pages;
use App\Models\Category;

class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static ?string $navigationIcon = 'folder';

    protected static ?string $recordTitleAttribute = 'name';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.blog');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->label(__('playground.fields.name'))
                    ->maxLength(255)
                    ->required(),
                TextInput::make('slug')
                    ->label(__('playground.fields.slug'))
                    ->maxLength(255)
                    ->required(),
                ColorPicker::make('color')->label(__('playground.fields.color')),
                IconPicker::make('icon')->label(__('playground.fields.icon'))->sets(['lucide'])->placeholder(__('playground.fields.icon_placeholder')),
                // alfasix/alfakit-tree: the parent in the category tree.
                Select::make('parent_id')->label(__('playground.fields.parent'))->relationship('parent', 'name')->searchable()->preload(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label(__('playground.fields.name'))
                    ->searchable(),
                TextColumn::make('slug')
                    ->label(__('playground.fields.slug'))
                    ->searchable(),
                ColorColumn::make('color')->label(__('playground.fields.color')),
                IconColumn::make('icon')->label(__('playground.fields.icon')),
                TextColumn::make('created_at')
                    ->label(__('playground.fields.created_at'))
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->headerActions([
                ImportAction::make()->importer(CategoryImporter::class),
                ExportAction::make()->exporter(CategoryExporter::class),
            ])
            ->bulkActions([
                ExportBulkAction::make()->exporter(CategoryExporter::class),
                DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategories::route('/'),
            'create' => Pages\CreateCategory::route('/create'),
            'edit' => Pages\EditCategory::route('/{record}/edit'),
            // alfasix/alfakit-tree
            'tree' => Pages\CategoryTree::route('/tree'),
        ];
    }
}
