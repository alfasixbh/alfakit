<?php

namespace Database\Seeders;

use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitApi\ApiPlugin;
use AlfaSix\AlfakitCms\Enums\PageStatus;
use AlfaSix\AlfakitCms\Models\Menu;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitForms\Models\FormSubmission;
use AlfaSix\AlfakitHelpdesk\Enums\TicketStatus;
use AlfaSix\AlfakitHelpdesk\Models\Ticket;
use AlfaSix\AlfakitHelpdesk\Support\Tickets;
use AlfaSix\AlfakitInvoices\Models\Invoice;
use AlfaSix\AlfakitInvoices\Models\Tax;
use AlfaSix\AlfakitTeams\Models\Team;
use AlfaSix\AlfakitTeams\TeamManager;
use AlfaSix\AlfakitWebhooks\Models\WebhookEndpoint;
use AlfaSix\AlfakitWorkflows\Support\Approvals;
use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Pennant\Feature;

/**
 * Demo data for the second wave of first-party plugins and core features. Safe to run
 * more than once: `php artisan db:seed --class=WavePluginsSeeder`.
 */
class WavePluginsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = $this->user('admin@example.com', 'Alfa Admin');
        $editor = $this->user('editor@example.com', 'Eda Editor');
        $viewer = $this->user('viewer@example.com', 'Vic Viewer');

        Auth::guard('web')->setUser($admin);

        $this->seedCategoryIcons();
        $this->seedExpenses($admin, $editor);
        $this->seedForms();
        $this->seedCms();
        $this->seedApiToken($admin);
        $this->seedWebhooks($admin);
        $this->seedFeatureFlags($editor);
        $this->seedInvoices($editor, $viewer);
        $this->seedFiles();
        $this->seedHelpdesk($admin, $editor, $viewer);
        $this->seedAnalytics();
        $this->seedTeams($admin, $editor, $viewer);
    }

    protected function user(string $email, string $name): User
    {
        return User::query()->firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );
    }

    /** IconPicker on categories. */
    protected function seedCategoryIcons(): void
    {
        $icons = ['Engineering' => 'cpu', 'Backend' => 'server', 'Frontend' => 'monitor', 'Product' => 'package', 'Design' => 'palette', 'Company' => 'building-2', 'News' => 'newspaper', 'Hiring' => 'user-plus'];

        foreach ($icons as $name => $icon) {
            Category::query()->where('name', $name)->update(['icon' => $icon]);
        }
    }

    /** alfasix/alfakit-workflows: claims in every state, one waiting for the admin's approval. */
    protected function seedExpenses(User $admin, User $editor): void
    {
        if (Expense::query()->exists()) {
            return;
        }

        $create = fn (string $title, int $amount): Expense => Expense::query()->create(['user_id' => $editor->id, 'title' => $title, 'amount' => $amount]);

        $create('Team lunch with a customer', 8450);

        $create('Conference ticket: Laracon EU', 49900)->transition('submit', comment: 'Approved in the Q3 budget.', user: $editor);
        $create('Train to the client workshop', 6400)->transition('submit', user: $editor);

        $approved = $create('New monitor for the design team', 32900);
        $approved->transition('submit', user: $editor);
        $this->approve($approved, $admin, 'Go ahead.');

        $paid = $create('Domain renewals', 2400);
        $paid->transition('submit', user: $editor);
        $this->approve($paid, $admin);
        $paid->refresh()->transition('pay', ['reference' => 'TRX-1042'], user: $admin);

        $rejected = $create('Business class upgrade', 120000);
        $rejected->transition('submit', user: $editor);
        $request = $rejected->getPendingApprovalRequest();
        $approval = $request ? Approvals::assignmentFor($request, $admin) : null;

        if ($approval !== null) {
            Approvals::reject($approval, $admin, 'Economy for flights under six hours, please.');
        }
    }

    protected function approve(Expense $expense, User $admin, ?string $comment = null): void
    {
        $request = $expense->getPendingApprovalRequest();
        $approval = $request ? Approvals::assignmentFor($request, $admin) : null;

        if ($approval !== null) {
            Approvals::approve($approval, $admin, $comment);
        }
    }

    /** alfasix/alfakit-forms: a published contact form at /forms/contact-us with a few answers. */
    protected function seedForms(): void
    {
        $form = Form::query()->firstOrCreate(['slug' => 'contact-us'], [
            'title' => 'Contact us',
            'description' => 'Questions about AlfaKit? We answer within a working day.',
            'is_published' => true,
            'fields' => [
                ['type' => 'text', 'data' => ['label' => 'Your name', 'name' => 'name', 'required' => true]],
                ['type' => 'email', 'data' => ['label' => 'Email', 'name' => 'email', 'required' => true]],
                ['type' => 'select', 'data' => ['label' => 'Topic', 'name' => 'topic', 'required' => true, 'options' => ['Sales', 'Support', 'Partnerships']]],
                ['type' => 'textarea', 'data' => ['label' => 'Message', 'name' => 'message', 'required' => true, 'rows' => 5]],
                ['type' => 'rating', 'data' => ['label' => 'How did we do so far?', 'name' => 'rating']],
                ['type' => 'checkbox', 'data' => ['label' => 'Send me product news', 'name' => 'newsletter']],
            ],
        ]);

        if ($form->submissions()->exists()) {
            return;
        }

        foreach ([
            ['name' => 'Ana Lopez', 'email' => 'ana@example.com', 'topic' => 'Sales', 'message' => 'Do you offer a team licence?', 'rating' => 5, 'newsletter' => true],
            ['name' => 'Omar Haddad', 'email' => 'omar@example.com', 'topic' => 'Support', 'message' => 'How do I add a custom field in Svelte?', 'rating' => 4, 'newsletter' => false],
            ['name' => 'Mia Chen', 'email' => 'mia@example.com', 'topic' => 'Partnerships', 'message' => 'We build Laravel apps for agencies and would like to partner.', 'rating' => null, 'newsletter' => true],
        ] as $index => $data) {
            FormSubmission::query()->forceCreate(['form_id' => $form->id, 'data' => $data, 'created_at' => now()->subDays(3 - $index), 'updated_at' => now()->subDays(3 - $index)]);
        }
    }

    /** alfasix/alfakit-cms: home, about and pricing pages at /site, with main and footer menus. */
    protected function seedCms(): void
    {
        $home = Page::query()->firstOrCreate(['slug' => 'home'], [
            'title' => 'AlfaKit Playground',
            'is_home' => true,
            'status' => PageStatus::Published,
            'content' => [
                ['type' => 'hero', 'data' => [
                    'eyebrow' => 'AlfaKit CMS',
                    'heading' => 'Admin panels for Laravel, rendered with Inertia',
                    'subheading' => 'This page is managed in the panel under Content › Pages. Sign in as an editor to see the "Edit this page" bar.',
                    'primary_label' => 'Open the panel', 'primary_url' => '/admin',
                    'secondary_label' => 'Contact us', 'secondary_url' => '/forms/contact-us',
                    'alignment' => 'center',
                ]],
                ['type' => 'features', 'data' => [
                    'heading' => 'Everything in one panel',
                    'intro' => 'First-party plugins for the work around your data.',
                    'columns' => '3',
                    'items' => [
                        ['icon' => 'square-kanban', 'title' => 'Kanban boards', 'description' => 'Drag posts between draft, review and published.'],
                        ['icon' => 'git-pull-request-arrow', 'title' => 'Approval workflows', 'description' => 'Expense claims with an approvals inbox.'],
                        ['icon' => 'life-buoy', 'title' => 'Helpdesk', 'description' => 'Tickets, SLAs and a customer portal at /support.', 'url' => '/support/contact'],
                        ['icon' => 'receipt', 'title' => 'Invoices', 'description' => 'Exact money, taxes and printable documents.'],
                        ['icon' => 'chart-line', 'title' => 'Analytics', 'description' => 'Cookieless visits to this very page.'],
                        ['icon' => 'flag', 'title' => 'Feature flags', 'description' => 'Pennant features with rollouts and a kill switch.'],
                    ],
                ]],
                ['type' => 'faq', 'data' => [
                    'heading' => 'Questions',
                    'items' => [
                        ['question' => 'Which renderers are supported?', 'answer' => 'React, Vue and Svelte, from the same PHP definitions.'],
                        ['question' => 'Where does validation run?', 'answer' => 'Always on the server, in PHP.'],
                    ],
                ]],
                ['type' => 'call-to-action', 'data' => [
                    'heading' => 'Talk to us',
                    'body' => 'Questions, partnerships or a demo: the contact form goes straight to the Forms plugin.',
                    'primary_label' => 'Contact us', 'primary_url' => '/forms/contact-us',
                    'tone' => 'primary',
                ]],
            ],
            'seo' => ['title' => 'AlfaKit Playground', 'description' => 'The AlfaKit playground site, built with the CMS plugin.'],
        ]);

        $about = Page::query()->firstOrCreate(['slug' => 'about'], [
            'title' => 'About',
            'status' => PageStatus::Published,
            'content' => [
                ['type' => 'rich-text', 'data' => ['content' => '<h2>About this playground</h2><p>Every page here is a CMS page with blocks, revisions and SEO settings. Edit it in the panel and publish to see the change.</p>']],
            ],
        ]);

        $pricing = Page::query()->firstOrCreate(['slug' => 'pricing'], [
            'title' => 'Pricing',
            'status' => PageStatus::Published,
            'content' => [
                ['type' => 'hero', 'data' => ['heading' => 'Simple pricing', 'subheading' => 'MIT licensed. Free forever.']],
                ['type' => 'rich-text', 'data' => ['content' => '<p>Plans and checkout live in the Billing plugin.</p>']],
            ],
        ]);

        Page::query()->firstOrCreate(['slug' => 'roadmap'], [
            'title' => 'Roadmap (draft)',
            'status' => PageStatus::Draft,
            'content' => [['type' => 'rich-text', 'data' => ['content' => '<p>Not published yet.</p>']]],
        ]);

        Menu::query()->updateOrCreate(['handle' => 'main'], ['name' => 'Main', 'items' => [
            ['label' => 'Home', 'type' => 'page', 'page_id' => $home->id],
            ['label' => 'About', 'type' => 'page', 'page_id' => $about->id],
            ['label' => 'Pricing', 'type' => 'page', 'page_id' => $pricing->id],
            ['label' => 'Support', 'type' => 'url', 'url' => '/support/contact'],
        ]]);

        Menu::query()->updateOrCreate(['handle' => 'footer'], ['name' => 'Footer', 'items' => [
            ['label' => 'Contact us', 'type' => 'url', 'url' => '/forms/contact-us'],
            ['label' => 'Admin panel', 'type' => 'url', 'url' => '/admin'],
        ]]);
    }

    /** alfasix/alfakit-api: a read-only token for the admin (its plain text was shown once, at creation). */
    protected function seedApiToken(User $admin): void
    {
        $plugin = ApiPlugin::get(alfakit()->getPanel('admin'));

        if (DB::table('alfakit_api_tokens')->where('name', 'Playground read-only')->exists()) {
            return;
        }

        $plugin->getTokenRepository()->create(user: $admin, panelId: 'admin', name: 'Playground read-only', abilities: ['posts:read'], expiresAt: now()->addDays(90));
    }

    /** alfasix/alfakit-webhooks: an endpoint for post events (deliveries wait in the queue). */
    protected function seedWebhooks(User $admin): void
    {
        WebhookEndpoint::query()->firstOrCreate(['description' => 'Playground receiver (example.com)'], [
            'url' => 'https://example.com/webhooks/alfakit',
            'is_enabled' => true,
            'events' => ['post.published', 'post.created', 'post.updated'],
            'created_by_type' => $admin->getMorphClass(),
            'created_by_id' => (string) $admin->getKey(),
        ]);
    }

    /** alfasix/alfakit-feature-flags: features live in app/Features; give the editor the new editor. */
    protected function seedFeatureFlags(User $editor): void
    {
        Feature::for($editor)->activate('new-post-editor');
        Feature::for($editor)->activate('purchase-button', 'green');
    }

    /** alfasix/alfakit-invoices: VAT and two invoices (one sent, one paid). */
    protected function seedInvoices(User $editor, User $viewer): void
    {
        $vat = Tax::query()->firstOrCreate(['name' => 'VAT'], ['rate' => '10', 'is_default' => true]);
        Tax::query()->firstOrCreate(['name' => 'City levy'], ['rate' => '2.5', 'is_compound' => true]);

        if (Invoice::query()->exists()) {
            return;
        }

        $sent = Invoice::createWithItems(['billable' => $editor, 'currency' => 'USD', 'reference' => 'PO-1042'], [
            ['description' => 'Admin panel build', 'quantity' => '12', 'unit_price' => 9500, 'tax_ids' => [$vat->id]],
            ['description' => 'Hosting (monthly)', 'quantity' => '1', 'unit_price' => 4900, 'discount_type' => 'percent', 'discount_value' => '20', 'tax_ids' => [$vat->id]],
        ]);
        $sent->markAsSent();

        $paid = Invoice::createWithItems(['billable' => $viewer, 'currency' => 'USD'], [
            ['description' => 'Support plan', 'quantity' => '1', 'unit_price' => 29900, 'tax_ids' => [$vat->id]],
        ]);
        $paid->markAsSent();
        $paid->recordPayment($paid->total, method: 'bank_transfer', reference: 'TT-88');

        Invoice::createWithItems(['billable' => $editor, 'currency' => 'USD'], [
            ['description' => 'Design review', 'quantity' => '3', 'unit_price' => 12000],
        ]);
    }

    /** alfasix/alfakit-file-manager: a few files under the public disk's playground-files folder. */
    protected function seedFiles(): void
    {
        $disk = Storage::disk('public');

        $disk->put('playground-files/README.txt', "Files in this folder are managed by the AlfaKit File Manager plugin (Files in the panel).\n");
        $disk->put('playground-files/reports/2026-q3-sales.csv', "month,revenue\nJuly,12000\nAugust,13400\nSeptember,15100\n");
        $disk->put('playground-files/reports/notes.md', "# Q3 notes\n\n- Launch the helpdesk portal\n- Ship the CMS site\n");
        $disk->makeDirectory('playground-files/images');

        if (is_file(public_path('apple-touch-icon.png'))) {
            $disk->put('playground-files/images/app-icon.png', (string) file_get_contents(public_path('apple-touch-icon.png')));
        }
    }

    /** alfasix/alfakit-helpdesk: tickets from the editor (portal at /support) and a guest. */
    protected function seedHelpdesk(User $admin, User $editor, User $viewer): void
    {
        if (Ticket::query()->exists()) {
            return;
        }

        $printer = Tickets::open(['subject' => 'Export to CSV times out', 'requester' => $editor, 'priority' => 'high', 'type' => 'incident', 'channel' => 'portal'], '<p>Exporting all posts to CSV stops after a minute. Can you help?</p>');
        Tickets::assign($printer, $admin, by: $admin);
        Tickets::reply($printer, '<p>Thanks! We are looking into it; exports now run on the queue.</p>', author: $admin, status: TicketStatus::Pending);

        $billing = Tickets::open(['subject' => 'Question about invoices', 'requester' => $editor, 'channel' => 'portal'], '<p>Can I add a second tax to an invoice?</p>');
        Tickets::reply($billing, '<p>Yes: add a compound tax rate under Billing › Tax rates.</p>', author: $admin);
        Tickets::changeStatus($billing, TicketStatus::Solved, $admin);

        $guest = Tickets::open(['subject' => 'Partnership enquiry', 'requester_email' => 'sam@example.org', 'requester_name' => 'Sam Guest', 'channel' => 'contact', 'priority' => 'low'], '<p>We would like to resell AlfaKit plugins.</p>');
        Tickets::note($guest, '<p>Forward to sales after the call.</p>', $admin);

        Tickets::open(['subject' => 'Dark mode on the login page', 'requester' => $viewer, 'priority' => 'urgent', 'type' => 'problem', 'channel' => 'portal'], '<p>The login page flashes white in dark mode.</p>');
    }

    /** alfasix/alfakit-analytics: the CMS site with 30 days of visits, then the daily rollups. */
    protected function seedAnalytics(): void
    {
        $host = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';

        $site = Site::query()->where('key', 'playground-site')->first() ?? (new Site)->forceFill([
            'name' => 'Playground site',
            'key' => 'playground-site',
            'domain' => $host,
            'timezone' => 'UTC',
            'goals' => [
                ['name' => 'Contact form', 'type' => 'page', 'match' => '/forms/contact-us'],
                ['name' => 'Signup', 'type' => 'event', 'match' => 'Signup'],
            ],
        ]);
        $site->forceFill(['domain' => $host])->save();

        if (DB::table('alfakit_analytics_visits')->where('site_id', $site->id)->exists()) {
            return;
        }

        mt_srand(42);
        $pages = ['/site', '/site/about', '/site/pricing', '/forms/contact-us', '/support/contact'];
        $sources = [[null, 'Direct', null], ['google.com', 'Organic Search', 'https://www.google.com/'], ['github.com', 'Referral', 'https://github.com/alfasix'], ['twitter.com', 'Social', 'https://t.co/x'], ['newsletter', 'Email', null]];
        $devices = [['desktop', 'Chrome', 'macOS'], ['desktop', 'Firefox', 'Windows'], ['mobile', 'Safari', 'iOS'], ['mobile', 'Chrome', 'Android'], ['tablet', 'Safari', 'iPadOS']];
        $countries = ['BH', 'SA', 'AE', 'US', 'GB', 'DE', 'FR', 'IN'];
        $today = CarbonImmutable::now('UTC')->startOfDay();

        for ($day = 29; $day >= 0; $day--) {
            $date = $today->subDays($day);
            $visits = 12 + mt_rand(0, 18) + (29 - $day);

            for ($i = 0; $i < $visits; $i++) {
                $start = $date->addMinutes(mt_rand(0, $day === 0 ? max(1, (int) now('UTC')->diffInMinutes($date)) : 1439));
                $path = array_values(array_slice($pages, 0, mt_rand(1, 4)));
                [$source, $channel, $referrer] = $sources[mt_rand(0, count($sources) - 1)];
                [$device, $browser, $os] = $devices[mt_rand(0, count($devices) - 1)];
                $visitor = substr(hash('sha256', $date->toDateString().$i), 0, 16);
                $duration = count($path) > 1 ? mt_rand(20, 420) : 0;

                $visitId = DB::table('alfakit_analytics_visits')->insertGetId([
                    'site_id' => $site->id, 'visitor' => $visitor, 'date' => $date->toDateString(),
                    'started_at' => $start, 'last_seen_at' => $start->addSeconds($duration), 'duration' => $duration,
                    'pageviews' => count($path), 'events' => 0, 'is_bounce' => count($path) === 1,
                    'hostname' => $host, 'entry_page' => $path[0], 'exit_page' => $path[count($path) - 1],
                    'source' => $source, 'channel' => $channel, 'referrer' => $referrer,
                    'utm_source' => $channel === 'Email' ? 'newsletter' : null, 'utm_medium' => $channel === 'Email' ? 'email' : null, 'utm_campaign' => $channel === 'Email' ? 'october' : null,
                    'country' => $countries[mt_rand(0, count($countries) - 1)], 'device' => $device, 'browser' => $browser, 'os' => $os,
                ]);

                foreach ($path as $n => $pathname) {
                    $at = $start->addSeconds((int) ($duration * $n / max(1, count($path))));
                    DB::table('alfakit_analytics_events')->insert([
                        'site_id' => $site->id, 'visit_id' => $visitId, 'visitor' => $visitor, 'name' => 'pageview',
                        'date' => $date->toDateString(), 'hour' => (int) $at->format('G'), 'occurred_at' => $at, 'pathname' => $pathname, 'hostname' => $host,
                    ]);
                }

                if (mt_rand(1, 10) === 1) {
                    $eventId = DB::table('alfakit_analytics_events')->insertGetId([
                        'site_id' => $site->id, 'visit_id' => $visitId, 'visitor' => $visitor, 'name' => 'Signup',
                        'date' => $date->toDateString(), 'hour' => (int) $start->format('G'), 'occurred_at' => $start, 'pathname' => $path[0], 'hostname' => $host,
                    ]);
                    DB::table('alfakit_analytics_event_properties')->insert(['event_id' => $eventId, 'site_id' => $site->id, 'date' => $date->toDateString(), 'event_name' => 'Signup', 'key' => 'plan', 'value' => mt_rand(0, 1) ? 'pro' : 'starter']);
                    DB::table('alfakit_analytics_visits')->where('id', $visitId)->update(['events' => 1]);
                }
            }
        }

        Artisan::call('alfakit-analytics:aggregate', ['--days' => 30]);
    }

    /** alfasix/alfakit-teams (/team panel): personal teams plus a shared team. */
    protected function seedTeams(User $admin, User $editor, User $viewer): void
    {
        $teams = app(TeamManager::class);

        foreach ([$admin, $editor, $viewer] as $user) {
            if ($user->personalTeam() === null) {
                $teams->createPersonalTeam($user);
            }
        }

        $hq = Team::query()->where('slug', 'playground-hq')->first() ?? $teams->createTeam($admin, ['name' => 'Playground HQ', 'slug' => 'playground-hq']);

        if (! $hq->hasMember($editor)) {
            $teams->addMember($hq, $editor, 'admin', enforceSeats: false);
        }

        if (! $hq->hasMember($viewer)) {
            $teams->addMember($hq, $viewer, 'viewer', enforceSeats: false);
        }
    }
}
