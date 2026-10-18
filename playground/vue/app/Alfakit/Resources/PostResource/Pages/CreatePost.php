<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use App\Alfakit\Resources\PostResource;
use AlfaSix\Alfakit\Resources\Pages\CreateRecord;

class CreatePost extends CreateRecord
{
    protected static string $resource = PostResource::class;
}
