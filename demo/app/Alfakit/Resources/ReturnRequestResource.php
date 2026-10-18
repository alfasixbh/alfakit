<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitComments\Infolists\Components\CommentsEntry;
use AlfaSix\AlfakitWorkflows\Actions\WorkflowActions;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowStateEntry;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowTimeline;
use AlfaSix\AlfakitWorkflows\Schemas\Components\WorkflowDiagram;
use AlfaSix\AlfakitWorkflows\Tables\Columns\WorkflowStateColumn;
use AlfaSix\AlfakitWorkflows\Tables\Filters\WorkflowStateFilter;
use App\Alfakit\Resources\ReturnRequestResource\Pages;
use App\Demo\Nav;
use App\Models\ReturnRequest;

/**
 * Return and refund requests (alfasix/alfakit-workflows): support agents open them from an
 * order, submit them for approval, an owner or manager approves or rejects them from the
 * Approvals inbox, and approved returns are refunded (a refund payment on the order).
 */
class ReturnRequestResource extends Resource
{
    protected static ?string $model = ReturnRequest::class;

    protected static ?string $slug = 'returns';

    protected static ?string $navigationIcon = 'undo-2';

    protected static ?int $navigationSort = 15;

    protected static ?string $recordTitleAttribute = 'number';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SALES);
    }

    public static function getModelLabel(): string
    {
        return __('plugins.returns.label');
    }

    public static function getPluralModelLabel(): string
    {
        return __('plugins.returns.plural');
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getEloquentQuery()->whereIn('state', ['requested', 'awaiting_approval'])->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(fn (): string => __('plugins.returns.sections.workflow'))->icon('workflow')->schema([
                    WorkflowDiagram::make(),
                ])->collapsible(),
                Section::make(fn (): string => __('plugins.returns.sections.history'))->icon('history')->schema([
                    WorkflowTimeline::make(),
                ]),
                Section::make(fn (): string => __('plugins.comments.section'))->icon('messages-square')->schema([
                    CommentsEntry::make(),
                ]),
            ])->columnSpan(['default' => 1, 'lg' => 2]),
            Section::make(fn (): string => __('plugins.returns.sections.details'))->icon('undo-2')->schema([
                TextEntry::make('number')->label(__('plugins.returns.fields.number'))->weight('semibold')->copyable(),
                WorkflowStateEntry::make()->label(__('plugins.returns.fields.state')),
                TextEntry::make('order.number')->label(__('sales.fields.number'))
                    ->url(fn (ReturnRequest $record): string => OrderResource::getUrl('view', ['record' => $record->order])),
                TextEntry::make('customer.name')->label(__('sales.fields.customer'))->placeholder('—'),
                TextEntry::make('reason')->label(__('plugins.returns.fields.reason'))->badge()->color('gray')
                    ->formatStateUsing(fn (string $state): string => __('plugins.returns.reasons.'.$state)),
                TextEntry::make('amount')->label(__('plugins.returns.fields.amount'))->money('USD'),
                TextEntry::make('details')->label(__('plugins.returns.fields.details'))->placeholder('—'),
                TextEntry::make('requestedBy.name')->label(__('plugins.returns.fields.requested_by'))->placeholder('—'),
                TextEntry::make('refund_reference')->label(__('plugins.returns.fields.refund_reference'))->placeholder('—'),
                TextEntry::make('created_at')->label(__('sales.fields.placed_at'))->dateTime(),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('number')->label(__('plugins.returns.fields.number'))->searchable()->sortable()->weight('semibold'),
                TextColumn::make('order.number')->label(__('sales.fields.number'))->searchable(),
                TextColumn::make('customer.email')->label(__('sales.fields.customer'))->placeholder('—')->visibleFrom('md'),
                TextColumn::make('reason')->label(__('plugins.returns.fields.reason'))->badge()->color('gray')
                    ->formatStateUsing(fn (string $state): string => __('plugins.returns.reasons.'.$state)),
                TextColumn::make('amount')->label(__('plugins.returns.fields.amount'))->money('USD')->alignEnd()->sortable(),
                WorkflowStateColumn::make()->label(__('plugins.returns.fields.state'))->showPendingApproval()->sortable(),
                TextColumn::make('created_at')->label(__('sales.fields.placed_at'))->since()->sortable()->visibleFrom('lg'),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                WorkflowStateFilter::make()->label(__('plugins.returns.fields.state')),
                SelectFilter::make('reason')->label(__('plugins.returns.fields.reason'))->options(ReturnRequest::reasonOptions()),
            ])
            ->emptyStateHeading(__('plugins.returns.empty'))
            ->emptyStateIcon('undo-2')
            ->recordActions([WorkflowActions::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReturnRequests::route('/'),
            'view' => Pages\ViewReturnRequest::route('/{record}'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['number'];
    }
}
