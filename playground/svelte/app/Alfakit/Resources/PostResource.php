<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ForceDeleteAction;
use AlfaSix\Alfakit\Actions\ForceDeleteBulkAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\RestoreBulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\KeyValue;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Infolists\Components\IconEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Filters\TrashedFilter;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Tables\Views\TableView;
use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;
use AlfaSix\AlfakitComments\Actions\CommentsTableAction;
use AlfaSix\AlfakitComments\Infolists\Components\CommentsEntry;
use AlfaSix\AlfakitMediaLibrary\Forms\Components\SpatieMediaLibraryFileUpload;
use AlfaSix\AlfakitMediaLibrary\Infolists\Components\SpatieMediaLibraryImageEntry;
use AlfaSix\AlfakitMediaLibrary\Tables\Columns\SpatieMediaLibraryImageColumn;
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;
use AlfaSix\AlfakitTags\Infolists\Components\SpatieTagsEntry;
use AlfaSix\AlfakitTags\Tables\Columns\SpatieTagsColumn;
use App\Alfakit\Resources\PostResource\Pages;
use App\Alfakit\Resources\PostResource\RelationManagers;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Lang;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'file-text';

    protected static ?string $recordTitleAttribute = 'title';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.blog');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(__('playground.sections.content'))->schema([
                    TextInput::make('title')
                        ->label(__('playground.fields.title'))
                        ->required()
                        ->maxLength(255)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', str($state ?? '')->slug()->toString()) : null),
                    TextInput::make('slug')->label(__('playground.fields.slug'))->required()->maxLength(255)->unique(ignoreRecord: true)->prefix('/blog/'),
                    // alfasix/alfakit-ai: writing assistant (needs a provider key, see php artisan alfakit:ai-setup).
                    Textarea::make('excerpt')->label(__('playground.fields.excerpt'))->rows(2)->maxLength(255)->columnSpanFull()->aiAssist(['shorter', 'longer', 'grammar', 'translate']),
                    RichEditor::make('content')->label(__('playground.fields.content'))->columnSpanFull(),
                ]),
                Section::make(__('playground.sections.seo'))->collapsible()->collapsed()->schema([
                    KeyValue::make('meta')->label(__('playground.fields.meta'))->keyLabel(__('playground.fields.meta_property'))->valueLabel(__('playground.fields.meta_value'))->columnSpanFull(),
                ]),
            ])->columnSpan(['default' => 1, 'lg' => 2]),
            Group::make([
                Section::make(__('playground.sections.publishing'))->schema([
                    Select::make('status')->label(__('playground.fields.status'))->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')])->required()->native(false),
                    Toggle::make('is_featured')->label(__('playground.fields.featured')),
                    DateTimePicker::make('published_at')->label(__('playground.fields.published_at'))->seconds(false),
                    Select::make('author_id')->label(__('playground.fields.author'))->relationship('author', 'name')->searchable()->preload()->required(),
                    Select::make('category_id')->label(__('playground.fields.category'))->relationship('category', 'name')->searchable()->preload(),
                    Select::make('topics')->label(__('playground.fields.topics'))->relationship('topics', 'name')->multiple()->preload(),
                    // alfasix/alfakit-tags: Spatie tags, synced after save.
                    SpatieTagsInput::make('tags')->label(__('playground.fields.tags')),
                ])->columns(1),
                Section::make(__('playground.sections.media'))->schema([
                    FileUpload::make('cover_image')->label(__('playground.fields.cover_image'))->image()->directory('posts')->imagePreviewHeight(160),
                    // alfasix/alfakit-media-library: the post's "gallery" media collection.
                    SpatieMediaLibraryFileUpload::make('gallery')->label(__('playground.fields.gallery'))->collection('gallery')->multiple()->reorderable()->image(),
                    TextInput::make('rating')->label(__('playground.fields.rating'))->numeric()->minValue(0)->maxValue(5)->step(0.1),
                ])->columns(1),
                Section::make(__('playground.sections.sponsorship'))->schema([
                    Select::make('currency')->label(__('playground.fields.currency'))->currencies()->searchable()->default('USD')->required()->live(),
                    MoneyInput::make('sponsorship_fee')
                        ->label(__('playground.fields.sponsorship_fee'))
                        ->currency(fn (Get $get): string => $get('currency') ?: 'USD')
                        ->minorUnits()
                        ->minValue(0),
                ])->columns(1),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.sections.post'))->schema([
                TextEntry::make('title')->label(__('playground.fields.title'))->size('lg')->weight('semibold')->columnSpanFull(),
                TextEntry::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => self::statusLabel($state))->badge()->color(fn (?string $state): string => match ($state) {
                    'published' => 'success',
                    'review' => 'warning',
                    default => 'gray',
                }),
                TextEntry::make('author.name')->label(__('playground.fields.author')),
                TextEntry::make('category.name')->label(__('playground.fields.category')),
                TextEntry::make('topics.name')->label(__('playground.fields.topics'))->badge()->color('info'),
                SpatieTagsEntry::make('tags')->label(__('playground.fields.tags')),
                IconEntry::make('is_featured')->label(__('playground.fields.is_featured'))->boolean(),
                TextEntry::make('published_at')->label(__('playground.fields.published_at'))->dateTime(),
                TextEntry::make('views')->label(__('playground.fields.views'))->numeric(),
                TextEntry::make('rating')->label(__('playground.fields.rating'))->numeric(decimalPlaces: 1)->suffix(' / 5'),
                TextEntry::make('sponsorship_fee')->label(__('playground.fields.sponsorship_fee'))->money(fn (Post $record): string => $record->currency, inMinorUnits: true),
                TextEntry::make('content')->label(__('playground.fields.content'))->html()->prose()->columnSpanFull(),
                SpatieMediaLibraryImageEntry::make('gallery')->label(__('playground.fields.gallery'))->collection('gallery')->stacked()->columnSpanFull(),
            ])->columns(3),
            // alfasix/alfakit-comments: the post's discussion (mentions, reactions).
            Section::make(__('playground.sections.discussion'))->schema([
                CommentsEntry::make(),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')->label(__('playground.fields.title'))->editable()->rules(['required', 'max:255'])->searchable()->sortable()->description(fn (Post $record): ?string => $record->excerpt ? str($record->excerpt)->limit(60)->toString() : null)->wrap(),
                TextColumn::make('author.name')->label(__('playground.fields.author'))->sortable()->toggleable(),
                TextColumn::make('category.name')->label(__('playground.fields.category'))->sortable()->badge()->color('info')->toggleable(),
                SpatieTagsColumn::make('tags')->label(__('playground.fields.tags'))->limitList(3)->toggleable(),
                SpatieMediaLibraryImageColumn::make('gallery')->label(__('playground.fields.gallery'))->collection('gallery')->stacked()->limit(3)->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('status')->label(__('playground.fields.status'))->formatStateUsing(fn (?string $state): ?string => self::statusLabel($state))->badge()->sortable()->color(fn (string $state): string => match ($state) {
                    'published' => 'success',
                    'review' => 'warning',
                    default => 'gray',
                }),
                ToggleColumn::make('is_featured')->label(__('playground.fields.featured')),
                TextColumn::make('views')->label(__('playground.fields.views'))->editable()->rules(['integer', 'min:0'])->numeric()->sortable()->alignEnd(),
                TextColumn::make('sponsorship_fee')->label(__('playground.fields.sponsorship'))->money(fn (Post $record): string => $record->currency, inMinorUnits: true)->sortable()->alignEnd()->toggleable(),
                TextColumn::make('published_at')->label(__('playground.fields.published_at'))->since()->sortable()->toggleable(),
                TextColumn::make('created_at')->label(__('playground.fields.created_at'))->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')->label(__('playground.fields.status'))->options(['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')])->multiple(),
                SelectFilter::make('category_id')->label(__('playground.fields.category'))->relationship('category', 'name')->preload(),
                TernaryFilter::make('is_featured')->label(__('playground.fields.featured')),
                TrashedFilter::make(),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
                CommentsTableAction::make(),
                // Undo in the toast after the confirmation (soft deletes: the undo restores).
                DeleteAction::make()->undoable()->skipConfirmationWhenUndoable(false),
                RestoreAction::make(),
                ForceDeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make()->undoable()->skipConfirmationWhenUndoable(false),
                RestoreBulkAction::make(),
                ForceDeleteBulkAction::make(),
            ])
            ->defaultSort('created_at', 'desc')
            // Saved views: tabs defined here plus the views users save (and share) themselves.
            ->savedViews()
            ->views([
                TableView::make('featured')->label(__('playground.posts.views.featured'))->icon('star')->filters(['is_featured' => ['value' => true]]),
                TableView::make('most-viewed')->label(__('playground.posts.views.most_viewed'))->icon('flame')->sort('views', 'desc'),
            ])
            // "Edit as spreadsheet": title, views and the featured toggle are editable cells.
            ->spreadsheet()
            // The count and summaries load right after the rows.
            ->deferTotals()
            ->striped();
    }

    /** The translated label of a stored post status (draft, review, published). */
    public static function statusLabel(?string $state): ?string
    {
        return $state !== null && Lang::has('playground.status.'.$state) ? __('playground.status.'.$state) : $state;
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\CommentsRelationManager::class,
            ActivitiesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            // alfasix/alfakit-kanban
            'board' => Pages\PostBoard::route('/board'),
            'view' => Pages\ViewPost::route('/{record}'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }

    /** Record sub-navigation: view and edit link to each other. */
    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\ViewPost::class,
            Pages\EditPost::class,
        ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['title', 'excerpt', 'author.name'];
    }
}
