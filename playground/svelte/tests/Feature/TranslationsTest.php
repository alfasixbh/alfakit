<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Localization\LocaleResolver;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/*
 * The playground's own strings: lang/<locale>/playground.php (and the model names in
 * models.php). The files are identical in playground/react, playground/vue and
 * playground/svelte.
 */

/**
 * Flattens a translation file to `dot.key => value`; lists (plan features) stay values.
 *
 * @param  array<array-key, mixed>  $lines
 * @return array<string, mixed>
 */
function playgroundTranslationKeys(array $lines, string $prefix = ''): array
{
    $flat = [];

    foreach ($lines as $key => $value) {
        if (is_array($value) && ! array_is_list($value)) {
            $flat += playgroundTranslationKeys($value, $prefix.$key.'.');
        } else {
            $flat[$prefix.$key] = $value;
        }
    }

    return $flat;
}

/** The `:placeholders` of a line (and the length of a list), so they can be compared. */
function playgroundTranslationShape(mixed $value): string
{
    $text = is_array($value) ? implode('|', array_map(strval(...), $value)) : (string) $value;
    preg_match_all('/:[a-z_]+/', $text, $matches);
    sort($matches[0]);

    return implode(',', $matches[0]).(is_array($value) ? '#'.count($value) : '');
}

dataset('playground locales', ['ar', 'de', 'es', 'fa', 'fr', 'it', 'ja', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN']);

dataset('playground groups', ['playground', 'models']);

it('translates every playground string with the same keys and placeholders as English', function (string $locale, string $group): void {
    $english = playgroundTranslationKeys(require lang_path("en/{$group}.php"));
    $translated = playgroundTranslationKeys(require lang_path("{$locale}/{$group}.php"));

    expect(array_keys($translated))->toEqualCanonicalizing(array_keys($english));

    foreach ($english as $key => $line) {
        expect(playgroundTranslationShape($translated[$key]))->toBe(playgroundTranslationShape($line), "{$locale}/{$group}.php: {$key}");
        expect($translated[$key])->not->toBe('', "{$locale}/{$group}.php: {$key} is empty");
    }
})->with('playground locales')->with('playground groups');

it('offers every panel locale', function (): void {
    $locales = array_keys(alfakit()->getPanel('admin')->getLocales());

    foreach ($locales as $locale) {
        expect(lang_path("{$locale}/playground.php"))->toBeFile();
    }
});

/** The Inertia page sent with a full page load, re-encoded without `\u` escapes. */
function playgroundPage(TestResponse $response): string
{
    preg_match('/<script data-page="app" type="application\/json">(.*?)<\/script>/s', (string) $response->getContent(), $matches);

    return (string) json_encode(json_decode($matches[1] ?? 'null', true), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

it('renders the navigation in the chosen language', function (): void {
    $user = User::factory()->create();

    $english = playgroundPage($this->actingAs($user)->get('/admin')->assertOk());

    expect($english)->toContain('"Posts board"', '"Category tree"', '"Blog"');

    $arabic = $this->actingAs($user)
        ->withSession([LocaleResolver::SESSION_KEY => 'ar'])
        ->get('/admin')
        ->assertOk()
        ->assertSee('dir="rtl"', false);

    expect(playgroundPage($arabic))
        ->toContain('"المدونة"', '"لوحة التدوينات"', '"شجرة التصنيفات"', '"التقويم"', '"النظام"')
        ->not->toContain('"Posts board"', '"Category tree"', '"Blog"');
});

it('shares the custom components’ strings with the frontend', function (): void {
    $page = $this->actingAs(User::factory()->create())
        ->withSession([LocaleResolver::SESSION_KEY => 'ja'])
        ->get('/admin')
        ->assertOk();

    expect(playgroundPage($page))->toContain('"playground":{"swatch_picker":{"selected":"選択中の色: :label"');
});
