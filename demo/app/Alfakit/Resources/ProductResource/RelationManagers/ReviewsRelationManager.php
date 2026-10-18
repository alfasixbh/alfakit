<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\RelationManagers;

use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\CatalogText as Text;
use App\Enums\ReviewStatus;
use App\Models\Review;
use Illuminate\Support\Enumerable;

/**
 * Customer reviews of one product. Read-only (no create/edit) on the view page by default;
 * the bulk approve / reject actions authorise every selected row through ReviewPolicy.
 */
class ReviewsRelationManager extends RelationManager
{
    protected static string $relationship = 'reviews';

    protected static ?string $recordTitleAttribute = 'title';

    protected static ?string $icon = 'message-square-text';

    public static function getTitle(): string
    {
        return __('catalog.fields.reviews_count');
    }

    public function getModelLabel(): string
    {
        return __('catalog.resources.review');
    }

    public function getPluralModelLabel(): string
    {
        return __('catalog.resources.reviews');
    }

    /** Shown read-only by the View action's modal. */
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('customer_name')->label(Text::field('customer'))->formatStateUsing(fn (?Review $record): ?string => $record?->customer?->name)->placeholder(fn (): string => __('catalog.reviews.anonymous')),
            TextInput::make('rating')->label(Text::field('rating'))->formatStateUsing(fn (mixed $state, ?Review $record): string => $record?->stars() ?? (string) $state),
            TextInput::make('title')->label(Text::field('title'))->columnSpanFull(),
            Textarea::make('body')->label(Text::field('body'))->rows(4)->columnSpanFull(),
            Select::make('status')->label(Text::field('status'))->options(ReviewStatus::options())->native(false),
            Toggle::make('is_verified_purchase')->label(Text::field('is_verified_purchase')),
        ])->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('rating')
                    ->label(Text::field('rating'))
                    ->formatStateUsing(fn (mixed $state, Review $record): string => $record->stars())
                    ->color('warning')
                    ->sortable(),
                TextColumn::make('title')
                    ->label(Text::field('title'))
                    ->weight('medium')
                    ->searchable()
                    ->description(fn (Review $record): ?string => $record->body ? str($record->body)->limit(90)->toString() : null)
                    ->wrap(),
                TextColumn::make('customer.name')
                    ->label(Text::field('customer'))
                    ->placeholder(fn (): string => __('catalog.reviews.anonymous'))
                    ->toggleable(),
                IconColumn::make('is_verified_purchase')
                    ->label(Text::field('is_verified_purchase'))
                    ->boolean()
                    ->trueIcon('badge-check')
                    ->falseIcon('minus')
                    ->falseColor('gray'),
                TextColumn::make('status')
                    ->label(Text::field('status'))
                    ->badge()
                    ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ReviewStatus ? $state->getLabel() : null)
                    ->color(fn (mixed $state): string => $state instanceof ReviewStatus ? $state->getColor() : 'gray')
                    ->icon(fn (mixed $state): ?string => $state instanceof ReviewStatus ? $state->getIcon() : null)
                    ->sortable(),
                TextColumn::make('created_at')->label(Text::field('created_at'))->since()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->label(Text::field('status'))->options(ReviewStatus::options())->multiple(),
            ])
            ->recordActions([
                ViewAction::make(),
            ])
            ->bulkActions([
                BulkAction::make('approve')
                    ->label(Text::action('approve_selected'))
                    ->icon('circle-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->authorizeIndividualRecords('approve')
                    ->visible(fn (): bool => ! $this->isReadOnly())
                    ->action(function (Enumerable $records): void {
                        $count = 0;

                        foreach ($records as $review) {
                            /** @var Review $review */
                            $review->moderate(ReviewStatus::Approved);
                            $count++;
                        }

                        Notification::make()->title(trans_choice('catalog.notifications.approved_many', $count, ['count' => $count]))->success()->send();
                    }),
                BulkAction::make('reject')
                    ->label(Text::action('reject_selected'))
                    ->icon('circle-x')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->authorizeIndividualRecords('reject')
                    ->visible(fn (): bool => ! $this->isReadOnly())
                    ->action(function (Enumerable $records): void {
                        $count = 0;

                        foreach ($records as $review) {
                            /** @var Review $review */
                            $review->moderate(ReviewStatus::Rejected);
                            $count++;
                        }

                        Notification::make()->title(trans_choice('catalog.notifications.rejected_many', $count, ['count' => $count]))->warning()->send();
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading(Text::t('empty.reviews_heading'))
            ->emptyStateDescription(Text::t('empty.reviews_description'))
            ->emptyStateIcon('message-square-text');
    }
}
