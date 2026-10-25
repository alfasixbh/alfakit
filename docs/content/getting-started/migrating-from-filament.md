---
title: Migrating from Filament
description: One command converts a FilamentPHP v3, v4 or v5 application to AlfaKit and reports what is left to do by hand.
---

# Migrating from Filament

AlfaKit's PHP API mirrors Filament's (see [Coming from Filament](filament-comparison)), so most of a Filament application converts mechanically: class names, directories, the panel provider and a handful of methods. The parts that cannot convert are the ones tied to Blade, Livewire and Alpine. `alfakit:migrate-from-filament` does the mechanical work and writes a report with every remaining decision.

## The command

```bash
composer require alfasix/alfakit
git commit -am "Require AlfaKit"   # the migration needs a clean working tree

# Preview: prints every change and writes alfakit-migration-report.md, touches nothing else
php artisan alfakit:migrate-from-filament --dry-run --adapter=react   # or --adapter=vue, --adapter=svelte

# Migrate
php artisan alfakit:migrate-from-filament --adapter=react
```

| Option            | Effect                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--adapter=`      | `react`, `vue` or `svelte`; detected from `@inertiajs/*` in `package.json` when omitted                                                                                                                                                                      |
| `--dry-run`       | Show what would be done and write the report; no file is modified                                                                                                                                                                                            |
| `--path=`         | Migrate another application directory (defaults to the current app)                                                                                                                                                                                          |
| `--keep-filament` | Leave the `filament/*` packages in `composer.json`                                                                                                                                                                                                           |
| `--force`         | Run on a dirty git working tree                                                                                                                                                                                                                              |
| `--no-npm`        | Skip installing the `@alfakit/<adapter>` npm package                                                                                                                                                                                                         |
| `--rector=`       | Also run the Rector set before the built-in rewriter: a path to a Rector binary, or `auto` for the app's own `vendor/bin/rector`. By default (or with `none`) the built-in token rewriter does everything; it is the path the measured share below refers to |

The command needs a clean git working tree (so the migration is one reviewable diff) and refuses otherwise unless you pass `--force`; that is why the snippet commits the `composer require` first. The report a `--dry-run` wrote doesn't count as a change. Without git it first copies every touched file to `storage/alfakit-migration-backup-<timestamp>/`. Running it again finds nothing to do.

## What it converts

1. **Discovery.** `app/Filament`, `app/Providers/Filament`, every PHP file that references `Filament\` (including `app/Livewire` and `tests`), Blade views using `<x-filament…>` components, `resources/css/filament` themes, `config/filament.php`, `filament/*` and third-party `*filament*` packages, `filament:*` composer scripts and the installed Filament version.
2. **PHP rewrite.** The built-in `PhpToken`-based rewriter converts the code. With `--rector=auto` (or a path), the set in `vendor/alfasix/alfakit/rector/filament-to-alfakit.php` runs first and the built-in rewriter then handles whatever is left. It covers `use` statements, fully-qualified names, `extends`/`implements`, docblocks and class strings such as `'App\Filament\Resources'` and `app_path('Filament/Pages')`:
    - 230+ classes: `Filament\Forms\Components\*`, `Filament\Schemas\*`, `Filament\Tables\*`, `Filament\Actions\*`, `Filament\Infolists\*`, `Filament\Resources\*`, `Filament\Pages\*`, `Filament\Widgets\*`, `Panel`, `PanelProvider`, enums, notifications, contracts (`FilamentUser` → `CanAccessPanel`), auth and MFA classes, plus the v3 names (`Filament\Forms\Form` / `Filament\Infolists\Infolist` → `Schema`, `Filament\Forms\Components\Section` → `Schemas\Components\Section`, `Filament\Tables\Actions\EditAction` → `Actions\EditAction`, `MaxWidth` → `Width`, `Filament\Forms\Get`/`Set` → `Schemas\Components\Utilities\Get`/`Set`).
    - `form(Form $form): Form` → `form(Schema $form): Schema`; `->toolbarActions([..., BulkActionGroup::make([...])])` → `->headerActions([...])->bulkActions([...])`; `BulkActionGroup` wrappers are flattened; `->lazy()` → `->live(onBlur: true)`.
    - Property declarations are aligned with the AlfaKit parent through reflection: `string|BackedEnum|null $navigationIcon` → `?string`, `ChartWidget::$heading` is no longer static, and a chart widget's `getType()` (which returns `'line'`, `'bar'`, …) is renamed to `getChartType()`, because AlfaKit's own `getType()` returns the schema type.
    - `Heroicon::OutlinedUsers` and `'heroicon-o-users'` → Lucide names (`'users'`); `Color::Amber` → `'#d97706'`; `Color::hex('#…')` → the string.
    - Custom pages lose their Livewire plumbing: `implements HasForms` / `use InteractsWithForms` (and the table, action, infolist and schema equivalents) on pages, widgets and relation managers, `public ?array $data`, `$this->form->fill([...])` → `$this->formData = [...]`, `->statePath('data')` removed, `mount()` → `mount(mixed ...$parameters)`.
    - Panel providers: Filament's explicit cookie/session/CSRF middleware list becomes `['web']`, `authMiddleware([Authenticate::class])` goes (AlfaKit adds its own), `AccountWidget` / `FilamentInfoWidget` leave the widget list, `plugins()`, `renderHook()`, `viteTheme()`, `assets()`, `routes()` and the other methods without an equivalent are removed and reported.
    - Fluent methods that have no equivalent in the renderers (`extraAlpineAttributes()`, `livewire()`, cosmetic image-editor options such as `imageEditorMode()` and `imageEditorViewportWidth()`, …) are removed so the code keeps running, each with a report line.
3. **Directories and registration.** `app/Filament` → `app/Alfakit` (`App\Filament` → `App\Alfakit`), `app/Providers/Filament` → `app/Providers/Alfakit`, and `bootstrap/providers.php` registers the renamed providers. Files that already exist at the destination are left in place and reported.
4. **Configuration.** `config/filament.php` is removed and each key is mapped to its `config/alfakit.php` equivalent in the report; `filament:upgrade`, `filament:assets`, `filament:optimize*` in composer scripts become the `alfakit:*` commands.
5. **Frontend.** The installer's steps run without creating a second panel provider: `config/alfakit.php`, `resources/js/alfakit/app.(tsx|ts)`, `resources/css/alfakit.css`, the Vite inputs and the npm package. If `package.json` has no `@inertiajs/*` dependency (a Blade and Livewire Filament app) and you didn't pass `--adapter`, the command stops here and tells you to set up Inertia first; re-run it afterwards. With `--adapter` it sets up the toolchain itself (`alfakit:install --scaffold`: Inertia, the framework and its Vite plugin, Tailwind CSS, TypeScript).
6. **Cleanup.** `composer remove filament/filament …` (unless `--keep-filament`) and `alfakit:optimize-clear`.

### Filament 5 APIs

Code written for Filament 5.0–5.10 converts as written, including the resource layout of the v5 generators (`Resources/Products/{ProductResource, Schemas/ProductForm, Schemas/ProductInfolist, Tables/ProductsTable, Pages/…}`), clusters (`Clusters/Settings/{SettingsCluster, Pages, Resources}`), `Operation` in `visibleOn()` / `hiddenOn()`, `Flex`, `Width`, `GlobalSearchPosition`, `Tab` / `getTabs()` with `->query()` (renamed to `->modifyQueryUsing()`), `->reactive()` (→ `->live()`), `paginated([10, 25, 50])`, nested `RichEditor::toolbarButtons([['bold', 'italic'], ['h2', 'h3']])`, `Action` buttons in `Notification::actions()`, `getRecordRouteBindingEloquentQuery()`, `$this->record` in `CreateRecord::afterCreate()`, `Export::getFailedRowsCount()`, `route('filament.admin.resources.products.edit', …)` (→ `alfakit.admin…`, the tenant is filled in from the current one), `FontWeight::Bold` / `TextSize::Large` / `IconSize::*` / `FontFamily::Mono` (→ `'bold'`, `'lg'`, …), `Heroicon` used as a type (→ `string`), `HasAvatar::getFilamentAvatarUrl()` (→ `getAlfakitAvatarUrl()`), `->submit('save')` on custom page form actions (→ `->action(fn () => $this->save())`) and `->recordTitleAttribute()` on relation manager tables (the static property is used).

### Livewire components become custom components

Every Livewire component in `app/Livewire` gets an AlfaKit custom component scaffold, so the port starts from working files rather than a blank page:

- `app/Alfakit/Components/<Name>.php`: a schema component (use it anywhere with `<Name>::make()`) whose `getSchemaProps()` already returns the Livewire public properties' default values, and a docblock listing the Livewire properties and methods to port.
- `resources/js/alfakit/components/<Name>.(tsx|vue|svelte)`: the renderer half in the auto-registered `components/` folder (no registration needed with `createAlfakit({ discover })`), typed from the PHP property types, with the `wire:` bindings found in the Blade view listed in a TODO comment.

The Livewire class is kept (marked with a TODO) until you have moved its logic; delete it and its view afterwards.

### Plugins become first-party plugins

Popular Filament plugins map to first-party AlfaKit plugins. The report and the console print one command that adds them all, for example `php artisan alfakit:add calendar comments kanban shield`; plugin classes the code uses are converted to the plugin's classes.

| Filament plugin                                                                                                         | AlfaKit                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `bezhansalleh/filament-shield`                                                                                          | `shield` (`HasPageShield`, `HasWidgetShield`, `HasPanelShield` converted)                        |
| `filament/spatie-laravel-media-library-plugin`, `awcodes/filament-curator`                                              | `media-library` (`SpatieMediaLibraryFileUpload` / `ImageColumn` / `ImageEntry` keep their names) |
| `filament/spatie-laravel-tags-plugin`                                                                                   | `tags` (`SpatieTagsInput` / `Column` / `Entry`)                                                  |
| `filament/spatie-laravel-settings-plugin`                                                                               | `settings`                                                                                       |
| `kirschbaum-development/commentions`, `parallax/filament-comments`                                                      | `comments` (`CommentsAction`, `Commentable`, `HasComments` converted)                            |
| `mokhosh/filament-kanban`, `relaticle/flowforge`                                                                        | `kanban` (a board page gets a TODO: rebuild it as a `KanbanPage` or `KanbanWidget`)              |
| `saade/filament-fullcalendar`, `guava/calendar`                                                                         | `calendar` (`FullCalendarWidget` → `CalendarWidget`, same `fetchEvents()`)                       |
| `rmsramos/activitylog`, `pxlrbt/filament-activity-log`, `z3d0x/filament-logger`                                         | `activity-log`                                                                                   |
| `solution-forest/filament-tree`                                                                                         | `tree` (`ModelTree` converted)                                                                   |
| `shuvroroy/filament-spatie-laravel-backup`, `…-health`, `filament/spark-billing-provider`, `kenepa/translation-manager` | `backup`, `health`, `billing`, `translation-manager`                                             |
| `stechstudio/filament-impersonate`                                                                                      | built in: `Impersonate` → `ImpersonateAction`                                                    |

A class that extends a plugin class with no drop-in equivalent keeps working on an AlfaKit base class (`Page`, `Widget`, …) and gets a TODO with how to rebuild it.

### TODO markers and the converted share

Everything that needs a decision is marked in the code with `// TODO(alfakit-migration): …` (`{{-- … --}}` in Blade views, `/* … */` in theme CSS), so `grep -rn "TODO(alfakit-migration)"` lists what is left. The report starts with a summary: how many Filament constructs were found (class references, fluent methods, render hooks, views, themes, config keys, scripts and plugins), how many were converted automatically and how many need a manual step.

The repository's test corpus, a Filament 5.10 shop back office written from Filament's documented APIs (`packages/alfakit/tests/Fixtures/Filament5App`: resources with forms, tables, infolists, relation managers, a wizard, repeaters, import/export, filters including `QueryBuilder`, clusters, tenancy, multi-factor authentication, six widgets, custom pages with Blade views, render hooks, a theme, three Livewire components and nine plugins), converts **91.8% of its 574 constructs** automatically (527 with 0.1.7; the 47 manual steps are the Blade views and Livewire components, the plugin installs, the theme, a kanban board page and a Livewire test). `MigrateFromFilament5CorpusTest` checks that the result lints, passes PHPStan level 5 against AlfaKit, boots with its own providers in a separate process and renders every panel page (20 pages and 2 redirects), including the dashboard's deferred widgets.

## What it reports

`alfakit-migration-report.md` starts with the summary and the `alfakit:add` command for the plugins, lists what was done, then groups every item **by file** (manual steps marked **TODO** first, then notes about what was converted), and finally **by topic** as `file:line — what — suggested change`. The console prints the same, grouped by file, followed by the next steps (`npm install && npm run build`, the `alfakit:add` command for the plugins, `alfakit:optimize-clear`). A dry run counts the same constructs as the real run with the same options (without `--adapter`, a Blade and Livewire app gets one more manual step: setting up Inertia). The topics are:

- **Classes without an AlfaKit equivalent**: `HasForms` / `InteractsWithForms` and the other Livewire traits, `RenderHook`, `FilamentAsset`, … each with the replacement.
- **Methods removed or changed**: every stripped or renamed fluent method, return types changed to match the parent.
- **Blade views, Livewire components and Alpine**: pages with a `$view`, `->view('…')` on components, `resources/views` files using `<x-filament…>`, Livewire components in `app/Livewire`. The alternative is a frontend component for your renderer (`make:alfakit-field|column|entry|widget`, `View::make('name')`, `protected static ?string $component`) or an ejected built-in (`alfakit:eject`); forms and tables outside panels become `Standalone\Form` / `Standalone\Table` classes rendered with `<AlfakitComponent>`.
- **Panel configuration**: render hooks → [slots](../design/slots), middleware changes, removed widgets.
- **Plugins**: each `->plugins([...])` entry and each composer package with the first-party plugin (`alfakit:add <slug>`) or built-in feature that replaces it (impersonate → `ImpersonateAction`, Excel/import plugins → `ExportAction` / `ImportAction`, translatable → `->translatable()`, Breezy → `->profile()` and `->multiFactorAuthentication()`), or "no AlfaKit equivalent yet".
- **Themes**: `resources/css/filament/<panel>/theme.css` → `php artisan make:alfakit-theme <panel>` (themes override shadcn CSS variables, see [Themes](../design/themes)).
- **Configuration and scripts**, **Tests** (Livewire helpers → `alfakit()->testPage()`), and **Icons to check** (Heroicons without a one-to-one Lucide name).

## Manual steps after the migration

1. `npm install && npm run build` and open the panel. Resources, relation managers, widgets and the panel configuration should work as before.
2. Replace Blade views. A custom page that rendered `filament.pages.settings` now needs either schema components (`form()`, `infolist()`, header widgets, `getHeaderActions()`) or a frontend component registered in `createAlfakit({ components })` and named in `protected static ?string $component`. Delete the Blade files afterwards.
3. Port the scaffolded custom components (`app/Alfakit/Components`, `resources/js/alfakit/components`), or move Livewire forms and tables to [standalone components](../standalone/overview) rendered in your own Inertia pages.
4. Recreate themes with `make:alfakit-theme` and render hooks with `->slot(Slot::…, …)`.
5. Add the first-party plugins with the printed `php artisan alfakit:add …` command; for the rest use the built-in feature or implement a [plugin](../panels/plugins).
6. Rewrite tests with the [page test helpers](../advanced/testing); the method names match Filament's Livewire helpers.
7. Run `php artisan alfakit:optimize-clear` and your test suite, review the diff, commit.

## Before and after

```php
// app/Filament/Resources/PostResource.php (Filament v4)
namespace App\Filament\Resources;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PostResource extends Resource
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('title')->required()->lazy()]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('title')->searchable()])
            ->recordActions([EditAction::make()])
            ->toolbarActions([CreateAction::make(), BulkActionGroup::make([DeleteBulkAction::make()])]);
    }
}
```

```php
// app/Alfakit/Resources/PostResource.php (after alfakit:migrate-from-filament)
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;

class PostResource extends Resource
{
    protected static ?string $navigationIcon = 'file-text';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('title')->required()->live(onBlur: true)]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('title')->searchable()])
            ->recordActions([EditAction::make()])
            ->headerActions([
                CreateAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ]);
    }
}
```

The Rector set can also be run on its own, for example on a package: `vendor/bin/rector process src --config vendor/alfasix/alfakit/rector/filament-to-alfakit.php`. The class map it uses is `AlfaSix\Alfakit\Migration\FilamentClassMap`.
