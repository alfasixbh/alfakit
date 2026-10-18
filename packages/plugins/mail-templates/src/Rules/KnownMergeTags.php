<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Rules;

use AlfaSix\Alfakit\Mail\EditableTemplates;
use AlfaSix\Alfakit\Mail\Mails;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Only the merge tags the mail offers (`MailDefinition::editable()`): a template must not
 * reach for data the mail doesn't hand it.
 */
class KnownMergeTags implements ValidationRule
{
    public function __construct(
        protected ?string $key,
        protected bool $isBody = false,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        $definition = $this->key === null ? null : Mails::get($this->key);

        if ($definition === null) {
            return;
        }

        $unknown = EditableTemplates::unknownMergeTags($definition, $this->isBody ? null : $value, $this->isBody ? $value : null);

        if ($unknown !== []) {
            $fail((string) trans_choice('alfakit-mail-templates::mail-templates.validation.unknown_tags', count($unknown), [
                'tags' => implode(', ', array_map(static fn (string $tag): string => '{{ '.$tag.' }}', $unknown)),
            ]));
        }
    }
}
