---
title: Testing
description: Test panels with Pest and standard HTTP assertions.
---

# Testing

AlfaKit pages are Inertia responses and actions are HTTP endpoints, so ordinary feature tests cover everything. The page test helpers wrap those requests in a fluent API that will feel familiar if you have used Filament's Livewire helpers.

## Page test helpers

`alfakit()->testPage()` (or `AlfaSix\Alfakit\Testing\PageTester::make()`) loads a page and drives its forms, actions and table through the same internal endpoints the renderer uses, with the page's context token. Validation, authorisation, tenancy and `afterStateUpdated` hooks run exactly as in the browser. Authenticate first: the requests share your test's application, user and session.

```php
use App\Alfakit\Resources\PostResource\Pages\{CreatePost, EditPost, ListPosts};
use AlfaSix\Alfakit\Actions\DeleteAction;

beforeEach(fn () => $this->actingAs(User::factory()->create()));

it('updates a post', function () {
    $post = Post::factory()->create();

    alfakit()->testPage(EditPost::class, ['record' => $post])
        ->assertFormSet(['title' => $post->title])
        ->fillForm(['title' => 'Hello World'])
        ->assertFormSet(['slug' => 'hello-world']) // set by afterStateUpdated on the server
        ->call('save')
        ->assertHasNoFormErrors()
        ->assertNotified('Saved');

    expect($post->refresh()->title)->toBe('Hello World');
});

it('validates', function () {
    alfakit()->testPage(CreatePost::class)
        ->fillForm(['title' => ''])
        ->call('create')
        ->assertHasFormErrors(['title' => 'required', 'slug']);
});

it('lists, searches and deletes', function () {
    $posts = Post::factory()->count(3)->create();

    alfakit()->testPage(ListPosts::class)
        ->assertCanSeeTableRecords($posts)
        ->searchTable($posts->first()->title)
        ->assertCanSeeTableRecords([$posts->first()])
        ->assertCanNotSeeTableRecords($posts->skip(1))
        ->searchTable()
        ->sortTable('title', 'desc')
        ->filterTable('is_published', true)
        ->resetTableFilters()
        ->callTableAction(DeleteAction::class, $posts->first())
        ->assertCanNotSeeTableRecords([$posts->first()])
        ->callTableBulkAction('delete', $posts->skip(1));
});
```

`testPage()` takes a page class (resource pages are found in the resource's `getPages()`) or a URL, the route parameters (`record`, `tenant`…), and `panel:` for pages of a panel other than the default.

| Area              | Methods                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page              | `assertOk()`, `assertForbidden()`, `assertNotFound()`, `assertStatus()`, `assertTitle()`, `assertHeading()`, `refresh()`, `getProps()`, `getPage()`, `getToken()`, `getResponse()`, `dump()` / `dd()` / `getDebugTree()` (the resolved schema tree with visibility and authorisation per component, see [Debug panel](debug-panel))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Forms             | `fillForm()`, `call($action)`, `getFormState()`, `assertFormSet()`, `assertFormFieldExists()` / `DoesNotExist()` / `Visible()` / `Hidden()` / `Disabled()` / `Enabled()` / `ReadOnly()` / `IsRequired()`, `assertHasFormErrors()`, `assertHasNoFormErrors()`, `getErrors()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Page actions      | `callAction($name, $data, $arguments)`, `mountAction()`, `setActionData()`, `callMountedAction()`, `unmountAction()`, `assertActionMounted()`, `assertActionVisible()` / `Hidden()` / `Exists()` / `DoesNotExist()` / `Enabled()` / `Disabled()`, `assertActionHasLabel()` / `DoesNotHaveLabel()`, `assertActionHasIcon()` / `DoesNotHaveIcon()`, `assertActionHasColor()` / `DoesNotHaveColor()`, `assertActionHasUrl()` / `DoesNotHaveUrl()`, `assertActionShouldOpenUrlInNewTab()` / `ShouldNotOpenUrlInNewTab()`, `assertActionListInOrder([...])`, `assertActionHalted()`, `assertActionSucceeded()`, `assertHasActionErrors()`, `assertHasNoActionErrors()`, `assertMountedActionModalSee()` / `DontSee()` / `SeeHtml()` / `DontSeeHtml()`                                                                                                                                                                                                                                                                                                            |
| Tables            | `searchTable()`, `searchTableColumns()`, `sortTable()`, `filterTable()`, `removeTableFilter()`, `removeTableFilters()`, `resetTableFilters()`, `toggleAllTableColumns($condition = true)`, `setTablePage()`, `setTablePerPage()`, `assertCanSeeTableRecords($records, inOrder:)`, `assertCanNotSeeTableRecords()`, `assertCountTableRecords()`, `assertTableColumnExists()`, `assertCanRenderTableColumn()` / `CanNotRender…()`, `assertTableColumnVisible()` / `Hidden()`, `assertTableColumnStateSet()` / `NotSet()` (raw state), `assertTableColumnFormattedStateSet()` / `NotSet()` (what the cell shows), `assertTableColumnHasDescription($column, $text, $record, 'below' \| 'above')` / `DoesNotHave…()`, `assertTableColumnHasExtraAttributes()` / `DoesNotHave…()`, `assertTableSelectColumnHasOptions()` / `DoesNotHave…()`, `assertTableFilterExists($name, $checkFilterUsing)`, `assertTableFilterVisible()` / `Hidden()`, `assertTableColumnSummarySet($column, $summarizerId, $state, isCurrentPaginationPageOnly:)`, `getTableRecordKeys()` |
| Table actions     | `callTableAction($name, $record, $data)`, `mountTableAction()`, `callTableBulkAction($name, $records, $data)` (`$records = null` runs "select all" on the filtered table), `mountTableBulkAction()`, `assertTableActionVisible()` / `Hidden()` / `Enabled()` / `Disabled()`, `assertTableBulkActionVisible()` / `Hidden()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Results           | `assertNotified($title or Notification)`, `assertNotNotified()` (outside page tests: the static `Notification::assertNotified()`, see [Notifications](../notifications/overview#testing-notifications)), `assertRedirect($url)`, `assertNoRedirect()`, `getNotifications()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Relation managers | `relationManager(CommentsRelationManager::class)`: every table helper and table action above then works on that manager's table (lazy managers are loaded like the renderer does); `relationManager(null)` goes back to the page's table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Schemas           | `assertSchemaExists($schema = 'form')`, `callFormComponentAction($field, $name, $data, $arguments)` (prefix, suffix and hint actions of the page form or the mounted action's form), `assertSchemaComponentExists($key, $schema = 'form', $checkComponentUsing)`, `assertSchemaComponentDoesNotExist()`, `assertSchemaComponentVisible()` / `Hidden()` (sections, tabs, steps and fields by key), `assertSchemaStateSet($state, 'infolist')` (each key an entry name, compared with the state the entry shows; on a View page without a form the default `form` means the infolist), `getSchemaEntryState()`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Wizards           | `goToNextWizardStep()` (validates the step on the server, as "Next" does), `goToPreviousWizardStep()`, `goToWizardStep($step)` (1-based; validates each step on the way), `assertWizardCurrentStep($step)`, `assertWizardStepExists($step)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Notes:

- **Action names** are a name (`'publish'`), a prebuilt action class with a default name (`DeleteAction::class`), or a path to an action in another action's modal footer (`['publish', 'confirm']`).
- **Modal actions.** `callAction()` opens the modal first, so its form is filled from the server (`fillForm()`, defaults), then fills `$data` and submits. While an action is mounted, `fillForm()`, `assertFormSet()`, the field assertions and the error assertions work on the modal's form. A failed submit keeps the modal mounted.
- **`fillForm()`** posts every path you set to the schema refresh endpoint, so `afterStateUpdated` runs (for live and non-live fields, as in Filament's helpers). Keys are state paths: `'title'`, `'meta.seo_title'`, `'title.en'` for a translatable field.
- **Nested actions.** Mounting `['edit', 'preview']` while `edit` is mounted keeps `edit` underneath, as the stacked modals in the browser: its form state is sent with the nested action (`$mountedActions`, `getRawData()`), `fillData()` updates it, and `edit` is mounted again when the nested action closes. `replaceMountedAction()` mounts (or runs) the next action.
- **Server-side checks.** Raw column state, hidden filters and summarizer values never reach the browser; `assertTableColumnStateSet()`, `assertTableFilterExists()` / `Hidden()` and `assertTableColumnSummarySet()` resolve the table on the server from the page token (same user, tenant and table state). `$summarizerId` is the summarizer's id (`Sum::make('total')`) or its class in lower case (`sum`, `range`; a range compares `[min, max]`).
- **Visibility.** Hidden fields and actions are never sent to the browser, so "visible" means "present in the page" and a field that doesn't exist also counts as hidden.
- **Errors.** `assertHasFormErrors(['title' => 'required'])` matches Laravel's message for that rule (any language); you can also pass the expected message. `assertHasNoFormErrors()` also fails when the request was refused (403, 404…), so authorisation problems don't pass silently. Filament-style `data.title` keys work too.
- **After a successful action** the page is reloaded, as Inertia does after the redirect, so the table and form show the new data. `assertRedirect()` without a URL checks for a redirect to another page; an action that redirects back to the same page passes `assertNoRedirect()`.
- **Tenancy.** Pass the tenant as a route parameter: `alfakit()->testPage(ListProjects::class, ['tenant' => $team], panel: 'app')`. The endpoints restore it from the token and re-check membership.
- **Relation managers.**

    ```php
    alfakit()->testPage(EditPost::class, ['record' => $post])
        ->relationManager(CommentsRelationManager::class)
        ->assertCanSeeTableRecords($post->comments)
        ->searchTable('Bob')
        ->callTableAction('approve', $comment);
    ```

- **Wizards** (a `HasWizard` create page or a `Wizard` in the form, or the mounted action's wizard): `->fillForm([...])->goToNextWizardStep()->assertHasNoFormErrors()->assertWizardCurrentStep(2)`. A step that fails validation keeps the wizard where it is and its errors are available to `assertHasFormErrors()`.
- **Schema keys** are the component's `key()`, a field's state path, or its generated key (see `getDebugTree()`). `$schema` is `form` (the page form, or the mounted action's form), `infolist`, `content`, or the key of any content block.
- The helpers are `Macroable`: `PageTester::macro('assertSaved', fn () => $this->assertHasNoFormErrors()->assertNotified('Saved'))`.

### Actions inside schemas

Actions embedded in a form or infolist are reached through the component they sit on:

- **`Actions::make([...])` components** and a field's prefix, suffix and hint actions: `callFormComponentAction($key, $name, $data, $arguments)`, where `$key` is the component's `key()` (or the field's state path). Pass `schema: 'infolist'` for actions in the infolist. While an action is mounted, it targets the mounted modal's form.
- **Section header and footer actions** (`Section::make()->headerActions([...])`) run as page actions: `callAction()`, `assertActionVisible()` and the other page action helpers find them.

```php
it('stars a post from the form', function (): void {
    alfakit()->testPage(EditPost::class, ['record' => $post])
        ->callFormComponentAction('ratingActions', 'star')        // Actions::make([...])->key('ratingActions')
        ->assertFormSet(['rating' => 5])
        ->callFormComponentAction('author_id', 'createAuthor', ['name' => 'Ada']) // a field's suffix action
        ->assertHasNoFormErrors()
        ->callAction('publish')                                   // a section header action
        ->assertNotified('Published');
});
```

## Raw requests

```php
use function Pest\Laravel\{actingAs, get, post};

it('creates a post', function () {
    $user = User::factory()->create();

    $page = actingAs($user)->get('/admin/posts/create', ['X-Inertia' => 'true', 'X-Inertia-Version' => ''])->json('props.page');

    expect($page['content'][0]['type'])->toBe('Form');

    post('/admin/_alfakit/actions', [
        'token' => $page['token'],
        'action' => 'create',
        'data' => ['title' => 'Hello', 'slug' => 'hello'],
    ], ['X-Inertia' => 'true', 'X-Inertia-Version' => '', 'Accept' => 'application/json'])
        ->assertRedirect();

    expect(Post::where('slug', 'hello')->exists())->toBeTrue();
});
```

Validation failures return `422` with `errors` keyed by state path. Table state is tested through query strings (`/admin/posts?search=hello&sort=title`). Use `withoutVite()` in tests that render the Blade root view.

## Unit-testing schemas

```php
$schema = Schema::make()->record($post)->components(PostResource::form(Schema::make())->getComponents());
$schema->fill();
$schema->rawState([...]);
$data = $schema->validate();
```

Tables can be driven with `TableState::fromRequest()` and inspected with `getRecords()` / `toSchema()`.

## End-to-end browser tests

The monorepo ships a Playwright suite in `e2e/` that drives the three playground applications (React, Vue and Svelte) through Chrome with the same spec files: sign-in, dashboard, table search/sort/pagination, create with a validation error then success, edit with a `live()` field, file upload, a record action behind a confirmation modal, a bulk action, the theme and dark-mode switches, an RTL locale switch, a standalone form outside the panel and an axe-core WCAG 2.1 AA pass of the main pages.

```bash
pnpm e2e                       # all renderers, against the Herd playground sites
E2E_RENDERERS=react pnpm e2e   # one renderer
```

It uses the installed Google Chrome (`channel: 'chrome'`), so nothing is downloaded; `e2e/README.md` lists the environment variables and the one-time `playwright install chromium` step for machines without Chrome. `.github/workflows/e2e.yml` runs the same suite in CI against `php artisan serve`.

## Accessibility

Each renderer also runs axe-core against the hydrated server-rendered fixtures; see [Accessibility](./accessibility).
