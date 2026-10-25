---
title: Kanban
description: Kanban boards for any Eloquent model, as resource pages and dashboard widgets, with drag and drop, keyboard moves, WIP limits, transitions and swimlanes.
---

# Kanban

`alfasix/alfakit-kanban` shows records as cards in columns that users rearrange by dragging (mouse, pen or touch) or with the keyboard. Every move is one authorised request that the server validates: the record, the user's `update` ability, the target column, the allowed transitions, WIP limits, the swimlane and the tenant. It provides a `KanbanPage` for resources and a `KanbanWidget` for dashboards.

The board renders in React, Vue and Svelte (registry key `kanban`) with no extra JavaScript dependencies. Moves are optimistic: the card moves at once and returns, with the server's reason, when the move is refused. The board works right to left and is announced to screen readers.

**Works in** an [admin panel](../getting-started/installation) and a [starter kit](../getting-started/starter-kits) panel (`KanbanWidget` also shows on the app's own `/dashboard`), and `KanbanWidget` works [outside panels](../standalone/component-kit#kanban-boards-and-calendars) in a `Standalone\Widgets` component with `KanbanPlugin::class` in `alfakit.standalone.plugins`.

## Installation

```bash
composer require alfasix/alfakit-kanban
```

Register the plugin to share the board's translations with the frontend (boards work without it, in English):

```php
use AlfaSix\AlfakitKanban\KanbanPlugin;

$panel->plugin(KanbanPlugin::make());
```

No migration is needed: the board reads a status column (or a `BelongsTo` relationship) and, to keep cards in order within a column, an integer order column on your table. The board orders by a `sort` column by default; on a table without one, set `protected static ?string $orderAttribute = null;` on the page (cards then keep key order), or the board fails with "no such column: sort":

```php
Schema::table('tasks', function (Blueprint $table): void {
    $table->string('status')->default('todo');
    $table->integer('sort')->nullable();
});
```

## A board page

`KanbanPage` is a resource page. Register it in the resource's pages, as the index or next to the table:

```php
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitKanban\Pages\KanbanPage;

class TaskBoard extends KanbanPage
{
    protected static string $resource = TaskResource::class;

    protected static ?string $statusEnum = TaskStatus::class;

    protected static ?string $orderAttribute = 'sort';

    protected static ?string $descriptionAttribute = 'summary';

    protected static ?string $dueDateAttribute = 'due_at';

    public function getFormSchema(): array
    {
        return [
            TextInput::make('title')->required(),
            Select::make('status')->options(TaskStatus::class)->required(),
            DatePicker::make('due_at'),
        ];
    }
}

```

```php
// TaskResource
public static function getPages(): array
{
    return [
        'index' => ListTasks::route('/'),
        'board' => TaskBoard::route('/board'),
    ];
}
```

Registered next to the table, the board has no link of its own: the sidebar opens the resource's index. Add a header action to the list page so users can click through to it (the board's breadcrumbs lead back to the list):

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;

// ListTasks
protected function getHeaderActions(): array
{
    return [
        Action::make('board')->label('Board')->icon('kanban')->color('gray')
            ->url(TaskResource::getUrl('board')),
        CreateAction::make(),
    ];
}
```

Registered as `'index'`, the board is what the sidebar link opens.

The cards come from the resource's query, so tenancy, global scopes and nested resources apply, and the user needs the resource's `viewAny` ability. With `getFormSchema()` the page has a create action in its header, every column a **+** button that opens the same modal with the column filled in, clicking a card opens a view modal and every card has a menu with view, edit and delete. Without fields, view and edit open the resource's pages when it has them. `content()` components are shown below the board.

The page is titled after the board, "Tasks board" (the resource's plural model label with the translated `alfakit-kanban::kanban.page.title`), with the resource list in the breadcrumbs before it; its navigation label (in a cluster's or record's sub-navigation) is the same. Set `protected static ?string $title = 'Sprint board';` (and `$navigationLabel` for the sub-navigation) to name it yourself.

## A board widget

`KanbanWidget` shows a board on a dashboard or any page with widgets:

```php
use AlfaSix\AlfakitKanban\Widgets\KanbanWidget;
use App\Enums\TicketStatus;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Builder;

class SupportBoard extends KanbanWidget
{
    protected static ?string $model = Ticket::class;

    protected static ?string $statusEnum = TicketStatus::class;

    protected ?string $heading = 'Support';

    public function getKanbanQuery(): ?Builder
    {
        return parent::getKanbanQuery()?->where('team_id', auth()->user()->team_id);
    }
}
```

`$model` names the model (its query is scoped to the current tenant through the panel's tenant ownership relationship), or `$resource` uses a resource's query, policies and pages. Override `getKanbanQuery()` to narrow the records. Widgets span the full width and load lazily by default (`protected static bool $isLazy = false;` renders them with the page).

## Columns

Columns come from one of three sources.

**A backed enum.** Each case is a column, with the label, colour, icon and description of `HasLabel`, `HasColor`, `HasIcon` and `HasDescription`:

```php
use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum TaskStatus: string implements HasColor, HasIcon, HasLabel
{
    case Todo = 'todo';
    case Doing = 'doing';
    case Done = 'done';

    public function getLabel(): string { return str($this->name)->headline(); }
    public function getColor(): string { return match ($this) { self::Done => 'success', default => 'gray' }; }
    public function getIcon(): string { return match ($this) { self::Done => 'circle-check', default => 'circle' }; }
}

```

```php
// TaskBoard
protected static ?string $statusEnum = TaskStatus::class;
protected static string $statusAttribute = 'status';
```

**A relationship.** The related records of a `BelongsTo` relationship are the columns (a `stages` table); the status attribute is its foreign key. The related query is scoped to the current tenant when the related model belongs to one:

```php
protected static ?string $columnRelationship = 'stage';
protected static string $columnRelationshipTitleAttribute = 'name';
protected static ?string $columnRelationshipOrderAttribute = 'position';

protected function makeColumnFromRelatedRecord(Model $related): Column
{
    return parent::makeColumnFromRelatedRecord($related)
        ->color($related->color)
        ->wipLimit($related->wip_limit, strict: true);
}
```

**A method or closure.** Override `getColumns()`, or call `columnsUsing()` with a closure (on a widget, for example in `SupportBoard::configureUsing()`). Return `Column`s, enum cases or plain values:

```php
use AlfaSix\AlfakitKanban\Column;

protected function getColumns(): array
{
    return [
        Column::make('backlog')->label('Backlog')->collapsed(),
        Column::make('todo')->label('To do')->icon('list-todo'),
        Column::make('doing')->label('In progress')->color('info')->wipLimit(3, strict: true),
        Column::make('review')->label('Review')->color('warning')->wipLimit(5),
        Column::make('done')->label('Done')->color('success')->collapsible()->creatable(false),
    ];
}
```

Columns built from an enum can be adjusted with `parent::getColumns()`: it returns `Column`s.

| `Column` method                                 | Does                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make(string\|int\|BackedEnum $value)`          | The status value of the column's cards                                                                                                                  |
| `fromEnum(UnitEnum $case)`                      | A column with the case's label, colour, icon and description                                                                                            |
| `label()`, `description()`, `icon()`, `color()` | How the column looks. Colours are theme colours (`primary`, `success`, `warning`, `danger`, `info`, `gray`), panel colours or plain CSS colours         |
| `wipLimit(?int $limit, bool $strict = false)`   | The most cards the column should hold. Over the limit the header turns red; with `strict` the server refuses moves and quick creates into a full column |
| `collapsible()` / `collapsed()`                 | The user can collapse the column to a narrow strip / it starts collapsed                                                                                |
| `creatable(bool)`                               | Whether the column has the quick-create button (default `true`)                                                                                         |
| `emptyStateLabel(?string)`                      | The text of an empty column (default "No cards")                                                                                                        |

Every method also takes a closure. Cards whose status matches no column are not shown.

## Cards

By default a card shows its title (the resource's record title, else `$titleAttribute`, else `title`) and the attributes you name:

```php
protected static ?string $titleAttribute = 'title';
protected static ?string $descriptionAttribute = 'summary';
protected static ?string $dueDateAttribute = 'due_at';
protected static ?string $progressAttribute = 'progress';   // 0–100
protected static ?string $coverImageAttribute = 'cover_url';
protected static array $with = ['assignees', 'labels'];     // eager loads
```

Override `getCard()` for badges, assignees and anything computed:

```php
use AlfaSix\AlfakitKanban\Card;
use AlfaSix\AlfakitKanban\CardAssignee;
use AlfaSix\AlfakitKanban\CardBadge;

public function getCard(Model $record): Card
{
    return parent::getCard($record)
        ->color($record->priority === 'urgent' ? 'danger' : null)
        ->badges([
            CardBadge::fromEnum($record->priority),
            ...$record->labels->map(fn (Label $label) => CardBadge::make($label->name)->color($label->color))->all(),
        ])
        ->assignees($record->assignees->map(fn (User $user) => CardAssignee::make($user->name)->avatar($user->avatar_url))->all())
        ->dueDate($record->due_at)
        ->overdue($record->due_at?->isPast() && $record->status !== TaskStatus::Done)
        ->progress($record->checklist_progress)
        ->coverImage($record->cover_url, alt: $record->title);
}
```

| `Card` method                            | Does                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `title()`, `description()`               | Plain text (the description is clamped to three lines)                                             |
| `color()`                                | An accent colour on the card's edge                                                                |
| `badges(array)`                          | `CardBadge`s, enum cases or strings; `CardBadge::make($label)->color()->icon()->tooltip()`         |
| `assignees(array)`                       | `CardAssignee`s or names, shown as avatars (initials without an image), three at most plus a count |
| `dueDate()`                              | A date shown in the panel's locale and timezone; a past date marks the card overdue                |
| `overdue(?bool)`                         | Overrides the overdue state                                                                        |
| `progress(int\|float\|null)`             | A progress bar, 0–100                                                                              |
| `coverImage(?string $url, ?string $alt)` | An image on top of the card (URLs are sanitised)                                                   |

For anything else, `getCardSchema()` returns infolist entries filled from the card's record:

```php
use AlfaSix\Alfakit\Infolists\Components\TextEntry;

public function getCardSchema(): array
{
    return [
        TextEntry::make('customer.name')->hiddenLabel()->icon('building-2'),
        TextEntry::make('estimate')->label('Estimate')->suffix(' h')->inlineLabel(),
    ];
}
```

### Card actions

Clicking a card (or Enter on a focused card) opens the view action, else the edit action; with a resource page and no form it navigates to the record's page. The menu on each card comes from `getCardActions()`, which receives the card's record like a table's record actions:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;

protected function getCardActions(): array
{
    return [
        ActionGroup::make([
            EditAction::make()->schema(fn (): array => $this->getFormSchema()),
            Action::make('archive')
                ->icon('archive')
                ->requiresConfirmation()
                ->visible(fn (Task $record): bool => $record->status === TaskStatus::Done)
                ->action(fn (Task $record) => $record->archive()),
            DeleteAction::make(),
        ]),
    ];
}
```

`hasViewAction()`, `hasEditAction()`, `hasDeleteAction()` and `hasQuickCreate()` turn the defaults off; `getCardClickActionName()` picks the action a click opens. Visibility and authorisation are checked per card, and records are resolved within the board's query.

### Quick create

With `getFormSchema()`, each column's **+** button opens `makeKanbanCreateAction()`: the create modal with the column's status (and lane) filled in. If the form has no status field, the record gets the column anyway; a new card goes to the end of its column. A full strict column has no button, and the server refuses creating into it.

## Moving cards

Users move a card by:

- dragging it with a mouse or pen, or after a short press with a finger (a quick swipe scrolls the board); the board scrolls near its edges and Escape cancels;
- focusing it, pressing Space to pick it up, the arrow keys to move it and Space (or Enter) to drop it, or Escape to put it back.

The board never offers a move the server would refuse: locked cards don't pick up, refused columns are skipped by the keyboard and outlined while dragging. Each drop sends one request with the target column, lane and the neighbouring card; the server re-checks everything, writes the status (and lane) and renumbers the column's order, in one transaction.

| Property or method                                    | Default                 | Does                                                                                             |
| ----------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `$orderAttribute` / `getOrderAttribute()`             | `'sort'`                | The order column within a column; `null` keeps cards in key order and only moves between columns |
| `canMoveCards()`                                      | `true`                  | Whether the user may move cards on this board                                                    |
| `canMoveCard(Model $record)`                          | the `update` ability    | Whether the user may move this card (resource or model policy)                                   |
| `getTransitions()`                                    | `null` (every move)     | The columns each column's cards may move to                                                      |
| `canMoveTo(Column $from, Column $to, ?Model $record)` | from `getTransitions()` | Rules that need the record                                                                       |
| `beforeCardMoved(KanbanMove $move)`                   | —                       | Throw a `ValidationException` to refuse a move with a message                                    |
| `saveCardMove(KanbanMove $move)`                      | writes the attributes   | How a move is saved (inside a transaction); override to call your own service                    |
| `afterCardMoved(KanbanMove $move)`                    | —                       | Runs after a move was saved, before the `CardMoved` event                                        |

```php
protected function getTransitions(): ?array
{
    return [
        'todo' => ['doing'],
        'doing' => ['todo', 'review'],
        'review' => ['doing', TaskStatus::Done],
        'done' => [],
    ];
}

public function canMoveTo(Column $from, Column $to, ?Model $record = null): bool
{
    // `$record` is null while the board is drawn, so the column stays offered; the
    // server checks the moved card.
    if ($record !== null && $to->getKey() === 'done' && $record->checklist_progress < 100) {
        return false;
    }

    return parent::canMoveTo($from, $to, $record);
}

protected function afterCardMoved(KanbanMove $move): void
{
    if ($move->changesColumn()) {
        Notification::make()->success()->title("Moved to {$move->to->getLabel()}")->send();
    }
}
```

`KanbanMove` holds the `record`, the `from` and `to` columns, `fromLane` / `toLane`, `toLaneValue` and the card's `position` in its new column, with `changesColumn()` and `changesLane()`. After every saved move the board dispatches `AlfaSix\AlfakitKanban\Events\CardMoved` (`$event->move`, `$event->board`):

```php
Event::listen(CardMoved::class, function (CardMoved $event): void {
    activity()->performedOn($event->move->record)->log("Moved to {$event->move->to->getLabel()}");
});
```

The record is refused (403) without the `update` ability, not found (404) outside the board's query, and refused (422, with the reason shown to the user) for an unknown column, a forbidden transition, a full strict column, a lane change the board doesn't allow, or a neighbour that moved meanwhile. The card then returns to where it was picked up.

## Swimlanes

Group the cards into rows by a second attribute:

```php
protected static ?string $swimlaneRelationship = 'assignee';  // a BelongsTo
protected static string $swimlaneRelationshipTitleAttribute = 'name';
protected static bool $canMoveBetweenSwimlanes = true;
```

or by a plain attribute (`$swimlaneAttribute = 'priority'`, labelled by `$swimlaneEnum`). Rows are built from the cards on the board, sorted by label, with cards without a value last ("Unassigned"); override `getSwimlanes()` to return an explicit list of `Swimlane::make($value)->label()->avatar()->icon()->collapsed()`. Rows collapse. With `$canMoveBetweenSwimlanes`, dragging a card to another row changes its swimlane attribute; the server only accepts rows that exist (related records within the tenant, enum cases, or values other cards have). WIP limits count the whole column.

## Search, filters and polling

```php
protected static array $searchableAttributes = ['title', 'summary'];
protected static ?string $pollingInterval = '15s';
protected static ?int $cardsPerColumn = 50;

protected function getKanbanFilters(): array
{
    return [
        SelectFilter::make('priority')->options(Priority::class),
        SelectFilter::make('assignee')->relationship('assignee', 'name')->searchable()->preload(),
        Filter::make('mine')->query(fn (Builder $query) => $query->whereBelongsTo(auth()->user(), 'assignee')),
    ];
}
```

- `$searchableAttributes` shows a search box; the board is filtered on the server (`LIKE` with wildcards escaped, case-insensitive on PostgreSQL). Override `applyKanbanSearch()` for full-text search.
- `getKanbanFilters()` takes the table filters (`SelectFilter`, `TernaryFilter`, `Filter`…), shown in a popover; their `query()` closures and defaults work as on tables. Searchable selects load their options on board pages; on widgets give them `preload()` or static options.
- `$pollingInterval` refreshes the board while the tab is visible (never during a drag or a save).
- `$cardsPerColumn` loads at most that many cards per column; the header still counts them all and the column shows "+N more".

Searching, filtering and polling go through the board's fetch action, which applies the same query, scopes and authorisation as the page.

## Keyboard and screen readers

The board is a labelled region; each column and row is a labelled list, and one card is in the tab order at a time. Moves are announced in a polite live region ("Write docs is in Review, position 2 of 4."), and the keyboard instructions are the cards' description.

| Key                   | Does                                                        |
| --------------------- | ----------------------------------------------------------- |
| ↑ / ↓, Home / End     | Previous / next card in the column, first / last            |
| ← / → (mirrored RTL)  | The card at the same position in the previous / next column |
| Enter                 | Open the card                                               |
| Space                 | Pick the card up                                            |
| ↑ / ↓ while picked up | Move it within the column (and to the previous / next row)  |
| ← / → while picked up | Move it to the previous / next column that accepts it       |
| Space or Enter        | Drop it and save                                            |
| Escape                | Put it back                                                 |

## Theming

The renderers emit `data-slot="kanban"` (the card), `kanban-toolbar`, `kanban-filters`, `kanban-scroller`, `kanban-column-header` (with `data-column`, `data-wip="over|full"`, `data-collapsed`), `kanban-lane`, `kanban-dropzone` (a list, with `data-column`, `data-lane` and `data-refused` while the picked card may not enter it), `kanban-card` (with `data-key`, `data-movable="false"`, `data-picked="pointer|keyboard"`, `data-saving`), `kanban-card-body`, `kanban-empty` and `kanban-ghost` (the copy that follows the pointer). Their drag styles live in the shared theme CSS; `body[data-kanban-dragging]` is set during a drag. Register your own component for `kanban` in `createAlfakit({ components })` to replace the renderer.

## Translations

PHP strings live in the `alfakit-kanban::kanban` group (`validation.*`, `lanes.none`). The frontend strings are under `alfakit-kanban::kanban.ui` and reach the renderers as `kanban.*` when the plugin is registered. Every string, including the screen reader announcements, ships in the 13 AlfaKit locales.

## Security

- Every request carries the page's encrypted context token; the action endpoint checks panel access, the tenant and the action's authorisation.
- Cards, moves and card actions only resolve records within `getKanbanQuery()` (the resource's tenant-scoped query); a record of another tenant is a 404.
- A move needs `canMoveCards()` and `canMoveCard($record)` (the `update` policy). Columns, transitions, strict WIP limits, lanes and neighbours are validated on the server; the browser's checks are a convenience.
- Relationship columns and lanes only accept related records within the current tenant.
- Card text is rendered as text; image and avatar URLs are sanitised; colours must be theme colours, panel colour names or plain CSS colours.

## Testing

Moves and fetches are actions of the board (`kanban` on a page, `widget:<id>` on a widget):

```php
use AlfaSix\Alfakit\Testing\PageTester;

$token = $this->get('/admin/tasks/board', PageTester::inertiaHeaders())->json('props.page.token');

$this->postJson('/admin/_alfakit/actions', [
    'token' => $token,
    'component' => 'kanban',
    'action' => 'kanbanMove',
    'record' => $task->id,
    'arguments' => ['kanban' => ['column' => 'review', 'after' => $other->id]],
])->assertOk()->assertJsonPath('result.ok', true);

expect($task->refresh()->status)->toBe(TaskStatus::Review);
```

The move arguments are `column`, `lane`, and `after` or `before` (a card key in the target column) or `position: 'start' | 'end'`. `kanbanFetch` takes `['kanban' => ['search' => '…', 'filters' => [...]]]` and returns `result.board`.
