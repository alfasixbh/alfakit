<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Models;

use AlfaSix\Alfakit\Mail\MailDefinition;
use AlfaSix\Alfakit\Mail\Mails;
use AlfaSix\Alfakit\Support\Html;
use AlfaSix\Alfakit\Versions\HasRecordVersions;
use AlfaSix\Alfakit\Versions\RecordVersion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * An edited mail template: the subject and body admins wrote for one mail (`key`, a
 * `MailDefinition`) in one locale. A null subject or body keeps the mail's own; saving
 * sanitises the body and keeps a version (History) when `alfakit_record_versions` exists.
 *
 * @property int $id
 * @property string $key
 * @property string $locale
 * @property string|null $subject
 * @property string|null $body
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class MailTemplate extends Model
{
    use HasRecordVersions;

    protected $table = 'alfakit_mail_templates';

    protected $guarded = ['id'];

    /** @var array<int, string> */
    protected array $versionInclude = ['subject', 'body'];

    protected int $maxVersions = 50;

    private static ?bool $hasVersionsTable = null;

    protected static function booted(): void
    {
        static::saving(static function (MailTemplate $template): void {
            $template->subject = static::cleanSubject($template->subject);
            $template->body = static::cleanBody($template->body);
            static::pauseVersionsWithoutTable();
        });

        static::deleting(static fn () => static::pauseVersionsWithoutTable());
    }

    /**
     * The mail this template edits, or null when it is no longer registered.
     */
    public function definition(): ?MailDefinition
    {
        return Mails::get($this->key);
    }

    public function isCustomized(): bool
    {
        return $this->subject !== null || $this->body !== null;
    }

    /**
     * Back to the mail's own subject and body (the history keeps the edited versions).
     */
    public function resetToDefault(): void
    {
        $this->subject = null;
        $this->body = null;
        $this->save();
    }

    /**
     * A subject on one line, or null when empty.
     */
    public static function cleanSubject(?string $subject): ?string
    {
        $subject = trim((string) preg_replace('/\s+/u', ' ', (string) $subject));

        return $subject === '' ? null : mb_substr($subject, 0, 255);
    }

    /**
     * The body sanitised (the panel's HTML sanitiser keeps merge tags), or null when empty.
     */
    public static function cleanBody(?string $body): ?string
    {
        if ($body === null || trim(strip_tags($body, '<img>')) === '' && ! str_contains($body, 'data-type="mergeTag"')) {
            return null;
        }

        $clean = Html::sanitize($body);

        return trim(strip_tags($clean, '<img>')) === '' && ! str_contains($clean, 'data-type="mergeTag"') ? null : $clean;
    }

    /**
     * Versions are kept only when the `alfakit_record_versions` table exists.
     */
    protected static function pauseVersionsWithoutTable(): void
    {
        if (! static::hasVersionsTable()) {
            static::$versioningPaused[static::class] = true;
        }
    }

    public static function hasVersionsTable(): bool
    {
        if (self::$hasVersionsTable !== null) {
            return self::$hasVersionsTable;
        }

        try {
            $table = (new RecordVersion)->getTable();

            return self::$hasVersionsTable = Schema::connection((new static)->getConnectionName())->hasTable($table);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Forget whether the versions table exists (tests, migrations at runtime).
     */
    public static function flushVersionsTableCache(): void
    {
        self::$hasVersionsTable = null;
        unset(static::$versioningPaused[static::class]);
    }
}
