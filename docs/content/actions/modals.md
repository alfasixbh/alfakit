---
title: Action modals
description: Confirmations, modal forms, slide-overs and custom content.
---

# Action modals

Clicking an action that has a modal fetches the modal's definition from the server — heading, description, form schema with its hydrated state — and opens it. Submitting posts the form data to the action endpoint; validation errors keep the modal open.

An action with a modal form, and one that asks for confirmation:

```alfakit-example name="action-modal-form"

```

## Confirmation

```php
Action::make('delete')->requiresConfirmation()
    ->modalHeading('Delete post')->modalDescription('This cannot be undone.')
    ->modalIcon('trash-2')->modalIconColor('danger')
    ->modalSubmitActionLabel('Delete')->modalCancelActionLabel('Keep');
```

## Forms

```php
Action::make('invite')
    ->form([
        TextInput::make('email')->email()->required(),
        Select::make('role')->options(['editor' => 'Editor', 'viewer' => 'Viewer'])->default('viewer'),
    ])
    ->fillForm(fn (Team $record) => ['role' => $record->default_role])
    ->mutateFormDataUsing(fn (array $data) => [...$data, 'invited_by' => auth()->id()])
    ->action(fn (Team $record, array $data) => $record->invite($data['email'], $data['role']));
```

A modal with a record (edit, view, replicate, or any action in a table row) fills its form from the record's attributes. Change them first with `mutateRecordDataUsing()`; it is skipped when `fillForm()` sets the data. Like the default fill, only the attributes a field reads reach the browser:

```php
EditAction::make()
    ->mutateRecordDataUsing(fn (array $data, Post $record): array => [...$data, 'title' => Str::title($data['title'])]);
```

`modifyFormUsing()` changes the built form schema before it is used (layout, operation, extra state). The closure receives the `Schema` as `$schema` (or `$form`) along with the usual injections; return the schema or nothing:

```php
EditAction::make()
    ->modifyFormUsing(fn (Schema $schema) => $schema->columns(1));
```

### Form lifecycle hooks

| Hook                                                     | Runs                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `beforeFormFilled(fn () => …)`                           | When the modal opens, before the form is filled                                                |
| `afterFormFilled(fn (array $data, Schema $schema) => …)` | When the modal opens, after the form is filled (`$data` is the filled state)                   |
| `beforeFormValidated(fn (array $data) => …)`             | On submit, before validation (`$data` is the submitted state)                                  |
| `afterFormValidated(fn (array $data) => …)`              | On submit, after validation (`$data` is the validated data), before `before()` and the handler |

They receive the usual injections (`$record`, `$schema`, `$arguments`, …), can be called several times to add more closures, and may `$action->halt()` or `$action->cancel()`. The fill hooks run only for the modal request, not again when the action runs.

### Running code when the modal opens

`mountUsing()` runs when the modal opens (or, for an action without a modal, before it runs). With a form it replaces the default fill, so fill the form yourself. `$action->halt()` or `$action->cancel()` keep the modal closed; notifications sent before are shown:

```php
Action::make('draft')
    ->schema([TextInput::make('title')])
    ->mountUsing(function (Schema $form, Action $action): void {
        if (RateLimiter::tooManyAttempts('drafts:'.auth()->id(), 10)) {
            Notification::make()->warning()->title('Too many drafts, try again later')->send();
            $action->halt();
        }

        $form->fill(['title' => 'Untitled']);
    });
```

### Read-only forms

`disabledForm()` disables every field of the modal form, for a review before confirming (`ViewAction` uses it). Disabled fields keep their server value.

### Unsaved changes

With the panel's `unsavedChangesAlerts()`, closing a modal whose form changed (Cancel, Escape, clicking away, the close button) asks first, and so does leaving the page. Turn it on or off per action with `unsavedChangesAlert()` / `unsavedChangesAlert(false)`. Read-only forms (`disabledForm()`) never ask.

Modal forms support everything page forms do, including `live()` fields (they refresh through the same endpoint, scoped to the action). Bulk-action forms refresh with the selection: the request carries the selected keys (or the "all records" flag and the page's query string), so closures in the form and in the actions nested in its modal see the same `$records` as the handler. A single `FileUpload` is sent as one path and validated as such; `multiple()` fields send a list.

## Presentation

| Method                                                                                      | Description                                                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `modalWidth(Width::ThreeExtraLarge)`                                                        | `3xs` … `7xl`, `none`, `full`, `min`, `max`, `fit`, `prose`, `container`, `screen-sm` … `screen-2xl`, `screen` |
| `slideOver()`                                                                               | Render as a side sheet                                                                                         |
| `slideOverPosition(SlideOverPosition::Start)`                                               | Slide in from the start side (default: end; mirrored in RTL)                                                   |
| `modalAlignment(Alignment::Center)`                                                         | Center heading and footer                                                                                      |
| `modalFooterActionsAlignment(Alignment::Between)`                                           | Align the footer buttons only (`Start`, `Center`, `End`, `Between`)                                            |
| `stickyModalHeader()`                                                                       | Keep the heading visible while the content scrolls                                                             |
| `stickyModalFooter()`                                                                       | Keep buttons visible on long forms                                                                             |
| `modalClickThrough()`                                                                       | No backdrop: the page stays scrollable and clickable; close with Escape or the buttons                         |
| `extraModalWindowAttributes(['class' => 'report'])`                                         | Attributes on the modal window (`class` is merged; `merge: true` adds to earlier calls)                        |
| `extraModalOverlayAttributes([...])`                                                        | Attributes on the backdrop                                                                                     |
| `modalContent([TextEntry::make('title'), Html::make(...)])`                                 | Content above the form (see [Custom modal content](#custom-modal-content))                                     |
| `modalContentFooter([...])`                                                                 | Content below the form; takes the same values as `modalContent()`                                              |
| `extraModalFooterActions([Action::make('preview')->url(...)])`                              | Extra buttons                                                                                                  |
| `closeModalByClickingAway(false)`, `closeModalByEscaping(false)`, `modalCloseButton(false)` | Dismissal                                                                                                      |
| `modalSubmitAction(false)`, `modalCancelAction(false)`                                      | Hide buttons (e.g. `ViewAction`)                                                                               |
| `modalHidden()`                                                                             | Skip the modal and run straight away                                                                           |
| `closeModal(false)`                                                                         | Keep the modal open after a successful run                                                                     |
| `modalAutofocus(false)`                                                                     | Don't focus the first field (or button) when the modal opens                                                   |

`modalSubmitAction()` and `modalCancelAction()` also take a closure that receives the button as an `Action`; change its label, colour or icon, or hide it:

```php
Action::make('send')
    ->requiresConfirmation()
    ->modalSubmitAction(fn (Action $action) => $action->label('Send now')->color('danger')->icon('send'))
    ->modalCancelAction(fn (Action $action) => $action->label('Not yet'));
```

### Custom modal content

`modalContent()` and `modalContentFooter()` accept read-only schema components (one or an array), the name of a frontend component registered with `createAlfakit({ components })` plus the data to pass it, or a Blade view. Any of these may come from a closure, which gets the action's `$record`, `$data`, `$arguments`… injected:

```php
// A registered frontend component; closures in the data are resolved with the action's injections.
Action::make('advance')
    ->modalContent('order-summary', fn (Order $record): array => [
        'number' => $record->number,
        'total' => $record->total,
    ])
    ->action(fn (Order $record) => $record->advance());

// Or a Blade view, rendered on the server and shown as trusted HTML.
Action::make('advance')
    ->modalContent(fn (Order $record) => view('orders.advance', ['record' => $record]));
```

The registered component receives the schema object as `component`; the data is in `component.props`:

```tsx
// createAlfakit({ components: { 'order-summary': OrderSummary } })
export function OrderSummary({
    component,
}: {
    component: { props: { number: string; total: number } }
}) {
    return <p>Order {component.props.number}</p>
}
```

The data is serialised to JSON for the browser: pass the values the component shows (scalars and arrays), not whole models.

`modalHidden()` (a boolean or closure) skips the confirmation, content and form; a form then runs with its default state (`mountUsing()` or the default fill), never with data from the browser. Password confirmation still opens the modal.

## Wizards

Split a modal form into steps with `->steps()`. **Next** validates the current step's fields on the server (`POST /_alfakit/schema/validate` with the step's key) and stays on the step with its errors when they fail; the step's `beforeValidation()` and `afterValidation()` closures run around that check. Submitting validates every step again, and the wizard jumps to the first step with an error. The modal's submit button appears on the last step. Page wizards (`Wizard::make([...])` in a form) behave the same.

```php
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;

Action::make('onboard')
    ->steps([
        Step::make('Account')->schema([TextInput::make('email')->email()->required()]),
        Step::make('Profile')->description('Shown on your page')->schema([Textarea::make('bio')]),
    ])
    ->skippableSteps()    // jump to any step instead of moving through them in order
    ->startOnStep(1)
    ->action(fn (array $data) => User::create($data));
```

## Nested actions

Footer buttons from `extraModalFooterActions()` are actions of their own: they can have a form, a confirmation or any other modal, which replaces the current one until it closes (`overlayParentActions()` stacks it on top instead). An `ActionGroup` in the list renders as a dropdown whose actions are nested actions too. They run on the parent's record (or bulk selection) and are only usable while the parent is visible and authorised.

```php
EditAction::make()
    ->extraModalFooterActions([
        Action::make('preview')
            ->schema([TextInput::make('email')->email()->required()])
            ->action(fn (Post $record, array $data) => Mail::to($data['email'])->send(new PostPreview($record))),
        Action::make('publish')
            ->requiresConfirmation()
            ->cancelParentActions()   // close the edit modal too after publishing
            ->action(fn (Post $record) => $record->publish()),
    ]);
```

`cancelParentActions('edit')` closes only the named parent and the modals opened from it. Two more options shape how a nested modal behaves:

| Method                         | Description                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cancelParentActionsOnClose()` | Dismissing this modal (cancel, Escape, clicking away, close button) closes its parents too; pass a parent's name to stop there                                   |
| `overlayParentActions()`       | Open this modal on top of the parent, which stays visible. By default (as in Filament) the parent is hidden while this one is open and comes back when it closes |

### Extra submit buttons

`makeModalSubmitAction()` builds a footer button that submits the modal's form and runs the action itself, with extra arguments:

```php
Action::make('edit')
    ->schema([TextInput::make('title')->required()])
    ->extraModalFooterActions(fn (Action $action): array => [
        $action->makeModalSubmitAction('saveAndPublish', arguments: ['publish' => true])->label('Save & publish'),
    ])
    ->action(function (array $data, array $arguments): void {
        // $arguments['publish'] is true when "Save & publish" was clicked
    });
```

### Reading and writing the parent's data

While a nested action runs, the browser sends the forms of the modals it was opened from. Inject `array $mountedActions` (outermost first, ending with the running action) or call `getParentAction()`:

```php
Action::make('suggestSlug')
    ->action(function (Action $action): void {
        $parent = $action->getParentAction();

        $raw = $parent->getRawData();            // what the user typed so far, unvalidated
        $data = $parent->getValidatedData();     // validated with the parent's rules; errors show in the parent modal

        $parent->fillData(['slug' => Str::slug($data['title'])]); // written into the open parent form
    });
```

`getValidatedData()` skips dehydration hooks, `mutateFormDataUsing()` and the form-validated hooks. `fillData()` only writes keys of fields in the parent form (dot notation reaches nested fields); the values are validated with the parent's rules when it is submitted.

### Chaining actions

`$action->replaceMountedAction('confirm', ['step' => 2])` inside `action()` closes this modal and opens the named action of the same owner (same record and parents) in its place, or runs it straight away when it has no modal.

Nested actions are addressed by their path from the outermost action (`edit>preview`). `registerModalActions([...])` adds actions that are resolvable from the modal without a footer button (for custom modal content that triggers them through the action runner with `parents: ['edit']`).

## Multi-factor challenge

`MultiFactorChallenge::make()` asks the signed-in user for a second factor in the modal ("sudo mode"): an authenticator code, an emailed code (sent when the modal opens) or a recovery code. The code is verified on the server while the form is validated, so the action only runs after a correct code. Attempts share the sign-in challenge's rate limit (five per five minutes).

```php
use AlfaSix\Alfakit\Auth\MultiFactor\MultiFactorChallenge;

Action::make('deleteAccount')
    ->color('danger')
    ->requiresConfirmation()
    ->schema([MultiFactorChallenge::make()])
    ->action(fn () => auth()->user()->delete());
```

The fields are nested under `multiFactorChallenge` and never reach `$data`. A user without a second factor can't pass the challenge; check `MultiFactorChallenge::make()->hasEnabledProviders($user)` (for example in `visible()`) when the action should work for them another way. Passing the challenge doesn't authorise anything: keep authorising the action itself.

## Password confirmation

`requiresPasswordConfirmation()` asks for the user's current password in the modal before the action runs. A correct password is remembered in the session (`auth.password_confirmed_at`, the key Laravel's `password.confirm` middleware uses) for `auth.password_timeout` seconds, or for the minutes you pass; `0` asks every time. Wrong passwords are throttled (five attempts a minute).

```php
Action::make('rotateApiKey')
    ->requiresPasswordConfirmation(rememberForMinutes: 5)
    ->action(fn (Team $record) => $record->rotateApiKey());
```
