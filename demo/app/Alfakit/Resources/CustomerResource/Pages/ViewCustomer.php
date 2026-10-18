<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Resources\CustomerResource;
use App\Alfakit\Resources\OrderResource;
use App\Models\Customer;

/**
 * The customer profile: infolist with the spend chart, recent orders and the default
 * address. Header actions start a new order for the customer or toggle the VIP flag.
 */
class ViewCustomer extends ViewRecord
{
    protected static string $resource = CustomerResource::class;

    protected static ?string $navigationIcon = 'user';

    public static function getSubNavigationLabel(): string
    {
        return __('sales.customers.pages.profile');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('new_order')
                ->label(__('sales.customers.actions.new_order'))
                ->icon('shopping-bag')
                ->color('primary')
                ->url(fn (Customer $record): string => OrderResource::getUrl('create').'?customer_id='.$record->getKey()),
            static::vipAction(),
            EditAction::make(),
        ];
    }

    public static function vipAction(): Action
    {
        return Action::make('toggle_vip')
            ->label(fn (Customer $record): string => $record->is_vip ? __('sales.customers.actions.vip_remove') : __('sales.customers.actions.vip_add'))
            ->icon('crown')
            ->color(fn (Customer $record): string => $record->is_vip ? 'gray' : 'warning')
            ->outlined()
            ->authorize('update')
            ->requiresConfirmation()
            ->modalHeading(__('sales.customers.actions.toggle_vip'))
            ->modalDescription(__('sales.customers.vip_hint'))
            ->action(function (Customer $record): void {
                $record->update(['is_vip' => ! $record->is_vip]);

                Notification::make()
                    ->title($record->is_vip ? __('sales.customers.actions.vip_on', ['name' => $record->name]) : __('sales.customers.actions.vip_off', ['name' => $record->name]))
                    ->success()
                    ->send();
            });
    }
}
