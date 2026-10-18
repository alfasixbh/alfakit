<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Support;

use AlfaSix\Alfakit\Mail\Contracts\MailTemplateRepository;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use Illuminate\Database\QueryException;

/**
 * Edited templates from `alfakit_mail_templates`. Before the migration runs, mails keep
 * their own content instead of failing.
 */
class DatabaseMailTemplateRepository implements MailTemplateRepository
{
    public function find(string $key, string $locale): ?array
    {
        try {
            $template = MailTemplate::query()->where('key', $key)->where('locale', $locale)->first(['subject', 'body']);
        } catch (QueryException) {
            return null;
        }

        return $template === null ? null : ['subject' => $template->subject, 'body' => $template->body];
    }
}
