<?php

namespace App\Support;

use AlfaSix\Alfakit\Standalone\Component;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Live examples of the docs: ```alfakit-example name="text-input-basic"``` blocks in the
 * Markdown are replaced by the PHP of app/Examples/TextInputBasic.php next to the result
 * it renders, in React, Vue and Svelte. The class is the code shown and the code run.
 */
class Examples
{
    public const RENDERERS = ['react', 'vue', 'svelte'];

    /** A fenced block: ```alfakit-example name="text-input-basic"``` (the body is ignored). */
    public const PATTERN = '/^```alfakit-example\s+name="([a-z0-9-]+)"[^\n]*\R(?:.*?\R)?```[ \t]*$/ms';

    public function __construct(protected string $directory, protected string $namespace = 'App\\Examples') {}

    /**
     * @return list<string>
     */
    public function names(): array
    {
        $names = [];

        foreach (File::glob($this->directory.'/*.php') ?: [] as $file) {
            $class = $this->namespace.'\\'.basename($file, '.php');

            if (class_exists($class) && is_subclass_of($class, Component::class)) {
                $names[] = Str::kebab(basename($file, '.php'));
            }
        }

        sort($names);

        return $names;
    }

    public function has(string $name): bool
    {
        return preg_match('/^[a-z0-9-]+$/', $name) === 1 && in_array($name, $this->names(), true);
    }

    /**
     * @return class-string<Component>
     */
    public function class(string $name): string
    {
        abort_unless($this->has($name), 404);

        /** @var class-string<Component> */
        return $this->namespace.'\\'.Str::studly($name);
    }

    /** The example's PHP file, as shown next to the result. */
    public function source(string $name): string
    {
        return rtrim(File::get($this->directory.'/'.Str::studly($name).'.php'));
    }

    public function make(string $name): Component
    {
        return $this->class($name)::make();
    }

    /**
     * Example names used by a Markdown page, in order.
     *
     * @return list<string>
     */
    public function referencedIn(string $markdown): array
    {
        preg_match_all(self::PATTERN, $markdown, $matches);

        return array_values(array_unique($matches[1]));
    }

    /**
     * Replace the example blocks with a mount point for the renderer tabs.
     */
    public function toPlaceholders(string $markdown): string
    {
        return (string) preg_replace_callback(self::PATTERN, fn (array $match): string => "\n<div data-alfakit-example=\"{$match[1]}\"></div>\n", $markdown);
    }

    /**
     * Replace the example blocks with the example's PHP (for llms.txt and the .md pages).
     */
    public function toCode(string $markdown): string
    {
        return (string) preg_replace_callback(self::PATTERN, fn (array $match): string => $this->has($match[1])
            ? "```php\n".$this->source($match[1])."\n```"
            : '', $markdown);
    }

    /**
     * What a docs page needs for each example: the code and the frames of each renderer.
     *
     * @param  list<string>  $names
     * @return array<string, array{name: string, title: string, code: string, frames: array<string, string>}>
     */
    public function forPage(array $names): array
    {
        $examples = [];

        foreach ($names as $name) {
            if (! $this->has($name)) {
                continue;
            }

            $examples[$name] = [
                'name' => $name,
                'title' => 'app/Examples/'.Str::studly($name).'.php',
                'code' => $this->source($name),
                'frames' => array_combine(self::RENDERERS, array_map(
                    fn (string $renderer): string => route('docs.examples.frame', ['name' => $name, 'renderer' => $renderer], absolute: false),
                    self::RENDERERS,
                )),
            ];
        }

        return $examples;
    }
}
