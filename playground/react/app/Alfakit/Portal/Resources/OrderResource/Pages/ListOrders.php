<?php

declare(strict_types=1);

namespace App\Alfakit\Portal\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Portal\Resources\OrderResource;

class ListOrders extends ListRecords
{
    protected static string $resource = OrderResource::class;
}
