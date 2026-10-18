<?php

namespace App\Support\Site;

use AlfaSix\AlfakitAnalytics\AlfakitAnalyticsServiceProvider;
use AlfaSix\AlfakitAnalytics\Analytics;
use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitForms\AlfakitForms;
use AlfaSix\AlfakitForms\AlfakitFormsServiceProvider;
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitForms\Support\FormDefinition;
use AlfaSix\AlfakitHelpdesk\AlfakitHelpdeskServiceProvider;
use Illuminate\Support\Str;
use Throwable;

/**
 * The website running on AlfaKit's own plugins (config `docs.dogfood`): the contact page
 * is a Forms form, page views go to Analytics (with a public read-only dashboard) and a
 * Helpdesk chat bubble answers visitors. Every part is off unless turned on.
 */
class Dogfood
{
    public static function enabled(string $plugin): bool
    {
        return (bool) config("docs.dogfood.{$plugin}.enabled", false);
    }

    /**
     * Service providers of the plugins that are turned on (they are not auto-discovered).
     *
     * @return list<class-string>
     */
    public static function providers(): array
    {
        return array_values(array_filter([
            self::enabled('forms') ? AlfakitFormsServiceProvider::class : null,
            self::enabled('analytics') ? AlfakitAnalyticsServiceProvider::class : null,
            self::enabled('helpdesk') ? AlfakitHelpdeskServiceProvider::class : null,
        ]));
    }

    /**
     * What the site's layout needs on every page: the tracker's site key, the shared
     * dashboard link and the chat endpoint, or nulls when a plugin is off.
     *
     * @return array{analytics: array{siteKey: string, shareUrl: string|null}|null, chat: array{endpoint: string}|null, contact: bool}
     */
    public static function props(): array
    {
        return [
            'analytics' => self::enabled('analytics') ? [
                'siteKey' => (string) config('docs.dogfood.analytics.site'),
                'shareUrl' => self::shareUrl(),
            ] : null,
            'chat' => self::enabled('helpdesk') ? ['endpoint' => '/'.trim((string) config('alfakit-helpdesk.route.prefix', 'support'), '/').'/chat'] : null,
            'contact' => self::enabled('forms'),
        ];
    }

    /**
     * The contact form as a payload for `<AlfakitComponent>`, or null when Forms is off or
     * the form isn't there (run `php artisan docs:dogfood`).
     */
    public static function contactForm(): mixed
    {
        if (! self::enabled('forms')) {
            return null;
        }

        $slug = (string) config('docs.dogfood.forms.contact', 'contact');

        if (! Form::query()->where('slug', $slug)->where('is_published', true)->exists()) {
            return null;
        }

        return AlfakitForms::embed($slug);
    }

    /**
     * The public, read-only dashboard of the site's analytics, when sharing is turned on.
     */
    public static function shareUrl(): ?string
    {
        if (! self::enabled('analytics') || ! config('docs.dogfood.analytics.share')) {
            return null;
        }

        try {
            $site = Site::query()->where('key', (string) config('docs.dogfood.analytics.site'))->first();
        } catch (Throwable) {
            return null; // Not migrated yet.
        }

        return $site === null ? null : Analytics::shareUrl($site);
    }

    /**
     * Create (or update) the records the site uses: the contact form and the analytics
     * site. Returns what was set up, for the command's output.
     *
     * @return list<string>
     */
    public static function setUp(): array
    {
        $done = [];

        if (self::enabled('forms')) {
            $slug = (string) config('docs.dogfood.forms.contact', 'contact');
            $form = Form::query()->firstOrNew(['slug' => $slug]);
            $form->forceFill([
                'slug' => $slug,
                'title' => 'Contact the AlfaKit team',
                'description' => 'Questions about AlfaKit, a plugin idea or a project for Alfa Six: we read every message.',
                'is_published' => true,
                'fields' => FormDefinition::normalize([
                    ['type' => 'text', 'data' => ['label' => 'Your name', 'name' => 'name', 'required' => true, 'width' => 'half']],
                    ['type' => 'email', 'data' => ['label' => 'Email', 'name' => 'email', 'required' => true, 'width' => 'half']],
                    ['type' => 'select', 'data' => ['label' => 'Topic', 'name' => 'topic', 'required' => true, 'options' => ['A question about AlfaKit', 'A plugin idea', 'Services from Alfa Six', 'Something else']]],
                    ['type' => 'textarea', 'data' => ['label' => 'Message', 'name' => 'message', 'required' => true]],
                ]),
                'settings' => [
                    'submit_label' => 'Send message',
                    'confirmation_message' => 'Thank you! We will get back to you soon.',
                    'honeypot' => true,
                ],
            ])->save();
            $done[] = "Forms: the /contact form ({$slug})";
        }

        if (self::enabled('analytics')) {
            $key = (string) config('docs.dogfood.analytics.site');
            $site = Site::query()->firstOrNew(['key' => $key]);
            $host = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';
            $share = (bool) config('docs.dogfood.analytics.share');

            $site->forceFill([
                'key' => $key,
                'name' => 'AlfaKit website',
                'domain' => null,
                'domains' => [$host],
                'timezone' => (string) config('app.timezone', 'UTC'),
                'is_active' => true,
                'is_shared' => $share,
                'share_token' => $share ? ($site->share_token ?? Str::random(40)) : $site->share_token,
            ])->save();
            $done[] = "Analytics: the site {$key}".($share ? ' with a public dashboard' : '');
        }

        if (self::enabled('helpdesk')) {
            $done[] = 'Helpdesk: the chat bubble (answer visitors in /admin)';
        }

        return $done;
    }
}
