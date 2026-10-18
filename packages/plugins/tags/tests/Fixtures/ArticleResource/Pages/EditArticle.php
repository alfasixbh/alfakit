<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource;

class EditArticle extends EditRecord
{
    protected static string $resource = ArticleResource::class;
}
