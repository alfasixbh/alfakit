<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Plugins;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\AlfakitCalendar\Event;
use AlfaSix\AlfakitCalendar\Widgets\CalendarWidget;
use AlfaSix\AlfakitCms\Models\Page as CmsPage;
use AlfaSix\AlfakitCms\Resources\PageResource;
use App\Alfakit\Resources\DiscountResource;
use App\Alfakit\Resources\OrderResource;
use App\Enums\DiscountType;
use App\Models\Discount;
use App\Models\Shipment;
use App\Models\Store;
use Illuminate\Support\Str;
use Throwable;

/**
 * The store calendar (alfasix/alfakit-calendar): promotions (discount schedules, editable:
 * drag to move, resize to change the duration, click to edit, select days to plan a new
 * one), shipments leaving the boutique and deliveries, and scheduled CMS publishes. Colours
 * match the legend on the Calendar page (CALENDAR_COLORS). Moving needs the discount
 * `update` ability, so staff and viewers only look.
 */
abstract class StoreCalendar extends CalendarWidget
{
    /** Event colours, also drawn in the legend (PromotionsCalendar). */
    public const COLORS = [
        'percentage' => '#F47A22',
        'fixed' => '#1E3A5F',
        'free_shipping' => '#0E9384',
        'shipped' => '#6366F1',
        'delivered' => '#16A34A',
        'publish' => '#DB2777',
    ];

    protected static ?string $resource = DiscountResource::class;

    protected static ?string $startAttribute = 'starts_at';

    protected static ?string $endAttribute = 'ends_at';

    /** @return array<string, mixed> */
    public function config(): array
    {
        // A busy month stays readable: three events per day, then "+N more".
        return ['dayMaxEvents' => 3, 'nowIndicator' => true];
    }

    public function fetchEvents(array $info): array
    {
        $tenant = alfakit()->getTenant();

        if (! $tenant instanceof Store) {
            return [];
        }

        return [
            ...$this->promotionEvents($tenant, $info),
            ...$this->shipmentEvents($tenant, $info),
            ...$this->publishEvents($tenant, $info),
        ];
    }

    /**
     * @param  array<string, mixed>  $info
     * @return array<int, Event>
     */
    protected function promotionEvents(Store $tenant, array $info): array
    {
        return Discount::query()
            ->where('store_id', $tenant->id)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $info['end'])
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', $info['start']))
            ->orderBy('starts_at')
            ->get()
            // Evergreen codes (running for months) would cover every day: campaigns only.
            ->filter(fn (Discount $discount): bool => $discount->ends_at === null || $discount->starts_at === null || $discount->starts_at->diffInDays($discount->ends_at) <= 62)
            ->map(fn (Discount $discount): Event => Event::make($discount)
                ->title($discount->code.' · '.$discount->name)
                ->start($discount->starts_at)
                ->end($discount->ends_at ?? $discount->starts_at?->copy()->addDay())
                ->backgroundColor(self::COLORS[$discount->type->value])
                ->borderColor(self::COLORS[$discount->type->value])
                ->textColor('#FFFFFF')
                ->classNames($discount->is_active ? [] : ['opacity-60'])
                ->extendedProps(['kind' => 'promotion']))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $info
     * @return array<int, Event>
     */
    protected function shipmentEvents(Store $tenant, array $info): array
    {
        $events = [];

        $shipments = Shipment::query()
            ->with('order:id,number,store_id')
            ->whereHas('order', fn ($query) => $query->where('store_id', $tenant->id))
            ->where(fn ($query) => $query
                ->whereBetween('shipped_at', [$info['start'], $info['end']])
                ->orWhereBetween('delivered_at', [$info['start'], $info['end']]))
            ->limit(120)
            ->get();

        foreach ($shipments as $shipment) {
            $url = $shipment->order ? OrderResource::getUrl('shipments', ['record' => $shipment->order]) : null;
            $number = $shipment->order->number ?? '';

            if ($shipment->shipped_at !== null && $shipment->shipped_at->between($info['start'], $info['end'])) {
                $events[] = Event::make('shipment-'.$shipment->id)
                    ->title(__('plugins.calendar.events.shipped', ['number' => $number, 'carrier' => $shipment->carrier]))
                    ->start($shipment->shipped_at)
                    ->end($shipment->shipped_at->copy()->addHour())
                    ->backgroundColor(self::COLORS['shipped'])->borderColor(self::COLORS['shipped'])->textColor('#FFFFFF')
                    ->editable(false)
                    ->url($url)
                    ->extendedProps(['kind' => 'shipment']);
            }

            if ($shipment->delivered_at !== null && $shipment->delivered_at->between($info['start'], $info['end'])) {
                $events[] = Event::make('delivery-'.$shipment->id)
                    ->title(__('plugins.calendar.events.delivered', ['number' => $number]))
                    ->start($shipment->delivered_at)
                    ->end($shipment->delivered_at->copy()->addHour())
                    ->backgroundColor(self::COLORS['delivered'])->borderColor(self::COLORS['delivered'])->textColor('#FFFFFF')
                    ->editable(false)
                    ->url($url)
                    ->extendedProps(['kind' => 'delivery']);
            }
        }

        return $events;
    }

    /**
     * @param  array<string, mixed>  $info
     * @return array<int, Event>
     */
    protected function publishEvents(Store $tenant, array $info): array
    {
        try {
            return CmsPage::query()
                ->where('tenant_id', $tenant->id)
                ->whereNotNull('publish_at')
                ->whereBetween('publish_at', [$info['start'], $info['end']])
                ->get()
                ->map(fn (CmsPage $page): Event => Event::make('cms-'.$page->getKey())
                    ->title(__('plugins.calendar.events.publish', ['title' => $page->title]))
                    ->start($page->publish_at)
                    ->end($page->publish_at->copy()->addHour())
                    ->backgroundColor(self::COLORS['publish'])->borderColor(self::COLORS['publish'])->textColor('#FFFFFF')
                    ->editable(false)
                    ->url(PageResource::getUrl('edit', ['record' => $page]))
                    ->extendedProps(['kind' => 'publish']))
                ->all();
        } catch (Throwable) {
            return [];
        }
    }

    public function getFormSchema(): array
    {
        return [
            TextInput::make('name')->label(__('sales.fields.name'))->required()->maxLength(80)->columnSpanFull(),
            TextInput::make('code')->label(__('sales.fields.code'))->required()->maxLength(24)
                ->default(fn (): string => 'PROMO-'.strtoupper(Str::random(5))),
            ToggleButtons::make('type')->label(__('sales.fields.type'))->options(DiscountType::options())
                ->default(DiscountType::Percentage->value)->inline()->live()->required(),
            TextInput::make('value')->label(__('plugins.calendar.fields.value'))->numeric()->minValue(0)->maxValue(500)->default(10)
                ->required(fn (Get $get): bool => $get('type') !== DiscountType::FreeShipping->value)
                ->hidden(fn (Get $get): bool => $get('type') === DiscountType::FreeShipping->value),
            DateTimePicker::make('starts_at')->label(__('sales.fields.starts_at'))->seconds(false)->required(),
            DateTimePicker::make('ends_at')->label(__('sales.fields.ends_at'))->seconds(false)->after('starts_at'),
            Toggle::make('is_active')->label(__('sales.fields.is_active'))->default(true),
        ];
    }

    public function createAction(string $name = 'create'): CreateAction
    {
        return parent::createAction($name)
            ->label(__('plugins.calendar.new_promotion'))
            ->icon('calendar-plus')
            ->mutateDataUsing(function (array $data): array {
                $data['store_id'] = alfakit()->getTenant()?->getKey();
                $data['value'] = ($data['type'] ?? null) === DiscountType::FreeShipping->value ? 0 : ($data['value'] ?? 0);

                return $data;
            });
    }
}
