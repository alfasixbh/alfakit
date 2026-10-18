---
title: Form layout
description: Sections, grids, tabs, wizards and prime components.
---

# Form layout

Layout components hold other components (`->schema([...])`) and are grids themselves (`->columns()`).

## Section

```php
Section::make('Pricing')
    ->description('How this product is sold')
    ->icon('tag')
    ->collapsible()->collapsed()
    ->aside()                // heading beside the content
    ->compact()
    ->headerActions([Action::make('recalculate')->action(...)])
    ->afterHeader([Text::make('Beta')->badge(), Action::make('help')->iconButton()->icon('circle-help')])
    ->footerActions([...])
    ->footerActionsAlignment(Alignment::End)
    ->footer([Text::make('Prices include VAT'), Action::make('preview')])
    ->secondary()            // a muted background, for less important sections
    ->schema([...])
    ->columns(2);
```

Sections span the full width by default. `afterHeader()` takes actions and other components (strings become `Text`) and places them at the end of the header; its actions run through the action endpoint like `headerActions()`. `footer()` does the same in the footer, after any `footerActions()`.

`headerActions()` and `footerActions()` also take an `ActionGroup`, shown as a dropdown; the actions inside it run like the others (the same goes for `Callout::actions()` / `controlActions()` and `EmptyState::actions()`):

```php
use AlfaSix\Alfakit\Actions\ActionGroup;

Section::make('Pricing')
    ->headerActions([
        Action::make('recalculate')->action(...),
        ActionGroup::make([Action::make('export')->action(...), Action::make('archive')->action(...)]),
    ])
    ->schema([...]);
```

### Deferred loading

`deferLoading()` leaves a layout component's children out of the page's first response. The browser shows a skeleton and loads them in a follow-up request once the skeleton scrolls into view, so an expensive section doesn't slow the page down:

```php
Section::make('Statistics')
    ->deferLoading()
    ->schema(fn () => [/* components with slow queries */]);

Tabs::make()->tabs([
    Tab::make('Details')->schema([...]),
    Tab::make('History')->deferLoading()->schema([...]),  // loads when the tab is opened
]);
```

- It works on `Section`, `Fieldset`, `Group`, `Grid`, `Tabs` / `Tab` and `Wizard` / `Step`, in forms and infolists. On `Tabs` and `Wizard` it defers every tab or step; a tab or step can defer itself.
- A collapsed section or an inactive tab loads when it is opened and scrolled into view; a deferred schema whose fields have validation errors loads right away.
- The form state of the fields inside is sent with the page as usual, so saving, validation and `$get()` work before the schema has loaded. Live fields inside work once it has.
- Only the page's first render defers: live updates, partial reloads and action modals render the children in full. Server-side rendering renders the skeleton.
- Give the component a `key()` (the request addresses it by key) when its siblings share a type and position might change. `deferLoading()` accepts a closure.

### Remembering the collapsed state

`persistCollapsed()` keeps a collapsible section open or closed after a page refresh, in the browser's local storage. The key comes from the section's heading; set an `id()` when headings repeat:

```php
Section::make('Cart')->id('order-cart')->collapsible()->persistCollapsed();
```

The server renders the schema's default (`collapsed()` or open) and the stored state is applied after the page mounts, so server-side rendering and hydration match. It accepts a closure (`persistCollapsed(fn () => Feature::active('remember'))`).

### Heading levels

Top-level section headings are `h2` (the page title is the `h1`) and every nested section goes one level deeper. Change the starting level for a whole schema, for the sections inside a layout component, or set one section's level:

```php
$schema->rootHeadingLevel(3);                    // every top-level section is an h3
Group::make([...])->rootHeadingLevel(3);         // sections inside start at h3
Section::make('Notes')->headingLevel(4);         // this section (and h5 for its children)
```

Levels stop at `h6`. Older renderers that receive no level keep rendering `h3`.

A section with a nested grid, and a collapsed section:

```alfakit-example name="layout-section-grid"

```

## Grid and Group

```php
Grid::make(['default' => 1, 'lg' => 3])->schema([...]);
Group::make([...])->columnSpan(2);
Group::make([TextInput::make('street'), TextInput::make('city')])->statePath('address'); // nests state
```

## Column span and start

`columnSpan()` and `columnStart()` place a component in its parent grid. Like the grid's own `columns(3)`, a number applies from the `lg` breakpoint up, so on phones (where grids are one column) components stack; `'full'` applies at every size, and a breakpoint map is used as given:

```php
Grid::make(3)->schema([
    TextInput::make('title')->columnSpan(2),             // 2 of 3 columns from lg up
    TextInput::make('sku')->columnStart(3),              // third column from lg up
    Textarea::make('notes')->columnSpanFull(),           // full width everywhere
    TextInput::make('code')->columnSpan(['default' => 2, 'md' => 1]), // explicit breakpoints
]);
```

> **Upgrading:** before this release a number applied at every size (`['default' => n]`). Pass `['default' => n]` to keep a component spanning columns on phones.

`columnOrder()` changes where a component appears without changing the schema's order (CSS `order`, 1–12). A number applies at every size; pass a breakpoint map to reorder per breakpoint, or a closure:

```php
Grid::make(2)->schema([
    TextInput::make('first')->columnOrder(2),                        // shown second
    TextInput::make('second')->columnOrder(['default' => 1, 'lg' => 3]),
    TextInput::make('third')->columnOrder(fn () => 1),
]);
```

Keyboard and screen-reader order still follow the schema, so reorder only when the visual order is a layout choice.

## Spacing

`dense()` halves the gap between a layout component's children; `gap(false)` removes it. Both work on `Grid`, `Group`, `Section`, `Fieldset`, `Flex`, tabs and wizard steps:

```php
Fieldset::make('Dimensions')->dense()->schema([...]);
Grid::make(3)->gap(false)->schema([...]);
```

## Inline labels

`inlineLabel()` puts a field's or entry's label beside its control from the `sm` breakpoint up (one third of the width for the label); on phones the label stays above. Set it on a field, on a layout component (`Section`, `Grid`, `Fieldset`, tabs, wizard steps…) or on the whole schema; children inherit it, and their own setting wins:

```php
public static function form(Schema $schema): Schema
{
    return $schema->inlineLabel()->components([
        TextInput::make('name'),
        Section::make('Address')->inlineLabel(false)->schema([
            TextInput::make('street'),                        // stacked label
            TextInput::make('city')->inlineLabel(),           // inline again
        ]),
    ]);
}
```

It accepts a closure, and works the same in infolists (`TextEntry::make('email')->inlineLabel()`). The layout uses the text direction, so the label is on the right in right-to-left locales.

## Fieldset

A bordered group with a legend: `Fieldset::make('Dimensions')->schema([...])`. `contained(false)` removes the border and padding and keeps the legend as a heading.

## Relationships

`Group`, `Fieldset` and `Section` (and tabs and wizard steps) can edit a single related record (`HasOne`, `MorphOne`, `BelongsTo` or `MorphTo`) instead of attributes of the form's record:

```php
Section::make('SEO')
    ->relationship('seo')
    ->schema([
        TextInput::make('meta_title')->required()->unique(ignoreRecord: true),
        Textarea::make('meta_description'),
    ]);

Fieldset::make('Address')
    ->relationship('address', condition: fn (array $state): bool => filled($state['street'] ?? null))
    ->schema([TextInput::make('street'), TextInput::make('city')]);
```

On a `MorphTo`, the children edit whichever record the owner points at. Pass `relatedModel:` so a record can be created (and associated) when the owner points at none:

```php
Section::make('Attachment')
    ->relationship('attachable', relatedModel: Image::class)
    ->schema([TextInput::make('url')->required()]);
```

- The children's state lives under the relationship name (`seo.meta_title`), filled from the related record (only the attributes the fields read).
- Fields are validated with the rest of the form, but their values are left out of the owner's data. After the owner is saved, the related record is updated, or created (and associated, for `BelongsTo`) when it doesn't exist; on tenant panels a new record is owned by the current tenant.
- Inside, `$record` is the related record, and `unique()`, `exists()` and relationship fields use the related table.
- With `condition`, the related record is only saved when the closure returns true for the children's `$state`; when it returns false, an existing `HasOne` / `MorphOne` record is deleted and a `BelongsTo` is dissociated.
- `mutateRelationshipDataBeforeFillUsing()`, `mutateRelationshipDataBeforeCreateUsing()` and `mutateRelationshipDataBeforeSaveUsing()` receive `$data` (and `$record`) and return the data to use.
- A hidden or disabled relationship component isn't saved. Relationship components inside repeater items aren't supported; use a relationship repeater for the items instead.
- In infolists, entries inside a relationship component read the related record.

## Tabs

```php
Tabs::make()->tabs([
    Tab::make('Content')->icon('file-text')->iconPosition(IconPosition::After)->schema([...]),
    Tab::make('SEO')->badge('3')->badgeColor('danger')->badgeTooltip('Issues')->schema([...]),
    Tab::make('Orders')->badge(fn (?Customer $record) => $record?->orders()->count())->deferBadge()->schema([...]),
])->persistTabInQueryString('tab')->contained()->vertical();
```

- `deferBadge()` loads the badge (with its colour and tooltip) in a request after the page renders, for badges that run slow queries.

- `scrollable(false)` wraps the tab list onto more lines instead of scrolling it sideways, so every tab stays visible.
- `persistTab()` remembers the active tab in the browser under the tabs' `id()` (or key): local storage by default, `persistTab(storage: 'session')` for session storage. A tab in the query string (`persistTabInQueryString()`) wins, and the stored tab is applied after the page mounts.

```php
Tabs::make('Order')->id('order-tabs')->persistTab()->scrollable(false)->tabs([...]);
```

Tabs with icons:

```alfakit-example name="layout-tabs"

```

## Wizard

```php
Wizard::make([
    Step::make('Account')->description('Credentials')->schema([...]),
    Step::make('Profile')->schema([...]),
])->startOnStep(1)->skippable()->submitActionLabel('Finish')->nextActionLabel('Continue')->previousActionLabel('Back');
```

Next validates the current step on the server (only that step's fields, with `beforeValidation()` and `afterValidation()` hooks on the `Step`) and stays on the step when it has errors. The whole form is validated again on submit, and the wizard jumps to the first step with an error. `skippable()` lets users jump between steps without validating them.

Customise the buttons and the step indicator:

```php
use AlfaSix\Alfakit\Actions\Action;
use Illuminate\Support\HtmlString;

Wizard::make([
    Step::make('Cart')->icon('shopping-cart')->completedIcon('badge-check')->schema([...]),
    Step::make('Payment')->schema([...]),
])
    ->nextAction(fn (Action $action) => $action->label('Continue')->icon('arrow-right', 'after'))
    ->previousAction(fn (Action $action) => $action->color('gray'))
    ->completedIcon('circle-check')
    ->persistStepInQueryString('checkout-step')
    ->submitAction(new HtmlString('<button type="submit" class="...">Place order</button>'));
```

- `nextAction()` / `previousAction()` receive the `Action` used for the button (named `next` / `previous`) and may return it or change it in place. Its label, icon, colour, size, tooltip and visibility are used; the button still validates and changes the step (`->hidden()` removes it).
- `submitAction()` replaces the `submitActionLabel()` text on the last step. Pass an `Action` to render a button that runs through the action endpoint like a section header action (hidden or unauthorised actions are not shown and cannot run), or `Htmlable` markup, e.g. a `<button type="submit">` that submits the surrounding form. On create and edit pages the page's own Save button keeps working too.
- `completedIcon()` replaces the check mark of completed steps; `Step::completedIcon()` overrides it per step.
- `persistStepInQueryString()` keeps the current step (1-based) in the URL under `step`, or under the key you pass, so a reload or a shared link opens on it. `startOnStep()` sets the first step otherwise.
- `goToStep('payment')` moves the browser to a step from the server, by the step's `key()` or the slug of its label. Call it in a live field's `afterStateUpdated()` or a schema action inside the wizard; the step changes when the form state comes back. A wizard that is not `skippable()` only moves back (or stays), never ahead:

```php
Wizard::make([
    Step::make('Cart')->key('cart')->schema([
        TextInput::make('coupon')->live()->afterStateUpdated(function (TextInput $component): void {
            $component->getContainer()->getRootSchema()->getComponent('checkout')?->goToStep('cart');
        }),
    ]),
    Step::make('Payment')->key('payment')->schema([...]),
])->key('checkout');
```

## Flex

`Flex` puts its children side by side and lets them share the width. Below the `from()` breakpoint they stack. `grow(false)` keeps a child at its natural width:

```php
use AlfaSix\Alfakit\Schemas\Components\Flex;

Flex::make([
    Section::make('Post')->schema([TextInput::make('title'), RichEditor::make('body')]),
    Section::make('Publishing')->schema([Toggle::make('is_published'), DatePicker::make('published_at')])->grow(false),
])->from('md')->verticallyAlignStart();
```

`verticalAlignment()` (or `verticallyAlignStart()`, `verticallyAlignCenter()`, `verticallyAlignEnd()`) aligns the children once they are in a row. `alignment(Alignment::End)` (or `alignStart()`, `alignCenter()`, `alignEnd()`, `alignBetween()`, `alignJustify()`) aligns them horizontally, which shows when they keep their natural width with `grow(false)`; `start` and `end` follow the text direction. `Split` is the Filament v3 name and works the same.

## Actions

`Actions` places a row of buttons anywhere in a form or infolist, for actions that belong to no single field:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Schemas\Components\Actions;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Support\Enums\Alignment;
use AlfaSix\Alfakit\Support\Enums\VerticalAlignment;

Grid::make(2)->schema([
    TextInput::make('rating'),
    Actions::make([
        Action::make('star')->icon('star')->action(fn (Set $set) => $set('rating', 5)),
        Action::make('reset')->color('danger')->action(fn (Set $set) => $set('rating', null)),
    ])->verticalAlignment(VerticalAlignment::End),
]);

Actions::make([...])->alignment(Alignment::Center)->fullWidth();
```

The actions run through the action endpoint like a field's [suffix actions](field-actions): `$get` and `$set` read and write the surrounding form, `$record` is the form's record, and the refreshed form comes back without a page visit. That works in page forms and infolists, in standalone forms and inside action modals. `ActionGroup`s are allowed; hidden or unauthorised actions are not rendered and cannot run, and a disabled `Actions` component shows its buttons disabled.

- `alignment()` takes `Alignment::Start` (default), `Center`, `End`, `Between` or `Justify` (buttons share the width); `alignStart()`, `alignCenter()`, `alignEnd()`, `alignBetween()` and `alignJustify()` are shortcuts.
- `verticalAlignment()` (`VerticalAlignment::Start`, `Center`, `End`) positions the row in its grid cell, e.g. at the bottom to line up with the inputs beside it.
- `fullWidth()` stretches the buttons to share the full width.

Give the component a `key()` when its position in the schema changes at runtime; the browser addresses it by key.

## FusedGroup

`FusedGroup` joins fields into one control with a shared border and no gaps, e.g. a country code and a phone number:

```php
use AlfaSix\Alfakit\Schemas\Components\FusedGroup;

FusedGroup::make([
    Select::make('country_code')->options(['+973' => '+973', '+966' => '+966'])->placeholder('Code'),
    TextInput::make('phone')->tel()->placeholder('Number')->columnSpan(2),
])
    ->label('Phone')
    ->columns(3);
```

- Each field gets its own row by default; `columns()` places them side by side (an integer applies from `lg` up, or pass a breakpoint map) and `columnSpan()` on a child sets its width.
- The children's labels become screen-reader text, so give them placeholders; their helper texts are not shown. Validation errors of the children are listed below the group, and the group's border turns red.
- Fused fields work best with inputs that have a border of their own: text inputs, selects, date pickers. The children's state, validation and saving are unchanged.

## Container-query columns

Columns normally follow the browser width (`sm`, `md`, `lg`, `xl`, `2xl`). Prefix a breakpoint with `@` to follow the width of the surrounding container instead, which is what you want for a grid inside a narrow section, a modal or a `Flex` column:

```php
Grid::make(['default' => 1, '@md' => 2, '@xl' => 3])->schema([...]);

TextInput::make('notes')->columnSpan(['@md' => 2]);
```

The container sizes are Tailwind's: `@3xs`, `@2xs`, `@xs`, `@sm` (24rem), `@md` (28rem), `@lg` (32rem), `@xl` (36rem), `@2xl` … `@7xl`. The grid gets an `@container` wrapper (`data-slot="schema-container"`) automatically; `@`-prefixed `columnSpan()` values follow the same container. Viewport and container keys can be mixed.

## Prime components

| Component                                                                                          | Purpose                                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Placeholder::make('created_at')->content(fn ($record) => $record?->created_at?->diffForHumans())` | Labelled read-only value                                                                  |
| `Text::make('Draft')->badge()->color('warning')->icon('pencil')`                                   | Styled text; see [Text](#text)                                                            |
| `Html::make('<p>…</p>')`                                                                           | Raw HTML; strings are sanitised, `HtmlString` is trusted                                  |
| `View::make('map-picker')->props([...])`                                                           | A custom frontend component — see [Custom components](../adapters/custom-components)      |
| `Callout::make('Payment overdue')->description('Pay before Friday.')->warning()->actions([...])`   | A highlighted message; `danger()`, `info()`, `success()`, `warning()` set colour and icon |
| `EmptyState::make('No orders yet')->description('…')->icon('shopping-cart')->actions([...])`       | A placeholder for missing content; `contained(false)` drops the dashed border             |
| `Icon::make('star')->color('warning')->size('lg')->tooltip('Featured')`                            | A single icon (`size()` takes `xs` … `xl` and `2xl`, or `Size::TwoExtraLarge`)            |
| `Image::make(asset('chart.png'), 'Sales chart')->imageHeight('12rem')->alignCenter()`              | An image; `imageWidth()`, `imageSize()`, `circular()`, `tooltip()`                        |
| `UnorderedList::make(['Unlimited projects', Text::make('Priority support')->weight('bold')])`      | A bulleted list; strings become `Text` items, `size('xs'…'lg')`                           |

Descriptions of `Callout` and `EmptyState` are rendered as HTML: plain strings are escaped, pass an `HtmlString` for trusted markup. Their `actions()` run through the action endpoint like section header actions. `footer()` takes actions and other components (strings become `Text`) shown under the description, after `actions()`:

```php
EmptyState::make('No orders yet')
    ->actions([Action::make('create')])
    ->footer([Text::make('or')->color('neutral'), Action::make('import')->link()]);
```

> **Upgrading:** `EmptyState::footer()` used to be an alias of `actions()`. Actions passed to it now render in the footer row (after `actions()`), and it also accepts components.

A callout coloured by a status (`danger()`, `warning()`, `info()`, `success()`) keeps its status icon colour after `color(null)` removes the background, and danger and warning callouts keep `role="alert"`. `iconColor()` sets the icon's colour on its own:

```php
Callout::make('Payment overdue')->danger()->color(null);          // no background, red icon
Callout::make('Tip')->info()->iconColor('warning');
```

Callouts also take an icon size, an alignment for their footer actions, and controls in the top end corner (actions and components), such as a dismiss button:

```php
Callout::make('New dashboard')
    ->info()
    ->iconSize('sm')                                   // sm, md or lg (default)
    ->actions([Action::make('tour')])
    ->footerActionsAlignment(Alignment::End)           // start, center, end, between
    ->controls([Text::make('Beta')->badge()])
    ->controlActions([
        Action::make('dismiss')->iconButton()->icon('x')->label(__('Dismiss'))
            ->action(fn () => auth()->user()->update(['dismissed_tour' => true])),
    ])
    ->visible(fn () => ! auth()->user()->dismissed_tour);
```

### Text

```php
Text::make('ORD-1042')
    ->color('neutral')            // the regular text colour (a gray badge with `badge()`)
    ->size('sm')->weight('medium')
    ->fontFamily('mono')          // sans, serif or mono
    ->tooltip('Order number')
    ->copyable(copyMessage: 'Copied!', copyMessageDuration: 1500);
```

`copyable()` adds a button that copies the text; the confirmation is announced to screen readers.

Infolist entries (`TextEntry`, `IconEntry`, …) can also be mixed into forms to show read-only data.
