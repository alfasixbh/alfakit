<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Auth\MultiFactor\Email\Notifications\VerifyEmailAuthentication;
use AlfaSix\Alfakit\Mail\Contracts\MailTemplateRepository;
use AlfaSix\Alfakit\Mail\EditableTemplates;
use AlfaSix\Alfakit\Mail\MailTheme;
use AlfaSix\Alfakit\Versions\RecordVersion;
use AlfaSix\AlfakitMailTemplates\Mail\TestTemplateMail;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages\CreateMailTemplate;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages\EditMailTemplate;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages\ListMailTemplates;
use AlfaSix\AlfakitMailTemplates\Support\DatabaseMailTemplateRepository;
use AlfaSix\AlfakitMailTemplates\Tests\TestCase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Mail;

use function AlfaSix\AlfakitMailTemplates\Tests\admin;
use function AlfaSix\AlfakitMailTemplates\Tests\editor;
use function AlfaSix\AlfakitMailTemplates\Tests\page;
use function AlfaSix\AlfakitMailTemplates\Tests\template;
use function AlfaSix\AlfakitMailTemplates\Tests\templatesPanel;

uses(TestCase::class);

require_once __DIR__.'/helpers.php';

beforeEach(function (): void {
    MailTheme::flush();
    templatesPanel();
});

it('binds the database repository', function (): void {
    expect(app(MailTemplateRepository::class))->toBeInstanceOf(DatabaseMailTemplateRepository::class);
});

it('sends the edited template instead of the default, with merge tags filled', function (): void {
    template();

    $message = (new VerifyEmailAuthentication('428913', 10, 'Ada'))->toMail(new AnonymousNotifiable);
    $html = (string) $message->render();

    expect($message->subject)->toBe('Your code 428913')
        ->and($html)->toContain('428913</strong>')->toContain('to sign in.')->toContain('Acme Mail')
        ->not->toContain('data-type="mergeTag"');
});

it('keeps the default email in other locales and after a reset', function (): void {
    $template = template();

    [$subject, $html] = MailTheme::withLocale('ar', function (): array {
        $message = (new VerifyEmailAuthentication('428913', 10, 'Ada'))->toMail(new AnonymousNotifiable);

        return [$message->subject, (string) $message->render()];
    });

    expect($subject)->not->toBe('Your code 428913')
        ->and($html)->toContain('dir="rtl"');

    $template->resetToDefault();

    $english = (new VerifyEmailAuthentication('428913', 10, 'Ada'))->toMail(new AnonymousNotifiable);

    expect($template->refresh()->isCustomized())->toBeFalse()
        ->and($english->subject)->not->toBe('Your code 428913');
});

it('sanitises the body when saving', function (): void {
    $template = template(['body' => '<p onclick="steal()">Hi <a href="javascript:alert(1)">there</a></p><script>alert(1)</script><span data-type="mergeTag" data-id="code">{{ code }}</span>', 'subject' => "  Line\none  "]);

    expect($template->body)->not->toContain('<script')->not->toContain('onclick')->not->toContain('javascript:')
        ->toContain('data-type="mergeTag"')
        ->and($template->subject)->toBe('Line one');

    expect(template(['key' => 'alfakit.password-reset', 'body' => '<p> </p>', 'subject' => ' '])->isCustomized())->toBeFalse();
});

it('keeps a version on every save and restores one', function (): void {
    $template = template();
    $template->update(['subject' => 'Second {{ code }}']);
    $template->update(['subject' => 'Third {{ code }}']);

    $versions = RecordVersion::query()->where('versionable_type', $template->getMorphClass())->where('versionable_id', (string) $template->getKey())->orderBy('id')->get();

    expect($versions)->toHaveCount(3)
        ->and($versions[1]->getSnapshot()['subject'])->toBe('Second {{ code }}')
        ->and(MailTemplateResource::hasVersions())->toBeTrue();

    $template->restoreRecordVersion($versions[0]);

    expect($template->refresh()->subject)->toBe('Your code {{ code }}');
});

it('lets authorised users manage templates only', function (): void {
    $this->actingAs(editor());
    page(ListMailTemplates::class)->assertForbidden();
    page(CreateMailTemplate::class)->assertForbidden();

    $this->actingAs(admin());
    page(ListMailTemplates::class)->assertOk();

    $template = template();
    $this->actingAs(editor());
    page(EditMailTemplate::class, ['record' => $template->getKey()])->assertForbidden();
});

it('denies everyone without authorize() unless the gate allows', function (): void {
    alfakit()->getPanel('templates')->getPlugin('mail-templates')->authorize(null);
    $this->actingAs(admin());

    page(ListMailTemplates::class)->assertForbidden();

    Illuminate\Support\Facades\Gate::define('manageAlfakitMailTemplates', fn (): bool => true);

    page(ListMailTemplates::class)->assertOk();
});

it('creates a template and rejects unknown merge tags', function (): void {
    $this->actingAs(admin());

    page(CreateMailTemplate::class)
        ->fillForm(['key' => 'alfakit.multi-factor-code', 'locale' => 'ar', 'subject' => 'رمزك {{ password }}', 'body' => '<p>{{ secret }} <span data-type="mergeTag" data-id="code">{{ code }}</span></p>'])
        ->call('create')
        ->assertHasFormErrors(['subject', 'body']);

    expect(MailTemplate::query()->count())->toBe(0);

    page(CreateMailTemplate::class)
        ->fillForm(['key' => 'alfakit.multi-factor-code', 'locale' => 'ar', 'subject' => 'رمزك {{ code }}', 'body' => '<p>استخدم <span data-type="mergeTag" data-id="code">{{ code }}</span></p>'])
        ->call('create')
        ->assertHasNoFormErrors();

    $template = MailTemplate::query()->sole();

    expect($template->locale)->toBe('ar')->and($template->subject)->toBe('رمزك {{ code }}');

    // One template per email and language.
    page(CreateMailTemplate::class)
        ->fillForm(['key' => 'alfakit.multi-factor-code', 'locale' => 'ar', 'subject' => 'x', 'body' => '<p>x</p>'])
        ->call('create')
        ->assertHasFormErrors(['key']);

    // Mails that are not editable can't be chosen.
    page(CreateMailTemplate::class)
        ->fillForm(['key' => 'tests.unknown', 'locale' => 'en', 'body' => '<p>x</p>'])
        ->call('create')
        ->assertHasFormErrors(['key']);
});

it('offers the merge tags of the chosen email in the editor', function (): void {
    $this->actingAs(admin());
    $template = template();

    page(EditMailTemplate::class, ['record' => $template->getKey()])
        ->assertFormFieldExists('body', function (array $field): bool {
            $ids = array_column($field['mergeTags'] ?? [], 'id');

            return in_array('code', $ids, true) && in_array('name', $ids, true);
        });
});

it('previews the saved template with sample data in light and dark', function (): void {
    $this->actingAs(admin());
    $template = template(['locale' => 'ar']);

    $tester = page(EditMailTemplate::class, ['record' => $template->getKey()])->mountAction('preview');
    $modal = json_encode($tester->getMountedActionModal());

    expect(substr_count((string) $modal, '<iframe sandbox=\"\"'))->toBe(2)
        ->and($modal)->toContain('428913')
        ->toContain('dir=&quot;rtl&quot;')
        ->toContain('content=&quot;dark&quot;');
});

it('sends a test email to the signed-in admin only', function (): void {
    Mail::fake();
    $this->actingAs($admin = admin());
    $template = template();

    page(EditMailTemplate::class, ['record' => $template->getKey()])
        ->callAction('sendTest', ['to' => 'attacker@example.com', 'email' => 'attacker@example.com'])
        ->assertHasNoActionErrors()
        ->assertNotified();

    Mail::assertSent(TestTemplateMail::class, 1);
    Mail::assertSent(TestTemplateMail::class, function (TestTemplateMail $mail) use ($admin): bool {
        return $mail->hasTo($admin->email)
            && count($mail->to) === 1
            && $mail->cc === [] && $mail->bcc === []
            && str_contains($mail->template->subject, '428913')
            && str_contains($mail->render(), 'Acme Mail');
    });
});

it('resets a template to the default and keeps the history', function (): void {
    $this->actingAs(admin());
    $template = template();

    page(EditMailTemplate::class, ['record' => $template->getKey()])
        ->callAction('reset')
        ->assertHasNoActionErrors();

    expect($template->refresh()->isCustomized())->toBeFalse()
        ->and(RecordVersion::query()->where('versionable_id', (string) $template->getKey())->count())->toBe(2);

    page(EditMailTemplate::class, ['record' => $template->getKey()])->assertActionHidden('reset');
});

it('renders a reset template with the email\'s own content', function (): void {
    $template = template(['subject' => null, 'body' => null, 'key' => 'alfakit.email-change-verify']);

    $rendered = MailTemplateResource::render($template);

    expect($rendered->html->toHtml())->toContain('Acme Mail')->toContain('/email-change/verify?preview=1')
        ->and($rendered->text)->not->toContain('<style');
});

it('lists every editable AlfaKit mail as a template option', function (): void {
    expect(MailTemplateResource::templateOptions())->toHaveKeys([
        'alfakit.multi-factor-code', 'alfakit.email-change-verify', 'alfakit.email-change-notice',
        'alfakit.password-reset', 'alfakit.email-verification', 'alfakit.users-invitation',
    ]);

    foreach (array_keys(MailTemplateResource::templateOptions()) as $key) {
        $definition = AlfaSix\Alfakit\Mail\Mails::get($key);

        expect(EditableTemplates::unknownMergeTags($definition, $definition->getDefaultSubject(), $definition->getDefaultBody()))->toBe([]);
    }
});
