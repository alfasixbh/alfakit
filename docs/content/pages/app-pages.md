---
title: Building app pages
description: Build any interactive screen inside a panel (a point of sale, a kanban board, a calendar, an inbox) with your own React, Vue or Svelte component, while AlfaKit handles auth, tenancy, server calls, validation, notifications and the panel shell. Walks through the demo's point of sale and fulfilment board.
---

# Building your own app pages

Some screens are not a form or a table: a point of sale, a kanban board, a scheduler, a chat inbox, a map, a drag-and-drop builder. For those, write the screen as an ordinary React, Vue or Svelte component and let AlfaKit provide everything around it:

| AlfaKit provides                                                                      | You write                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------- |
| The panel shell, or a `fullscreen` layout                                             | The component's markup and local UI state |
| Auth, panel access, `canAccess()`, tenancy, the context token                         | `canAccess()` if the page needs it        |
| Server calls to `#[Expose]` methods: validation, rate limits, abilities, transactions | The PHP methods                           |
| Toasts, modals, the debug panel                                                       | `Notification::make()->send()` in PHP     |
| Forms, tables and infolists defined in PHP, embedded where you want                   | `{name}Form()`, `{name}Table()` methods   |
| Partial reloads, polling and Echo listeners for your props                            | `getViewData()`                           |
| Keyboard shortcuts, locale-aware number and money formatting, UI primitives           | Which keys do what                        |

App pages are panel pages. In admin panels they work as described here; in a [starter kit](../getting-started/starter-kits) panel a page with its own `$component` can't be opened yet in 0.1.8 (the browser reports "Page not found: Pages/Pos"). Outside panels, use your own Inertia page with [standalone components](../standalone/overview).

The rule from the rest of AlfaKit still holds: business logic, validation, prices and permissions stay in PHP. The component displays data and calls methods.

## The toolkit at a glance

```php
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Attributes\Expose;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Models\Order;

class Board extends Page
{
    protected static ?string $component = 'Pages/Board';   // registered in createAlfakit({ pages })
    protected static string $layout = 'fullscreen';        // optional: no sidebar or topbar

    protected function getViewData(): array                // the component's props
    {
        return ['columns' => $this->columns()];
    }

    protected function columns(): array                    // your own query
    {
        return Order::query()->get()->groupBy('status')->all();
    }

    #[Expose(rules: ['order' => 'required|integer', 'status' => 'required|string'])]
    public function moveOrder(int $order, string $status): array   // callable from the component
    {
        // … scope to alfakit()->getTenant(), authorise, update …
        Notification::make()->success()->title('Moved')->send();

        return $card;
    }

    public function noteForm(Schema $schema): Schema       // <PageForm name="note" />
    {
        return $schema->components([Textarea::make('body')->required()]);
    }
}
```

```tsx
import { AppPage, PageForm, usePageMethod, useLiveProps, useShortcut } from '@alfakit/react'

export default function Board({ columns }: BoardProps) {
    const move = usePageMethod<Card, { order: number; status: string }>('moveOrder')
    useLiveProps(['columns'], { poll: '30s' })
    useShortcut('mod+k', () => openSearch())

    return (
        <AppPage>
            {/* your board */}
            <PageForm name="note" />
        </AppPage>
    )
}
```

Generate a starting point with:

```bash
php artisan make:alfakit-page Board --component [--adapter=react|vue|svelte] [--fullscreen] [--resource=Order]
```

It writes the PHP page (with `getViewData()` and an example `#[Expose]` method) and `resources/js/alfakit/pages/board.tsx` (`.vue`, `.svelte`), and registers it under `pages` in `resources/js/alfakit/app.*` and, when present, `ssr.*`. Running it again changes nothing.

### Ideas, and the parts each one uses

| App                         | Parts of the toolkit                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Point of sale               | `fullscreen`, exposed search/quote/checkout methods, `<PageForm>` for customer and payment, `useShortcut`, `useFormatter`                        |
| Kanban board                | `usePageMethod` with `optimistic`, `useLiveProps` polling, drag and drop in your own component                                                   |
| Calendar or scheduler       | `getViewData()` for the visible range, an exposed `reschedule()` method, `optimistic`, `<PageForm>` in a `Dialog` for event details              |
| Chat or support inbox       | `useLiveProps` with `echo: { channel, events }`, an exposed `reply()` with file arguments (`TemporaryUpload`), `<PageTable>` for the thread list |
| Map of stores or deliveries | `getViewData()` for markers, an exposed `nearby(lat, lng)` method, `<PageInfolist>` for the selected place                                       |
| Page or email builder       | Local drag-and-drop state, an exposed `save(array $blocks)` with rules, `useShortcut('mod+s')`                                                   |
| Spreadsheet-like editor     | `<PageTable>` with inline editable columns, or your own grid calling `updateCell()`; `reloadProps()` after bulk changes                          |
| Multi-step flow or kiosk    | `fullscreen` with `$hasFullscreenHeader = false`, one `<PageForm>` per step, exposed `submit()`                                                  |

## Calling PHP: `#[Expose]`

Only public, non-static page methods with the `AlfaSix\Alfakit\Pages\Attributes\Expose` attribute can be called. The component posts `{ token, method, arguments, forms }` to `POST /_alfakit/pages/call`; AlfaKit rebuilds the page from the context token (so the user, panel access, auth middleware, tenant and `canAccess()` are checked again) and then:

1. checks `authorize` (a Gate ability, or `[ability, ...arguments]`) for the panel user;
2. applies `rateLimit` per user (or IP address) and method, answering 429 with a toast;
3. validates the arguments with `rules` (an array, or the name of a page method that returns them and receives `array $arguments`); with rules, only validated arguments reach the method;
4. casts `int`, `float`, `string`, `bool`, `array`, backed enum and `TemporaryUpload` parameters, answering 422 when a value doesn't fit; every other parameter is injected by the container;
5. runs the method, in a database transaction when `transaction: true` or the panel uses `databaseTransactions()`.

```php
#[Expose(
    rateLimit: 20,                                  // calls per minute (decaySeconds: 60)
    authorize: ['create', Order::class],
    rules: ['items' => ['required', 'array', 'min:1'], 'items.*.quantity' => ['required', 'integer', 'min:1']],
    messages: ['items.required' => 'Add a product first.'],
)]
public function checkout(array $items, ?string $discountCode = null): array
```

The answer is `{ result, notifications, errors, reload?, redirect? }`:

- `result` is whatever the method returned (arrays, models, `JsonSerializable`).
- `notifications` are the toasts sent during the call; the renderer shows them.
- Throwing a `ValidationException` answers 422 with `errors`; the hooks expose them.
- Returning `redirect()->to(...)` (or any redirect) makes the browser visit it; its toasts are shown on the next page.
- `$this->reloadProps('cart', 'totals')` asks the browser for an Inertia partial reload of those `getViewData()` keys (`'page'` reloads the page's own blocks, no arguments reloads everything).
- Throwing `AlfaSix\Alfakit\Actions\Exceptions\Halt` stops quietly (`halted: true`).

Positional arguments work too: `call('rename', [12, 'New name'])` is the same as `{ project: 12, name: 'New name' }`.

### Files

Put a `File` (or `Blob`) anywhere in the arguments. The renderer uploads it to the temporary upload endpoint first and sends its key; type the parameter as `AlfaSix\Alfakit\Support\TemporaryUpload` to receive it (only uploads of the current user are found):

```php
#[Expose(rules: ['photo' => 'required|string'])]
public function attach(TemporaryUpload $photo): string
{
    $path = Storage::disk('public')->putFile('photos', new File(TemporaryUpload::disk()->path($photo->path())));
    $photo->delete();

    return $path;
}
```

The temporary disk must be a local disk for `->path()`; use `TemporaryUpload::disk()->readStream($photo->path())` otherwise. Check the type and size yourself (`$photo->mimeType()`, `$photo->size()`): the upload endpoint only applies the panel-wide size limit and blocked types.

## Calling from the component

**React**

```tsx
const checkout = usePageMethod<Sale, { items: Line[] }>('checkout', { forms: ['sale'] })

<Button disabled={checkout.loading} onClick={() => checkout.call({ items })}>Charge</Button>
{checkout.errors.items && <p>{checkout.errors.items}</p>}
```

`usePageMethod(name, options)` returns `call(args?, options?)` (resolves with the result, or `undefined` when the call failed), `callOrThrow()` (rejects with a `PageMethodError`), `loading`, `result`, `error`, `errors` (first message per key) and `reset()`. Options: `forms` (named forms to send and validate), `optimistic`, `toasts: false`, `followRedirects: false`, `onSuccess`, `onError`.

`usePageMethods<Map>()` calls any method by name, with `isLoading(name)` and `errors[name]`. Type it with a map so arguments and results are checked:

```ts
type PosMethods = {
    findBySku: { args: { code: string }; result: Product }
    checkout: { args: { items: Line[] }; result: Sale }
}
const methods = usePageMethods<PosMethods>()
const product = await methods.call('findBySku', { code })
```

**Vue** — the same composables return refs:

```vue
<script setup lang="ts">
import { usePageMethod } from '@alfakit/vue'
const checkout = usePageMethod<Sale, { items: Line[] }>('checkout', { forms: ['sale'] })
const { loading, errors } = checkout
</script>

<template>
    <Button :disabled="loading" @click="checkout.call({ items })">Charge</Button>
</template>
```

**Svelte** — the helpers return objects with reactive getters (call them while the component initialises):

```svelte
<script lang="ts">
    import { usePageMethod } from '@alfakit/svelte'
    const checkout = usePageMethod<Sale, { items: Line[] }>('checkout', { forms: ['sale'] })
</script>

<Button disabled={checkout.loading} onclick={() => checkout.call({ items })}>Charge</Button>
```

Outside the hooks, `callPageMethod()` and `runPageMethod()` from `@alfakit/core` make the same call.

### Optimistic updates

Apply the change before the server answers, and return how to undo it. The rollback runs when the call fails (validation, authorisation, network):

```tsx
const move = usePageMethod<Card, { order: number; status: string }>('moveOrder', {
    optimistic: (args) => {
        const before = columns
        setColumns(moveCard(before, args!.order, args!.status))
        return () => setColumns(before)
    },
    onSuccess: (card) => setColumns((current) => replaceCard(current, card)),
})
```

`optimistic(apply, run)` from `@alfakit/core` does the same around any promise.

## Embedding PHP forms, tables and infolists

Any public method named `{name}Form(Schema $schema): Schema`, `{name}Table(Table $table): Table` or `{name}Infolist(Schema $schema): Schema` is a named piece. It is sent with the page as a content block keyed `form:{name}`, `table:{name}` or `infolist:{name}`, and every internal endpoint finds it by that key, so live fields, field actions (a select's create option), searchable options, uploads, table actions, inline edits and polling work as on any other page.

```php
public function saleForm(Schema $schema): Schema
{
    return $schema->model(Order::class)->columns(1)->components([
        OrderResource::customerSelect()->createOptionForm([...])->createOptionUsing(...),
        ToggleButtons::make('payment_method')->options([...])->default('card')->required(),
    ]);
}

public function productsTable(Table $table): Table
{
    return $table->query(Product::query()->whereBelongsTo(alfakit()->getTenant()))->columns([...]);
}
```

```tsx
<PageForm name="sale" />
<PageTable name="products" />
<PageInfolist name="summary" />
<PageWidgets />                    {/* header widgets; position="footer" for the others */}
<PageBlock name="form" />          {/* any block by key: form, table, infolist, content, headerWidgets… */}
```

Vue and Svelte export the same components. A table keeps its own query string (`products_search`, `products_page`) unless it sets `queryStringIdentifier()`. Set initial form state in `mount()` with `$this->formsData['sale'] = [...]`.

To use a form's values in a method, send it with the call (`forms: ['sale']`) and read it with `$this->formState('sale')`. It applies the browser state and validates it exactly like an action form; its errors come back as `forms.sale.{field}` and appear on the form's fields. `usePageForm('sale')` gives you the form's `store` (for `store.setValue('customer_id', null)`) and its current `values`.

## Keeping data fresh

- `useReloadProps(['cart'])` returns `{ reload, reloading }`: an Inertia partial reload of those view data keys.
- `useLiveProps(['orders'], { poll: '15s' })` reloads them on an interval (paused while the tab is hidden; props with the same interval share one request).
- `useLiveProps(['orders'], { echo: { channel: `stores.${id}.orders`, events: ['.OrderUpdated'] } })` reloads them when a Laravel Echo event arrives on a private channel (`visibility: 'public' | 'presence'` for others). Without `window.Echo` it does nothing. Authorise the channel in `routes/channels.php` as usual.
- From PHP, `$this->reloadProps('orders')` in an exposed method.

## Keyboard shortcuts

`useShortcut('mod+k', handler)` registers a shortcut while the component is mounted (`mod` is ⌘ on macOS and Ctrl elsewhere; `f2`, `/`, `esc`, `shift+enter`…). Shortcuts without a modifier are ignored while the user types, unless you pass `{ allowInInputs: true }`. Pass `{ enabled }` to switch it off (a boolean in React, a ref in Vue, a function in Svelte).

## The fullscreen layout

`protected static string $layout = 'fullscreen';` drops the sidebar and topbar and gives the component the whole viewport (`h-svh`, the component fills `main[data-slot="content"]`). A slim header keeps the brand, the page title, the `topbar.start`/`topbar.end` slots, notifications, the theme toggle, the debug panel toggle, the user menu and an exit link to the panel home (`getExitUrl()`). Set `protected static bool $hasFullscreenHeader = false;` for a kiosk: only the debug toggle remains, at the bottom end. Auth, tenancy, toasts and modals work as on other pages. Replace it with `createAlfakit({ components: { 'layout:fullscreen': MyLayout } })`.

`<AppPage>` renders the page's layout (any layout), heading, header actions and document title around your component. Without it you render the whole screen yourself.

## UI primitives and formatting

Each renderer exports its shadcn primitives: `Button`, `Badge`, `Card` (and its parts), `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Select`, `RadioGroup`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Command`, `Tabs`, `Table`, `Tooltip`, `ScrollArea`, `Separator`, `Skeleton`, `Spinner`, `Alert`, `Avatar`, `Breadcrumb`, `Collapsible`, `Calendar`, plus `Icon` (any Lucide name) and `cn()`. They follow the panel theme, dark mode and the design options. Format numbers, money, dates and relative times with `useFormatter()` (`format.money(12.5, 'USD')`, `format.relative(date)`), which follows the panel's locale, currency and timezone. Use logical Tailwind classes (`ms-*`, `ps-*`, `text-start`, `border-s`) so the screen works right to left.

## Walkthrough: the demo's point of sale

The [live demo](/docs/getting-started/demo) has a **Point of sale** under Sales, in the React, Vue and Svelte panels. The PHP page is `demo/app/Alfakit/Pages/Apps/PointOfSale.php`; the components are `demo/resources/js/{react,vue,svelte}/pages/Pos.*`, with their props, method types and pure cart helpers shared in `demo/resources/js/shared/apps.ts`.

**1. The page.** `$component = 'Pages/Pos'`, `$layout = 'fullscreen'`, `getNavigationGroup()` returns the Sales group, and `canAccess()` lets any staff member of the store in. `registerRoutes()` adds a printable receipt route (`pos/receipts/{order}`, a Blade view) next to the page, inside the tenant's route group.

**2. View data.** `getViewData()` sends the first products, the categories that have products, today's sales, the currency and the page's copy (`__('apps.pos')`, so Arabic works).

**3. Exposed methods.** `searchProducts(?string $search, ?int $category)`, `findBySku(string $code)` (the SKU field; a scanner types the code and presses Enter), `quote(array $items, ?string $discountCode)` (subtotal, discount, VAT, total) and `checkout(array $items, ?string $discountCode)`. Every query is scoped with `whereBelongsTo($store)`: exposed methods are not resource queries, so nothing scopes them for you. `checkout` reads the `sale` form with `formState('sale')`, locks the products, checks stock, creates the order, its items and a captured payment, decrements stock, sends a toast with a "View order" button and calls `$this->reloadProps('recentSales')`. The panel's `databaseTransactions()` wraps it in one transaction.

**4. The sale form.** `saleForm()` holds a relationship `Select` for the customer (searchable, with a "create customer" modal) and `ToggleButtons` for the payment method. The component renders it with `<PageForm name="sale" />` and sends it with `forms: ['sale']`.

**5. The component.** Search and category changes call `searchProducts` (debounced); the cart is local state; every cart change calls `quote`, so the totals shown are the server's. **Charge** (or F2) calls `checkout` and opens a `Dialog` with links to the receipt and the order. `/` focuses the search, Esc clears the sale (unless a modal is open). Money is formatted with `useFormatter()`. The layout is two columns from `md` up and one column on phones.

```tsx
const methods = usePageMethods<PosMethods>()
const charge = async () => {
    const sale = await methods.callOrThrow(
        'checkout',
        { items: cartItems(cart), discountCode },
        { forms: ['sale'] },
    )
    setSale(sale)
}
useShortcut('f2', () => void charge(), { allowInInputs: true })
```

## A second example: the fulfilment board

`demo/app/Alfakit/Pages/Apps/FulfilmentBoard.php` (`Pages/FulfilmentBoard`) shows orders in four columns by status (paid, processing, shipped, delivered). Cards are dragged between columns with HTML drag and drop, or moved with each card's menu (keyboard and touch). The component calls `moveOrder(int $order, string $status)` with an `optimistic` update; the method checks the `update` ability and allows one step forward or back. When it refuses (paid → delivered), it sends a danger toast and throws a `ValidationException`; the card slides back. `useLiveProps(['columns'], { poll: '30s' })` keeps the board current.

## Testing

Call exposed methods like the browser does: get the page's token, then post to the endpoint.

```php
use AlfaSix\Alfakit\Testing\PageTester;

$token = $this->get('/admin/pos', PageTester::inertiaHeaders())->json('props.page.token');

$this->postJson('/admin/_alfakit/pages/call', [
    'token' => $token,
    'method' => 'checkout',
    'arguments' => ['items' => [['product_id' => $product->id, 'quantity' => 2]]],
    'forms' => ['sale' => ['payment_method' => 'card']],
])->assertOk()->assertJsonPath('errors', null);
```

See `demo/tests/Feature/Apps/AppPagesTest.php` for checkout, stock, tenant scoping and refused methods.

See also [security: exposed methods](/docs/advanced/security#exposed-page-methods) and [custom pages](/docs/pages/custom-pages).
