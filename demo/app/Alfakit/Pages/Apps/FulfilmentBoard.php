<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Apps;

use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Attributes\Expose;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Support\Currency;
use App\Alfakit\Resources\OrderResource;
use App\Demo\Nav;
use App\Enums\OrderStatus;
use App\Enums\StaffRole;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * A kanban board for order fulfilment, rendered by `Pages/FulfilmentBoard` in each renderer:
 * one column per status, cards dragged between columns call `moveOrder()`. The component
 * moves the card at once (optimistic update) and puts it back when the server refuses the
 * move. The board reloads its `columns` prop every 30 seconds (`useLiveProps`).
 */
class FulfilmentBoard extends Page
{
    /** The fulfilment flow, in column order. */
    public const STATUSES = [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered];

    /** Moves the board allows: one step forward, or one step back to fix a mistake. */
    public const TRANSITIONS = [
        'paid' => ['processing'],
        'processing' => ['paid', 'shipped'],
        'shipped' => ['processing', 'delivered'],
        'delivered' => [],
    ];

    public const CARDS_PER_COLUMN = 20;

    protected static ?string $slug = 'fulfilment';

    protected static ?string $component = 'Pages/FulfilmentBoard';

    protected static ?string $navigationIcon = 'square-kanban';

    protected static ?int $navigationSort = -9;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SALES);
    }

    public static function getNavigationLabel(): string
    {
        return __('apps.board.title');
    }

    public function getTitle(): string
    {
        return __('apps.board.title');
    }

    public function getSubheading(): ?string
    {
        return __('apps.board.subheading');
    }

    public static function canAccess(): bool
    {
        $user = alfakit()->auth();

        return $user instanceof User && $user->hasStaffRole(StaffRole::Staff);
    }

    /**
     * @return array<string, mixed>
     */
    protected function getViewData(): array
    {
        return [
            'columns' => $this->columns(),
            'ordersUrl' => OrderResource::getUrl('index'),
            'copy' => __('apps.board'),
        ];
    }

    /**
     * Move an order to another column.
     *
     * @return array<string, mixed>
     */
    #[Expose(rules: [
        'order' => ['required', 'integer'],
        'status' => ['required', 'string'],
    ])]
    public function moveOrder(int $order, string $status): array
    {
        $target = OrderStatus::tryFrom($status);
        $record = Order::query()->whereBelongsTo($this->store())->findOrFail($order);

        Gate::authorize('update', $record);

        if ($target === null || ! in_array($target->value, self::TRANSITIONS[$record->status->value] ?? [], true)) {
            $message = __('apps.board.errors.transition', ['from' => $record->status->getLabel(), 'to' => $target?->getLabel() ?? $status]);

            // A toast explains the refusal while the card slides back.
            Notification::make()->danger()->title($message)->send();

            throw ValidationException::withMessages(['status' => $message]);
        }

        $record->transitionTo($target, __('apps.board.moved', ['number' => $record->number, 'status' => $target->getLabel()]))->save();

        Notification::make()
            ->success()
            ->title(__('apps.board.moved', ['number' => $record->number, 'status' => $target->getLabel()]))
            ->send();

        return $this->card($record->loadCount('items')->load('customer'));
    }

    // ---------------------------------------------------------------- Helpers

    protected function store(): Store
    {
        $store = alfakit()->getTenant();
        abort_unless($store instanceof Store, 404);

        return $store;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function columns(): array
    {
        $counts = Order::query()
            ->whereBelongsTo($this->store())
            ->whereIn('status', self::STATUSES)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return array_map(fn (OrderStatus $status): array => [
            'status' => $status->value,
            'label' => $status->getLabel(),
            'color' => $status->getColor(),
            'icon' => $status->getIcon(),
            'count' => (int) ($counts[$status->value] ?? 0),
            'cards' => Order::query()
                ->whereBelongsTo($this->store())
                ->where('status', $status)
                ->with('customer')
                ->withCount('items')
                ->latest('placed_at')
                ->limit(self::CARDS_PER_COLUMN)
                ->get()
                ->map(fn (Order $order): array => $this->card($order))
                ->all(),
        ], self::STATUSES);
    }

    /**
     * @return array<string, mixed>
     */
    protected function card(Order $order): array
    {
        $items = (int) ($order->items_count ?? $order->items()->count());

        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status->value,
            'customer' => $order->customer_id === null ? __('apps.board.walk_in') : (string) $order->customer?->getAttribute('name'),
            'total' => Currency::format((float) $order->total, $order->currency),
            'items' => trans_choice('apps.board.items', $items, ['count' => $items]),
            'placedAt' => $order->placed_at?->toIso8601String(),
            'url' => OrderResource::getUrl('view', ['record' => $order]),
        ];
    }
}
