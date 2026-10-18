<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Support\EnumBadge;
use App\Demo\Catalog;
use App\Enums\OrderStatus;
use App\Enums\ShipmentStatus;
use App\Models\Order;
use App\Models\Shipment;
use Illuminate\Support\Carbon;

/**
 * The "Shipments" tab: parcels of the order with carrier, tracking and status. Adding the
 * first in-transit shipment to a paid order moves it to Shipped.
 */
class ManageOrderShipments extends ManageRelatedRecords
{
    protected static string $resource = OrderResource::class;

    protected static string $relationship = 'shipments';

    protected static ?string $relatedRecordTitleAttribute = 'tracking_number';

    protected static ?string $navigationIcon = 'truck';

    public static function getNavigationLabel(): string
    {
        return __('sales.orders.pages.shipments');
    }

    public function getRelatedModelLabel(): ?string
    {
        return __('sales.orders.shipment');
    }

    public function getRelatedPluralModelLabel(): ?string
    {
        return __('sales.orders.sections.shipments');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('carrier')
                ->label(__('sales.fields.carrier'))
                ->options(EditOrder::carrierOptions())
                ->default(Catalog::CARRIERS[0]['carrier'])
                ->required()
                ->native(false)
                ->live()
                ->afterStateUpdated(function (Set $set, ?string $state): void {
                    $carrier = collect(Catalog::CARRIERS)->firstWhere('carrier', $state);

                    if ($carrier !== null) {
                        $set('service', $carrier['service']);
                        $set('tracking_number', EditOrder::trackingNumber($carrier));
                    }
                }),
            TextInput::make('service')->label(__('sales.fields.service'))->default(Catalog::CARRIERS[0]['service'])->maxLength(60),
            TextInput::make('tracking_number')
                ->label(__('sales.fields.tracking_number'))
                ->default(fn (): string => EditOrder::trackingNumber(Catalog::CARRIERS[0]))
                ->required()
                ->maxLength(40),
            ToggleButtons::make('status')
                ->label(__('sales.fields.status'))
                ->options(ShipmentStatus::options())
                ->colors(EnumBadge::toggleMaps(ShipmentStatus::class)['colors'])
                ->icons(EnumBadge::toggleMaps(ShipmentStatus::class)['icons'])
                ->default(ShipmentStatus::InTransit->value)
                ->inline()
                ->live()
                ->required(),
            DateTimePicker::make('shipped_at')
                ->label(__('sales.fields.shipped_at'))
                ->default(fn (): Carbon => now())
                ->seconds(false)
                ->native(false),
            DateTimePicker::make('delivered_at')
                ->label(__('sales.fields.delivered_at'))
                ->seconds(false)
                ->native(false)
                ->afterOrEqual('shipped_at')
                ->visible(fn (Get $get): bool => $get('status') === ShipmentStatus::Delivered->value),
        ])->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('carrier')->label(__('sales.fields.carrier'))->weight('medium')->description(fn (Shipment $record): ?string => $record->service),
                TextColumn::make('tracking_number')->label(__('sales.fields.tracking_number'))->copyable()->color('gray'),
                EnumBadge::column('status', ShipmentStatus::class)->label(__('sales.fields.status')),
                TextColumn::make('shipped_at')->label(__('sales.fields.shipped_at'))->dateTime()->placeholder('—')->sortable(),
                TextColumn::make('delivered_at')->label(__('sales.fields.delivered_at'))->dateTime()->placeholder('—')->visibleFrom('md'),
            ])
            ->defaultSort('shipped_at', 'desc')
            ->paginated(false)
            ->headerActions([
                CreateAction::make()
                    ->label(__('sales.orders.actions.add_shipment'))
                    ->icon('plus')
                    ->modalHeading(__('sales.orders.actions.add_shipment'))
                    ->after(function (Shipment $result): void {
                        /** @var Order $order */
                        $order = $this->getOwnerRecord()->refresh();

                        if ($result->status === ShipmentStatus::InTransit && in_array($order->status, [OrderStatus::Paid, OrderStatus::Processing], true)) {
                            $order->transitionTo(OrderStatus::Shipped, __('demo.timeline.shipped', ['carrier' => $result->carrier]), $result->shipped_at)->save();
                        }

                        Notification::make()
                            ->title(__('sales.notifications.shipment_added', ['carrier' => $result->carrier, 'number' => $order->number]))
                            ->success()
                            ->send();
                    }),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->emptyStateHeading(__('sales.orders.empty.shipments'))
            ->emptyStateDescription(__('sales.orders.empty.shipments_body'))
            ->emptyStateIcon('truck');
    }
}
