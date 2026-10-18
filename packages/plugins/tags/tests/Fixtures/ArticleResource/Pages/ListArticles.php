<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\AlfakitTags\Tests\Fixtures\ArticleResource;

class ListArticles extends ListRecords
{
    protected static string $resource = ArticleResource::class;
}
