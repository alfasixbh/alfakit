<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Tests;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Testing\PageTester;
use AlfaSix\Alfakit\Tests\Fixtures\AuthTenancy\Panels;
use AlfaSix\Alfakit\Tests\Fixtures\Models\User;
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;

const ADMIN_EMAIL = 'admin@example.com';

function mailTemplatesTest(): TestCase
{
    return TestCase::current();
}

function templatesPanel(?MailTemplatesPlugin $plugin = null): Panel
{
    config()->set('alfakit.mail.name', 'Acme Mail');

    return Panels::register('templates', static fn (Panel $panel): Panel => $panel
        ->login()
        ->default()
        ->locales(['en', 'ar'])
        ->plugin($plugin ?? MailTemplatesPlugin::make()->authorize(static fn (User $user): bool => $user->email === ADMIN_EMAIL)));
}

function admin(): User
{
    return User::query()->firstOrCreate(['email' => ADMIN_EMAIL], ['name' => 'Ada Admin', 'password' => 'secret']);
}

function editor(): User
{
    return User::query()->create(['name' => 'Eve Editor', 'email' => uniqid('eve', true).'@example.com', 'password' => 'secret']);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function template(array $attributes = []): MailTemplate
{
    return MailTemplate::query()->create([
        'key' => 'alfakit.multi-factor-code',
        'locale' => 'en',
        'subject' => 'Your code {{ code }}',
        'body' => '<p>Use <strong><span data-type="mergeTag" data-id="code">{{ code }}</span></strong> to sign in.</p>',
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $parameters
 */
function page(string $page, array $parameters = []): PageTester
{
    return PageTester::make($page, $parameters, 'templates');
}
