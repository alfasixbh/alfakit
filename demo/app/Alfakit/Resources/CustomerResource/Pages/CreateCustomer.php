<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\CustomerResource;

class CreateCustomer extends CreateRecord
{
    protected static string $resource = CustomerResource::class;

    protected function getRedirectUrl(): string
    {
        return CustomerResource::getUrl('view', ['record' => $this->getCreatedRecord()]);
    }
}
