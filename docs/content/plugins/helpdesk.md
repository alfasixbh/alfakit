---
title: Helpdesk
description: Tickets with SLAs, an agent inbox, a customer portal, a contact form and a live chat widget.
---

# Helpdesk

`alfasix/alfakit-helpdesk` is a Zendesk / Intercom-style helpdesk inside an AlfaKit panel.

| Part                   | Where                             | Does                                                                                         |
| ---------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Tickets resource       | Panel                             | List with views, SLA filters, bulk assign / close; create on behalf; the ticket page         |
| Inbox page             | Panel                             | Views, list and conversation side by side, quick composer, `j` / `k` / `r` / `n` / `/`, live |
| Canned replies, groups | Panel                             | Saved replies with `{{ placeholders }}`; teams of agents                                     |
| Reports widget         | Above the tickets list            | Created, solved, median first response, SLA compliance, CSAT                                 |
| Portal                 | `/support` (outside panels)       | Signed-in customers see and answer their own tickets, rate solved ones                       |
| Contact form           | `/support/contact`                | Guests open tickets; honeypot, time check and rate limit                                     |
| Live chat widget       | Your public pages                 | `<HelpdeskChat />` in React, Vue or Svelte; a chat becomes a ticket                          |
| Emails, reply by email | Queued Mailables, inbound webhook | Requesters and agents are notified; replies to the signed Reply-To address are filed         |

Agents get replies, typing and presence in real time when the panel has [`realtime()`](../panels/realtime); otherwise the inbox polls.

## Installation

```bash
composer require alfasix/alfakit-helpdesk
php artisan vendor:publish --tag=alfakit-helpdesk-migrations
php artisan migrate
php artisan alfakit-helpdesk:pages   # the Inertia page of the portal and contact form
```

Register the plugin:

```php
use AlfaSix\AlfakitHelpdesk\Enums\TicketPriority;
use AlfaSix\AlfakitHelpdesk\HelpdeskPlugin;
use AlfaSix\AlfakitHelpdesk\Sla\BusinessHours;
use AlfaSix\AlfakitHelpdesk\Sla\SlaPolicy;

$panel->plugin(
    HelpdeskPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_support_agent)
        ->businessHours(BusinessHours::make('Asia/Bahrain')->days(['sun', 'mon', 'tue', 'wed', 'thu'], '08:00', '17:00'))
        ->slaPolicies([
            SlaPolicy::make('urgent')->priorities([TicketPriority::Urgent])->firstResponseWithin(30)->resolveWithin(240),
            SlaPolicy::make('standard')->firstResponseWithin(240)->resolveWithin(3 * 24 * 60),
        ]),
);
```

Schedule the SLA command every minute (breach warnings and closing old solved tickets):

```php
Schedule::command('alfakit-helpdesk:sla')->everyMinute();
```

Emails are queued Mailables: run a queue worker.

## Plugin options

```php
HelpdeskPlugin::make()
    // Who works the helpdesk (sees every ticket, replies, assigns). Without it, the
    // Ticket policy decides (the default policy lets every panel user in).
    ->authorize(fn (User $user): bool => $user->hasRole('support'))
    // The users tickets can be assigned to (default: the panel's users, members of the tenant on tenancy panels).
    ->agents(fn (?Model $tenant) => User::query()->where('is_agent', true))
    ->businessHours(BusinessHours::make('Europe/Paris')->weekdays('09:00', '12:30')->weekdays('13:30', '18:00')->holidays(['2026-12-25']))
    ->slaPolicies([...])
    ->dueSoonMinutes(60)                       // "due soon" window (default 60)
    // The tenant of tickets created outside the panel (portal, contact form, chat, email).
    ->publicTenant(fn (Request $request): ?Model => Team::where('domain', $request->getHost())->first())
    ->chatGreeting('Hi! Ask us anything.')
    ->inboxPollingInterval('20s')              // without realtime(); null to turn polling off
    ->toolbarButtons(['bold', 'italic', 'link', 'bulletList', 'orderedList'])
    ->spatieTags()                             // tag tickets with spatie/laravel-tags (see Tags)
    ->navigationGroup('Support')
    ->navigationSort(10)
    ->inbox(false)                             // no Inbox page
    ->cannedReplies(false)                     // no canned replies
    ->groups(false)                            // no groups
    ->reports(false)                           // no reports widget
    ->ticketResource(MyTicketResource::class)  // extend TicketResource, CannedReplyResource,
    ->cannedReplyResource(MyCannedReplyResource::class) // HelpdeskGroupResource or Inbox
    ->groupResource(MyGroupResource::class)
    ->inboxPage(MyInbox::class);
```

The customer side runs outside panels and uses the plugin options of `config('alfakit-helpdesk.panel')`, or of the first panel that registers the plugin.

## Tickets

A ticket has a subject, a requester (a user, or a guest's email and name), a status (`open`, `pending`, `solved`, `closed`), a priority (`low`, `normal`, `high`, `urgent`), a type (`question`, `incident`, `problem`, `task`), a channel, tags, an assignee and a group, and its conversation: **public replies**, **internal notes** (agents only) and **events** ("Dana assigned the ticket to Riley").

- A requester's reply reopens a pending or solved ticket. Closed (and merged) tickets are final: their portal shows "open a new ticket", emailed replies open a follow-up.
- Merging moves the conversation to the other ticket and closes this one. Only tickets of the **same requester and tenant** merge, so no requester ever sees another one's conversation.
- Solving emails the requester a signed link to a 1–5 satisfaction survey.

Change tickets from your own code through `Tickets`, so the SLA clock, events, emails and broadcasts stay consistent:

```php
use AlfaSix\AlfakitHelpdesk\Support\Tickets;

$ticket = Tickets::open(['subject' => 'Printer on fire', 'requester' => $user, 'priority' => 'high'], '<p>Help!</p>');
Tickets::reply($ticket, '<p>On our way.</p>', author: $agent, status: TicketStatus::Pending);
Tickets::note($ticket, '<p>VIP customer</p>', $agent);
Tickets::assign($ticket, $agent, by: $agent);
Tickets::changeStatus($ticket, TicketStatus::Solved, $agent);
Tickets::merge($duplicate, $ticket, $agent);
Tickets::rate($ticket, 5, 'Great!');
```

Message bodies are sanitised HTML (`Html::sanitize()`); plain text (chat, email) is escaped into paragraphs.

### Actions

The ticket page and the inbox share the same actions (`TicketActions`): **Reply** (rich editor, attachments, canned reply picker, "then set the status to"), **Internal note**, **Solve**, **Take it**, **Assign** (agent and group, checked against the allowed options), **Change status**, **Edit details** (subject, priority, type, tags) and **Merge**. The list has **Assign** and **Close** bulk actions. Every action is authorised with the ticket policy (`update`).

### Views

`mine` (my open tickets), `unassigned`, `due_soon`, `breached`, `active`, `pending`, `solved` and `all`: tabs of the tickets list (with counts) and views of the inbox. `Ticket::query()->breached()` and `->dueSoon()` are scopes you can use too.

## SLA

The first `SlaPolicy` that applies to a ticket (by priority, type or a `when()` closure) sets two targets from the ticket's creation: **first response** (the first public agent reply) and **resolution** (solved). They count **business minutes** of `businessHours()` (Monday to Friday 09:00–17:00 by default), or every minute with `calendarHours()`.

```php
SlaPolicy::make('vip')
    ->when(fn (Ticket $ticket): bool => $ticket->requester?->is_vip === true)
    ->firstResponseWithin(15)
    ->resolveWithin(120)
    ->calendarHours();

BusinessHours::make('Asia/Bahrain')
    ->days(['sun', 'mon', 'tue', 'wed', 'thu'], '08:00', '12:00')
    ->days(['sun', 'mon', 'tue', 'wed', 'thu'], '13:00', '17:00')   // a lunch break
    ->holidays(['2026-12-16', '2026-12-17']);
BusinessHours::always();                                           // 24/7
```

- While a ticket is **pending** (waiting for the requester) the resolution clock is paused; it resumes with the time that was left.
- Changing the priority or type moves the targets to the new policy. A reopened ticket gets a fresh resolution target.
- Each target is `on_track`, `due_soon`, `breached`, `paused`, `met` or `missed` (`Sla::firstResponseState()`, `Sla::resolutionState()`, `Sla::summary()`).
- `alfakit-helpdesk:sla` dispatches `SlaBreached` once per ticket and sends the assignee a database notification.

## Canned replies

Agents save replies, shared with everyone or private. Choosing one in the reply modal adds it to the editor with its placeholders filled in for the ticket:

```text
Hi {{ requester.first_name }}, {{ agent.first_name }} here about {{ ticket.reference }}.
```

Built in: `requester.name`, `requester.first_name`, `requester.email`, `agent.name`, `agent.first_name`, `ticket.reference`, `ticket.id`, `ticket.subject`, `ticket.status`, `ticket.priority`, `ticket.url`, `app.name`. Add your own:

```php
Placeholders::define('company.name', fn (Ticket $ticket, ?Model $agent): string => 'Acme');
```

Rendering is a lookup in that list: nothing is evaluated (no Blade, no PHP, no expressions), values are HTML-escaped, unknown placeholders render as nothing and the result is sanitised again.

## Inbox

The **Inbox** page shows the views, the list (search by subject, requester or `#number`, "Load more") and the open ticket: its details, SLA, actions and conversation, with a quick composer (reply or internal note; Enter sends, Shift+Enter adds a line) and the full Reply modal for attachments and canned replies.

Keyboard shortcuts are registered in the panel's shortcuts registry (customisable in the `?` overlay): `j` / `k` next / previous ticket, `r` reply, `n` internal note, `/` search.

With `realtime()` the inbox follows the ticket model's channel: new tickets and messages refresh the list and the open ticket, the requester's typing shows live, and the avatars of other agents on the same ticket appear (presence). Without it, the inbox polls at `inboxPollingInterval()`.

The inbox is the `helpdesk:inbox` registry key in every renderer; replace it with `createAlfakit({ components: { 'helpdesk:inbox': MyInbox } })`.

## Customer portal and contact form

Under `/{prefix}` (`support` by default, `config/alfakit-helpdesk.php`):

| Route                       | Who                              | Shows                                                      |
| --------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `/support`                  | Signed-in customers              | Their tickets                                              |
| `/support/tickets/new`      | Signed-in customers              | New ticket form                                            |
| `/support/tickets/{ticket}` | The ticket's requester           | Status, public conversation, reply form, satisfaction form |
| `/support/t/{ticket}`       | Signed link from emails (guests) | The same                                                   |
| `/support/rate/{ticket}`    | Signed link from emails          | Satisfaction survey                                        |
| `/support/contact`          | Everyone                         | Contact form                                               |

Pages are AlfaKit [standalone components](../standalone/overview) rendered by the Inertia page `config('alfakit-helpdesk.page')` (`php artisan alfakit-helpdesk:pages` creates it for your renderer). Guests are sent to `portal.login_url` (the `login` route by default).

A customer's tickets are those they requested, plus those sent from their email address when it is **verified** (`MustVerifyEmail`, `portal.match_verified_email`). Another requester's ticket is a 404. Customers only ever receive public replies: notes and events are never loaded.

The contact form has a honeypot input, a minimum fill time (`spam.min_seconds`) and a rate limit per IP address (`rate_limits.contact`). Spam gets the normal confirmation and stores nothing.

## Live chat widget

```tsx
import { HelpdeskChat } from '@alfakit/react' // or '@alfakit/vue', '@alfakit/svelte'

;<HelpdeskChat endpoint="/support/chat" position="end" />
```

| Prop             | Default         | Description                                              |
| ---------------- | --------------- | -------------------------------------------------------- |
| `endpoint`       | `/support/chat` | The chat endpoint                                        |
| `position`       | `end`           | `start` or `end` corner, in the reading direction        |
| `defaultOpen`    | `false`         | Open on load                                             |
| `label`          | `Open chat`     | The launcher's name before the server's texts arrive     |
| `pollWhenClosed` | `true`          | Keep polling (slowly) while closed, for the unread badge |

The widget works on any page (no `AlfakitRoot`), renders nothing on the server and loads the chat's code when it is first opened. It is a labelled dialog with a polite live log, closes with Escape (focus returns to the launcher), follows the page's direction (RTL) and uses texts translated on the server (`alfakit-helpdesk::helpdesk.chat`).

A visitor's first message opens a ticket on the `chat` channel. Guests are recognised by an HTTP-only, SameSite=Lax cookie holding a signed token (`AccessToken`: ticket, random secret, HMAC; only a hash of the secret is stored); signed-in customers by their account. Starting chats and sending messages are rate limited (`rate_limits.chat_start`, `chat_message`), and the start request has a honeypot.

The visitor polls every `chat.polling_interval` seconds while the chat is open; agents answer from the inbox, where the visitor's typing shows live with `realtime()`. The agent's typing reaches the visitor with the next poll.

Endpoints: `GET /support/chat` (settings and the visitor's chat), `POST /support/chat` (start), `POST /support/chat/messages`, `POST /support/chat/typing`, `DELETE /support/chat` (forget the chat on this device).

## Emails and reply by email

| Mailable            | To                                                          | When                          |
| ------------------- | ----------------------------------------------------------- | ----------------------------- |
| `TicketReceived`    | Requester                                                   | Ticket opened (not chat)      |
| `AgentReplied`      | Requester                                                   | Public agent reply (not chat) |
| `AgentNotification` | Assignee, else the group's agents, else `mail.agent_emails` | New ticket, requester reply   |
| `TicketSolvedMail`  | Requester                                                   | Solved, with the survey link  |

All are queued (`mail.connection`, `mail.queue`), sent after the transaction commits, one per recipient. Publish the views with `--tag=alfakit-helpdesk-views`.

Reply by email (`inbound.enabled`): emails get a signed Reply-To address `{local}+{ticket}.{signature}@{domain}` built from `inbound.reply_to`. Point your provider's inbound webhook at `POST /support/inbound/mail` (no session, no CSRF):

1. `InboundMailVerifier` checks the request. The default `HmacSignatureVerifier` expects `X-Helpdesk-Signature: sha256=<HMAC-SHA256 of the raw body with inbound.secret>`; without a secret every request is refused (403). Bind your provider's own scheme:

    ```php
    $this->app->bind(InboundMailVerifier::class, PostmarkSignatureVerifier::class);
    ```

2. `InboundMailParser` turns the request into an `InboundMessage`. The default `JsonInboundMailParser` reads `{"from": {"email", "name"}, "to": [], "subject", "text", "html", "message_id"}`; adapt your provider's payload in your own parser. AlfaKit ships no provider-specific parsing.
3. A message sent to a ticket's signed address **by its requester** is added as a reply (quoted text stripped); anything else opens a new ticket. Repeated `message_id`s are ignored.

## Reports

`HelpdeskStatsWidget` (above the tickets list, lazy, tenant-scoped): tickets created (14-day sparkline) and solved in the last 30 days, median time to first reply, SLA compliance (met targets out of met and missed) and CSAT (share of 4 and 5 ratings). `Reports::summary($query, $from, $until)` returns the same figures for your own widgets.

## Tags

Without spatie/laravel-tags, tickets have a `labels` JSON column edited with a `TagsInput`. With [`alfasix/alfakit-tags`](tags) installed and a ticket model using `Spatie\Tags\HasTags` (set it in `config('alfakit-helpdesk.models.ticket')`), the resource uses `SpatieTagsInput` / column / entry with the type `helpdesk`.

## Authorisation and tenancy

- Agents: `authorize()` and the policies registered for `Ticket`, `CannedReply` and `HelpdeskGroup` (`TicketPolicy`, `CannedReplyPolicy`, `HelpdeskGroupPolicy`; your own `Gate::policy()` replaces them). Private canned replies are their owner's only.
- Tenancy: tickets, canned replies and groups belong to a tenant through a `tenant` morph; resources, the inbox, reports, agents and groups are scoped to the current tenant, and assignments to another tenant's agents or groups are refused. Public tickets get `publicTenant()`.
- Customers: never through the panel; the portal and chat only reach their own tickets.

## Events

`TicketCreated`, `ReplyAdded` (replies and notes; `$message->isInternal()`), `TicketAssigned`, `TicketSolved`, `TicketsMerged`, `TicketRated` and `SlaBreached`, in `AlfaSix\AlfakitHelpdesk\Events`.

## Real time

With `realtime()`, every change dispatches `TicketActivity` (`broadcastAs()` = `helpdesk.activity`) on the panel's ticket model channel and the ticket's presence channel, the same channels as AlfaKit's `RecordChanged`, authorised by the same policies and tenant checks. Its payload is `{ticket, kind, actor, by, at}` with `kind` = `message`, `typing` or `updated`. **Subjects and message bodies are never broadcast**: the inbox fetches the ticket again through the authorised action endpoint.

## Configuration

`php artisan vendor:publish --tag=alfakit-helpdesk-config` publishes `config/alfakit-helpdesk.php`: `panel`, `route` (prefix, middleware, name, domain), `page`, `portal`, `contact`, `chat`, `rate_limits`, `spam`, `attachments` (private disk, size, count, types, signed URL lifetime), `mail`, `inbound`, `close_solved_after_days` and `models`.

## Security notes

- Every panel request is authorised from the page's context token, the panel, the tenant and the ticket policy; tickets are always looked up through the tenant-scoped resource query.
- Customers never see internal notes or events: the portal, the chat and emails only load public replies.
- Attachments are stored on a private disk and downloaded through short-lived signed URLs that are only generated for people who may see the message, with `Content-Security-Policy: sandbox`.
- Canned reply placeholders are never evaluated; values are escaped and the result sanitised.
- Guest chat tokens are signed and only a hash of their secret is stored; guest ticket links in emails are signed and expire after 60 days.
- The inbound webhook refuses every request until you configure a verifier secret.
- Broadcasts carry keys only.

## "Powered by" credit

The pages and emails your customers see carry no AlfaKit or Alfa Six branding by default. To credit AlfaKit, turn on the small "Powered by AlfaKit · Alfa Six" line for the customer portal (`meta.poweredBy`; pages from the portal generator render it), the chat widget and the helpdesk emails:

```php
HelpdeskPlugin::make()->poweredBy();
```

Without `poweredBy()`, the plugin follows `config('alfakit.credit.public_pages')` and `config('alfakit.credit.emails')`, both `false` by default. See [Credits](../panels/configuration#credits).
