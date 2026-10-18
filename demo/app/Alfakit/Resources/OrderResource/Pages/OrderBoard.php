<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\AlfakitKanban\Card;
use AlfaSix\AlfakitKanban\CardAssignee;
use AlfaSix\AlfakitKanban\CardBadge;
use AlfaSix\AlfakitKanban\Column;
use AlfaSix\AlfakitKanban\Pages\KanbanPage;
use AlfaSix\AlfakitKanban\Support\KanbanMove;
use App\Alfakit\Resources\OrderResource;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * The order fulfilment board (alfasix/alfakit-kanban): a column per order status, cards
 * dragged (or moved with the keyboard) along the allowed transitions. Every move is checked
 * on the server (the order `update` policy, the transition, the tenant) and leaves a step in
 * the order's timeline. Refunds go through Returns (the approval workflow), not the board.
 */
class OrderBoard extends KanbanPage
{
    protected static string $resource = OrderResource::class;

    protected static ?string $statusEnum = OrderStatus::class;

    protected static ?string $orderAttribute = 'board_sort';

    protected static ?string $titleAttribute = 'number';

    protected static array $searchableAttributes = ['number'];

    protected static ?int $cardsPerColumn = 15;

    protected static array $with = ['customer'];

    protected static ?string $navigationIcon = 'square-kanban';

    public static function getNavigationLabel(): string
    {
        return __('plugins.board.title');
    }

    public function getTitle(): string
    {
        return __('plugins.board.title');
    }

    public function getSubheading(): ?string
    {
        return __('plugins.board.subheading');
    }

    protected function getColumns(): array
    {
        return array_values(array_filter(array_map(
            fn (Column $column): ?Column => match ($column->getKey()) {
                OrderStatus::Refunded->value => null,
                OrderStatus::Pending->value => $column->wipLimit(25),
                OrderStatus::Processing->value => $column->wipLimit(20),
                OrderStatus::Delivered->value, OrderStatus::Cancelled->value => $column->collapsible()->creatable(false),
                default => $column,
            },
            parent::getColumns(),
        )));
    }

    protected function getTransitions(): ?array
    {
        return [
            'pending' => ['paid', 'cancelled'],
            'paid' => ['processing', 'cancelled'],
            'processing' => ['paid', 'shipped', 'cancelled'],
            'shipped' => ['processing', 'delivered'],
            'delivered' => [],
            'cancelled' => [],
        ];
    }

    protected function hasQuickCreate(): bool
    {
        return false;
    }

    public function getKanbanQuery(): ?Builder
    {
        return parent::getKanbanQuery()?->where('placed_at', '>=', now()->subDays(60));
    }

    protected function getKanbanFilters(): array
    {
        return [
            SelectFilter::make('channel')->label(__('sales.fields.channel'))->options(OrderResource::channelOptions()),
        ];
    }

    public function getCard(Model $record): Card
    {
        /** @var Order $record */
        return parent::getCard($record)
            ->description($record->customer?->email)
            ->badges([
                CardBadge::make(Currency::format((float) $record->total, $record->currency))->color('gray')->icon('banknote'),
                CardBadge::make(__('sales.channel.'.$record->channel))->color('info'),
            ])
            ->assignees($record->customer ? [CardAssignee::make($record->customer->name)] : [])
            ->dueDate($record->placed_at)
            ->overdue($record->status === OrderStatus::Pending && $record->placed_at?->lt(now()->subDays(3)));
    }

    protected function beforeCardMoved(KanbanMove $move): void
    {
        if (! $move->changesColumn()) {
            return;
        }

        /** @var Order $order */
        $order = $move->record;
        $status = OrderStatus::from($move->to->getKey());
        $timeline = $order->timeline ?? [];
        $timeline[] = ['status' => $status->value, 'at' => now()->toIso8601String(), 'note' => __('plugins.board.timeline_note', ['user' => auth()->user()->name ?? '—'])];
        $order->timeline = $timeline;
    }
}
