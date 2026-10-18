<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitWorkflows\Actions\WorkflowActions;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowStateEntry;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowTimeline;
use AlfaSix\AlfakitWorkflows\Schemas\Components\WorkflowDiagram;
use AlfaSix\AlfakitWorkflows\Tables\Columns\WorkflowStateColumn;
use AlfaSix\AlfakitWorkflows\Tables\Filters\WorkflowStateFilter;
use App\Alfakit\Resources\ExpenseResource\Pages;
use App\Models\Expense;

/**
 * alfasix/alfakit-workflows: expense claims with an approval step (see App\Models\Expense).
 */
class ExpenseResource extends Resource
{
    protected static ?string $model = Expense::class;

    protected static ?string $navigationIcon = 'receipt';

    protected static ?string $recordTitleAttribute = 'title';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.work');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.sections.expense'))->schema([
                TextInput::make('title')->label(__('playground.fields.title'))->required()->maxLength(255),
                MoneyInput::make('amount')->label(__('playground.fields.amount'))->currency('USD')->minorUnits()->minValue(0)->required(),
            ]),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.sections.expense'))->schema([
                TextEntry::make('title')->label(__('playground.fields.title')),
                TextEntry::make('user.name')->label(__('playground.fields.requested_by')),
                TextEntry::make('amount')->label(__('playground.fields.amount'))->money('USD', inMinorUnits: true),
                WorkflowStateEntry::make(),
                TextEntry::make('payment_reference')->label(__('playground.fields.payment_reference'))->placeholder('—'),
            ])->columns(3),
            Section::make(__('playground.sections.workflow'))->schema([WorkflowDiagram::make()])->collapsible(),
            Section::make(__('playground.sections.history'))->schema([WorkflowTimeline::make()]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')->label(__('playground.fields.title'))->searchable()->sortable(),
                TextColumn::make('user.name')->label(__('playground.fields.requested_by')),
                TextColumn::make('amount')->label(__('playground.fields.amount'))->money('USD', inMinorUnits: true)->sortable()->alignEnd(),
                WorkflowStateColumn::make()->showPendingApproval()->sortable(),
                TextColumn::make('created_at')->label(__('playground.fields.created_at'))->since()->sortable(),
            ])
            ->filters([WorkflowStateFilter::make()])
            ->recordActions([WorkflowActions::make()])
            // Rows open the view page, where the workflow actions, diagram and history are.
            ->recordUrl(fn (Expense $record): string => static::getUrl('view', ['record' => $record]))
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListExpenses::route('/'),
            'create' => Pages\CreateExpense::route('/create'),
            'view' => Pages\ViewExpense::route('/{record}'),
            'edit' => Pages\EditExpense::route('/{record}/edit'),
        ];
    }
}
