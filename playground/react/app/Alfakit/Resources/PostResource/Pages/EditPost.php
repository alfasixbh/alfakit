<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\AlfakitComments\Actions\CommentsAction;
use App\Alfakit\Resources\PostResource;

class EditPost extends EditRecord
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // alfasix/alfakit-comments: the discussion in a slide-over.
            CommentsAction::make(),
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}
