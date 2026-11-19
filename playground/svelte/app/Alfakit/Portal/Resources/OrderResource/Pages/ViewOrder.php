<?php

declare(strict_types=1);

namespace App\Alfakit\Portal\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Portal\Resources\OrderResource;

class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;
}
