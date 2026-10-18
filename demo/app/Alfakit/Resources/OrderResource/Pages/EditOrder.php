<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\ReplicateAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\OrderResource;
use App\Demo\Catalog;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ShipmentStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Store;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

/**
 * The "Details" tab of an order. Header actions walk the order through its life: ship
 * (confirmation + rate limit), deliver, refund (nested modal with password confirmation),
 * cancel, invoice (signed link to a printable page) and duplicate.
 */
class EditOrder extends EditRecord
{
    protected static string $resource = OrderResource::class;

    protected static ?string $navigationIcon = 'receipt';

    public static function getSubNavigationLabel(): string
    {
        return __('sales.orders.pages.details');
    }

    protected function getHeaderActions(): array
    {
        return [
            static::shipAction(),
            static::deliverAction(),
            static::refundAction(),
            static::invoiceAction(),
            ActionGroup::make([
                static::cancelAction(),
                static::replicateAction(),
                DeleteAction::make(),
                RestoreAction::make(),
            ]),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        /** @var Order $order */
        $order = $this->getRecord();
        $status = OrderStatus::tryFrom((string) ($data['status'] ?? ''));

        // A status picked by hand still leaves a trace in the timeline.
        if ($status !== null && $status !== $order->status) {
            $timeline = $order->timeline ?? [];
            $timeline[] = ['status' => $status->value, 'at' => now()->toIso8601String(), 'note' => __('sales.orders.timeline.manual', ['user' => auth()->user()->name ?? '—'])];
            $data['timeline'] = $timeline;
        }

        return $data;
    }

    protected function afterSave(): void
    {
        /** @var Order $order */
        $order = $this->getRecord();

        $order->refresh()->recalculateTotals();
    }

    // ---------------------------------------------------------------- Actions

    public static function shipAction(): Action
    {
        return Action::make('ship')
            ->label(__('sales.orders.actions.ship'))
            ->icon('truck')
            ->color('primary')
            ->authorize('ship')
            ->requiresConfirmation()
            ->rateLimit(10)
            ->modalHeading(fn (Order $record): string => __('sales.orders.actions.ship_heading', ['number' => $record->number]))
            ->modalDescription(__('sales.orders.actions.ship_description'))
            ->modalSubmitActionLabel(__('sales.orders.actions.ship_submit'))
            ->modalIcon('truck')
            ->schema([
                Select::make('carrier')
                    ->label(__('sales.fields.carrier'))
                    ->options(static::carrierOptions())
                    ->default(Catalog::CARRIERS[0]['carrier'])
                    ->required()
                    ->native(false),
                TextInput::make('tracking_number')
                    ->label(__('sales.fields.tracking_number'))
                    ->default(fn (): string => static::trackingNumber(Catalog::CARRIERS[0]))
                    ->required()
                    ->maxLength(40),
                DateTimePicker::make('shipped_at')
                    ->label(__('sales.fields.shipped_at'))
                    ->default(fn (): Carbon => now())
                    ->seconds(false)
                    ->native(false)
                    ->required(),
            ])
            ->action(function (Order $record, array $data): void {
                $carrier = collect(Catalog::CARRIERS)->firstWhere('carrier', $data['carrier']) ?? Catalog::CARRIERS[0];
                $shippedAt = Carbon::parse($data['shipped_at']);

                $record->shipments()->create([
                    'carrier' => $carrier['carrier'],
                    'service' => $carrier['service'],
                    'tracking_number' => $data['tracking_number'],
                    'status' => ShipmentStatus::InTransit,
                    'shipped_at' => $shippedAt,
                ]);

                $record->transitionTo(OrderStatus::Shipped, __('demo.timeline.shipped', ['carrier' => $carrier['carrier']]), $shippedAt)->save();

                Notification::make()
                    ->title(__('sales.orders.actions.ship_done', ['number' => $record->number, 'carrier' => $carrier['carrier']]))
                    ->success()
                    ->send();
            });
    }

    public static function deliverAction(): Action
    {
        return Action::make('deliver')
            ->label(__('sales.orders.actions.deliver'))
            ->icon('circle-check')
            ->color('success')
            ->outlined()
            ->visible(fn (Order $record): bool => $record->status === OrderStatus::Shipped && (bool) auth()->user()?->hasStaffRole('staff'))
            ->requiresConfirmation()
            ->action(function (Order $record): void {
                $record->shipments()->where('status', ShipmentStatus::InTransit)->update(['status' => ShipmentStatus::Delivered, 'delivered_at' => now()]);
                $record->transitionTo(OrderStatus::Delivered, __('demo.timeline.delivered'))->save();

                Notification::make()->title(__('sales.orders.actions.deliver_done', ['number' => $record->number]))->success()->send();
            });
    }

    public static function refundAction(): Action
    {
        return Action::make('refund')
            ->label(__('sales.orders.actions.refund'))
            ->icon('rotate-ccw')
            ->color('warning')
            ->outlined()
            ->authorize('refund')
            ->visible(fn (Order $record): bool => $record->paidTotal() > 0)
            ->modalHeading(fn (Order $record): string => __('sales.orders.actions.refund_heading', ['number' => $record->number]))
            ->modalDescription(__('sales.orders.actions.refund_description'))
            ->modalIcon('rotate-ccw')
            ->modalSubmitActionLabel(__('sales.orders.actions.refund'))
            ->requiresPasswordConfirmation()
            ->schema([
                MoneyInput::make('amount')
                    ->label(__('sales.fields.amount'))
                    ->currency(fn (Order $record): string => $record->currency)
                    ->default(fn (Order $record): float => $record->paidTotal())
                    ->minValue(0.01)
                    ->maxValue(fn (Order $record): float => $record->paidTotal())
                    ->required(),
                Textarea::make('reason')
                    ->label(__('sales.orders.actions.refund_reason'))
                    ->placeholder(__('sales.orders.actions.refund_reason_placeholder'))
                    ->rows(2)
                    ->maxLength(500)
                    ->required(),
            ])
            ->action(fn (Order $record, array $data) => static::refund($record, (float) $data['amount'], (string) $data['reason']))
            ->extraModalFooterActions([
                Action::make('refund_full')
                    ->label(__('sales.orders.actions.refund_full'))
                    ->icon('rotate-ccw')
                    ->color('danger')
                    ->outlined()
                    ->requiresConfirmation()
                    ->requiresPasswordConfirmation()
                    ->modalHeading(fn (Order $record): string => __('sales.orders.actions.refund_heading', ['number' => $record->number]))
                    ->modalDescription(fn (Order $record): string => __('sales.orders.actions.refund_full_description', ['amount' => OrderResource::money($record->paidTotal(), $record)]))
                    ->modalSubmitActionLabel(fn (Order $record): string => __('sales.orders.actions.refund_submit', ['amount' => OrderResource::money($record->paidTotal(), $record)]))
                    ->cancelParentActions()
                    ->action(fn (Order $record) => static::refund($record, $record->paidTotal(), __('sales.orders.actions.refund_full'))),
            ]);
    }

    public static function invoiceAction(): Action
    {
        return Action::make('invoice')
            ->label(__('sales.orders.actions.invoice'))
            ->icon('file-text')
            ->color('gray')
            ->outlined()
            ->url(fn (Order $record): string => static::invoiceUrl($record), shouldOpenInNewTab: true);
    }

    public static function cancelAction(): Action
    {
        return Action::make('cancel')
            ->label(__('sales.orders.actions.cancel'))
            ->icon('circle-x')
            ->color('danger')
            ->authorize('cancel')
            ->requiresConfirmation()
            ->modalHeading(fn (Order $record): string => __('sales.orders.actions.cancel_heading', ['number' => $record->number]))
            ->modalDescription(__('sales.orders.actions.cancel_description'))
            ->action(function (Order $record): void {
                $record->transitionTo(OrderStatus::Cancelled, __('demo.timeline.cancelled'))->save();

                Notification::make()->title(__('sales.orders.actions.cancel_done', ['number' => $record->number]))->warning()->send();
            });
    }

    public static function replicateAction(): ReplicateAction
    {
        $replicaId = null;

        return ReplicateAction::make()
            ->label(__('sales.orders.actions.replicate'))
            ->icon('copy')
            ->excludeAttributes(['number', 'status', 'timeline', 'placed_at', 'deleted_at'])
            ->beforeReplicaSaved(function (Order $replica): void {
                /** @var Store $store */
                $store = alfakit()->getTenant();
                $now = now();

                $replica->fill([
                    'number' => Order::nextNumber($store),
                    'status' => OrderStatus::Pending,
                    'placed_at' => $now,
                    'timeline' => [['status' => OrderStatus::Pending->value, 'at' => $now->toIso8601String(), 'note' => __('demo.timeline.placed')]],
                ]);
            })
            ->afterReplicaSaved(function (Order $record, Order $replica) use (&$replicaId): void {
                $replicaId = $replica->getKey();
                $record->items->each(fn (OrderItem $item) => $replica->items()->create($item->only(['product_id', 'product_variant_id', 'name', 'sku', 'quantity', 'unit_price', 'total'])));
                $replica->recalculateTotals();

                Notification::make()
                    ->title(__('sales.orders.actions.replicate_done', ['number' => $record->number, 'replica' => $replica->number]))
                    ->success()
                    ->send();
            })
            ->successRedirectUrl(fn (): string => $replicaId === null ? OrderResource::getUrl() : OrderResource::getUrl('edit', ['record' => $replicaId]));
    }

    // ---------------------------------------------------------------- Helpers

    /** Record a refund and close the order when nothing captured remains. */
    public static function refund(Order $order, float $amount, string $reason): void
    {
        $paid = $order->paidTotal();
        $amount = round($amount, 2);

        if ($amount <= 0 || $amount > $paid) {
            throw ValidationException::withMessages([
                'amount' => __('sales.orders.actions.refund_too_much', ['amount' => OrderResource::money($paid, $order)]),
            ]);
        }

        /** @var Payment|null $captured */
        $captured = $order->payments()->where('status', PaymentStatus::Captured)->latest('paid_at')->first();

        $order->payments()->create([
            'method' => $captured->method ?? PaymentMethod::Card,
            'status' => PaymentStatus::Refunded,
            'amount' => $amount,
            'currency' => $order->currency,
            'reference' => 'RF-'.strtoupper(substr(md5($order->number.$amount.now()->timestamp), 0, 8)),
            'card_brand' => $captured?->card_brand,
            'card_last_four' => $captured?->card_last_four,
            'paid_at' => now(),
        ]);

        if ($order->paidTotal() <= 0) {
            $order->transitionTo(OrderStatus::Refunded, $reason)->save();
        } else {
            $timeline = $order->timeline ?? [];
            $timeline[] = ['status' => $order->status->value, 'at' => now()->toIso8601String(), 'note' => __('sales.orders.timeline.partial_refund', ['amount' => OrderResource::money($amount, $order), 'reason' => $reason])];
            $order->forceFill(['timeline' => $timeline])->save();
        }

        Notification::make()
            ->title(__('sales.orders.actions.refund_done', ['amount' => OrderResource::money($amount, $order), 'number' => $order->number]))
            ->success()
            ->send();
    }

    /** A signed link valid for a day; the page is public but unguessable. */
    public static function invoiceUrl(Order $order): string
    {
        return URL::temporarySignedRoute('demo.invoice', now()->addDay(), ['order' => $order->getKey()]);
    }

    /** @return array<string, string> */
    public static function carrierOptions(): array
    {
        return collect(Catalog::CARRIERS)->mapWithKeys(fn (array $carrier): array => [$carrier['carrier'] => $carrier['carrier'].' · '.$carrier['service']])->all();
    }

    /** @param  array{carrier: string, service: string, prefix: string}  $carrier */
    public static function trackingNumber(array $carrier): string
    {
        return $carrier['prefix'].str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT);
    }
}
