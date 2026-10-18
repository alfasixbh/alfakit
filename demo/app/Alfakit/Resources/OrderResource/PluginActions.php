<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\AlfakitInvoices\Models\Invoice;
use AlfaSix\AlfakitInvoices\Models\Tax;
use AlfaSix\AlfakitInvoices\Resources\InvoiceResource;
use App\Alfakit\Resources\ReturnRequestResource;
use App\Demo\Access;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\Store;
use Illuminate\Database\Eloquent\Model;

/**
 * Order header actions that hand off to the first-party plugins: an invoice document
 * (alfakit-invoices) and a return request with its approval workflow (alfakit-workflows).
 */
final class PluginActions
{
    /** Open the order's invoice, or issue one from its lines (VAT from the store's tax rates). */
    public static function invoice(): Action
    {
        return Action::make('issueInvoice')
            ->label(fn (Order $record): string => self::invoiceFor($record) ? __('plugins.invoices.open') : __('plugins.invoices.issue'))
            ->icon('file-text')
            ->color('gray')
            ->visible(fn (): bool => Access::managers(alfakit()->auth()))
            ->requiresConfirmation(fn (Order $record): bool => self::invoiceFor($record) === null)
            ->modalDescription(fn (): string => __('plugins.invoices.issue_description'))
            ->action(function (Order $record): void {
                if (self::invoiceFor($record) === null) {
                    self::issue($record);
                }
            })
            ->successRedirectUrl(fn (Order $record): ?string => ($invoice = self::invoiceFor($record)) ? InvoiceResource::getUrl('view', ['record' => $invoice]) : null);
    }

    public static function invoiceFor(Order $order): ?Invoice
    {
        /** @var Invoice|null $invoice */
        $invoice = Invoice::query()->where('reference', $order->number)->forTenant($order->store)->first();

        return $invoice;
    }

    /** An invoice in the order's currency with one line per item, plus shipping. */
    public static function issue(Order $order, ?Model $tenant = null): Invoice
    {
        $tenant ??= $order->store;
        $vat = Tax::query()->forTenant($tenant)->where('is_default', true)->pluck('id')->all();

        $lines = $order->items->map(fn (OrderItem $item): array => [
            'description' => $item->name.($item->sku ? ' ('.$item->sku.')' : ''),
            'quantity' => (string) $item->quantity,
            'unit_price' => (int) round((float) $item->unit_price * 100),
            'tax_ids' => $vat,
        ])->all();

        if ((float) $order->shipping_total > 0) {
            $lines[] = ['description' => __('sales.fields.shipping'), 'quantity' => '1', 'unit_price' => (int) round((float) $order->shipping_total * 100), 'tax_ids' => []];
        }

        // The order discount, as a fixed discount on the first line (capped at that line).
        if ((float) $order->discount_total > 0 && $lines !== []) {
            $lines[0]['discount_type'] = 'fixed';
            $lines[0]['discount_value'] = number_format((float) $order->discount_total, 2, '.', '');
        }

        $customer = $order->customer;

        return Invoice::createWithItems(array_filter([
            'billable' => $customer,
            'customer_name' => $customer === null ? __('sales.orders.wizard.review_anonymous') : null,
            'currency' => $order->currency,
            'reference' => $order->number,
            'issue_date' => ($order->placed_at ?? now())->toDateString(),
            'due_date' => ($order->placed_at ?? now())->copy()->addDays(14)->toDateString(),
            'notes' => __('plugins.invoices.notes', ['number' => $order->number]),
        ], fn (mixed $value): bool => $value !== null), $lines, $tenant instanceof Store ? $tenant : null);
    }

    /** Open a return request on a paid order; it then goes through the approval workflow. */
    public static function requestReturn(): Action
    {
        return Action::make('requestReturn')
            ->label(fn (): string => __('plugins.returns.request'))
            ->icon('undo-2')
            ->color('gray')
            ->visible(fn (Order $record): bool => in_array($record->status, [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered], true)
                && ! $record->returnRequests()->whereNotIn('state', ['refunded', 'closed'])->exists()
                && Access::support(alfakit()->auth()))
            ->modalHeading(fn (Order $record): string => __('plugins.returns.request_heading', ['number' => $record->number]))
            ->schema([
                Select::make('reason')->label(__('plugins.returns.fields.reason'))->options(ReturnRequest::reasonOptions())->required()->native(false),
                MoneyInput::make('amount')->label(__('plugins.returns.fields.amount'))->currency('USD')->minValue(1)
                    ->default(fn (Order $record): float => (float) $record->total)
                    ->maxValue(fn (Order $record): float => (float) $record->total)->required(),
                Textarea::make('details')->label(__('plugins.returns.fields.details'))->rows(3)->maxLength(1000),
            ])
            ->action(function (Order $record, array $data): void {
                $return = ReturnRequest::query()->create([
                    'store_id' => $record->store_id,
                    'order_id' => $record->id,
                    'customer_id' => $record->customer_id,
                    'requested_by_id' => alfakit()->auth()?->getAuthIdentifier(),
                    'number' => ReturnRequest::nextNumber(),
                    'reason' => $data['reason'],
                    'details' => $data['details'] ?? null,
                    'amount' => $data['amount'],
                ]);

                Notification::make()->success()->title(__('plugins.returns.created', ['number' => $return->number]))->send();
            })
            ->successRedirectUrl(fn (Order $record): ?string => ($return = $record->returnRequests()->latest('id')->first()) ? ReturnRequestResource::getUrl('view', ['record' => $return]) : null);
    }
}
