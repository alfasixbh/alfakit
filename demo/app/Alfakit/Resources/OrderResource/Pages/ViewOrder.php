<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Resources\OrderResource\PluginActions;

/**
 * The "Timeline" tab: the order's infolist (status history as a RepeatableEntry plus a
 * summary card). Relation managers are read-only here.
 */
class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;

    protected static ?string $navigationIcon = 'history';

    public static function getSubNavigationLabel(): string
    {
        return __('sales.orders.pages.timeline');
    }

    protected function getHeaderActions(): array
    {
        return [
            PluginActions::requestReturn(),
            PluginActions::invoice(),
            EditOrder::invoiceAction(),
            EditAction::make(),
        ];
    }
}
