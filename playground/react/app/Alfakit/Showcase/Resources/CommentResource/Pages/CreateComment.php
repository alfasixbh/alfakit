<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Resources\CommentResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Showcase\Resources\CommentResource;

class CreateComment extends CreateRecord
{
    protected static string $resource = CommentResource::class;
}
