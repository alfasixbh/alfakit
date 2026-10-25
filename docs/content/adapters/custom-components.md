---
title: Custom components
description: Extend AlfaKit with your own fields, entries, widgets, pages and toasts.
---

# Custom components

Every renderer resolves schema `type` strings through a **registry**. Files in `resources/js/alfakit/{fields,columns,…}` register themselves ([Bring your own components](../advanced/custom-components)); anything else you register under a key and reference that key from PHP.

```ts
createAlfakit({
    components: {
        'map-picker': MapPicker, // View::make('map-picker') or a Field with $type = 'map-picker'
        'welcome-card': WelcomeCard, // Widget with $component = 'welcome-card'
        'my-toast': MyToast, // Notification::make()->view('my-toast')
        TextInput: FancyTextInput, // override a built-in renderer
    },
    pages: {
        'Pages/Reports': Reports, // Page with $component = 'Pages/Reports'
    },
})
```

Columns and widgets are looked up by type too: register `column:<type>` to render every column of that type (`column:TextColumn` overrides the built-in; a custom `Column` subclass sets `protected ?string $type = 'progress'`), and `widget:<type>` for widgets (`widget:Chart`). A widget class can also name one component with `protected static ?string $component`, including chart and stats widgets. Filters render their form components, so a custom filter UI is a custom field.

## Generators

Drop a file into `resources/js/alfakit/fields`, `columns`, `entries`, `widgets`, `pages`, `components` or `blocks` and it registers itself under its file name. The generators write both halves for you; see [Bring your own components](../advanced/custom-components) for the folder rules, typed props (`php artisan alfakit:types`) and shadcn fields.

```bash
php artisan make:alfakit-field RatingInput      # Forms\Components\RatingInput + fields/RatingInput.tsx
php artisan make:alfakit-field Volume --from-shadcn=slider  # wraps resources/js/components/ui/slider
php artisan make:alfakit-column ProgressBar     # Tables\Columns\ProgressBar + columns/ProgressBar.tsx (`column:ProgressBar`)
php artisan make:alfakit-entry StarRating       # Infolists\Components\StarRating + entries/StarRating.tsx
php artisan make:alfakit-schema-component ShippingPanel  # Schemas\Components\ShippingPanel + components/ShippingPanel.tsx
php artisan make:alfakit-widget RevenueCard --type=custom  # Widgets\RevenueCard + widgets/RevenueCard.tsx
```

Each writes the PHP class (in `app/Alfakit`, or your `alfakit.file_generation` namespace; the type is the class name) and a starter component for your adapter (`.tsx`, `.vue` or `.svelte`, detected from `package.json` or chosen with `--adapter`). With `createAlfakit({ discover })` (or, in a [starter kit app](../getting-started/starter-kits#the-page-file), `createStarterKitPage({ discover })` in `resources/js/pages/Alfakit/Page.*`) there is nothing to register; entries without it get the component added to `components` and a hint on how to turn auto-registration on. Use `--no-frontend` for the PHP class only.

## Three levels of custom components

1. **Embed a frontend component** — `View::make('map-picker')->props(['zoom' => 12])`. Receives `props` plus the schema object. No state.
2. **A custom field** — subclass `Field` in PHP and set `$type`; serialise options in `getSchemaProps()`. The renderer component receives a field schema with `statePath` and binds through `useField()`; validation, hydration and dehydration are handled by PHP like any field.

    ```php
    use AlfaSix\Alfakit\Forms\Components\Field;

    class MapPicker extends Field
    {
        protected ?string $type = 'map-picker';

        protected int $zoom = 12;

        public function zoom(int $zoom): static { $this->zoom = $zoom; return $this; }

        protected function getSchemaProps(): array { return ['zoom' => $this->zoom]; }

        protected function getTypeValidationRules(): array { return ['array']; }
    }
    ```

3. **A custom page** — set `$component` and build the screen with the adapter's exported building blocks (`PageShell`, `ActionList`, `DataTable`, shadcn primitives).

## Custom layout components

A layout component holds other components: subclass `Component`, set `$type`, and pass children with `->schema([...])`. In the renderer, `<SchemaChildren>` renders the children in the component's grid (`columns()`, `dense()`, `gap(false)`), so your component only draws the frame:

```php
namespace App\Alfakit\Schemas\Components;

use AlfaSix\Alfakit\Schemas\Components\Component;

class ShippingPanel extends Component
{
    protected ?string $type = 'ShippingPanel'; // resources/js/alfakit/components/ShippingPanel.tsx registers under it

    protected function getSchemaProps(): array { return ['tone' => 'muted']; }
}
```

```php
ShippingPanel::make()->schema([TextInput::make('street'), TextInput::make('city')])->columns(2);
```

```tsx
// resources/js/alfakit/components/ShippingPanel.tsx
import { SchemaChildren, type BaseComponent } from '@alfakit/react'

export default function ShippingPanel({ component }: { component: BaseComponent }) {
    return (
        <section className="rounded-xl border p-4">
            <SchemaChildren component={component} />
        </section>
    )
}
```

Vue: `<SchemaChildren :component="props.component" />`; Svelte: `<SchemaChildren {component} />`. `make:alfakit-schema-component` generates the class and a starter component.

### Reading other state, the record and the operation

`useSchemaComponentContext(component)` gives a custom component (field, entry, layout or `View`) what it may read about its schema:

| Value                    | Source                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `get(path, isAbsolute?)` | Another component's current state, resolved from the component's container like PHP's `$get()` (`'../title'`) |
| `state`                  | The whole form state; `null` outside a form (infolists)                                                       |
| `operation`, `recordKey` | Sent when the PHP component calls `exposeContext()`                                                           |
| `record`                 | Only the attributes listed in `exposeContext(record: ['name', 'author.name'])`                                |
| `data`                   | `exposeContext(data: fn (?Post $record) => [...])`, evaluated with the usual injections                       |

```php
View::make('word-count')->exposeContext(
    record: ['title'],
    data: fn (?Post $record): array => ['words' => str_word_count($record?->content ?? '')],
);
```

```tsx
const context = useSchemaComponentContext(component)
const title = context.get<string>('title') // live form state
const words = context.data.words // computed on the server
```

Vue returns a computed ref (`context.value.get('title')`) and accepts a getter (`useSchemaComponentContext(() => props.component)`); Svelte returns `{ current }` and accepts a getter too. Nothing is sent unless the component calls `exposeContext()` (or sets `protected bool|Closure $exposesContext = true`), and only the listed attributes leave the server, so hidden columns never reach the browser by accident. Keep validation and authorisation in PHP; the context is for display.

## Table columns and infolist entries

Column and entry types are resolved the same way: `class MapColumn extends Column { … }` with `getType()` returning `'MapColumn'` and a registered renderer receiving `{ column, cell }`.

## Overriding built-ins

Any built-in key can be replaced — for example `Select` with a renderer backed by a different combobox. Keep the schema contract: read the same props and bind the same state path.

## Dispatching frontend events

Notification actions can `->dispatch('event', [...])`, which emits a `CustomEvent` on `window`; listen with `window.addEventListener('event', …)`.

## Languages and right-to-left layouts

Custom components should work in every language and direction:

- Read strings with `useT()` / `useChoice()` and share your translation groups with `->frontendTranslations()`. See [Localization](../localization/overview#strings-in-custom-frontend-components).
- Format numbers, money and dates with `useFormatter()`, not hand-written `toFixed()` or `toLocaleString()` calls.
- Use logical Tailwind classes (`ms-*`, `ps-*`, `start-*`, `text-start`) so your component mirrors in right-to-left languages, and `rtl:rotate-180` on arrows. See [Right-to-left languages](../localization/rtl).
- Never hardcode English in markup, including `aria-label` and screen-reader-only text.

## Accessibility

`FieldWrapper` gives the label, hint, helper text and error stable ids derived from the field id (`fieldIds(id)` from `@alfakit/core` returns them: `${id}-label`, `-hint`, `-helper`, `-error`). `useField()` returns `aria`: `aria-describedby` pointing at whichever of those are shown, `aria-invalid` while the field has an error, and `aria-required` for required fields. Spread it on your control so screen readers read the help text and the error:

```tsx
const { value, setValue, error, id, aria } = useField(component)

<Map id={id} value={value} onChange={setValue} {...aria} />
```

For a control whose role does not take `aria-required` (a button that opens a picker, a group), use `withoutRequired(aria)`. A group of controls (like a checkbox list) can take `aria-labelledby={fieldIds(id).label}` and the describedby, and put `aria-invalid` on each control. Icon-only buttons need a translated `aria-label`, and links that open a new tab should add the translated `opens_in_new_tab` hint as screen-reader text.
