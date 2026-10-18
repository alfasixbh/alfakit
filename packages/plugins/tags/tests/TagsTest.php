<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;
use AlfaSix\AlfakitTags\Infolists\Components\SpatieTagsEntry;
use AlfaSix\AlfakitTags\TagsPlugin;
use AlfaSix\AlfakitTags\Tests\Fixtures\Article;
use AlfaSix\AlfakitTags\Tests\TestCase as TagsTestCase;
use Spatie\Tags\Tag;

uses(TagsTestCase::class);

function tgTest(): TagsTestCase
{
    return TagsTestCase::current();
}

/**
 * @param  array<string, array<int, string>>  $tags  Type => names
 */
function tgArticle(array $tags = [], string $title = 'Hello'): Article
{
    $article = Article::query()->create(['title' => $title]);

    foreach ($tags as $type => $names) {
        $article->attachTags($names, $type === '' ? null : $type);
    }

    return $article->refresh();
}

/**
 * @param  array<string, mixed>  $block
 * @return array<string, mixed>
 */
function tgComponent(array $block, string $name): array
{
    return collect($block['components'])->firstWhere('name', $name);
}

it('registers the plugin on a panel', function (): void {
    $panel = alfakit()->getPanel('tags');

    expect($panel->hasPlugin('tags'))->toBeTrue()
        ->and($panel->getPlugin('tags'))->toBeInstanceOf(TagsPlugin::class);
});

it('saves the tags of each type when a record is created', function (): void {
    tgTest()->actingAs(tgTest()->admin());
    $token = tgTest()->pageProps('/tags/articles/create')['token'];

    tgTest()->runAction($token, 'create', ['title' => 'News', 'categories' => ['Laravel', 'PHP'], 'labels' => ['featured']])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $article = Article::query()->where('title', 'News')->sole();

    expect($article->tagsWithType('categories')->pluck('name')->all())->toBe(['Laravel', 'PHP'])
        ->and($article->tagsWithType('labels')->pluck('name')->all())->toBe(['featured']);
});

it('fills the input from the record and suggests the existing tags of its type', function (): void {
    $article = tgArticle(['categories' => ['Laravel'], 'labels' => ['featured']]);
    tgArticle(['categories' => ['Vue']], 'Other');
    tgTest()->actingAs(tgTest()->admin());

    $form = tgTest()->pageProps("/tags/articles/{$article->id}/edit")['content'][0];
    $field = tgComponent($form, 'categories');

    expect($field['type'])->toBe('TagsInput')
        ->and($form['state']['categories'])->toBe(['Laravel'])
        ->and($form['state']['labels'])->toBe(['featured'])
        ->and($field['suggestions'])->toBe(['Laravel', 'Vue']);
});

it('syncs only the tags of its type when the record is saved', function (): void {
    $article = tgArticle(['categories' => ['Laravel', 'PHP'], 'labels' => ['featured']]);
    tgTest()->actingAs(tgTest()->admin());
    $token = tgTest()->pageProps("/tags/articles/{$article->id}/edit")['token'];

    tgTest()->runAction($token, 'save', ['title' => 'Hello', 'categories' => ['PHP', 'Testing'], 'labels' => ['featured']])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $article->refresh();

    expect($article->tagsWithType('categories')->pluck('name')->sort()->values()->all())->toBe(['PHP', 'Testing'])
        ->and($article->tagsWithType('labels')->pluck('name')->all())->toBe(['featured'])
        ->and(Tag::query()->where('type', 'categories')->count())->toBe(3);
});

it('syncs tags of any type without a type', function (): void {
    $article = tgArticle(['categories' => ['Laravel'], '' => ['untyped']]);

    $field = SpatieTagsInput::make('tags');
    $form = Schema::make()->components([$field])->record($article)->fill();

    expect($field->isAnyTagTypeAllowed())->toBeTrue()
        ->and($form->getRawState()['tags'])->toEqualCanonicalizing(['Laravel', 'untyped']);

    $form->rawState(['tags' => ['fresh']]);
    $form->saveRelationships();

    expect($article->refresh()->tags->pluck('name')->all())->toBe(['fresh']);

    $untyped = SpatieTagsInput::make('tags')->type(null);
    Schema::make()->components([$untyped])->model(Article::class);

    expect($untyped->getExistingTagNames())->toBe(['untyped', 'fresh']);
});

it('shows the tags of the type in table columns and infolist entries', function (): void {
    $article = tgArticle(['categories' => ['Laravel'], 'labels' => ['featured']]);
    tgTest()->actingAs(tgTest()->admin());

    $table = tgTest()->pageProps('/tags/articles')['content'][0];
    $column = collect($table['columns'])->firstWhere('name', 'categories');

    expect($column['type'])->toBe('TextColumn')
        ->and($column['badge'])->toBeTrue()
        ->and($table['records'][0]['cells']['categories']['state'])->toBe(['Laravel']);

    $infolist = collect(tgTest()->pageProps("/tags/articles/{$article->id}")['content'])->firstWhere('type', 'Infolist');

    expect(tgComponent($infolist, 'categories')['type'])->toBe('TextEntry')
        ->and(tgComponent($infolist, 'categories')['state'])->toBe(['Laravel'])
        ->and(tgComponent($infolist, 'tags')['state'])->toEqualCanonicalizing(['Laravel', 'featured']);

    $entry = SpatieTagsEntry::make('labels')->type('labels');
    Schema::make()->components([$entry])->record($article);

    expect($entry->getState())->toBe(['featured']);
});

it('requires a signed-in user to save', function (): void {
    $article = tgArticle(['categories' => ['Laravel']]);
    tgTest()->actingAs(tgTest()->admin());
    $token = tgTest()->pageProps("/tags/articles/{$article->id}/edit")['token'];

    auth()->logout();

    $status = tgTest()->postJson('/tags/_alfakit/actions', ['token' => $token, 'action' => 'save', 'data' => ['title' => 'Hello', 'categories' => []]])->status();

    expect($status)->toBeIn([401, 403])
        ->and($article->refresh()->tagsWithType('categories')->pluck('name')->all())->toBe(['Laravel']);
});
