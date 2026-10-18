<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ReturnRequestResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\ReturnRequestResource;

class ListReturnRequests extends ListRecords
{
    protected static string $resource = ReturnRequestResource::class;

    public function getSubheading(): ?string
    {
        return __('plugins.returns.subheading');
    }
}
