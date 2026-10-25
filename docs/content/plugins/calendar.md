---
title: Calendar
description: FullCalendar widgets with month, week, day and list views, event actions and drag and drop.
---

# Calendar

`alfasix/alfakit-calendar` adds a `CalendarWidget`: a [FullCalendar](https://fullcalendar.io) calendar that shows your events in month, week, day and list views. Clicking an event opens an AlfaKit action for its record, selecting a range opens a create action, and events can be dragged and resized. The API follows Filament's `saade/filament-fullcalendar`.

Everything the calendar does goes through the widget's [actions](../actions/overview) on the server: events are fetched for the visible range, and each interaction is authorised from the page's context token, like any other action. The widget renders in React, Vue and Svelte (registry key `widget:calendar`); FullCalendar is loaded the first time a calendar is shown, so it doesn't add to your main bundle, and the server render shows a skeleton.

## Installation

```bash
composer require alfasix/alfakit-calendar
```

The FullCalendar packages ship as dependencies of `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte`; there is nothing to install on the frontend.

**Works in** an [admin panel](../getting-started/installation) and a [starter kit](../getting-started/starter-kits) panel, where a calendar discovered in `app/Alfakit/Widgets` shows on the app's own `/dashboard`, and [outside panels](../standalone/component-kit#kanban-boards-and-calendars): put the widget in a `Standalone\Widgets` component and list `CalendarPlugin::class` in `alfakit.standalone.plugins`.

Register the plugin on the panel. It shares the calendar's translations with the frontend and holds panel-wide defaults:

```php
use AlfaSix\AlfakitCalendar\CalendarPlugin;

$panel->plugin(
    CalendarPlugin::make()
        ->editable()
        ->config(['dayMaxEvents' => true]),
);
```

## A calendar widget

Extend `CalendarWidget` and return the events of the visible range from `fetchEvents()`. `$info['start']` and `$info['end']` are `CarbonImmutable` dates in the application timezone (the end is exclusive):

```php
namespace App\Alfakit\Widgets;

use AlfaSix\AlfakitCalendar\Event;
use AlfaSix\AlfakitCalendar\Widgets\CalendarWidget;
use App\Models\Meeting;

class MeetingsCalendar extends CalendarWidget
{
    protected static ?string $model = Meeting::class;

    // Names the record in the event modals ("View Standup"); without it a model with no
    // `title` or `name` column shows its key ("View 1").
    protected static ?string $recordTitleAttribute = 'subject';

    protected ?string $heading = 'Meetings';

    public function fetchEvents(array $info): array
    {
        return Meeting::query()
            ->where('starts_at', '<', $info['end'])
            ->where('ends_at', '>', $info['start'])
            ->get()
            ->map(fn (Meeting $meeting) => Event::make($meeting)
                ->title($meeting->subject)
                ->start($meeting->starts_at)
                ->end($meeting->ends_at))
            ->all();
    }
}
```

Add it to a dashboard (or any page with widgets) like any other widget: `->widgets([MeetingsCalendar::class])`. Calendars span the full width by default (`$columnSpan = 'full'`).

`fetchEvents()` may also return plain arrays in FullCalendar's event format (as `EventData::toArray()` does in Filament); DateTime values in `start` and `end` are converted the same way, URLs are sanitised and only JSON values are sent.

## Events

`Event::make($id)` takes a key, or a model whose key is used. The id is what the event's actions, `onEventDrop()` and `onEventResize()` receive.

| Method                                              | Does                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `title(string)`                                     | The text of the event                                                              |
| `start($date)` / `end($date)`                       | A `DateTimeInterface` (shown in the calendar's timezone) or a string sent as it is |
| `allDay(bool = true)`                               | An all-day event; its dates are days and are never shifted by timezones            |
| `url($url, $shouldOpenInNewTab = false)`            | Clicking the event visits the URL instead of running the click action              |
| `backgroundColor()`, `borderColor()`, `textColor()` | Any CSS colour                                                                     |
| `editable(?bool)`                                   | Allow or forbid dragging and resizing this event (overrides the widget)            |
| `groupId(string)`                                   | Events with the same group move together                                           |
| `classNames(array)`                                 | CSS classes on the event                                                           |
| `extendedProps(array)`                              | Extra JSON data sent with the event                                                |

## Views and options

| Property or method                  | Default                                                                   | Does                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$views` / `getViews()`             | `['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']`             | The views in the toolbar: `dayGridMonth`, `dayGridWeek`, `dayGridDay`, `timeGridWeek`, `timeGridDay`, `listDay`, `listWeek`, `listMonth`, `listYear` |
| `$initialView` / `getInitialView()` | the first view                                                            | The view the calendar opens with                                                                                                                     |
| `$heading` / `getHeading()`         | none                                                                      | The title above the calendar                                                                                                                         |
| `getTimezone()`                     | the plugin's `timezone()`, else the panel's timezone                      | The timezone events are shown in                                                                                                                     |
| `getLocale()`                       | the plugin's `locale()`, else the panel's locale                          | Date formats and week numbering (a BCP 47 locale)                                                                                                    |
| `getFirstDay()`                     | the plugin's `firstDay()`, else the panel's first day of the week         | 0 = Sunday … 6 = Saturday                                                                                                                            |
| `isEditable()`                      | the plugin's `editable()`, else false                                     | Events can be dragged and resized                                                                                                                    |
| `isSelectable()`                    | the plugin's `selectable()`, else true when there is a date select action | A date range can be selected                                                                                                                         |
| `config()`                          | `[]`                                                                      | Extra FullCalendar options for this widget, merged over the plugin's `config()`                                                                      |

The calendar follows the panel's text direction (it is mirrored right to left), and its toolbar, "all day", "more" and "no events" texts are translated with the panel.

### Extra FullCalendar options

`config()` (on the widget or the plugin) passes options straight to FullCalendar:

```php
public function config(): array
{
    return [
        'dayMaxEvents' => true,
        'nowIndicator' => true,
        'slotMinTime' => '07:00:00',
        'businessHours' => ['daysOfWeek' => [0, 1, 2, 3, 4], 'startTime' => '08:00', 'endTime' => '17:00'],
    ];
}
```

Only JSON values (strings, numbers, booleans, null and arrays of them) are sent; there is no way to send JavaScript. Options the widget controls are dropped: `plugins`, `events`, `eventSources`, `timeZone`, `locale`, `direction`, `editable`, `selectable`, `initialView`, `headerToolbar`, `buttonText`, every callback (`eventClick`, `select`, `eventDrop`, `datesSet`…), and any option ending in `Content`, `DidMount`, `WillUnmount` or `Allow`.

### Timezones

The server sends event dates as wall time in the calendar's timezone (`2026-10-13T09:30:00`) and FullCalendar shows them as they are, so no timezone plugin is needed in the browser. Dates coming back (the visible range, a dropped event, a selected range) are read in the calendar's timezone and handed to your code in the application timezone.

## Actions

By default a widget with a `$model` and a form gets a create button above the calendar, a view modal when an event is clicked (with edit and delete buttons in its footer) and a create modal when a range is selected:

```php
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\TextInput;

protected static ?string $startAttribute = 'starts_at';

protected static ?string $endAttribute = 'ends_at';

public function getFormSchema(): array
{
    return [
        TextInput::make('subject')->required(),
        DateTimePicker::make('starts_at')->required(),
        DateTimePicker::make('ends_at'),
    ];
}
```

With `$startAttribute` and `$endAttribute` set, the create modal opened by a selection is filled with the selected dates, and dragging or resizing an event saves them (see below).

Override any of these to change them:

| Method                                                                             | Default                                                      | Does                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `getFormSchema()`                                                                  | `[]`                                                         | Fields of the default create, edit and view actions                                                                                      |
| `getHeaderActions()`                                                               | `[$this->createAction()]`                                    | Buttons above the calendar                                                                                                               |
| `getEventClickAction()`                                                            | `$this->viewAction()` with `getModalActions()` in its footer | Opened when an event without a URL is clicked, for the event's record                                                                    |
| `getModalActions()`                                                                | `[$this->editAction(), $this->deleteAction()]`               | Footer actions of the default view modal                                                                                                 |
| `getDateSelectAction()`                                                            | the header action named `create`                             | Opened when a range is selected                                                                                                          |
| `createAction($name = 'create')`, `editAction()`, `viewAction()`, `deleteAction()` |                                                              | The prebuilt actions, with the widget's model and form. Actions are found by name, so give a second action of the same kind its own name |

The event click action receives the event's record (resolved by its id within `getEloquentQuery()`, so a user can't open another tenant's record), and any action in its modal works on it too:

```php
protected function getEventClickAction(): ?Action
{
    return $this->editAction()->modalWidth('lg');
}
```

The date select action receives the selection in `$arguments`: `start` and `end` (`CarbonImmutable`, application timezone, end exclusive) and `allDay`:

```php
protected function getDateSelectAction(): ?Action
{
    // Its own name: the header's `create` button keeps its default form.
    return $this->createAction('createFromSelection')
        ->mountUsing(fn (Schema $form, array $arguments) => $form->fill([
            'starts_at' => $arguments['start']?->toDateTimeString(),
            'ends_at' => $arguments['end']?->toDateTimeString(),
        ]));
}
```

When an action succeeds the page reloads its props and the calendar fetches its events again.

### Records, resources and tenancy

`$model` names the events' model; `$resource` uses a resource instead (its model, its tenant-scoped query and its policies). `getEloquentQuery()` is the query records are resolved from: the resource's query, or the model's query scoped to the current tenant through the panel's tenant ownership relationship. Override `resolveEventRecord($key)` to find records another way. Calendars without a model (events from an API, say) work too; their actions receive no record.

## Drag and drop

With `editable()`, events can be dragged to another date and resized. The browser calls the widget's `onEventDrop()` or `onEventResize()`; return `true` when the change is saved. Returning `false`, throwing, or failing authorisation moves the event back.

```php
public function onEventDrop(array $event, array $oldEvent, ?Model $record): bool
{
    if ($record === null || $record->locked) {
        Notification::make()->danger()->title('This meeting is locked.')->send();

        return false;
    }

    $record->update(['starts_at' => $event['start'], 'ends_at' => $event['end']]);

    return true;
}
```

`$event` and `$oldEvent` hold `id`, `start` and `end` (`CarbonImmutable` in the application timezone, or null) and `allDay`. Notifications sent during the call are shown right away. Note that, unlike Filament's, the return value says whether the change was **saved**, not whether to revert it.

The default implementation writes `start` and `end` to `$startAttribute` and `$endAttribute` and saves the record; without `$startAttribute` every drop is reverted until you override the methods.

Before either method runs, the widget checks `isEditable()` and `canEditEvent($record)`: the resource's `update` ability, or the model policy's `update` method when there is no resource. Override `canEditEvent()` for other rules.

## Theming

The calendar is drawn inside `[data-slot="calendar"]`, which maps FullCalendar's `--fc-*` CSS variables to the panel's theme tokens (`--border`, `--primary`, `--muted`…), so themes and dark mode apply. Override a variable on the slot to restyle it:

```css
[data-slot='calendar'] {
    --fc-event-bg-color: var(--chart-2);
    --fc-today-bg-color: transparent;
}
```

The card around it has `data-slot="calendar-widget"`. To replace the renderer entirely, register your own component for `widget:calendar` in `createAlfakit({ components })`.

## Translations

PHP strings live in the `alfakit-calendar::calendar` group (publish them with `php artisan vendor:publish --tag=alfakit-calendar-translations` or override single keys in `lang/vendor/alfakit-calendar/{locale}/calendar.php`). The frontend strings are under `alfakit-calendar::calendar.ui` and reach the renderers as `calendar.*` when the plugin is registered: `label`, `today`, `month`, `week`, `day`, `list`, `all_day`, `more_events`, `no_events`, `previous`, `next`, `loading`, `load_failed`, `move_failed`.

## Testing

The widget's endpoints are plain actions, so tests post to the panel's action endpoint with the page's token:

```php
use AlfaSix\Alfakit\Testing\PageTester;

$token = $this->get('/admin', PageTester::inertiaHeaders())->json('props.page.token');

$this->postJson('/admin/_alfakit/actions', [
    'token' => $token,
    'component' => 'widget:'.MeetingsCalendar::make()->getId(),
    'action' => CalendarWidget::FETCH_EVENTS_ACTION,
    'arguments' => ['calendar' => ['start' => '2026-10-01', 'end' => '2026-11-01']],
])->assertOk()->assertJsonCount(3, 'result.events');
```

`CalendarWidget::EVENT_DROP_ACTION` and `EVENT_RESIZE_ACTION` take the event id as `record` and `{calendar: {start, end, allDay, oldStart, oldEnd}}` as arguments.
