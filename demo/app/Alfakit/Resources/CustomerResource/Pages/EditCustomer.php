<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\CustomerResource;

class EditCustomer extends EditRecord
{
    protected static string $resource = CustomerResource::class;

    protected static ?string $navigationIcon = 'pencil';

    public static function getSubNavigationLabel(): string
    {
        return __('sales.customers.pages.edit');
    }

    protected function getHeaderActions(): array
    {
        return [
            ViewCustomer::vipAction(),
            ViewAction::make(),
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
