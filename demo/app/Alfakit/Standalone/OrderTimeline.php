<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Infolist;
use App\Enums\OrderStatus;
use App\Models\Order;

/**
 * The status timeline of one order on the tracking page (`OrderTimeline::make(['record' => $order])`).
 */
class OrderTimeline extends Infolist
{
    public function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(fn (): string => __('shop.track.timeline.heading', ['number' => $this->getRecord()?->getAttribute('number')]))
                ->description(__('shop.track.timeline.description'))
                ->icon('route')
                ->schema([
                    Grid::make(['default' => 2, '@md' => 4])->schema([
                        TextEntry::make('status')
                            ->label(__('shop.track.orders.status'))
                            ->badge()
                            ->formatStateUsing(fn (OrderStatus $state): string => $state->getLabel())
                            ->color(fn (OrderStatus $state): string => $state->getColor())
                            ->icon(fn (OrderStatus $state): string => $state->getIcon()),
                        TextEntry::make('placed_at')->label(__('shop.track.orders.placed'))->dateTime(),
                        TextEntry::make('total')->label(__('shop.track.orders.total'))->money(fn (Order $record): string => $record->currency)->weight('semibold'),
                        TextEntry::make('latestShipment.carrier')
                            ->label(__('shop.track.timeline.carrier'))
                            ->placeholder(__('shop.track.timeline.no_shipment')),
                    ]),
                    Grid::make(['default' => 1, '@md' => 2])->schema([
                        TextEntry::make('shipping_address')
                            ->label(__('shop.track.timeline.ship_to'))
                            ->getStateUsing(fn (Order $record): array => self::address($record->shipping_address ?? []))
                            ->listWithLineBreaks(),
                        TextEntry::make('latestShipment.tracking_number')
                            ->label(__('shop.track.timeline.tracking'))
                            ->copyable()
                            ->fontFamily('mono')
                            ->placeholder(__('shop.track.timeline.no_tracking')),
                    ]),
                    RepeatableEntry::make('timeline')
                        ->label(__('shop.track.timeline.steps'))
                        ->schema([
                            TextEntry::make('status')
                                ->hiddenLabel()
                                ->badge()
                                ->formatStateUsing(fn (OrderStatus|string $state): string => self::status($state)->getLabel())
                                ->color(fn (OrderStatus|string $state): string => self::status($state)->getColor())
                                ->icon(fn (OrderStatus|string $state): string => self::status($state)->getIcon()),
                            TextEntry::make('at')
                                ->hiddenLabel()
                                ->placeholder('—')
                                ->dateTime(), // same locale-aware format as "Placed" above
                            TextEntry::make('note')
                                ->hiddenLabel()
                                ->placeholder('—')
                                ->color('gray'),
                        ])
                        ->columns(['default' => 1, '@md' => 3])
                        ->contained(false),
                ]),
        ]);
    }

    /** Timeline steps arrive as enums when the model casts them and as strings from raw JSON. */
    private static function status(OrderStatus|string $state): OrderStatus
    {
        return $state instanceof OrderStatus ? $state : OrderStatus::from($state);
    }

    /**
     * @param  array<string, mixed>  $address
     * @return array<int, string>
     */
    private static function address(array $address): array
    {
        $lines = array_filter([
            $address['recipient'] ?? null,
            $address['line1'] ?? null,
            $address['line2'] ?? null,
            trim(implode(' ', array_filter([$address['postal_code'] ?? null, $address['city'] ?? null, $address['state'] ?? null]))),
            $address['country'] ?? null,
        ], fn (mixed $line): bool => is_string($line) && $line !== '');

        return array_values($lines);
    }
}
