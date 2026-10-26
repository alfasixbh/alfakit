---
title: Testing standalone components
description: Pest tests for forms, tables and actions used outside panels.
---

# Testing standalone components

A standalone component is a prop of your page and its internal requests go to `/_alfakit/*`, so ordinary HTTP tests cover everything. The examples are Pest. In an app made with PHPUnit (the starter kits' default) add it with `composer require pestphp/pest pestphp/pest-plugin-laravel --dev -W` (`-W` lets Composer update the locked `phpunit/phpunit` and `laravel/pao`, which otherwise refuse Pest), then run `./vendor/bin/pest --init` and turn on `->use(RefreshDatabase::class)` in the `tests/Pest.php` it writes, so tests run against a migrated database. In a PHPUnit test class the same calls are `$this->get()`, `$this->postJson()` and `$this->actingAs()`. Read the token from the page, then post to the endpoints exactly as the renderer does. The example tests the `ContactForm` of [Forms](forms) on the `/contact` route of the [overview](overview).

```php
use AlfaSix\Alfakit\Testing\PageTester;
use App\Models\ContactRequest;
use Inertia\Inertia;

use function Pest\Laravel\{actingAs, get, getJson, post, postJson};

beforeEach(function () {
    // X-Inertia with the app's asset version: any other one answers 409 once the app has a Vite build.
    $this->inertia = PageTester::inertiaHeaders();
});

it('sends the contact form', function () {
    $form = get('/contact', $this->inertia)->json('props.form');

    expect($form['content'][0]['type'])->toBe('Form');

    postJson('/_alfakit/actions', ['token' => $form['token'], 'action' => 'submit', 'data' => ['email' => 'nope']])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'message']);

    post('/_alfakit/actions', [
        'token' => $form['token'],
        'action' => 'submit',
        'data' => ['name' => 'Ann', 'email' => 'ann@example.com', 'topic' => 'sales', 'message' => 'Hello there'],
    ], [...$this->inertia, 'Accept' => 'application/json'])->assertRedirect('/contact');

    expect(ContactRequest::count())->toBe(1)
        ->and(Inertia::getFlashed()['alfakitNotifications'][0]['title'])->toBe('Thanks!');
});
```

The form's submit action is named `submit`; table actions take `'component' => 'table'` plus `'record' => $id` (record actions) or `'bulk' => true, 'records' => [...]` (bulk actions); the key of a `FileUpload` value is the `tmp:` key returned by `/_alfakit/uploads`.

## Tables

Table state is the page's query string. The next examples use the `OrdersTable` of [Tables](tables) on `/account/orders`; `$user`, `$order`, `$ann` and `$bob` are records your test creates (a user whose customer has the orders `INV-1`, `INV-2` and one that doesn't match `inv`, and a second user):

```php
it('lists the customer orders sorted and searched', function () {
    actingAs($user);

    $table = get("/account/orders?sort=total&direction=desc&search=inv", $this->inertia)->json('props.orders.content.0');

    expect(array_column(array_column(array_column($table['records'], 'cells'), 'number'), 'state'))->toBe(['INV-2', 'INV-1']);

    post('/_alfakit/actions', [
        'token' => get('/account/orders', $this->inertia)->json('props.orders.token'),
        'component' => 'table',
        'action' => 'cancel',
        'record' => $order->id,
    ], [...$this->inertia, 'Accept' => 'application/json'])->assertRedirect();
});
```

Records outside the table's query answer 404; a record action on another customer's order cannot run.

## Authentication and tokens

```php
it('rejects guests and other users', function () {
    $token = actingAs($ann)->get('/account/orders', $this->inertia)->json('props.orders.token');

    actingAs($bob)->postJson('/_alfakit/actions', ['token' => $token, 'component' => 'table', 'action' => 'cancel', 'record' => 1])
        ->assertForbidden();
});
```

A token is bound to the user it was issued to (403 for anyone else, 401 for guests on components that `requiresAuthentication()`), expires after `alfakit.token_lifetime` minutes (419), and resolves its models again on every request (404 when one is gone).

## Lazy and polled components

```php
$stats = get('/account', $this->inertia)->json('props.stats');

getJson('/_alfakit/standalone/components?'.http_build_query(['token' => $stats['token'], 'targets' => implode(',', $stats['lazy'])]))
    ->assertOk()
    ->assertJsonPath('widget:app-alfakit-widgets-team-stats.stats.0.value', 3);
```

The answer is keyed by the lazy targets in `$stats['lazy']`: `widget:` followed by the widget's class name in kebab case (`App\Alfakit\Widgets\TeamStats` is `widget:app-alfakit-widgets-team-stats`).

## Unit tests

`toPayload()` returns the array the renderer receives, so a component can be tested without HTTP:

```php
$payload = OrdersTable::make(['customer' => $customer])->toPayload();

expect($payload['content'][0]['records'])->toHaveCount(2);
```

Frontend: the renderers' Vitest suites render `<AlfakitComponent>` from a JSON payload (see `packages/*/tests/standalone.test.*`); do the same for your own pages with `@testing-library`.
