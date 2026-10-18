<?php

declare(strict_types=1);

namespace Database\Seeders;

use AlfaSix\Alfakit\Notifications\DatabaseNotification;
use AlfaSix\Alfakit\Notifications\Notification;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Enums\ShipmentStatus;
use App\Enums\StaffRole;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Shipment;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Database notifications so the bell has something to show on first sign-in. Each staff
 * member gets a welcome note visible in every store plus a handful of events drawn from the
 * seeded orders, stock, reviews and shipments of each store they belong to. Notifications
 * are written in the user's own language and tagged with the store, so the bell only lists
 * the ones that concern the current tenant.
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [];
        $defaultLocale = app()->getLocale();

        foreach (User::query()->with('stores')->get() as $user) {
            app()->setLocale($user->locale ?? $defaultLocale);

            $rows[] = $this->row($user, $this->welcome(), now()->subDays(12)->setTime(9, 0), read: true);

            foreach ($user->stores as $index => $store) {
                foreach ($this->events($store, $user, $index) as $position => [$notification, $sentAt]) {
                    $rows[] = $this->row($user, $notification, $sentAt, read: $sentAt->lessThan(now()->subDays(3)));
                }
            }
        }

        app()->setLocale($defaultLocale);

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('notifications')->insert($chunk);
        }
    }

    private function welcome(): Notification
    {
        return Notification::make()
            ->title(__('platform.seed.notifications.welcome.title'))
            ->body(__('platform.seed.notifications.welcome.body'))
            ->info()
            ->icon('demo::bottle')
            ->forAllTenants();
    }

    /**
     * Four to six store events, newest first, spread over the last ten days.
     *
     * @return array<int, array{0: Notification, 1: Carbon}>
     */
    private function events(Store $store, User $user, int $index): array
    {
        $events = [];
        $setting = $store->setting;
        $threshold = $setting instanceof Setting ? $setting->low_stock_threshold : 5;

        $paid = Order::query()
            ->where('store_id', $store->id)
            ->whereIn('status', [OrderStatus::Paid->value, OrderStatus::Processing->value])
            ->with(['customer:id,first_name,last_name', 'payments'])
            ->latest('placed_at')
            ->limit(2)
            ->get();

        foreach ($paid as $position => $order) {
            $payment = $order->payments->first();

            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.order_paid.title', ['number' => $order->number]))
                    ->body(__('platform.seed.notifications.order_paid.body', [
                        'customer' => $order->customer?->getAttribute('name') ?? '',
                        'total' => $this->money((float) $order->total, $store->currency),
                        'method' => $payment?->method?->getLabel() ?? '',
                    ]))
                    ->success()
                    ->icon('demo::revenue')
                    ->tenant($store),
                now()->subHours(3 + $position * 9 + $index),
            ];
        }

        $low = Product::query()
            ->where('store_id', $store->id)
            ->whereBetween('stock', [1, $threshold])
            ->orderBy('stock')
            ->first();

        if ($low !== null) {
            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.low_stock.title', ['product' => $low->name]))
                    ->body(__('platform.seed.notifications.low_stock.body', ['stock' => $low->stock, 'threshold' => $threshold]))
                    ->warning()
                    ->icon('demo::inventory')
                    ->tenant($store),
                now()->subDays(1)->subHours($index * 2),
            ];
        }

        $review = Review::query()
            ->where('status', ReviewStatus::Pending->value)
            ->whereHas('product', fn (Builder $query) => $query->where('store_id', $store->id))
            ->with(['product:id,name', 'customer:id,first_name,last_name'])
            ->latest()
            ->first();

        if ($review !== null) {
            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.review_pending.title'))
                    ->body(__('platform.seed.notifications.review_pending.body', [
                        'customer' => $review->customer?->getAttribute('name') ?? '',
                        'rating' => $review->rating,
                        'product' => $review->product?->getAttribute('name') ?? '',
                    ]))
                    ->info()
                    ->icon('star')
                    ->tenant($store),
                now()->subDays(2)->subHours(5 + $index),
            ];
        }

        $shipment = Shipment::query()
            ->whereHas('order', fn (Builder $query) => $query->where('store_id', $store->id))
            ->where('status', ShipmentStatus::InTransit->value)
            ->with('order:id,number')
            ->latest('shipped_at')
            ->first();

        if ($shipment !== null) {
            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.shipment.title', [
                        'number' => $shipment->order?->getAttribute('number') ?? '',
                        'carrier' => $shipment->carrier,
                    ]))
                    ->body(__('platform.seed.notifications.shipment.body', ['tracking' => $shipment->tracking_number]))
                    ->info()
                    ->icon('truck')
                    ->tenant($store),
                now()->subDays(4)->subHours($index),
            ];
        }

        // Someone who joined the team: a manager or staff member, never the owner.
        $colleague = $store->users()->whereKeyNot($user->id)->wherePivot('role', '!=', StaffRole::Owner->value)->orderBy('users.name')->first();

        if ($colleague !== null) {
            $role = $colleague->roleIn($store);

            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.invite.title', ['name' => $colleague->name]))
                    ->body(__('platform.seed.notifications.invite.body', [
                        'store' => $store->name,
                        'role' => $role?->getLabel() ?? '',
                    ]))
                    ->success()
                    ->icon('demo::staff')
                    ->tenant($store),
                now()->subDays(6)->subHours(2 + $index),
            ];
        }

        if ($index === 0) {
            $events[] = [
                Notification::make()
                    ->title(__('platform.seed.notifications.export_ready.title'))
                    ->body(__('platform.seed.notifications.export_ready.body', ['rows' => Order::query()->where('store_id', $store->id)->count()]))
                    ->success()
                    ->icon('download')
                    ->tenant($store),
                now()->subDays(8)->subHours(7),
            ];
        }

        return $events;
    }

    /** @return array<string, mixed> */
    private function row(User $user, Notification $notification, Carbon $sentAt, bool $read): array
    {
        return [
            'id' => (string) Str::uuid(),
            'type' => DatabaseNotification::class,
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'data' => json_encode($notification->toDatabaseData(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'read_at' => $read ? $sentAt->copy()->addHours(2) : null,
            'created_at' => $sentAt,
            'updated_at' => $sentAt,
        ];
    }

    private function money(float $amount, string $currency): string
    {
        $formatter = new \NumberFormatter(app()->getLocale(), \NumberFormatter::CURRENCY);

        return $formatter->formatCurrency($amount, $currency) ?: number_format($amount, 2).' '.$currency;
    }
}
