<?php

use Illuminate\Support\Facades\Artisan;

/*
 * The homepage's numbers (resources/js/pages/welcome.tsx) must match the code: they are
 * the first thing people quote.
 */

function homepageNumber(string $label): int
{
    $source = (string) file_get_contents(resource_path('js/pages/welcome.tsx'));

    preg_match("/value: '(\\d+)', label: '".preg_quote($label, '/')."'/", $source, $match);

    return (int) ($match[1] ?? -1);
}

/**
 * @return list<string> Concrete subclasses of $base in the package directory $dir.
 */
function concreteClasses(string $dir, string $namespace, string $base): array
{
    $classes = [];

    foreach (glob(base_path("vendor/alfasix/alfakit/src/{$dir}/*.php")) ?: [] as $file) {
        $class = $namespace.'\\'.basename($file, '.php');

        if (class_exists($class) && ! (new ReflectionClass($class))->isAbstract() && is_subclass_of($class, $base)) {
            $classes[] = basename($file, '.php');
        }
    }

    return $classes;
}

it('counts the form fields, column types, generators and languages it advertises', function () {
    // `Hidden` stores a value without a control, so it isn't counted as a form field.
    $fields = array_diff(concreteClasses('Forms/Components', 'AlfaSix\\Alfakit\\Forms\\Components', AlfaSix\Alfakit\Forms\Components\Field::class), ['Hidden']);
    $columns = concreteClasses('Tables/Columns', 'AlfaSix\\Alfakit\\Tables\\Columns', AlfaSix\Alfakit\Tables\Columns\Column::class);
    $generators = array_filter(array_keys(Artisan::all()), fn (string $name): bool => str_starts_with($name, 'make:alfakit-'));
    $languages = count(glob(base_path('../packages/translations/lang/*'), GLOB_ONLYDIR) ?: []) + 1; // + English in the core package

    expect(homepageNumber('Form fields'))->toBe(count($fields))
        ->and(homepageNumber('Column types'))->toBe(count($columns))
        ->and(homepageNumber('Generators'))->toBe(count($generators))
        ->and(homepageNumber('Languages'))->toBe($languages)
        ->and(homepageNumber('Themes'))->toBe(count(AlfaSix\Alfakit\Theming\Themes::all()));
});
