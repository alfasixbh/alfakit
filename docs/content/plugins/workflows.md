---
title: Workflows
description: State machines and approval workflows for any model, with an approvals inbox, a history timeline and a diagram.
---

# Workflows

`alfasix/alfakit-workflows` turns a model column into a state machine. You describe the states and the transitions between them in PHP, and the plugin applies transitions safely on the server. A transition can have business-rule guards, policy checks, a form, a required comment and notifications. It can also wait for approval steps: a single approver, any one of a group, everyone in a group, or several levels one after another. Steps can have due dates, reminders, delegation, reassignment and escalation.

| Class                 | Use it in                       | Does                                                                                                      |
| --------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `HasWorkflow`         | Your model                      | Binds the workflow, sets the initial state, refuses state changes outside a transition                    |
| `WorkflowActions`     | Page header actions, table rows | One action per allowed transition, plus Approve / Reject / Delegate / Reassign / Withdraw / View workflow |
| `WorkflowTimeline`    | Infolists, forms, modals        | The history: who did what, when, with comments, plus who a pending approval waits for                     |
| `WorkflowDiagram`     | Infolists, forms, pages, modals | A read-only, accessible SVG of the states and transitions, drawn on the server                            |
| `WorkflowStateColumn` | Tables                          | The state as a badge with the state's label, colour and icon                                              |
| `WorkflowStateFilter` | Table filters                   | Filter by one or more states                                                                              |
| `WorkflowStateEntry`  | Infolists                       | The state as a badge, with "Awaiting approval" while a request is open                                    |
| `ApprovalsInbox`      | Registered by the plugin        | Everything waiting for the signed-in user's decision, with bulk approve                                   |

Everything is built from AlfaKit's own components (actions, entries, `Callout`, `Html`, a page table), so it renders the same in React, Vue and Svelte. There is no frontend package and nothing to build.

## Installation

```bash
composer require alfasix/alfakit-workflows
php artisan vendor:publish --tag=alfakit-workflows-migrations
php artisan migrate
```

The migration creates three tables:

- `alfakit_workflow_approval_requests`: a transition waiting for approval, with the requester, the step it is on, the form data and the tenant;
- `alfakit_workflow_approvals`: one row per approver per step, with the decision, comment, due date, reminders and escalation;
- `alfakit_workflow_logs`: the append-only audit trail of every transition, request, decision, delegation, reassignment, escalation and withdrawal.

Subjects, users and tenants are stored as string morphs, so integer, UUID and ULID keys all work. Bell notifications use Laravel's `notifications` table (`php artisan make:notifications-table`). Turn on the bell with `->databaseNotifications()` on the panel.

Register the plugin on the panels that should have the approvals inbox:

```php
use AlfaSix\AlfakitWorkflows\WorkflowsPlugin;

$panel->plugin(WorkflowsPlugin::make());
```

Transitions also work without the plugin, for example from jobs or other panels. In that case `WorkflowsPlugin::get()` returns the defaults.

## Worked example: invoice approval

An invoice starts as a draft. Submitting it asks a manager to approve it. Invoices of 1,000 or more also need every member of finance to approve, after the manager. While approval is pending, the invoice waits in `submitted`. A rejection sends it to `rejected`, where it can be reopened with a comment. Approved invoices are marked as paid with a payment reference, and admins can void an invoice from any state that is not final.

### 1. The model

```php
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitWorkflows\ApprovalStep;
use AlfaSix\AlfakitWorkflows\Concerns\HasWorkflow;
use AlfaSix\AlfakitWorkflows\State;
use AlfaSix\AlfakitWorkflows\Transition;
use AlfaSix\AlfakitWorkflows\Workflow;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasWorkflow;

    public static function workflow(): Workflow
    {
        return Workflow::make('invoice')
            ->label('Invoice')
            ->stateColumn('state') // the default
            ->states([
                State::make('draft')->label('Draft')->color('gray')->icon('file-pen'),
                State::make('submitted')->label('Submitted')->color('warning')->icon('hourglass'),
                State::make('approved')->label('Approved')->color('success')->icon('badge-check'),
                State::make('rejected')->label('Rejected')->color('danger')->icon('circle-x'),
                State::make('paid')->label('Paid')->color('primary')->icon('banknote')->final(),
                State::make('void')->label('Void')->final(),
            ])
            ->transitions([
                Transition::make('submit')
                    ->label('Submit')
                    ->from('draft')
                    ->to('approved')
                    ->guard(fn (Invoice $record): bool => $record->total > 0, 'Add an amount first.')
                    ->withComment()
                    ->requiresApproval([
                        ApprovalStep::make('manager')
                            ->label('Manager approval')
                            ->role('manager')
                            ->dueIn('2 days')
                            ->remindEvery('1 day')
                            ->escalateAfter('3 days')
                            ->escalateToRole('director'),
                        ApprovalStep::make('finance')
                            ->label('Finance approval')
                            ->role('finance')
                            ->allOf()
                            ->onlyWhen(fn (Invoice $record): bool => $record->total >= 1000),
                    ])
                    ->pendingState('submitted')
                    ->rejectedState('rejected'),

                Transition::make('pay')
                    ->label('Mark as paid')
                    ->from('approved')
                    ->to('paid')
                    ->form([
                        TextInput::make('reference')->label('Payment reference')->required()->maxLength(64),
                    ])
                    ->using(function (Invoice $record, array $data): void {
                        $record->payment_reference = $data['reference'];
                        $record->paid_at = now();
                    })
                    ->notify(fn (Invoice $record) => User::query()->where('role', 'finance')->get()),

                Transition::make('reopen')
                    ->label('Reopen')
                    ->from('rejected')
                    ->to('draft')
                    ->requiresComment(),

                Transition::make('void')
                    ->label('Void')
                    ->fromAny()
                    ->to('void')
                    ->color('danger')
                    ->authorize('void'), // InvoicePolicy::void()
            ])
            ->initial('draft');
    }
}
```

The `state` column is a plain string column (`$table->string('state')->nullable()`). New invoices start in `draft`, and a "created" entry starts their history.

### 2. The resource

```php
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitWorkflows\Actions\WorkflowActions;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowStateEntry;
use AlfaSix\AlfakitWorkflows\Infolists\Components\WorkflowTimeline;
use AlfaSix\AlfakitWorkflows\Schemas\Components\WorkflowDiagram;
use AlfaSix\AlfakitWorkflows\Tables\Columns\WorkflowStateColumn;
use AlfaSix\AlfakitWorkflows\Tables\Filters\WorkflowStateFilter;

class InvoiceResource extends Resource
{
    protected static ?string $model = Invoice::class;

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            TextEntry::make('number'),
            WorkflowStateEntry::make(),
            Section::make('Workflow')->schema([WorkflowDiagram::make()])->collapsible(),
            Section::make('History')->schema([WorkflowTimeline::make()]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('number')->searchable(),
                WorkflowStateColumn::make()->showPendingApproval(),
            ])
            ->filters([WorkflowStateFilter::make()])
            ->recordActions([WorkflowActions::make()]);
    }
}

class ViewInvoice extends ViewRecord
{
    protected static string $resource = InvoiceResource::class;

    protected function getHeaderActions(): array
    {
        // Inline buttons in the header; in table rows the default dropdown fits better.
        return [WorkflowActions::make()->dropdown(false)];
    }
}
```

### 3. Who sees what

- **Ada** (author) sees **Submit** on a draft. The modal asks for an optional comment and says the invoice needs Manager approval, then Finance approval, before it becomes Approved. Submitting moves it to **Submitted** and notifies every manager. Ada herself is never one of the approvers. While the request is open, Ada sees **Withdraw request**, which sends the invoice back to Draft.
- **Bob** (manager) sees **Approve**, **Reject** and **Delegate** on the invoice page and in **Approvals** in the navigation, with a badge showing how many items wait for him. Approving a 500 invoice completes it: the finance step doesn't apply, so the invoice moves to **Approved** and Ada is notified. For a 5,000 invoice, Bob's approval opens the finance step instead, and the invoice becomes Approved only after every member of finance has approved.
- Rejecting needs a comment. The invoice moves to **Rejected**, Ada is notified with the comment, and she can **Reopen** it (with a required comment) to try again.
- If Bob doesn't decide within three days, the scheduled command hands his approval to the directors.
- **Admins** (with a `reassignApprovals` policy method) see **Reassign** while a request is open, and **Void** in every state that is not final.

Every action is re-checked on the server when it runs, on the row read again with a lock. A stale page, a double click or a crafted request can't apply a transition twice, skip a guard or decide someone else's approval.

### 4. Schedule reminders and escalation

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('alfakit-workflows:process')->everyFifteenMinutes();
```

The command reminds approvers every `remindEvery()` (saying when a decision is overdue) and escalates decisions still pending `escalateAfter()` after they were assigned. Each request is processed in the panel and tenant it was made in. Use `--no-reminders` or `--no-escalations` to run only one of the two.

## Defining workflows

### States

```php
State::make('approved')
    ->label('Approved')          // default: the headline of the name ("In Review" for in_review)
    ->color('success')           // primary, success, warning, danger, info, gray (default) or a #hex
    ->icon('badge-check')        // any icon name the panel can render
    ->description('Ready to pay')
    ->final()                    // no transition may leave it
```

A plain string (`'submitted'`) is a state with the default label and colour. The stored value is the state's name. Backed enums cast on the column work too: `getStateOf()` reads their value.

### Workflow options

| Method                    | Default  | Does                                                                                        |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `label(string)`           | headline | Shown in the diagram, the inbox and the "View workflow" modal                               |
| `states(array)`           | none     | `State` objects or names                                                                    |
| `transitions(array)`      | none     | `Transition` objects; their order is the order of the actions                               |
| `initial(string)`         | required | The state new records start in, unless they were created with a state                       |
| `stateColumn(string)`     | `state`  | The attribute holding the state                                                             |
| `guardStateColumn(bool)`  | `true`   | Saving a changed state outside a transition throws `TransitionDenied`; turn off for imports |
| `allowSelfApproval(bool)` | `false`  | Let the requester be one of the approvers                                                   |

The definition is validated the first time it is used. Unknown states, transitions leaving a final state, steps without approvers, an escalation without `escalateTo()`, a pending state without approval steps and duplicate names throw `InvalidWorkflowDefinition`, with every problem listed. Transition names start with a letter and contain only letters, digits and underscores, because they become action names (`workflow_submit`).

### Transitions

| Method                                  | Does                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `from(string\|array)`, `fromAny()`      | The states it leaves. `fromAny()` means every state that is not final; the diagram draws it as one arrow                |
| `to(string)`                            | The state it reaches (after approval, when it needs one)                                                                |
| `label()`, `icon()`, `color()`          | The action button; `description()` replaces the modal's default text                                                    |
| `guard(Closure, ?string $message)`      | A business rule. Return `false` (shown with `$message`), a message string or a denied `Response` to refuse. Add several |
| `authorize(string\|bool\|Closure)`      | Who may run it: a Gate ability on the record, a boolean, or `fn (Invoice $record, User $user)`                          |
| `form(array\|Closure)`                  | Fields in the modal; the validated data goes to `using()` and into the history                                          |
| `withComment()`, `requiresComment()`    | An optional, or a required, comment stored in the history                                                               |
| `using(Closure)`                        | Change the record inside the transaction, before the new state is saved: `fn (Invoice $record, array $data)`            |
| `after(Closure)`                        | Run after the commit: `fn (Invoice $record, array $data, ?User $user)`                                                  |
| `notify(Model\|iterable\|Closure)`      | Users notified once the transition is applied (call it again to add more)                                               |
| `requiresApproval(ApprovalStep\|array)` | Steps that must approve, in order                                                                                       |
| `pendingState(string)`                  | Where the record waits while approval is pending (it stays put without one)                                             |
| `rejectedState(string)`                 | Where a rejection sends it (back to where the request started without one)                                              |
| `successNotificationTitle(string)`      | The toast after the action, instead of "Moved to :state"                                                                |
| `sort(int)`                             | The action's position (default: the order of `transitions()`)                                                           |

Closures receive `$record`, `$user`, `$data`, `$workflow` and `$state` by name, and the record, the workflow and the user by type. Guards run twice: when the actions are shown, and again on the locked row when the transition runs.

Without `authorize()`, a `transition($user, $record, string $transition)` method on the record's policy decides. Without that, the record's `update` ability decides. Without a policy, the transition is allowed, unless the panel uses `strictAuthorization()`.

### Approval steps

```php
ApprovalStep::make('finance')
    ->label('Finance approval')
    ->approvers($cfo)                                        // a user, users, keys or a closure
    ->approvers(fn (Invoice $record) => $record->company->controllers)
    ->role('finance')                                        // spatie/laravel-permission's role scope, or hasRole()
    ->permission('approve-invoices')                         // a Gate ability checked per user
    ->allOf()                                                // everyone must approve; anyOf() (default) needs one
    ->onlyWhen(fn (Invoice $record): bool => $record->total >= 1000)
    ->dueIn('2 days')
    ->remindEvery('1 day')
    ->escalateAfter('3 days')
    ->escalateTo(fn (Invoice $record) => $record->company->cfo)
    ->escalateToRole('director')
    ->requiresApprovalComment()                              // approving needs a comment (off by default)
    ->requiresRejectionComment(false)                        // rejecting needs one by default
    ->delegable(false)                                       // approvers may delegate by default
    ->bulkApprovable(false)                                  // the inbox can bulk approve by default
```

The approval modes:

- **Single approver**: one user, through `approvers($user)` or a closure that returns one.
- **Any of a group**: `anyOf()` (the default). The first approval completes the step, and the other approvers' open approvals are closed as "skipped".
- **All of a group**: `allOf()`. Every approver must approve. One rejection rejects the whole request.
- **Sequential, multi-level**: several steps. Each one opens only after the previous one is complete, and its approvers are asked then. `onlyWhen()` skips a step that doesn't apply. When no step is left, the transition is applied.

Approvers are resolved when their step opens, from the [candidate users](#users-and-tenants). The requester is left out unless the workflow `allowSelfApproval()`. If nobody is left, the transition (or the approval that would open the step) is refused with "Nobody can approve the step …", and nothing changes. `permission()` checks every candidate, so on large user tables prefer `role()` or `approvers()`. Durations take strings such as `'2 days'` and `'36 hours'`, ISO 8601 durations (`'P1DT12H'`) or `DateInterval`s.

## Running transitions from code

```php
$invoice->transition('submit', comment: 'Ready for review');            // the signed-in user
$invoice->transition('pay', ['reference' => 'TRX-42'], user: $accountant);
$invoice->transition('void');                                             // no user: runs as the system

$invoice->canTransition('pay', $user);              // bool
$invoice->getAvailableTransitions($user);           // ['submit' => Transition, ...]
$invoice->getWorkflowState();                       // 'draft'
$invoice->getWorkflowStateDefinition()?->getLabel();
$invoice->isAwaitingApproval();
$invoice->getPendingApprovalRequest();              // ?ApprovalRequest
$invoice->workflowHistory()->latest()->get();       // WorkflowLog query
$invoice->approvalRequests()->get();                // ApprovalRequest query
Invoice::query()->whereWorkflowState(['approved', 'paid'])->get();
```

`transition()` throws `AlfaSix\AlfakitWorkflows\Exceptions\TransitionDenied` when it is refused. The exception's `reason` is one of `unknown`, `invalid_state`, `unauthorized`, `guard`, `awaiting_approval`, `no_approvers`, `not_pending`, `comment_required` or `invalid_delegate`, and its message is translated and safe to show. Without a user (in a queued job, for example), authorisation is skipped but guards still run, and the history shows "System".

Decisions have their own API, so you can build your own UI or approve from Slack:

```php
use AlfaSix\AlfakitWorkflows\Support\Approvals;

$request = $invoice->getPendingApprovalRequest();
$approval = Approvals::assignmentFor($request, $user);   // the user's open approval, or null

Approvals::approve($approval, $user, 'Looks good');
Approvals::reject($approval, $user, 'Wrong VAT rate');
Approvals::delegate($approval, $colleague, $user, 'On holiday');
Approvals::delegate($approval, $colleague, $admin, reassign: true);
Approvals::cancel($request, $user, 'Wrong customer');     // withdraw
Approvals::inboxQuery($user);                              // what waits for the user, in the current tenant
```

## The actions

`WorkflowActions::make()` builds actions from the workflow of the page's model (or the table's model). On a page without a model, pass the model class: `WorkflowActions::make(Invoice::class)`.

| Action name                           | Shown when                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `workflow_{transition}`               | The state allows it, no approval is pending, the user is authorised and every guard passes |
| `workflow-approve`, `workflow-reject` | The user has an open approval on the current step                                          |
| `workflow-delegate`                   | The same, and the step is `delegable()`                                                    |
| `workflow-reassign`                   | A request is pending and the user may reassign (see below)                                 |
| `workflow-withdraw`                   | A request is pending and the user asked for it, or may reassign                            |
| `workflow-diagram`                    | Always: "View workflow" opens the diagram in a modal                                       |

A transition without a form or comment asks for confirmation. One with a form shows the form, then the comment field. Refusals become a danger notification instead of an error page.

```php
WorkflowActions::make()
    ->only(['submit', 'pay'])        // or ->except(['void'])
    ->approvalActions(false)         // no Approve / Reject / Delegate / Reassign / Withdraw
    ->diagramAction(false)           // no "View workflow"
    ->dropdown(false)                // inline buttons instead of the default "Workflow" dropdown
```

It is an `ActionGroup`, so `label()`, `icon()`, `iconButton()`, `button()` and `buttonGroup()` work as usual. For tests and custom pages, the action names are the constants `WorkflowActions::APPROVE`, `REJECT`, `DELEGATE`, `REASSIGN`, `WITHDRAW` and `DIAGRAM`, the prefix `TRANSITION_PREFIX` and the comment field name `COMMENT_FIELD`.

## Timeline, diagram, column and filter

```php
WorkflowTimeline::make()
    ->limit(25)                 // newest first; null for everything
    ->oldestFirst()
    ->showPendingApprovals(false)
    ->subject($otherRecord)     // another record than the schema's

WorkflowDiagram::make()                         // the schema record's workflow
WorkflowDiagram::make()->workflow(Invoice::class) // a model's workflow, without a record
WorkflowDiagram::make()->showHistory(false)     // don't draw the path the record took

WorkflowStateColumn::make()                     // the `state` column
WorkflowStateColumn::make('status')->showPendingApproval()->sortable()

WorkflowStateFilter::make()                     // the `state` column of the table's model
WorkflowStateFilter::make('status')->workflow(Invoice::class)

WorkflowStateEntry::make()
```

The timeline lists each event with an icon, the person, a relative time (exact on hover), the state change as two badges, and the comment. While approval is pending it starts with a callout naming the step, whether one or every approval is needed, each approver's status and their due dates. It is hidden from users who may not `view` the record.

The diagram lays states out in columns by their distance from the initial state. Transitions are labelled arrows, approval outcomes are green (approved) and dashed red (rejected), `fromAny()` transitions are one dashed stub, the current state is highlighted, and transitions the record already took are drawn solid. It is SVG built on the server with the theme's CSS variables, so it follows light and dark mode and every theme, and it mirrors for right-to-left locales. It has an accessible name and description, and a list for screen readers that spells out every state and transition. A wide workflow scrolls sideways on small screens; the scroll area can be reached with the keyboard.

## The approvals inbox

The plugin adds an **Approvals** page (`/approvals`) to the navigation, with a badge counting what waits for the user. It lists the user's open approvals in the current tenant: the record (linked to its view page), the workflow and transition, the step, who asked (with their comment), when, and the due date (red when overdue). There is an "Overdue only" filter. Each row has **Approve**, **Reject** and **Delegate**, and **Approve selected** approves several at once. Rows whose step needs an approval comment, or is not `bulkApprovable()`, can't be selected, and each selected item is checked again before it is approved.

## Plugin options

```php
WorkflowsPlugin::make()
    ->inbox(true)                                  // false, or your subclass of ApprovalsInbox
    ->navigationGroup('Work')
    ->navigationSort(5)
    ->navigationIcon('inbox')
    ->navigationBadge(true)
    ->users(fn (?Model $tenant) => User::query()->where('active', true))
    ->userSearchColumns(['name', 'email'])
    ->databaseNotifications(true)                  // bell notifications (default)
    ->mailNotifications()                          // also email (off by default)
    ->recordUrlUsing(fn (Model $record) => route('invoices.show', $record))
    ->authorizeReassignUsing(fn (Model $record, User $user): bool => $user->isAdmin())
```

## Users and tenants

Approvers, delegates and escalation targets are chosen from the candidate users. These are the plugin's `users()` query, or by default the panel's user model. On tenancy panels, candidates are limited to the members of the tenant, found through its `members` or `users` relationship, and users that implement `HasTenants` must be able to access it.

Each request stores the tenant (and panel) it was made in, and so does every history entry. The inbox, the navigation badge and every decision only see requests of the current tenant, so an approver who belongs to two teams only sees each team's work in that team. Records themselves are scoped by the resource as usual. The scheduled command runs each request in its own panel and tenant, so escalation targets and notification links stay in the right tenant.

## Notifications

| When                                   | Who                                          |
| -------------------------------------- | -------------------------------------------- |
| A step opens                           | Its approvers                                |
| An approval is delegated or reassigned | The new approver                             |
| An approval is escalated               | The escalation targets                       |
| `remindEvery()` passed                 | The approver (marked overdue past `dueIn()`) |
| The request is approved or rejected    | The requester (with the rejection comment)   |
| A transition is applied                | Its `notify()` recipients                    |

Notifications are sent after the transaction commits. They link to the record's view (or edit) page in the panel, or to `recordUrlUsing()`, and are marked with the request's tenant. With `mailNotifications()`, users who have a mail route also get an email.

## Events

All events implement `ShouldDispatchAfterCommit`, so listeners never see a change that was rolled back.

| Event               | Properties                                                                             | When                                               |
| ------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `TransitionApplied` | `record`, `workflow`, `transition`, `from`, `to`, `user`, `comment`, `data`, `request` | A record moved to a new state                      |
| `ApprovalRequested` | `request`, `record`, `step`, `approvers`, `requester`                                  | A step opened                                      |
| `ApprovalGranted`   | `request`, `approval`, `record`, `approver`, `comment`                                 | An approver approved (the request may need more)   |
| `ApprovalRejected`  | `request`, `approval`, `record`, `approver`, `comment`                                 | An approver rejected; the request is closed        |
| `ApprovalDelegated` | `request`, `from`, `to`, `by`, `reassigned`, `escalated`                               | An approval was delegated, reassigned or escalated |

They live in `AlfaSix\AlfakitWorkflows\Events`.

## Authorisation

- **Transitions**: `authorize()`, else a `transition()` policy method, else the record's `update` ability (see [Transitions](#transitions)).
- **Approve, reject, delegate**: only the user the approval is assigned to, and only while it is open on the current step of a pending request in the current tenant. Being assigned is what authorises the decision; the record's policy is not asked again.
- **Reassign and withdraw for others**: `authorizeReassignUsing()`, else a `reassignApprovals($user, $record)` policy method. Nobody can when neither exists. Requesters can always withdraw their own requests.
- **Timeline**: the record's `view` ability. **Inbox**: any signed-in user, who only sees their own approvals.

## Integrity

- Every transition and decision runs in a database transaction that first reads the record (and the request and approval) again with `lockForUpdate()`. State, pending approval, authorisation and guards are checked on that fresh row. Two people clicking at once, or one person clicking twice, apply it once; the second gets "… is not possible from the state …" or "This approval is no longer pending."
- Only one approval request per record can be pending, and no other transition is possible while it is.
- `HasWorkflow` refuses saving a changed state column outside a transition (`guardStateColumn()`), so a stray `update(['state' => 'paid'])` or a form field can't skip the workflow.
- An exception in `using()`, a missing approver for the next step or a failed save rolls back everything: the state, the request, the approvals and the history.
- The history is append-only and keeps the form data of each transition (scalar values only).

## spatie/laravel-model-states

The plugin is independent of `spatie/laravel-model-states`. It stores plain strings, needs no state classes and has its own transition rules. Don't use both on the same column. If you already use model states, keep them for domain logic on another column, or move the rules into a `Workflow`. To let another package write the column, turn off `guardStateColumn()`.

## Security notes

- Approvers and requesters are matched by morph type and key, and candidates are limited to the tenant's members. A delegate must be a candidate, can't be the current approver, someone already asked on the step, or (without `allowSelfApproval()`) the requester.
- State and transition labels, comments and names are escaped everywhere. The diagram's SVG is generated from escaped text only, never from user markup.
- Form data stored in the history is reduced to scalars; uploads and objects are dropped. Don't put secrets in transition forms, because they are kept in `alfakit_workflow_logs.data`.
- Notification bodies are escaped by AlfaKit's notifications, and links come from your resources (or `recordUrlUsing()`).

## Translations

Strings live in `alfakit-workflows::workflows` (`resources/lang/en/workflows.php`) and ship in the 13 AlfaKit locales. Publish them with `php artisan vendor:publish --tag=alfakit-workflows-translations`.
