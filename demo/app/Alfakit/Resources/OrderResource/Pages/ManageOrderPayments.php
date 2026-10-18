<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Support\EnumBadge;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * The "Payments" tab: captured payments and refunds. "Record payment" opens a modal form;
 * when the captured amount covers the total, a pending order moves to Paid.
 */
class ManageOrderPayments extends ManageRelatedRecords
{
    protected static string $resource = OrderResource::class;

    protected static string $relationship = 'payments';

    protected static ?string $relatedRecordTitleAttribute = 'reference';

    protected static ?string $navigationIcon = 'credit-card';

    public static function getNavigationLabel(): string
    {
        return __('sales.orders.pages.payments');
    }

    public function getRelatedModelLabel(): ?string
    {
        return __('sales.orders.payment');
    }

    public function getRelatedPluralModelLabel(): ?string
    {
        return __('sales.orders.sections.payments');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            ToggleButtons::make('method')
                ->label(__('sales.fields.method'))
                ->options(PaymentMethod::options())
                ->colors(EnumBadge::toggleMaps(PaymentMethod::class)['colors'])
                ->icons(EnumBadge::toggleMaps(PaymentMethod::class)['icons'])
                ->default(PaymentMethod::Card->value)
                ->inline()
                ->live()
                ->required()
                ->columnSpanFull(),
            MoneyInput::make('amount')
                ->label(__('sales.fields.amount'))
                ->currency(fn (): string => $this->order()->currency)
                ->default(fn (): float => max(0, round((float) $this->order()->total - $this->order()->paidTotal(), 2)))
                ->minValue(0.01)
                ->required(),
            DateTimePicker::make('paid_at')
                ->label(__('sales.fields.paid_at'))
                ->default(fn (): Carbon => now())
                ->seconds(false)
                ->native(false)
                ->required(),
            TextInput::make('reference')
                ->label(__('sales.fields.reference'))
                ->default(fn (): string => 'PAY-'.strtoupper(substr(md5((string) microtime(true)), 0, 10)))
                ->maxLength(40),
            Select::make('card_brand')
                ->label(__('sales.fields.card'))
                ->options(['visa' => 'Visa', 'mastercard' => 'Mastercard', 'amex' => 'American Express'])
                ->native(false)
                ->visible(fn (Get $get): bool => $get('method') === PaymentMethod::Card->value),
            TextInput::make('card_last_four')
                ->label(__('sales.orders.card_last_four'))
                ->length(4)
                ->numeric()
                ->visible(fn (Get $get): bool => $get('method') === PaymentMethod::Card->value),
        ])->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->latest('paid_at'))
            ->columns([
                EnumBadge::column('method', PaymentMethod::class)->label(__('sales.fields.method')),
                EnumBadge::column('status', PaymentStatus::class)->label(__('sales.fields.status')),
                TextColumn::make('amount')
                    ->label(__('sales.fields.amount'))
                    ->money(fn (Payment $record): string => $record->currency)
                    ->alignEnd()
                    ->weight('semibold')
                    ->color(fn (Payment $record): ?string => $record->status === PaymentStatus::Refunded ? 'warning' : null)
                    ->summarize(Sum::make()->money('USD')->label(__('sales.orders.summary.captured'))->query(fn ($query) => $query->where('status', PaymentStatus::Captured->value))),
                TextColumn::make('reference')->label(__('sales.fields.reference'))->copyable()->placeholder('—')->color('gray'),
                TextColumn::make('card_brand')
                    ->label(__('sales.fields.card'))
                    ->formatStateUsing(fn (?string $state, Payment $record): ?string => $state === null ? null : ucfirst($state).' •••• '.$record->card_last_four)
                    ->placeholder('—')
                    ->visibleFrom('md'),
                TextColumn::make('paid_at')->label(__('sales.fields.paid_at'))->dateTime()->sortable(),
            ])
            ->paginated(false)
            ->headerActions([
                CreateAction::make()
                    ->label(__('sales.orders.actions.record_payment'))
                    ->icon('plus')
                    ->modalHeading(__('sales.orders.actions.record_payment'))
                    ->mutateDataUsing(fn (array $data): array => [
                        ...$data,
                        'status' => PaymentStatus::Captured,
                        'currency' => $this->order()->currency,
                    ])
                    ->after(function (Payment $result): void {
                        $order = $this->order()->refresh();

                        if ($order->status === OrderStatus::Pending && $order->paidTotal() >= (float) $order->total) {
                            $order->transitionTo(OrderStatus::Paid, __('demo.timeline.paid'))->save();
                        }

                        Notification::make()
                            ->title(__('sales.notifications.payment_recorded', ['amount' => OrderResource::money($result->amount, $order), 'number' => $order->number]))
                            ->success()
                            ->send();
                    }),
            ])
            ->recordActions([
                DeleteAction::make()->visible(fn (Payment $record): bool => $record->status === PaymentStatus::Pending || $record->status === PaymentStatus::Failed),
            ])
            ->emptyStateHeading(__('sales.orders.empty.payments'))
            ->emptyStateDescription(__('sales.orders.empty.payments_body'))
            ->emptyStateIcon('credit-card');
    }

    protected function order(): Order
    {
        /** @var Order $order */
        $order = $this->getOwnerRecord();

        return $order;
    }
}
