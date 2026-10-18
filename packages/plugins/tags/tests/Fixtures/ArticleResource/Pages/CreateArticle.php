<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource;

class CreateArticle extends CreateRecord
{
    protected static string $resource = ArticleResource::class;
}
