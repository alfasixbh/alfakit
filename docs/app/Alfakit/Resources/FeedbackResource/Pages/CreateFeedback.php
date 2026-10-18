<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\FeedbackResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\FeedbackResource;

class CreateFeedback extends CreateRecord
{
    protected static string $resource = FeedbackResource::class;
}
