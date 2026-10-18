<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Resources\UserResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Showcase\Resources\UserResource;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;
}
