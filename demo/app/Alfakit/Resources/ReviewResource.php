<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\ReviewResource\Pages;
use App\Demo\CatalogText as Text;
use App\Demo\Nav;
use App\Enums\ReviewStatus;
use App\Models\Review;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Enumerable;

/**
 * Review moderation. Reviews reach the store through their product, so the tenant scope is a
 * `whereHas('product')`; approving is rate limited per user, bulk approval authorises every
 * selected row through ReviewPolicy, and bulk deletion asks for the password again.
 */
class ReviewResource extends Resource
{
    /** Approvals a moderator may run per minute before the limiter steps in. */
    public const APPROVALS_PER_MINUTE = 20;

    protected static ?string $model = Review::class;

    protected static ?string $navigationIcon = 'message-square-text';

    protected static ?int $navigationSort = 50;

    protected static ?string $recordTitleAttribute = 'title';

    public static function getModelLabel(): string
    {
        return __('catalog.resources.review');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.reviews');
    }

    public static function getNavigationLabel(): string
    {
        return __('catalog.navigation.reviews');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    public static function getNavigationBadge(): string|int|null
    {
        $pending = static::pendingCount();

        return $pending > 0 ? $pending : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function getNavigationBadgeTooltip(): ?string
    {
        return trans_choice('catalog.navigation.pending_reviews_tooltip', static::pendingCount(), ['count' => static::pendingCount()]);
    }

    public static function scopeEloquentQueryToTenant(Builder $query, Model $tenant): Builder
    {
        return $query->whereHas('product', fn (Builder $q) => $q->where('store_id', $tenant->getKey()));
    }

    /** Read-only details shown by the View action's modal. */
    public static function form(Schema $schema): Schema
    {
        return $schema->components(static::fields())->columns(2);
    }

    /** @return array<int, Component> */
    public static function fields(): array
    {
        return [
            TextInput::make('product_name')->label(Text::field('product'))->formatStateUsing(fn (?Review $record): ?string => $record?->product?->name)->columnSpanFull(),
            TextInput::make('customer_name')->label(Text::field('customer'))->formatStateUsing(fn (?Review $record): ?string => $record?->customer?->name)->placeholder(fn (): string => __('catalog.reviews.anonymous')),
            TextInput::make('rating')->label(Text::field('rating'))->formatStateUsing(fn (mixed $state, ?Review $record): string => $record?->stars() ?? (string) $state),
            TextInput::make('title')->label(Text::field('title'))->columnSpanFull(),
            Textarea::make('body')->label(Text::field('body'))->rows(5)->columnSpanFull(),
            Select::make('status')->label(Text::field('status'))->options(ReviewStatus::options()),
            Toggle::make('is_verified_purchase')->label(Text::field('is_verified_purchase')),
        ];
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['product:id,name,slug,images', 'customer:id,first_name,last_name']))
            ->columns([
                ImageColumn::make('product.images')
                    ->label(Text::field('image'))
                    ->getStateUsing(fn (Review $record): ?string => $record->product?->images[0] ?? null)
                    ->square()
                    ->size(40),
                TextColumn::make('product.name')
                    ->label(Text::field('product'))
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->url(fn (Review $record): ?string => $record->product ? ProductResource::getUrl('view', ['record' => $record->product]) : null)
                    ->wrap(),
                TextColumn::make('rating')
                    ->label(Text::field('rating'))
                    ->formatStateUsing(fn (mixed $state, Review $record): string => $record->stars())
                    ->tooltip(fn (Review $record): string => __('catalog.reviews.stars', ['rating' => $record->rating]))
                    ->color('warning')
                    ->sortable(),
                TextColumn::make('title')
                    ->label(Text::field('title'))
                    ->searchable()
                    ->description(fn (Review $record): ?string => $record->body ? str($record->body)->limit(110)->toString() : null)
                    ->wrap()
                    ->grow(),
                TextColumn::make('customer.name')
                    ->label(Text::field('customer'))
                    ->placeholder(fn (): string => __('catalog.reviews.anonymous'))
                    ->toggleable(),
                IconColumn::make('is_verified_purchase')
                    ->label(Text::field('is_verified_purchase'))
                    ->boolean()
                    ->trueIcon('badge-check')
                    ->falseIcon('minus')
                    ->falseColor('gray')
                    ->toggleable(),
                TextColumn::make('status')
                    ->label(Text::field('status'))
                    ->badge()
                    ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ReviewStatus ? $state->getLabel() : null)
                    ->color(fn (mixed $state): string => $state instanceof ReviewStatus ? $state->getColor() : 'gray')
                    ->icon(fn (mixed $state): ?string => $state instanceof ReviewStatus ? $state->getIcon() : null)
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label(Text::field('created_at'))
                    ->since()
                    ->sortable(),
                TextColumn::make('approved_at')
                    ->label(Text::field('approved_at'))
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('rating')
                    ->label(Text::t('filters.rating'))
                    ->options(collect(range(5, 1))->mapWithKeys(fn (int $rating): array => [(string) $rating => str_repeat('★', $rating)])->all())
                    ->multiple(),
                SelectFilter::make('product_id')
                    ->label(Text::field('product'))
                    ->relationship('product', 'name', fn (Builder $query) => $query->where('store_id', alfakit()->getTenant()?->getKey()))
                    ->searchable()
                    ->preload(),
                TernaryFilter::make('is_verified_purchase')
                    ->label(Text::t('filters.verified')),
            ])
            ->recordActions([
                ViewAction::make()->schema(static::fields()),
                Action::make('approve')
                    ->label(Text::action('approve'))
                    ->icon('circle-check')
                    ->color('success')
                    ->authorize('approve')
                    ->visible(fn (Review $record): bool => $record->status !== ReviewStatus::Approved)
                    ->rateLimit(self::APPROVALS_PER_MINUTE)
                    ->rateLimitedNotificationTitle(fn (): string => __('catalog.notifications.approve_rate_limited'))
                    ->action(function (Review $record): void {
                        $record->moderate(ReviewStatus::Approved);

                        Notification::make()->title(__('catalog.notifications.approved'))->success()->send();
                    }),
                Action::make('reject')
                    ->label(Text::action('reject'))
                    ->icon('circle-x')
                    ->color('danger')
                    ->authorize('reject')
                    ->visible(fn (Review $record): bool => $record->status !== ReviewStatus::Rejected)
                    ->requiresConfirmation()
                    ->action(function (Review $record): void {
                        $record->moderate(ReviewStatus::Rejected);

                        Notification::make()->title(__('catalog.notifications.rejected'))->warning()->send();
                    }),
            ])
            ->bulkActions([
                BulkAction::make('approve')
                    ->label(Text::action('approve_selected'))
                    ->icon('circle-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(fn (Enumerable $records): string => trans_choice('catalog.modals.approve_heading', $records->count(), ['count' => $records->count()]))
                    ->authorizeIndividualRecords('approve')
                    ->action(function (Enumerable $records): void {
                        $records->each(fn (Review $review) => $review->moderate(ReviewStatus::Approved));

                        Notification::make()->title(trans_choice('catalog.notifications.approved_many', $records->count(), ['count' => $records->count()]))->success()->send();
                    })
                    ->deselectRecordsAfterCompletion(),
                BulkAction::make('reject')
                    ->label(Text::action('reject_selected'))
                    ->icon('circle-x')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading(fn (Enumerable $records): string => trans_choice('catalog.modals.reject_heading', $records->count(), ['count' => $records->count()]))
                    ->authorizeIndividualRecords('reject')
                    ->action(function (Enumerable $records): void {
                        $records->each(fn (Review $review) => $review->moderate(ReviewStatus::Rejected));

                        Notification::make()->title(trans_choice('catalog.notifications.rejected_many', $records->count(), ['count' => $records->count()]))->warning()->send();
                    })
                    ->deselectRecordsAfterCompletion(),
                DeleteBulkAction::make()
                    ->modalDescription(Text::t('modals.delete_reviews_description'))
                    ->requiresPasswordConfirmation(),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading(Text::t('empty.reviews_heading'))
            ->emptyStateDescription(Text::t('empty.reviews_description'))
            ->emptyStateIcon('message-square-text')
            ->paginationPageOptions([10, 25, 50]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReviews::route('/'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['title', 'product.name'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Review $record */
        return [
            __('catalog.fields.product') => $record->product?->name,
            __('catalog.fields.rating') => $record->stars(),
            __('catalog.fields.status') => $record->status->getLabel(),
        ];
    }

    public static function getGlobalSearchEloquentQuery(): Builder
    {
        return parent::getGlobalSearchEloquentQuery()->with('product');
    }

    public static function pendingCount(): int
    {
        return static::getEloquentQuery()->where('status', ReviewStatus::Pending)->count();
    }
}
