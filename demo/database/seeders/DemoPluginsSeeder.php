<?php

declare(strict_types=1);

namespace Database\Seeders;

use AlfaSix\AlfakitAnalytics\Analytics;
use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitAnalytics\Support\Hit;
use AlfaSix\AlfakitApi\ApiPlugin;
use AlfaSix\AlfakitCms\Enums\PageStatus;
use AlfaSix\AlfakitCms\Models\Menu;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitForms\Models\FormSubmission;
use AlfaSix\AlfakitForms\Support\FormDefinition;
use AlfaSix\AlfakitHelpdesk\Enums\TicketStatus;
use AlfaSix\AlfakitHelpdesk\Models\CannedReply;
use AlfaSix\AlfakitHelpdesk\Models\HelpdeskGroup;
use AlfaSix\AlfakitHelpdesk\Support\Tickets;
use AlfaSix\AlfakitInvoices\Models\Tax;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use AlfaSix\AlfakitShield\ShieldPlugin;
use AlfaSix\AlfakitShield\Support\PermissionModels;
use AlfaSix\AlfakitTeams\Models\TeamInvitation;
use AlfaSix\AlfakitWebhooks\Models\WebhookEndpoint;
use AlfaSix\AlfakitWorkflows\Support\Approvals;
use App\Alfakit\Resources\OrderResource\PluginActions;
use App\Demo\Access;
use App\Demo\ProductArtwork;
use App\Demo\Shop;
use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Enums\StaffRole;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\Store;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

/**
 * Seeds the first-party plugins into the Maison Alfa story, per store: Shield roles, return
 * requests in their approval workflow, invoices, internal comments with mentions, helpdesk
 * tickets, storefront CMS pages and menus, forms with submissions, 30 days of analytics,
 * calendar promotions, customer segments, a product gallery, an audit trail, a disabled
 * webhook endpoint and a read-only API token.
 *
 * Idempotent: `demo:reset` runs `migrate:fresh --seed` every hour, and running this seeder
 * again on a seeded database first removes what it created (see `clear()`). Every email is
 * on example.com and no number is presented as a real figure.
 */
class DemoPluginsSeeder extends Seeder
{
    /** Shield roles per store, mapped from the store ladder (`team_user.role`). */
    private const STAFF_ROLE_MAP = [
        'owner' => Access::OWNER,
        'manager' => Access::MANAGER,
    ];

    /** Staff titles that work the helpdesk; other staff members are viewers. */
    private const SUPPORT_TITLES = ['Customer care', 'Sales associate', 'Perfumer'];

    public function run(): void
    {
        $scale = DemoSeeder::$scale ?? (float) config('demo.seed_scale', 1.0);
        mt_srand(4242);
        fake()->seed(4242);

        $this->clear();

        $panel = alfakit()->getPanel('react');
        alfakit()->setCurrentPanel($panel);

        $this->permissions();

        $stores = Store::query()->orderBy('id')->get();

        foreach ($stores as $store) {
            alfakit()->setTenant($store);
            setPermissionsTeamId($store->id);

            $staff = $this->roles($store);
            $this->segments($store);
            $this->promotions($store);
            $this->comments($store, $staff);
            $this->activity($store, $staff);
            $this->invoices($store, max(4, (int) round(12 * $scale)));
            $this->returns($store, $staff);
            $this->helpdesk($store, $staff, max(4, (int) round(12 * $scale)));
            $this->cms($store, $staff['owner']);
            $this->forms($store, max(3, (int) round(10 * $scale)));
            $this->webhooks($store);
            $this->apiToken($store, $staff);
            $this->teamInvitations($store, $staff);
        }

        $this->mailTemplates();

        $shop = Shop::store();

        if ($shop !== null) {
            alfakit()->setTenant($shop);
            setPermissionsTeamId($shop->id);
            $this->analytics($shop, $scale);
            $this->gallery($shop);
        }

        alfakit()->setTenant(null);
        setPermissionsTeamId(null);
        // The CMS revisions were saved "as" the owner: sign them out again, so seeding never
        // leaves a user signed in (tests and `db:seed` in a running app would otherwise see staff).
        auth()->forgetUser();
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
    }

    /** Removes the plugin data so a second run starts clean (the demo data stays). */
    private function clear(): void
    {
        foreach ([
            'alfakit_workflow_approvals', 'alfakit_workflow_approval_requests', 'alfakit_workflow_logs',
            'alfakit_comment_reactions', 'alfakit_comments', 'return_requests',
            'alfakit_invoice_payments', 'alfakit_invoice_items', 'alfakit_invoices', 'alfakit_invoice_taxes', 'alfakit_invoice_sequences',
            'helpdesk_messages', 'helpdesk_tickets', 'helpdesk_group_agent', 'helpdesk_groups', 'helpdesk_canned_replies',
            'alfakit_cms_page_revisions', 'alfakit_cms_pages', 'alfakit_cms_menus', 'alfakit_cms_redirects',
            'alfakit_form_submissions', 'alfakit_forms',
            'alfakit_webhook_deliveries', 'alfakit_webhook_events', 'alfakit_webhook_endpoints',
            'alfakit_api_tokens', 'activity_log', 'taggables', 'spatie_tags', 'helpdesk_ticket_tag',
            'alfakit_analytics_event_properties', 'alfakit_analytics_events', 'alfakit_analytics_visits',
            'alfakit_analytics_daily', 'alfakit_analytics_report_rows', 'alfakit_analytics_sites',
            'alfakit_mail_templates', 'team_invitations',
        ] as $table) {
            if (DB::getSchemaBuilder()->hasTable($table)) {
                DB::table($table)->delete();
            }
        }

        Discount::query()->where('code', 'like', 'CAL-%')->delete();

        // The lifestyle galleries (Spatie media; the files live on the demo disk).
        Product::query()->whereHas('media')->get()->each(fn (Product $product) => $product->clearMediaCollection('gallery'));
    }

    // ---------------------------------------------------------------- Teams

    /**
     * Two pending invitations per store, so the Teams plugin's Invitations page (store menu →
     * Members → Invitations) has something to resend or revoke. Nothing is mailed.
     *
     * @param  array{owner: User, managers: Collection<int, User>, agents: Collection<int, User>, viewers: Collection<int, User>, all: Collection<int, User>}  $staff
     */
    private function teamInvitations(Store $store, array $staff): void
    {
        foreach ([['jordan', StaffRole::Staff], ['riley', StaffRole::Manager]] as [$name, $role]) {
            TeamInvitation::query()->create([
                'team_id' => $store->getKey(),
                'email' => "{$name}.{$store->slug}@example.com",
                'role' => $role->value,
                'invited_by' => $staff['owner']->getKey(),
                'expires_at' => now()->addDays(7),
            ]);
        }
    }

    // ---------------------------------------------------------------- Mail templates

    /** Two edited emails (global, not per store), so the list shows "Customised" next to the defaults. */
    private function mailTemplates(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('alfakit_mail_templates')) {
            return;
        }

        MailTemplate::query()->create([
            'key' => 'alfakit.multi-factor-code',
            'locale' => 'ar',
            'subject' => 'رمز الدخول إلى {{ app }}',
            'body' => '<p>مرحباً {{ name }}،</p><p>رمز الدخول الخاص بك هو <strong>{{ code }}</strong>، وهو صالح لمدة {{ minutes }} دقيقة.</p><p>مع تحيات فريق ميزون ألفا</p>',
        ]);

        MailTemplate::query()->create([
            'key' => 'helpdesk.ticket-received',
            'locale' => 'en',
            'subject' => 'We have your request [{{ reference }}]',
            'body' => '<p>Dear {{ name }},</p><p>Thank you for writing to Maison Alfa. Your request <strong>{{ subject }}</strong> is with our concierge team, who usually reply within four hours on business days.</p><p>The Maison Alfa concierge</p>',
        ]);
    }

    // ---------------------------------------------------------------- Shield

    private function permissions(): void
    {
        $panel = alfakit()->getPanel('react');
        $registry = ShieldPlugin::get($panel)->getPermissionRegistry($panel);
        PermissionModels::ensurePermissions($registry->allPermissions(), $registry->getGuard());
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * The four roles of the store and every member's role.
     *
     * @return array{owner: User, managers: Collection<int, User>, agents: Collection<int, User>, viewers: Collection<int, User>, all: Collection<int, User>}
     */
    private function roles(Store $store): array
    {
        $permissions = DB::table(config('permission.table_names.permissions'))->pluck('name');

        $roles = [];

        foreach (Access::ROLES as $name) {
            $roles[$name] = Role::query()->firstOrCreate(['name' => $name, 'guard_name' => 'web', 'team_id' => $store->id]);
        }

        $roles[Access::OWNER]->syncPermissions($permissions->all());
        $roles[Access::MANAGER]->syncPermissions($permissions->reject(fn (string $p): bool => Str::startsWith($p, ['force_delete', 'delete_any']) || Str::endsWith($p, '_role'))->values()->all());
        $roles[Access::SUPPORT]->syncPermissions($permissions->filter(fn (string $p): bool => Str::startsWith($p, ['view_any_', 'view_']) || Str::endsWith($p, ['_ticket', '_return_request']))->values()->all());
        $roles[Access::VIEWER]->syncPermissions($permissions->filter(fn (string $p): bool => Str::startsWith($p, ['view_any_', 'view_']))->values()->all());

        $members = $store->users()->get();
        $groups = ['managers' => collect(), 'agents' => collect(), 'viewers' => collect()];
        $owner = null;

        foreach ($members as $user) {
            /** @var User $user */
            $ladder = (string) $user->getAttribute('pivot')?->getAttribute('role');
            $role = $user->isDemoAccount() ? Access::OWNER : (self::STAFF_ROLE_MAP[$ladder] ?? (in_array($user->title, self::SUPPORT_TITLES, true) ? Access::SUPPORT : Access::VIEWER));

            $user->assignRole($roles[$role]);

            match ($role) {
                Access::OWNER => $owner ??= $user,
                Access::MANAGER => $groups['managers']->push($user),
                Access::SUPPORT => $groups['agents']->push($user),
                default => $groups['viewers']->push($user),
            };
        }

        // Every store has someone answering customers.
        if ($groups['agents']->isEmpty() && $groups['viewers']->isNotEmpty()) {
            $agent = $groups['viewers']->shift();
            $agent->removeRole($roles[Access::VIEWER]);
            $agent->assignRole($roles[Access::SUPPORT]);
            $groups['agents']->push($agent);
        }

        $demo = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();
        $owner ??= $demo;

        return [...$groups, 'owner' => $owner, 'demo' => $demo, 'all' => $members];
    }

    // ---------------------------------------------------------------- Tags (customer segments)

    private function segments(Store $store): void
    {
        $customers = Customer::query()->where('store_id', $store->id)->inRandomOrder()->limit(60)->get();

        foreach ($customers as $index => $customer) {
            $segments = array_values(array_filter([
                $customer->is_vip ? 'VIP' : null,
                $customer->accepts_marketing ? 'Newsletter' : null,
                $index % 7 === 0 ? 'Wholesale' : null,
                $index % 5 === 0 ? 'Gift buyer' : null,
                $index % 9 === 0 ? 'Oud lover' : null,
            ]));

            if ($segments !== []) {
                $customer->syncTagsWithType($segments, 'segment');
            }
        }
    }

    // ---------------------------------------------------------------- Calendar (promotions)

    private function promotions(Store $store): void
    {
        $today = CarbonImmutable::now($store->timezone)->startOfDay();
        $campaigns = [
            ['CAL-OUD', 'Oud week', DiscountType::Percentage, 15, -9, 5],
            ['CAL-WEEKEND', 'Weekend gift wrap', DiscountType::FreeShipping, 0, -2, 2],
            ['CAL-AUTUMN', 'Autumn launch', DiscountType::Percentage, 10, 2, 9],
            ['CAL-PAIR', 'Pair & save', DiscountType::Fixed, 20, 6, 4],
            ['CAL-NATDAY', 'National Day', DiscountType::Percentage, 20, 13, 3],
            ['CAL-VIPNIGHT', 'VIP evening', DiscountType::Fixed, 30, 17, 1],
            ['CAL-WINTER', 'Winter collection preview', DiscountType::Percentage, 12, 23, 7],
            ['CAL-SHIP', 'Free express shipping', DiscountType::FreeShipping, 0, -20, 6],
        ];

        foreach ($campaigns as [$code, $name, $type, $value, $offset, $days]) {
            $start = $today->addDays($offset)->setTime(10, 0);

            Discount::query()->create([
                'store_id' => $store->id,
                'code' => $code,
                'name' => $name,
                'type' => $type,
                'value' => $value,
                'min_order_total' => $type === DiscountType::Fixed ? 120 : null,
                'used_count' => $offset < 0 ? mt_rand(3, 40) : 0,
                'starts_at' => $start->utc(),
                'ends_at' => $start->addDays($days)->setTime(23, 0)->utc(),
                'is_active' => true,
            ]);
        }
    }

    // ---------------------------------------------------------------- Comments

    /** @param array<string, mixed> $staff */
    private function comments(Store $store, array $staff): void
    {
        $orders = Order::query()->where('store_id', $store->id)->whereIn('status', [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped])
            ->orderByDesc('placed_at')->limit(6)->get();
        $authors = collect([...$staff['managers'], ...$staff['agents']])->values();
        $demo = $staff['demo'];

        if ($authors->isEmpty()) {
            return;
        }

        $lines = [
            fn (User $mention): string => '<p>Customer asked for gift wrapping and a handwritten card. '.$this->mention($mention).' can you check the note before packing?</p>',
            fn (User $mention): string => '<p>Engraving requested on the 100 ml bottle. '.$this->mention($mention).' please confirm the spelling with the customer.</p>',
            fn (User $mention): string => '<p>Address looks incomplete (no building number). Called the customer, waiting for a reply.</p>',
            fn (User $mention): string => '<p>Swapped the tester for a sealed bottle. '.$this->mention($mention).' FYI.</p>',
        ];

        foreach ($orders as $index => $order) {
            /** @var User $author */
            $author = $authors[$index % $authors->count()];
            Carbon::setTestNow(($order->placed_at ?? now())->copy()->addHours(2));
            $comment = $order->comment(($lines[$index % count($lines)])($demo), $author);

            if ($index % 2 === 0) {
                Carbon::setTestNow(($order->placed_at ?? now())->copy()->addHours(5));
                $order->comment('<p>Done, thanks! Packed and labelled.</p>', $demo);
            }

            unset($comment);
        }

        Carbon::setTestNow();
    }

    private function mention(User $user): string
    {
        return '<span data-type="mention" data-id="'.$user->id.'" data-label="'.e($user->name).'">@'.e($user->name).'</span>';
    }

    // ---------------------------------------------------------------- Activity log

    /** @param array<string, mixed> $staff */
    private function activity(Store $store, array $staff): void
    {
        $actors = collect([$staff['demo'], ...$staff['managers'], ...$staff['agents']])->values();
        $orders = Order::query()->where('store_id', $store->id)->orderByDesc('placed_at')->limit(14)->get();
        $steps = [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped];

        foreach ($orders as $index => $order) {
            $status = $steps[$index % count($steps)];
            /** @var User $actor */
            $actor = $actors[$index % $actors->count()];

            activity('orders')
                ->performedOn($order)
                ->causedBy($actor)
                ->event('updated')
                ->withProperties([
                    'attributes' => ['status' => $status->value],
                    'old' => ['status' => OrderStatus::Pending->value],
                    'alfakit_tenant_type' => $store->getMorphClass(),
                    'alfakit_tenant_id' => $store->getKey(),
                ])
                ->createdAt(($order->placed_at ?? now())->copy()->addHours(3 + $index))
                ->log('updated');
        }

        $products = Product::query()->where('store_id', $store->id)->orderBy('id')->limit(6)->get();

        foreach ($products as $index => $product) {
            /** @var User $actor */
            $actor = $actors[$index % $actors->count()];

            activity('catalog')
                ->performedOn($product)
                ->causedBy($actor)
                ->event('updated')
                ->withProperties([
                    'attributes' => ['price' => (string) $product->price, 'stock' => $product->stock],
                    'old' => ['price' => number_format((float) $product->price + 10, 2, '.', ''), 'stock' => $product->stock + 4],
                    'alfakit_tenant_type' => $store->getMorphClass(),
                    'alfakit_tenant_id' => $store->getKey(),
                ])
                ->createdAt(now()->subDays($index + 1)->subHours(2))
                ->log('updated');
        }
    }

    // ---------------------------------------------------------------- Invoices

    private function invoices(Store $store, int $count): void
    {
        Tax::query()->create([
            'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
            'name' => 'VAT', 'rate' => '10', 'is_inclusive' => false, 'is_compound' => false, 'is_default' => true, 'is_active' => true, 'sort' => 1,
        ]);
        Tax::query()->create([
            'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
            'name' => 'Zero-rated export', 'rate' => '0', 'is_inclusive' => false, 'is_compound' => false, 'is_default' => false, 'is_active' => true, 'sort' => 2,
        ]);

        $orders = Order::query()->with(['items', 'customer', 'store'])->where('store_id', $store->id)
            ->whereIn('status', [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered])
            ->whereNotNull('customer_id')
            ->orderByDesc('placed_at')->limit($count)->get();

        foreach ($orders as $index => $order) {
            Carbon::setTestNow($order->placed_at ?? now());
            CarbonImmutable::setTestNow($order->placed_at ?? now());

            try {
                $invoice = PluginActions::issue($order, $store);

                if ($index === $orders->count() - 1) {
                    continue; // a draft
                }

                $invoice->markAsSent();

                if ($index % 6 === 4 && $invoice->total > 0) {
                    $invoice->recordPayment((int) floor($invoice->total / 2), method: 'bank_transfer', reference: 'TT-'.(4100 + $index));
                } elseif ($index % 6 !== 3) {
                    $invoice->markAsPaid(method: 'card', reference: 'CH-'.Str::upper(Str::random(8)));
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
    }

    // ---------------------------------------------------------------- Returns (workflow)

    /** @param array<string, mixed> $staff */
    private function returns(Store $store, array $staff): void
    {
        /** @var User|null $agent */
        $agent = $staff['agents']->first() ?? $staff['viewers']->first();

        if ($agent === null) {
            return;
        }

        $approver = $staff['managers']->first() ?? $staff['demo'];
        $orders = Order::query()->where('store_id', $store->id)->whereIn('status', [OrderStatus::Delivered, OrderStatus::Shipped])
            ->whereNotNull('customer_id')->orderByDesc('placed_at')->limit(6)->get();
        $plan = ['requested', 'awaiting', 'awaiting', 'approved', 'rejected', 'refunded'];

        foreach ($orders as $index => $order) {
            $step = $plan[$index] ?? 'requested';
            Carbon::setTestNow(($order->placed_at ?? now())->copy()->addDays(6));
            CarbonImmutable::setTestNow(Carbon::now()->toImmutable());

            $return = ReturnRequest::query()->create([
                'store_id' => $store->id,
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'requested_by_id' => $agent->id,
                'number' => ReturnRequest::nextNumber(),
                'reason' => ReturnRequest::REASONS[$index % count(ReturnRequest::REASONS)],
                'details' => ['The cap arrived cracked.', 'Received the 50 ml instead of the 100 ml.', 'Notes differ from the tester in the boutique.', 'Skin reaction after first use.', 'Gift recipient already owns it.', 'Box crushed in transit.'][$index % 6],
                'amount' => round((float) $order->total * ($index % 2 === 0 ? 1 : 0.5), 2),
            ]);

            try {
                if ($step === 'requested') {
                    continue;
                }

                $return->transition('submit', comment: 'Photos attached in the ticket. Customer is happy to return it by courier.', user: $agent);

                if ($step === 'awaiting') {
                    continue;
                }

                Carbon::setTestNow(Carbon::now()->addDay());
                $request = $return->getPendingApprovalRequest();
                $approval = $request === null ? null : Approvals::assignmentFor($request, $approver);

                if ($approval === null) {
                    continue;
                }

                if ($step === 'rejected') {
                    Approvals::reject($approval, $approver, 'Opened bottle and past the 14-day window. Offered a sample set instead.');

                    continue;
                }

                Approvals::approve($approval, $approver, 'Approved, the courier pickup is booked.');

                if ($step === 'refunded') {
                    Carbon::setTestNow(Carbon::now()->addDay());
                    $return->refresh()->transition('refund', ['reference' => 'RF-'.Str::upper(Str::random(8))], user: $approver);
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
    }

    // ---------------------------------------------------------------- Helpdesk

    /** @param array<string, mixed> $staff */
    private function helpdesk(Store $store, array $staff, int $count): void
    {
        $agents = collect([...$staff['agents'], ...$staff['managers']])->values();

        if ($agents->isEmpty()) {
            $agents = collect([$staff['demo']]);
        }

        $tenant = ['tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey()];
        $care = HelpdeskGroup::query()->create([...$tenant, 'name' => 'Client care', 'description' => 'Orders, deliveries and returns.']);
        $experts = HelpdeskGroup::query()->create([...$tenant, 'name' => 'Fragrance advisors', 'description' => 'Scent advice and samples.']);
        $care->agents()->sync($agents->pluck('id')->all());
        $experts->agents()->sync($agents->take(2)->pluck('id')->all());

        foreach ([
            ['Where is my order?', '<p>Hi {{ requester.first_name }}, {{ agent.first_name }} here about {{ ticket.reference }}. Your parcel is on its way; you will receive the tracking link by email.</p>'],
            ['Return instructions', '<p>Hi {{ requester.first_name }}, unopened bottles can be returned within 14 days. Reply with your order number and we will book a courier.</p>'],
            ['Sample set', '<p>Hi {{ requester.first_name }}, we can send a discovery set of five 2 ml samples so you can try them at home.</p>'],
        ] as [$title, $body]) {
            CannedReply::query()->create([...$tenant, 'title' => $title, 'body' => $body, 'is_shared' => true, 'owner_id' => $agents->first()->id]);
        }

        $customers = Customer::query()->where('store_id', $store->id)->inRandomOrder()->limit($count)->get();
        $subjects = [
            ['Gift wrapping for a birthday', 'question', 'normal', 'web'],
            ['Parcel shows delivered but not received', 'incident', 'high', 'email'],
            ['Which oud is closest to the boutique tester?', 'question', 'low', 'chat'],
            ['Wrong size delivered', 'problem', 'high', 'web'],
            ['Can I change the engraving text?', 'question', 'normal', 'chat'],
            ['Cracked cap on arrival', 'incident', 'urgent', 'email'],
            ['Do you ship to Kuwait?', 'question', 'low', 'chat'],
            ['Invoice with company VAT number', 'task', 'normal', 'email'],
        ];

        foreach ($customers as $index => $customer) {
            [$subject, $type, $priority, $channel] = $subjects[$index % count($subjects)];
            $opened = CarbonImmutable::now()->subDays(($index * 2) % 20)->subHours(3 + $index);
            CarbonImmutable::setTestNow($opened);
            Carbon::setTestNow($opened);

            try {
                $ticket = Tickets::open([
                    'subject' => $subject,
                    'type' => $type,
                    'priority' => $priority,
                    'channel' => $channel,
                    'requester_email' => $customer->email,
                    'requester_name' => $customer->name,
                    'tenant' => $store,
                    'group_id' => $type === 'question' ? $experts->id : $care->id,
                ], '<p>'.e($subject).'. Order reference in my account. Thank you!</p>', ['notify' => false]);

                if ($index % 4 === 3) {
                    continue; // still unassigned
                }

                /** @var User $agent */
                $agent = $agents[$index % $agents->count()];
                Tickets::assign($ticket, $agent, by: $agent);

                CarbonImmutable::setTestNow($opened->addMinutes(40 + $index * 7));
                Carbon::setTestNow($opened->addMinutes(40 + $index * 7));
                Tickets::reply($ticket, '<p>Hello '.e($customer->first_name).', thank you for writing to Maison Alfa. I am looking into it now and will update you shortly.</p>', author: $agent, status: $index % 3 === 0 ? TicketStatus::Pending : null, notify: false);

                if ($index % 2 === 0) {
                    Tickets::note($ticket, '<p>Checked the courier portal: the parcel left the boutique yesterday.</p>', $agent);
                }

                if ($index % 5 === 1) {
                    CarbonImmutable::setTestNow($opened->addHours(20));
                    Carbon::setTestNow($opened->addHours(20));
                    Tickets::changeStatus($ticket, TicketStatus::Solved, $agent);
                    Tickets::rate($ticket, [5, 4, 5, 3][$index % 4], $index % 2 === 0 ? 'Quick and friendly, thank you.' : null);
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        CarbonImmutable::setTestNow();
        Carbon::setTestNow();
    }

    // ---------------------------------------------------------------- CMS (storefront pages)

    private function cms(Store $store, User $author): void
    {
        // Revisions record who saved them: the seeded ones were written by the owner.
        auth()->setUser($author);

        $tenant = $store->getKey();
        $create = function (array $attributes) use ($tenant): Page {
            $page = new Page;
            $page->forceFill(['tenant_id' => $tenant, 'locale' => 'en', 'status' => PageStatus::Published, ...$attributes]);
            $page->save();

            return $page;
        };

        $about = $create([
            'title' => 'Our house', 'slug' => 'our-house', 'sort' => 1,
            'seo' => ['description' => 'Maison Alfa is a small perfume house with boutiques in Manama, Dubai and London.'],
            'content' => [
                ['type' => 'hero', 'data' => [
                    'eyebrow' => 'Since 2019', 'heading' => 'A perfume house from the Gulf',
                    'subheading' => $store->name.' blends oud, rose and amber with modern French perfumery. Every bottle is filled and labelled by hand in our atelier.',
                    'primary_label' => 'Shop the collection', 'primary_url' => '/'.'react',
                    'secondary_label' => 'Visit us', 'secondary_url' => '/react/contact',
                    'alignment' => 'start',
                ]],
                ['type' => 'features', 'data' => [
                    'heading' => 'What we care about', 'columns' => '3',
                    'items' => [
                        ['icon' => 'leaf', 'title' => 'Responsible sourcing', 'description' => 'Oud and rose from growers we visit every season.'],
                        ['icon' => 'hand-heart', 'title' => 'Made by hand', 'description' => 'Small batches, filled and engraved in the boutique.'],
                        ['icon' => 'gift', 'title' => 'Gifting', 'description' => 'Complimentary wrapping and handwritten cards.'],
                    ],
                ]],
                ['type' => 'call-to-action', 'data' => [
                    'heading' => 'Book a fragrance consultation', 'body' => 'Thirty minutes with one of our advisors, in the boutique or by video.',
                    'primary_label' => 'Contact us', 'primary_url' => '/react/contact', 'tone' => 'primary',
                ]],
            ],
        ]);

        $shipping = $create([
            'title' => 'Shipping & returns', 'slug' => 'shipping-returns', 'sort' => 2,
            'content' => [
                ['type' => 'rich-text', 'data' => ['content' => '<h2>Shipping</h2><p>Orders placed before 2 pm leave the boutique the same day. Express delivery across the GCC takes one to three working days.</p><h2>Returns</h2><p>Unopened bottles can be returned within 14 days. Contact our client care team and we will book a courier for you.</p>', 'width' => 'prose']],
            ],
        ]);

        $care = $create([
            'title' => 'Fragrance care guide', 'slug' => 'care-guide', 'sort' => 3,
            'content' => [
                ['type' => 'faq', 'data' => [
                    'heading' => 'Questions we hear every day',
                    'items' => [
                        ['question' => 'How should I store my perfume?', 'answer' => 'Away from light and heat, in its box, at room temperature. A bathroom shelf is the worst place for it.'],
                        ['question' => 'How long does a bottle last once opened?', 'answer' => 'Three to five years when stored well. Oud and amber compositions often deepen with time.'],
                        ['question' => 'Where should I apply it?', 'answer' => 'On pulse points: wrists, neck and behind the ears. Avoid rubbing your wrists together.'],
                    ],
                ]],
            ],
        ]);

        // A journal post scheduled for next week: it shows on the store calendar.
        $create([
            'title' => 'Journal: the winter collection', 'slug' => 'winter-collection', 'sort' => 4,
            'publish_at' => now()->addDays(8)->setTime(9, 0),
            'content' => [
                ['type' => 'rich-text', 'data' => ['content' => '<p>Smoked vanilla, saffron and cedar: a first look at the three fragrances of our winter collection.</p>', 'width' => 'prose']],
            ],
        ]);

        // An unpublished draft to try the review workflow and the live preview on.
        $create([
            'title' => 'Corporate gifting', 'slug' => 'corporate-gifting', 'sort' => 5, 'status' => PageStatus::Draft,
            'content' => [
                ['type' => 'rich-text', 'data' => ['content' => '<p>Branded gift boxes for your clients and teams, from ten pieces.</p>', 'width' => 'prose']],
            ],
        ]);

        $arabic = new Page;
        $arabic->forceFill([
            'tenant_id' => $tenant, 'locale' => 'ar', 'status' => PageStatus::Published, 'translation_of_id' => $about->id,
            'title' => 'دارنا', 'slug' => 'our-house', 'sort' => 1,
            'content' => [
                ['type' => 'hero', 'data' => [
                    'eyebrow' => 'منذ 2019', 'heading' => 'دار عطور من الخليج',
                    'subheading' => 'نمزج العود والورد والعنبر مع العطارة الفرنسية الحديثة. تُعبّأ كل زجاجة يدويًا في مشغلنا.',
                    'primary_label' => 'تسوّق المجموعة', 'primary_url' => '/react', 'alignment' => 'start',
                ]],
            ],
        ])->save();

        $menu = new Menu;
        $menu->forceFill(['tenant_id' => $tenant, 'name' => 'Main', 'handle' => 'main', 'locale' => 'en', 'items' => [
            ['type' => 'page', 'page_id' => $about->id, 'label' => 'Our house'],
            ['type' => 'page', 'page_id' => $shipping->id, 'label' => 'Shipping & returns'],
            ['type' => 'page', 'page_id' => $care->id, 'label' => 'Care guide'],
        ]])->save();

        $footer = new Menu;
        $footer->forceFill(['tenant_id' => $tenant, 'name' => 'Footer', 'handle' => 'footer', 'locale' => 'en', 'items' => [
            ['type' => 'page', 'page_id' => $shipping->id, 'label' => 'Shipping & returns'],
            ['type' => 'page', 'page_id' => $care->id, 'label' => 'Care guide'],
        ]])->save();

        $arabicMenu = new Menu;
        $arabicMenu->forceFill(['tenant_id' => $tenant, 'name' => 'Main (Arabic)', 'handle' => 'main', 'locale' => 'ar', 'items' => [
            ['type' => 'page', 'page_id' => $arabic->id, 'label' => 'دارنا'],
        ]])->save();
    }

    // ---------------------------------------------------------------- Forms

    private function forms(Store $store, int $submissions): void
    {
        $storefront = Shop::store()?->is($store) ?? false;
        $slug = $storefront ? 'wholesale' : 'wholesale-'.$store->slug;

        $form = new Form;
        $form->forceFill([
            'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
            'title' => 'Wholesale enquiry',
            'slug' => $slug,
            'description' => 'Hotels, spas and concept stores: tell us about your business and we will send our trade price list.',
            'is_published' => true,
            'fields' => FormDefinition::normalize([
                ['type' => 'text', 'data' => ['label' => 'Your name', 'name' => 'name', 'required' => true, 'width' => 'half']],
                ['type' => 'email', 'data' => ['label' => 'Work email', 'name' => 'email', 'required' => true, 'width' => 'half']],
                ['type' => 'text', 'data' => ['label' => 'Company', 'name' => 'company', 'required' => true, 'width' => 'half']],
                ['type' => 'select', 'data' => ['label' => 'Business type', 'name' => 'business_type', 'required' => true, 'width' => 'half', 'options' => ['Hotel', 'Spa', 'Concept store', 'Corporate gifting', 'Other']]],
                ['type' => 'text', 'data' => ['label' => 'Tell us more', 'name' => 'business_other', 'conditions' => [['field' => 'business_type', 'operator' => 'equals', 'value' => 'Other']]]],
                ['type' => 'page_break', 'data' => ['label' => 'Your order']],
                ['type' => 'checkbox_list', 'data' => ['label' => 'Collections you are interested in', 'name' => 'collections', 'options' => ['Oud', 'Rose', 'Amber', 'Home fragrance']]],
                ['type' => 'number', 'data' => ['label' => 'Estimated units per month', 'name' => 'units', 'min' => 10, 'max' => 5000]],
                ['type' => 'textarea', 'data' => ['label' => 'Anything else?', 'name' => 'message']],
                ['type' => 'checkbox', 'data' => ['label' => 'I agree to be contacted about this enquiry', 'name' => 'consent', 'required' => true]],
            ]),
            'settings' => [
                'submit_label' => 'Send enquiry',
                'confirmation_message' => 'Thank you! Our trade team will reply within two working days.',
                'first_page_label' => 'About you',
                'honeypot' => true,
                'notify_emails' => ['trade@example.com'],
            ],
            'views_count' => $submissions * 9,
        ])->save();

        $feedback = new Form;
        $feedback->forceFill([
            'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
            'title' => 'Boutique feedback',
            'slug' => 'feedback-'.$store->slug,
            'description' => 'Two minutes about your last visit.',
            'is_published' => true,
            'fields' => FormDefinition::normalize([
                ['type' => 'rating', 'data' => ['label' => 'How was your visit?', 'name' => 'rating', 'required' => true, 'max' => 5]],
                ['type' => 'radio', 'data' => ['label' => 'Would you recommend us?', 'name' => 'recommend', 'options' => ['Yes', 'Maybe', 'No']]],
                ['type' => 'textarea', 'data' => ['label' => 'What could we do better?', 'name' => 'improve']],
            ]),
            'settings' => ['submit_label' => 'Send feedback', 'confirmation_message' => 'Thank you for your feedback.'],
            'views_count' => $submissions * 6,
        ])->save();

        $types = ['Hotel', 'Spa', 'Concept store', 'Corporate gifting'];
        $companies = ['Harbour View Hotel', 'Pearl Spa', 'Atelier Nine', 'Gulf Events Co.', 'Cedar & Co.', 'Blue Lagoon Resort', 'Saffron House', 'North Pier Gifts'];

        for ($i = 0; $i < $submissions; $i++) {
            $first = fake()->firstName();
            $created = now()->subDays(mt_rand(0, 28))->subMinutes(mt_rand(0, 600));

            $submission = new FormSubmission;
            $submission->forceFill([
                'form_id' => $form->id, 'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
                'data' => [
                    'name' => $first.' '.fake()->lastName(),
                    'email' => Str::lower($first).'@example.com',
                    'company' => $companies[$i % count($companies)],
                    'business_type' => $types[$i % count($types)],
                    'collections' => array_slice(['Oud', 'Rose', 'Amber', 'Home fragrance'], $i % 3, 2),
                    'units' => (string) (20 + 15 * ($i % 6)),
                    'message' => $i % 2 === 0 ? 'Could you send the trade price list and minimum order quantities?' : null,
                    'consent' => true,
                ],
                'is_spam' => $i === $submissions - 1,
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();

            $answer = new FormSubmission;
            $answer->forceFill([
                'form_id' => $feedback->id, 'tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey(),
                'data' => ['rating' => [5, 4, 5, 3, 5][$i % 5], 'recommend' => ['Yes', 'Yes', 'Maybe'][$i % 3], 'improve' => $i % 3 === 0 ? 'More seating while we try the fragrances.' : null],
                'created_at' => $created, 'updated_at' => $created,
            ])->save();
        }
    }

    // ---------------------------------------------------------------- Webhooks

    private function webhooks(Store $store): void
    {
        $endpoint = new WebhookEndpoint;
        $endpoint->forceFill([
            'tenant_type' => $store->getMorphClass(),
            'tenant_id' => (string) $store->getKey(),
            'url' => 'https://example.com/webhooks/maison-alfa',
            'description' => 'ERP sync (sample endpoint, disabled in the public demo)',
            'is_enabled' => false,
            'events' => ['order.paid', 'order.shipped', 'return.approved'],
            'secret' => 'whsec_'.Str::random(32),
            'disabled_at' => now()->subDays(2),
            'disabled_reason' => 'Disabled in the public demo: deliveries are never sent.',
        ])->save();
    }

    // ---------------------------------------------------------------- API

    /** @param array<string, mixed> $staff */
    private function apiToken(Store $store, array $staff): void
    {
        $panel = alfakit()->getPanel('react');
        $plugin = ApiPlugin::get($panel);

        $plugin->getTokenRepository()->create(
            user: $staff['demo'],
            panelId: $panel->getId(),
            name: 'Storefront sync (read-only)',
            abilities: ['products:read', 'orders:read'],
            expiresAt: now()->addDays(7),
            tenant: $store,
        );
    }

    // ---------------------------------------------------------------- Analytics

    private function analytics(Store $store, float $scale): void
    {
        $host = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';

        $site = new Site;
        $site->forceFill([
            'tenant_type' => $store->getMorphClass(),
            'tenant_id' => (string) $store->getKey(),
            'name' => $store->name.' storefront',
            'domain' => null, // any host: the public demo and local copies count alike
            'domains' => [$host],
            'key' => 'maison-alfa-'.$store->slug,
            'timezone' => $store->timezone,
            'is_active' => true,
            'goals' => [
                ['name' => 'Contact form', 'type' => 'page', 'match' => '/*/contact'],
                ['name' => 'Wholesale enquiry', 'type' => 'event', 'match' => 'Wholesale enquiry'],
                ['name' => 'Chat started', 'type' => 'event', 'match' => 'Chat started'],
            ],
        ])->save();

        $products = Product::query()->where('store_id', $store->id)->where('status', 'active')->limit(12)->pluck('slug')->all();
        $renderers = ['react', 'react', 'vue', 'svelte'];
        $referrers = [null, null, 'https://www.google.com/', 'https://www.instagram.com/', 'https://www.bing.com/', 'https://news.example.com/gift-guide', 'https://www.tiktok.com/'];
        $agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
        ];
        $base = 'http://'.$host;
        $now = CarbonImmutable::now();

        for ($day = 29; $day >= 0; $day--) {
            $visitors = (int) round((18 + 10 * sin($day / 4) + mt_rand(0, 8) + ($day < 7 ? 6 : 0)) * max(0.2, $scale));

            for ($v = 0; $v < $visitors; $v++) {
                $at = $now->subDays($day)->startOfDay()->addMinutes(mt_rand(8 * 60, 23 * 60));

                if ($at->isFuture()) {
                    $at = $now->subMinutes(mt_rand(5, 120));
                }

                $renderer = $renderers[mt_rand(0, count($renderers) - 1)];
                $ip = '203.0.113.'.mt_rand(1, 254);
                $agent = $agents[mt_rand(0, count($agents) - 1)];
                $referrer = $referrers[mt_rand(0, count($referrers) - 1)];
                $utm = mt_rand(0, 9) === 0 ? '?utm_source=newsletter&utm_medium=email&utm_campaign=autumn' : '';
                $path = ["/{$renderer}", "/{$renderer}", "/{$renderer}/products/".($products[mt_rand(0, max(0, count($products) - 1))] ?? ''), "/{$renderer}/pages/our-house"][mt_rand(0, 3)];
                $journey = [$path.$utm];

                if (mt_rand(0, 2) > 0 && $products !== []) {
                    $journey[] = "/{$renderer}/products/".$products[mt_rand(0, count($products) - 1)];
                }

                if (mt_rand(0, 6) === 0) {
                    $journey[] = "/{$renderer}/contact";
                }

                foreach ($journey as $step => $url) {
                    Analytics::record($site, new Hit('pageview', $base.$url, referrer: $step === 0 ? $referrer : $base.$journey[$step - 1], ip: $ip, userAgent: $agent, occurredAt: $at->addMinutes($step * 2), isServerSide: true));
                }

                if (mt_rand(0, 25) === 0) {
                    Analytics::record($site, new Hit('Wholesale enquiry', $base."/{$renderer}/wholesale", ip: $ip, userAgent: $agent, occurredAt: $at->addMinutes(5), isServerSide: true));
                }

                if (mt_rand(0, 18) === 0) {
                    Analytics::record($site, new Hit('Chat started', $base.$path, ip: $ip, userAgent: $agent, occurredAt: $at->addMinutes(1), isServerSide: true));
                }
            }
        }
    }

    // ---------------------------------------------------------------- Media library

    private function gallery(Store $store): void
    {
        $products = Product::query()->where('store_id', $store->id)->where('featured', true)->limit(4)->get();
        $disk = Storage::disk(ProductArtwork::DISK);

        foreach ($products as $product) {
            foreach (array_slice($product->images ?? [], 0, 2) as $path) {
                if (! $disk->exists($path)) {
                    continue;
                }

                try {
                    $product->addMediaFromDisk($path, ProductArtwork::DISK)
                        ->preservingOriginal()
                        ->usingName($product->name)
                        ->toMediaCollection('gallery');
                } catch (Throwable $exception) {
                    report($exception);
                }
            }
        }
    }
}
