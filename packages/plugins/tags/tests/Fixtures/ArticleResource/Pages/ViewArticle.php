<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource;

class ViewArticle extends ViewRecord
{
    protected static string $resource = ArticleResource::class;
}
