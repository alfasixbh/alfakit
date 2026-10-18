<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CustomerResource;
use App\Alfakit\Schemas\AddressFields;
use App\Models\Address;
use App\Models\Customer;

/**
 * The customer's address book as a related-records page: shipping and billing addresses,
 * one of them the default copied onto new orders.
 */
class ManageCustomerAddresses extends ManageRelatedRecords
{
    protected static string $resource = CustomerResource::class;

    protected static string $relationship = 'addresses';

    protected static ?string $relatedRecordTitleAttribute = 'line1';

    protected static ?string $navigationIcon = 'map-pin';

    public static function getNavigationLabel(): string
    {
        return __('sales.customers.pages.addresses');
    }

    public function getRelatedModelLabel(): ?string
    {
        return __('sales.customers.address');
    }

    public function getRelatedPluralModelLabel(): ?string
    {
        return __('sales.customers.pages.addresses');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('label')->label(__('sales.fields.label'))->placeholder(__('sales.customers.home'))->maxLength(40),
            ToggleButtons::make('type')
                ->label(__('sales.fields.type'))
                ->options(['shipping' => __('sales.address_type.shipping'), 'billing' => __('sales.address_type.billing')])
                ->icons(['shipping' => 'truck', 'billing' => 'receipt'])
                ->default('shipping')
                ->grouped()
                ->required(),
            AddressFields::make(),
            Toggle::make('is_default')->label(__('sales.fields.is_default'))->helperText(__('sales.customers.default_hint'))->columnSpanFull(),
        ])->columns(2);
    }

    public function table(Table $table): Table
    {
        $single = function (Address $result): void {
            if ($result->is_default) {
                $this->makeDefault($result);
            }
        };

        return $table
            ->columns([
                TextColumn::make('label')->label(__('sales.fields.label'))->weight('medium')->placeholder(__('sales.customers.home')),
                TextColumn::make('type')
                    ->label(__('sales.fields.type'))
                    ->badge()
                    ->color(fn (string $state): string => $state === 'billing' ? 'info' : 'primary')
                    ->icon(fn (string $state): string => $state === 'billing' ? 'receipt' : 'truck')
                    ->formatStateUsing(fn (string $state): string => __('sales.address_type.'.$state)),
                TextColumn::make('line1')
                    ->label(__('sales.fields.shipping_address'))
                    ->formatStateUsing(fn (mixed $state, Address $record): ?string => AddressFields::format($record->toSnapshot()))
                    ->wrap()
                    ->searchable(),
                TextColumn::make('phone')->label(__('sales.fields.phone'))->placeholder('—')->visibleFrom('lg'),
                IconColumn::make('is_default')->label(__('sales.fields.is_default'))->boolean()->trueIcon('star')->trueColor('warning')->falseIcon('minus')->falseColor('gray')->alignCenter(),
            ])
            ->defaultSort('is_default', 'desc')
            ->paginated(false)
            ->headerActions([
                CreateAction::make()
                    ->label(__('sales.customers.actions.add_address'))
                    ->icon('plus')
                    ->modalHeading(__('sales.customers.actions.add_address'))
                    ->after($single),
            ])
            ->recordActions([
                Action::make('make_default')
                    ->label(__('sales.customers.actions.make_default'))
                    ->icon('star')
                    ->color('warning')
                    ->link()
                    ->visible(fn (Address $record): bool => ! $record->is_default && ! $this->isReadOnly())
                    ->action(function (Address $record): void {
                        $this->makeDefault($record);

                        Notification::make()
                            ->title(__('sales.customers.actions.make_default_done', ['label' => $record->label ?: $record->line1]))
                            ->success()
                            ->send();
                    }),
                EditAction::make()->after($single),
                DeleteAction::make(),
            ])
            ->emptyStateHeading(__('sales.customers.empty.addresses'))
            ->emptyStateDescription(__('sales.customers.empty.addresses_body'))
            ->emptyStateIcon('map-pin');
    }

    /** Only one default address per customer. */
    protected function makeDefault(Address $address): void
    {
        /** @var Customer $customer */
        $customer = $this->getOwnerRecord();

        $customer->addresses()->whereKeyNot($address->getKey())->update(['is_default' => false]);
        $address->forceFill(['is_default' => true])->save();
    }
}
