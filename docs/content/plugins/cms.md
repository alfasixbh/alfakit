---
title: CMS
description: Block-based pages with drafts, scheduling, revisions and signed previews, SEO, sitemap and robots, redirects, menus, a public Inertia route with React, Vue and Svelte renderers, and a read-only JSON API.
---

# CMS

`alfasix/alfakit-cms` lets AlfaKit run your public site as well as your admin. Editors build pages from blocks in the panel, save drafts, schedule publication, restore earlier revisions and share preview links. Visitors get those pages at their own paths, rendered by the same React, Vue or Svelte renderer as the panel, with SEO metadata, a sitemap, `robots.txt`, redirects and menus. Headless frontends read the same pages from a JSON API.

Everything is decided on the server: block data is turned into render-ready JSON in PHP (rich text sanitised, links and media URLs checked, embeds limited to an allowlist), and the renderers only draw it. Nothing a visitor or an editor types is ever evaluated as code.

## For content editors

This part is for the people who write the website. You don't need to know anything technical.

### Making a page

1. Open **Content → Pages** and click **Create your first page** (or **New page**).
2. Pick a **template** if you like: it fills the page with ready-made blocks you can change. Or start with a blank page.
3. Type a **title**. The address of the page is filled in for you; you can change it.
4. Under **Content**, click **Add block** and pick what you want: a big heading (**Hero**), text, a picture, a gallery, questions and answers, a video… Each block says in one line what it is for.
5. Drag blocks by their handle to change the order. Use the copy button to duplicate a block, and **Hide from visitors** in the block's menu to keep it without showing it to visitors (**Show to visitors** brings it back).

Your work is **saved automatically as a draft** while you type ("All changes saved" appears next to **Live preview**). Nothing is visible to visitors until you publish.

### Seeing it before visitors do

The bar at the top of the form stays in view while you scroll. It shows where the page stands in plain words (for example **Draft** or **Changes not published yet**), whether your latest typing is saved, and the main buttons: **Live preview**, **Save draft** and **Publish**. Everything else (**Preview** in a new tab, **View live**, **Discard changes**, **Save as template**, **Unpublish**, **Delete**) is in the **⋮** menu next to the page title.

Click **Live preview** to open the page next to the form. It updates by itself a moment after you stop typing. On a wide screen it opens by itself; click **Hide preview** (or press Escape) to fold it away, and the editor remembers your choice next time on that browser. Use the buttons at the top of the pane to see the page as on a computer, a tablet or a phone, or full screen. On a phone it covers the form until you close it.

**Preview** (at the top of the page) opens the same view in a new tab. You can send that link to a colleague; it stops working after a day.

### Publishing

- **Publish** makes the page visible now. Pick a date and time instead to **schedule** it: it goes live by itself.
- After a page is published, your next changes are kept as a draft. The page shows **Changes not published yet** until you click **Publish changes**. Visitors keep seeing the old version in the meantime. **Discard changes** (in the **⋮** menu of every published page) throws your draft away, or says there is nothing to discard.
- **Unpublish** takes a page offline again.

If you can write pages but not publish them, you'll see **Submit for review** instead. Add a note if you like; an editor gets a notification, checks the page, and either clicks **Approve and publish** or **Request changes** with a note for you (you get a notification too). Pages waiting for an editor are in the **In review** tab.

### Going back to an earlier version

The **Revisions** tab lists every saved version, who saved it and when. **Compare** tells you in plain words what would change ("The title changes from … to …", "A FAQ block is removed"). **Restore** brings that version back; the current version stays in the list, so you can always undo.

### Search engines and sharing

Turn on **Show advanced settings** to see **Search and sharing**. It shows how the page may look in Google, counts the characters of the title and description, and gives tips: a missing description, a title that is too long, pictures without a description for people who can't see them. Fill in the **Alternative text** under each picture: it helps blind visitors and search engines.

### Reusable sections and templates

- **Reusable sections** are blocks you edit once and show on many pages, like a newsletter sign-up. Add them to a page with the **Reusable section** block. Changing the section changes every page that uses it.
- **Page templates** are starting points for new pages. Save any page as a template with **Save as template** (in the **⋯** menu of the editor).

### Menus

**Content → Menus** holds the links at the top and bottom of the site. Add items, pick a page (start typing to search) or type a web address, drag items to reorder them, and add sub-items under an item. Links to pages that aren't published are left out automatically.

### Editing from the website

If your site shows the **editing bar**, you'll see it at the bottom of every page while you're signed in: **Edit this page** takes you straight to the editor, **View draft** shows unpublished changes, **Back to dashboard** returns to the admin. The arrow button tucks the bar away.

## Installation

```bash
composer require alfasix/alfakit-cms
php artisan vendor:publish --tag=alfakit-cms-migrations
php artisan migrate
php artisan storage:link
```

The migration creates `alfakit_cms_pages`, `alfakit_cms_page_revisions`, `alfakit_cms_sections`, `alfakit_cms_templates`, `alfakit_cms_redirects` and `alfakit_cms_menus`. Each table that belongs to a tenant has a nullable `tenant_id` column; change it to `uuid()` or `ulid()` in the published migration before migrating if your tenant keys are not integers.

The block renderers ship in `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte`; there is nothing extra to install on the frontend.

## Register

```php
use AlfaSix\AlfakitCms\CmsPlugin;

$panel->plugin(
    CmsPlugin::make()
        ->siteName('Acme')
        ->publicRoutes()
        ->api(),
);
```

The plugin adds these resources to the panel, under a **Content** navigation group: **Pages**, **Reusable sections**, **Page templates**, **Menus** and **Redirects**. `publicRoutes()` (opt-in) serves published pages to visitors; `api()` (opt-in) adds the JSON API.

## Pages

A page has a title, a slug, an optional parent page, block content, publishing settings and SEO settings.

- **Paths** follow the page tree: a page with the slug `team` under `company` lives at `/company/team`. The path is stored on the page and kept in sync when a parent moves. A page can't be placed under itself or one of its descendants, and two pages of the same site can't share a path.
- **Home page**: turn on **Home page** to serve a page at the site root. There is one home page per tenant and language; marking another page as home releases the previous one. Your app's own `/` route wins over it (see [The public site](#the-public-site)).
- **Order**: `sort` orders sibling pages (menus have their own order).
- **Layout**: with `->layouts(['default' => 'Default', 'landing' => 'Landing'])`, editors pick a layout and the page's `layout` reaches the frontend, where your page component can switch on it.

The list has tabs for all, published, scheduled, draft and in-review pages, a status filter, bulk publish, unpublish and delete, and an empty state with **Create your first page**. The form keeps technical fields (search and sharing, order, layout, translation) behind **Show advanced settings**.

## Blocks

The **Content** section is a [Builder](../forms/builder) with these blocks (grouped, searchable and described in plain language in the block picker):

| Block            | Name             | What editors fill in                                                                                                                                         |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hero             | `hero`           | Eyebrow, heading, introduction, two buttons, an image beside the text, alignment                                                                             |
| Rich text        | `rich-text`      | Rich editor content, readable or wide width                                                                                                                  |
| Image            | `image`          | Image, alternative text, caption, width (contained, wide, full)                                                                                              |
| Gallery          | `gallery`        | Heading, 2 to 4 columns, images with alternative text and captions                                                                                           |
| Call to action   | `call-to-action` | Heading, text, two buttons, style (default, primary, muted)                                                                                                  |
| Features grid    | `features`       | Heading, introduction, 2 to 4 columns, features with an icon, title, description and link                                                                    |
| FAQ              | `faq`            | Heading, questions and answers (rendered as disclosure widgets and added to the JSON-LD as `FAQPage`)                                                        |
| Testimonials     | `testimonials`   | Heading, quotes with a name, role and photo. The block ships empty: there is no sample content to publish by accident                                        |
| Video or embed   | `embed`          | YouTube or Vimeo URL (played in privacy-enhanced mode), an `https` video file, or a page of an allowed host; title for screen readers; caption; aspect ratio |
| Columns          | `columns`        | 2 to 4 columns, each with its own blocks (any block but columns)                                                                                             |
| Form             | `form`           | A form your application provides (see [Forms](#form-embeds))                                                                                                 |
| Reusable section | `section`        | One of the panel's **Reusable sections** (`->sections(false)` removes both)                                                                                  |

Every block gets **Hide from visitors** / **Show to visitors** in its menu (stored as `cms_hidden`; hidden blocks are never rendered), a plain-language description in the block picker (`CmsBlock::getDescription()`, from `alfakit-cms::cms.blocks.{name}.description`), and an item label with its heading so collapsed blocks are easy to tell apart (`getSummary()`). Blocks can be dragged, moved with the keyboard and duplicated. `->blockPreviews()` shows a compact preview of each block instead of its fields until it is opened. Image fields have the image editor and, with alfasix/alfakit-media-library on the panel, a **choose from the media library** picker (not on tenancy panels, whose media isn't tenant-scoped; `->mediaLibrary(false)` turns it off).

`Block::description()` is a core Builder feature, so your own Builder blocks can use it too.

Every link field accepts `http(s)` URLs, paths, fragments, `mailto:` and `tel:` links only; `javascript:` and `data:` URLs fail validation and are dropped when rendering. Images are uploaded to the `public` disk under `cms/`; change both with `->disk('s3')->directory('site')`.

Limit or extend the block list:

```php
CmsPlugin::make()
    ->withoutBlocks(['testimonials', 'form'])       // remove blocks by name
    ->onlyBlocks(['hero', 'rich-text', 'image'])    // or keep only these, in this order
    ->embedHosts(['www.google.com'])                // extra https hosts the embed block may show
```

### Custom blocks

A block is a PHP class with a form (`schema()`) and the JSON its frontend component receives (`toFrontend()`). `toFrontend()` is the only data that reaches the browser, so build plain values with the helpers: `text()`, `html()` (sanitised rich content), `url()` (safe link), `link()` (button), `image()` (URL and alternative text), `choice()` and `items()`. `linkFields()` and `imageFields()` add the matching form fields.

```php
namespace App\Cms\Blocks;

use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitCms\Blocks\CmsBlock;
use AlfaSix\AlfakitCms\Support\BlockContext;

class PricingBlock extends CmsBlock
{
    public function getName(): string
    {
        return 'pricing';
    }

    public function getIcon(): ?string
    {
        return 'badge-dollar-sign';
    }

    public function getDescription(): ?string
    {
        return 'Your plans and prices, side by side.';
    }

    public function schema(): array
    {
        return [
            TextInput::make('heading')->required(),
            Repeater::make('plans')->schema([
                TextInput::make('name')->required(),
                TextInput::make('price')->required(),
            ]),
            $this->linkFields('cta'),
        ];
    }

    public function toFrontend(array $data, BlockContext $context): ?array
    {
        return [
            'heading' => $this->text($data, 'heading'),
            'plans' => array_map(fn (array $plan): array => [
                'name' => $this->text($plan, 'name'),
                'price' => $this->text($plan, 'price'),
            ], $this->items($data, 'plans')),
            'cta' => $this->link($data, 'cta'),
        ];
    }
}
```

```php
CmsPlugin::make()->blocks([PricingBlock::class]);
```

A block with the name of a default block replaces it. Return `null` from `toFrontend()` to skip a block (for example when a required value is missing). `getLabel()`, `getGroup()` and `getMaxItems()` customise the block picker, and `jsonLd()` adds a node to the page's structured data.

Register the renderer component under `cms:block:{name}` in each frontend. It receives `block` (`{ type, id, data }`) and `data`:

```tsx
// React
function PricingBlock({
    data,
}: {
    data: { heading: string; plans: { name: string; price: string }[] }
}) {
    return (
        <section className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-3xl font-semibold">{data.heading}</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
                {data.plans.map((plan) => (
                    <li key={plan.name} className="rounded-xl border p-6">
                        {plan.name}: {plan.price}
                    </li>
                ))}
            </ul>
        </section>
    )
}

createAlfakit({ components: { 'cms:block:pricing': PricingBlock } })
```

```vue
<!-- Vue: PricingBlock.vue, registered with createAlfakit({ components: { 'cms:block:pricing': PricingBlock } }) -->
<script setup lang="ts">
defineProps<{ data: { heading: string; plans: { name: string; price: string }[] } }>()
</script>

<template>
    <section class="mx-auto max-w-5xl px-4 py-16">
        <h2 class="text-3xl font-semibold">{{ data.heading }}</h2>
        <ul class="mt-8 grid gap-6 sm:grid-cols-3">
            <li v-for="plan in data.plans" :key="plan.name" class="rounded-xl border p-6">
                {{ plan.name }}: {{ plan.price }}
            </li>
        </ul>
    </section>
</template>
```

```svelte
<!-- Svelte: PricingBlock.svelte, registered with createAlfakit({ components: { 'cms:block:pricing': PricingBlock } }) -->
<script lang="ts">
    let { data }: { data: { heading: string; plans: { name: string; price: string }[] } } = $props()
</script>

<section class="mx-auto max-w-5xl px-4 py-16">
    <h2 class="text-3xl font-semibold">{data.heading}</h2>
    <ul class="mt-8 grid gap-6 sm:grid-cols-3">
        {#each data.plans as plan (plan.name)}
            <li class="rounded-xl border p-6">{plan.name}: {plan.price}</li>
        {/each}
    </ul>
</section>
```

You can also pass block components straight to `<CmsBlocks components={{ pricing: PricingBlock }}>` or `<CmsPage components={…}>`. Blocks without a renderer are not shown.

### Form embeds

The form block is a hook: list the forms editors may pick, and tell the server what to send for one. The frontend draws it with your `cms:form` component, which receives `form` (what you returned), `formKey` and `block`:

```php
CmsPlugin::make()
    ->formOptions(fn (): array => ['contact' => 'Contact us', 'newsletter' => 'Newsletter'])
    ->formUsing(fn (string $form, Page $page): ?array => [
        'action' => route('forms.submit', $form),
        'fields' => config("site.forms.{$form}"),
    ]);
```

```tsx
createAlfakit({ components: { 'cms:form': ContactForm } })
```

Without `formUsing()`, without a `cms:form` component, or for a form that is no longer listed, the block renders nothing (previews show a short notice instead).

### Reusable sections and page templates

**Reusable sections** (`SectionResource`) hold blocks shown on many pages through the `section` block; a section is rendered with the request's tenant only. **Page templates** (`TemplateResource`) are blocks a new page starts from: the create form has **Start from a template**, the editor **Save as template**. Templates can also live in code:

```php
CmsPlugin::make()->templates([
    'landing' => [
        'label' => 'Landing page',
        'content' => [
            ['type' => 'hero', 'data' => ['heading' => 'Your headline']],
            ['type' => 'features', 'data' => ['columns' => 3, 'items' => [['title' => 'First point']]]],
            ['type' => 'call-to-action', 'data' => ['heading' => 'Get started']],
        ],
    ],
]);
```

`->templateLibrary(false)` removes the templates resource (code templates still work).

### Blocks outside pages

`PageBuilder::make('content')` gives any resource the same block editor, and `Cms::blocks($model->content)` renders its state for `<CmsBlocks>`:

```php
use AlfaSix\AlfakitCms\Cms;
use AlfaSix\AlfakitCms\Forms\Components\PageBuilder;

PageBuilder::make('content'); // in a form schema

return Inertia::render('Products/Show', ['blocks' => Cms::blocks($product->content)]);
```

## Publishing

A page is a **draft**, **scheduled** or **published**, and a published page can have **changes not published yet**:

- **Publish** (on the editor, the table and in bulk) publishes now, or at the time you pick. A scheduled page goes live by itself at that time: public queries only show pages whose `publish_at` has passed, so no queue worker or cron job is involved.
- On a published page, **Save draft** stores the changes in the page's `draft` column; visitors keep the live version until **Publish changes** applies them (a revision is recorded and a redirect is added if the path changed). **Discard changes** drops them. Turn this off with `->draftChanges(false)` to make saves of published pages live at once.
- **Unpublish** turns a page back into a draft.

Publishing needs the `publish` ability (below). Users without it create drafts and can edit pages, but the server ignores any status or schedule they send.

### Autosave and live preview

The editor autosaves the form as the page's draft a moment after the last change (the editor page's `#[Expose]` method `cmsAutosave`, rate limited, checked against `update`; the form state is not validated, and live content never changes). The **Live preview** pane beside the form reloads the signed preview of that draft, at desktop, tablet (768 px) or phone (390 px) width, or full screen. The pane's code is loaded the first time an editor opens (`CmsLivePreview`, registry key `CmsLivePreview`).

```php
CmsPlugin::make()->livePreview(debounce: 1000);   // wait 1 s after typing stops
CmsPlugin::make()->livePreview(false);             // no autosave or live preview
```

### The editor bar

`PageResource::form()` starts with `LivePreview::make()` (`AlfaSix\AlfakitCms\Forms\Components\LivePreview`, schema type and registry key `CmsLivePreview`): a bar that sticks below the panel's top bar with

- the page's status, a badge and a sentence from `PageResource::describeEditorStatus()` (it switches to **Changes not published yet** as soon as an autosave makes the draft differ from the live page);
- the autosave indicator;
- the **Live preview** toggle;
- the editor's main actions, from `EditPage::getEditorActions()`: **Approve and publish** / **Request changes** / **Submit for review** when they apply, **Save draft** and **Publish** (or **Publish changes**, which appears as soon as an autosave makes a published page's draft differ: the bar is sent `changedActions` next to `actions`, as it is sent `changedStatus`). They run as ordinary page actions, after the latest typing is autosaved. The other actions are grouped in the header's menu (`getHeaderActions()`), and there are no buttons below the form.

Change the bar's buttons in your own edit page:

```php
use AlfaSix\AlfakitCms\Resources\PageResource\Pages\EditPage as BaseEditPage;
use AlfaSix\Alfakit\Actions\Action;

class EditPage extends BaseEditPage
{
    public function getEditorActions(): array
    {
        return [
            ...parent::getEditorActions(),
            Action::make('checklist')
                ->label('Launch checklist')
                ->url(fn (): string => route('launch-checklist')),
        ];
    }
}
```

and point the plugin at it with `CmsPlugin::make()->pageResource(...)` and a resource whose `getPages()` uses it.

The preview pane opens beside the form by itself when the column holding the form is at least 1440 px wide, never on phones and tablets (below 1024 px), and follows the viewer's last choice after they open or close it (kept in `localStorage` under `alfakit:cms-live-preview`; the helpers are `cmsPreviewOpensOnLoad()` and `rememberedCmsPreview()` in `@alfakit/core`). While it is open beside the form, the panel's content area moves clear of it and the pane starts below the sticky top bar. When the form would keep less than 640 px next to the pane (for example at 1280 px with the sidebar open), the preview opens as a full-screen overlay instead, so the form never runs under it (`cmsPreviewFitsBeside()`), and it never opens by itself there.

The content builder uses `Builder::blockActionsMenu()` (item actions in a **More** menu) and each built-in block has a `Block::summary()` (its heading, title, question or caption; `CmsBlock::getSummary()`) so collapsed blocks are easy to tell apart; see [Builder](/docs/forms/builder).

### Review workflow

People who may edit but not publish a page see **Submit for review** (ability `submitForReview`, falling back to `update`). People with `publish` see **Approve and publish** (with an optional schedule) and **Request changes** (with a note). Each step sends a database notification (the panel bell, `->databaseNotifications()`): submissions go to the users returned by `review(reviewers: …)`, decisions go back to the author.

```php
CmsPlugin::make()->review(reviewers: fn (Page $page): iterable => User::role('editor')->get());
CmsPlugin::make()->review(false); // no review workflow
```

`PageSubmittedForReview` and `PageReviewed` events fire too, and the list has an **In review** tab.

`PagePublished`, `PageUnpublished` and `PageRevisionRestored` events fire from the panel actions.

### Revisions

Every save that changes the title, slug, parent, home page flag, content, SEO or layout of the live page records a revision with its author. The **Revisions** tab of the editor lists them with a preview link, **Compare** (what restoring would change, in plain sentences: `RevisionDiff::describe()`) and a **Restore** action. Restoring copies that version back as a new revision ("Restored from revision 3"), so nothing is lost; it never changes whether the page is published. When the restored path is now used by another page, the current slug is kept.

Revisions beyond the 50 newest per page are pruned; change that with `->revisionsLimit(100)` (`0` keeps all).

### Preview links

**Preview** opens a temporary signed link that renders the page with its unpublished changes as visitors would see it, whatever its status; each revision has one too. Links expire after a day (`->previewLinkLifetime(60)` in minutes) and any change to the URL invalidates them. Preview responses send `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, and show a preview banner. Anyone holding a link can open it until it expires, so share it with care.

The preview route (`/_cms/preview/{page}`) is registered whenever a panel has the plugin; create links in code with `Cms::previewUrl($page)`.

## SEO

The **Search and sharing** section of a page sets its meta title, meta description, sharing image, canonical URL, page type (`WebPage`, `AboutPage`, `ContactPage`, `CollectionPage`, `FAQPage`, `ItemPage`) and **Hide from search engines**. From these the server builds:

- `<title>`: the meta title, else `titleTemplate()` (`:title | :site` by default);
- meta description, `robots` (`noindex, nofollow` for hidden pages and previews), canonical link;
- Open Graph and Twitter card tags (the sharing image, else `defaultOgImage()`);
- `hreflang` alternates between translations;
- a JSON-LD graph: the page, its breadcrumbs, and what blocks add (FAQ questions).

```php
CmsPlugin::make()
    ->siteName('Acme')
    ->titleTemplate(':title — :site')
    ->defaultOgImage(asset('images/og.png'))
    ->modifySeoUsing(fn (array $seo, Page $page): array => [...$seo, 'robots' => 'index, follow, max-image-preview:large']);
```

In the editor, **Search and sharing** shows a search-result preview, character counters for the meta title and description, and plain-language tips (missing or long description, long title, images without alternative text, hidden page) computed from the form as it changes (`SeoAdvisor`). The section is part of **Show advanced settings**, which also holds the page order, layout and translation fields, so the default view stays simple.

The renderers print these through Inertia's `<Head>` (server-rendered with [SSR](../advanced/ssr)). Without SSR, print the same tags in your Blade root view so crawlers that don't run JavaScript still see them:

```blade
<head>
    {{ $alfakitCmsHead ?? '' }}
    @inertiaHead
</head>
```

The JSON-LD is encoded with `<`, `>` and `&` escaped, so it can never close its `<script>` element.

### Sitemap and robots.txt

With `publicRoutes()`, `/sitemap.xml` lists every live page that isn't hidden from search engines, in every language, with `lastmod` and `hreflang` alternates. `/robots.txt` allows everything except preview links and points to the sitemap. Turn them off with `->sitemap(false)` / `->robots(false)`, or write your own `robots.txt`:

```php
CmsPlugin::make()->robots(using: fn (): array => [
    'User-agent: *',
    'Disallow: /checkout',
    'Sitemap: '.url('/sitemap.xml'),
]);
```

## Redirects

**Redirects** sends visitors from an old path to a path or URL with a 301, 302, 307 or 308. End the source with `*` to redirect everything below it, and use `*` in the target for the rest of the path (`/blog/*` → `/news/*`). The query string is kept unless the target has its own; Inertia visits get a full page visit to the target. Each redirect counts its hits and remembers when it was last used.

When a published page moves (a new slug or parent), a 301 redirect from its old path is added, redirects that pointed at the old path are updated, and a redirect away from the new path is removed so it can't hide the page. Turn that off with `->redirectOnPathChange(false)`.

Active redirects are cached per tenant (cleared whenever one changes) and applied by middleware that the plugin adds to the `web` group. Add it yourself instead with `->redirectMiddleware(false)` and `AlfaSix\AlfakitCms\Http\Middleware\HandleRedirects` (alias `alfakit-cms.redirects`); the public page route applies redirects either way. `->redirects(false)` removes the manager.

## Menus

**Menus** builds navigation menus: nested items (up to three levels) that link to a page or a URL, dragged into order, optionally opening in a new tab. A menu has a handle (`main`, `footer`) and, on multilingual sites, a language (or all languages).

Menu items that link to pages always use the page's current URL, and items whose page isn't live are left out. Each item comes with `current` (the requested page) and `active` (it or one of its children):

```php
CmsPlugin::make()->sharedMenus(['main', 'footer', 'legal']); // shared with public pages as cms.menus
```

Use them on your own Inertia pages too:

```php
use AlfaSix\AlfakitCms\Cms;

// AppServiceProvider::boot(): every Inertia response gets `cmsMenus.main` and `cmsMenus.footer`.
Cms::shareMenus(['main', 'footer']);

$menu = Cms::menu('main');            // ['handle' => 'main', 'name' => 'Main', 'items' => [...]]
$url = Cms::url($page);               // the page's public URL
```

## The public site

```php
CmsPlugin::make()->publicRoutes(prefix: '', middleware: ['web'], domain: null);
```

This registers `sitemap.xml`, `robots.txt` and a catch-all route for published pages. The catch-all is a Laravel fallback route, so every route of your application wins over it; a path without a live page answers 404 (after checking redirects). With a `prefix`, the site lives below it (`/site/about`). Only the first panel with `publicRoutes()` serves the site.

That includes `/`: Laravel's starter kits and a fresh app route it to their welcome page, so the CMS home page doesn't show until that route serves it. Keep the route's name (the starter kits' auth pages link to `home`) and point it at the CMS page controller:

```php
// routes/web.php
use AlfaSix\AlfakitCms\Http\Controllers\PageController;

Route::get('/', PageController::class)->name('home');
```

Pages render the `Alfakit/CmsPage` Inertia component with a `cms` prop: the page (blocks, SEO, breadcrumbs, translations), the shared menus, the site (name, URL, language, direction, languages) and the renderers' strings. Register the component in your public site's Inertia app:

```tsx
// resources/js/site.tsx (React; site.ts with @alfakit/vue or @alfakit/svelte is the same)
import { CmsPage, createAlfakit } from '@alfakit/react'
import '../css/alfakit.css' // panel mode: the stylesheet alfakit:install created; starter-kit mode: '../css/app.css'

createAlfakit({
    pages: { 'Alfakit/CmsPage': CmsPage },
    components: { 'cms:block:pricing': PricingBlock },
})
```

Import a stylesheet that loads Tailwind first: `resources/css/alfakit.css` in panel mode, or `resources/css/app.css` in starter-kit mode (only panel-mode installs create `alfakit.css`; the starter kit's `app.css` already imports AlfaKit's standalone styles): `@alfakit/*/styles.css` uses Tailwind utilities and can't be imported from JavaScript on its own. Load the entry from a Blade view of its own and add it to `laravel-vite-plugin`'s `input`:

```blade
{{-- resources/views/site.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @vite(['resources/js/site.tsx'])
        <x-inertia::head />
    </head>
    <body>
        <x-inertia::app />
    </body>
</html>
```

Then render public pages with it: `CmsPlugin::make()->publicRoutes()->rootView('site')`. A Laravel starter kit's own root view (`app.blade.php`) loads `resources/js/pages/{component}`, which has no `Alfakit/CmsPage`.

If your public pages use your own Inertia setup instead, add `CmsPage` to its `resolve()`: the component brings its own translations and works without a panel. Set the Blade root view of public pages with `->rootView('site')` when it isn't your Inertia middleware's, and the component name with `->inertiaComponent('Site/Page')` to render your own page:

```tsx
import { CmsBlocks, CmsHead, CmsNav, CmsProvider, type CmsPageProps } from '@alfakit/react'

export default function SitePage({ cms }: CmsPageProps) {
    return (
        <CmsProvider payload={cms}>
            <CmsHead seo={cms.page.seo} />
            <header>
                <CmsNav menu={cms.menus.main} />
            </header>
            <main>
                <CmsBlocks blocks={cms.page.blocks} />
            </main>
        </CmsProvider>
    )
}
```

`CmsPage` includes a skip link, a sticky header with the `main` menu (submenus open with a button and close with Escape; a disclosure menu on phones), language links, breadcrumbs, the blocks and a footer with the `footer` menu. It sets the document's `lang` and `dir` from the page's language and lays out right to left for RTL languages. Replace the header or footer with `cms:header` / `cms:footer` registry components (they receive `cms`). Every element has a `data-slot` (`cms-page`, `cms-header`, `cms-nav`, `cms-block`, `cms-hero`, `cms-faq`…) for styling.

### The editing bar

```php
CmsPlugin::make()->adminBar();
```

Public pages then include `cms.admin` (edit URL, draft preview URL, dashboard URL) for signed-in panel users who may `update` the page, and `CmsPage` shows a floating, collapsible bar with **Edit this page**, **View draft** and **Back to dashboard**. Its code loads only for those users; visitors get no extra JavaScript or data.

### Tenancy

On a tenancy panel, pages, menus and redirects belong to the panel's current tenant: lists, editors, parent and page pickers, path uniqueness, menus and redirects never mix tenants. The public site needs to know which tenant a request is for:

```php
CmsPlugin::make()
    ->publicRoutes()
    ->resolveTenantUsing(fn (Request $request): ?Team => Team::firstWhere('domain', $request->getHost()));
```

Without a resolver (or when it returns null), a tenancy site serves no pages, so one tenant's pages can never leak to another tenant's visitors. The sitemap, API, menus and redirects use the same tenant.

### Languages

```php
CmsPlugin::make()->locales(['en' => 'English', 'ar' => 'العربية'], default: 'en', prefixDefault: false);
```

Pages and menus get a language. The default language is served without a prefix (`/about`) and the others under their code (`/ar/about`); with `prefixDefault: true` every language has a prefix and `/` redirects to the default one. Link a page to its counterpart with **Translation of**: translations share `hreflang` alternates, the sitemap lists them together, and `CmsPage` links between them. Slugs are per language, so `/about` and `/ar/من-نحن` can be translations of each other.

## JSON API

```php
CmsPlugin::make()->api(prefix: 'api/cms', middleware: ['api']);
```

Read-only endpoints for headless frontends; drafts, scheduled pages, hidden menu items and other tenants' content are never returned:

| Endpoint                                      | Returns                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/cms/pages?locale=en&per_page=50`    | Live pages (`id`, `title`, `path`, `url`, `locale`, `isHome`, `updatedAt`) with pagination `meta`       |
| `GET /api/cms/page?path=about/team&locale=en` | One page with its render-ready blocks, SEO, breadcrumbs and alternates (an empty path is the home page) |
| `GET /api/cms/menus/{handle}?locale=en`       | A menu with its live links                                                                              |

The page payload is the same `cms.page` the Inertia route sends, typed as `CmsPageSchema` in `@alfakit/core`. Add throttling or authentication with the `middleware` argument.

## Authorisation

Every ability goes through the plugin's `authorize()` closure when you set one, else the model's policy (`Page`, `Menu`, `Redirect`):

```php
use AlfaSix\AlfakitCms\Models\Page;

CmsPlugin::make()->authorize(fn (string $ability, string $model, ?Model $record, ?User $user): bool => match (true) {
    $model === Page::class && $ability === 'publish' => $user?->hasRole('editor-in-chief') ?? false,
    default => $user?->hasRole(['editor', 'editor-in-chief']) ?? false,
});
```

Abilities are `viewAny`, `view`, `create`, `update`, `delete` and `deleteAny`, plus `publish` (publish, schedule, unpublish, approve or request changes), `submitForReview` and `restoreRevision` for pages. With a `PagePolicy`, `publish`, `submitForReview` and `restoreRevision` fall back to `update` when the policy doesn't define them.

A typical setup: **editors** may `publish`; **authors** may `create` and `update` but not `publish`, so they submit pages for review; **reviewers** are editors listed in `review(reviewers: …)`.

With alfasix/alfakit-shield, subclass the page resource to give Shield the CMS permissions (`publish_page`, `submit_for_review_page`, `restore_revision_page`, mapped to the policy methods above):

```php
use AlfaSix\AlfakitCms\CmsPlugin;
use AlfaSix\AlfakitCms\Resources\PageResource as BasePageResource;
use AlfaSix\AlfakitShield\Contracts\HasShieldPermissions;

class PageResource extends BasePageResource implements HasShieldPermissions {}

CmsPlugin::make()->pageResource(PageResource::class);
```

Without a policy everything is allowed unless the panel uses `strictAuthorization()`. Guests are never allowed. Revisions are shown to users who may update the page.

## Options

| Method                                                            | Default                               | Description                                                   |
| ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `siteName()`                                                      | `config('app.name')`                  | Site name in titles, Open Graph and the default header        |
| `titleTemplate()`                                                 | `':title \| :site'`                   | Title of pages without a meta title                           |
| `defaultOgImage()`                                                | none                                  | Sharing image of pages without one                            |
| `modifySeoUsing()`                                                | none                                  | Change a page's SEO payload                                   |
| `blocks()` / `withoutBlocks()` / `onlyBlocks()`                   | default blocks                        | The page builder's blocks                                     |
| `embedHosts()`                                                    | none                                  | Extra `https` hosts for the embed block                       |
| `formOptions()` / `formUsing()`                                   | none                                  | The form block hook                                           |
| `disk()` / `directory()`                                          | `public` / `cms`                      | Where block and sharing images are stored                     |
| `layouts()`                                                       | none                                  | Page layouts editors can pick                                 |
| `publicRoutes()`                                                  | off                                   | Public pages, sitemap and robots (prefix, middleware, domain) |
| `inertiaComponent()` / `rootView()`                               | `Alfakit/CmsPage` / your middleware's | How public pages render                                       |
| `sharedMenus()`                                                   | `['main', 'footer']`                  | Menus sent with public pages                                  |
| `resolveTenantUsing()`                                            | none                                  | Tenant of a public request                                    |
| `locales()`                                                       | single language                       | Content languages and URL prefixes                            |
| `sitemap()` / `robots()`                                          | on                                    | `sitemap.xml` and `robots.txt`                                |
| `api()`                                                           | off                                   | The JSON API (prefix, middleware)                             |
| `previewLinkLifetime()`                                           | 1440 minutes                          | How long preview links work                                   |
| `revisionsLimit()`                                                | 50                                    | Revisions kept per page                                       |
| `draftChanges()`                                                  | on                                    | Keep changes of published pages as a draft until published    |
| `livePreview()`                                                   | on, 1500 ms                           | Autosave and the live preview pane                            |
| `review()`                                                        | on                                    | The review workflow and who is notified                       |
| `adminBar()`                                                      | off                                   | The editing bar on public pages                               |
| `templates()` / `templateLibrary()`                               | none / on                             | Page templates in code and in the panel                       |
| `sections()`                                                      | on                                    | Reusable sections                                             |
| `blockPreviews()`                                                 | off                                   | Compact block previews in the editor                          |
| `mediaLibrary()`                                                  | on when installed                     | Media library picker in image fields                          |
| `redirects()` / `redirectOnPathChange()` / `redirectMiddleware()` | on                                    | Redirect manager and behaviour                                |
| `menus()`                                                         | on                                    | Menu builder                                                  |
| `authorize()`                                                     | policies                              | Decide every ability                                          |
| `pageResource()` / `menuResource()` / `redirectResource()`        | built-in                              | Your own subclasses of the resources                          |
| `navigationGroup()` / `navigationSort()`                          | Content                               | Navigation of the resources                                   |

## Security

- Rich text is sanitised on the server with the panel's [HTML sanitizer](../advanced/security) before it is sent; renderers insert only that HTML. Every other block value is plain text, printed as text.
- Links accept `http(s)`, paths, fragments, `mailto:` and `tel:` only, checked when saving and again when rendering. New-tab links get `rel="noopener noreferrer"`.
- Embeds are limited to YouTube (privacy-enhanced `youtube-nocookie.com`), Vimeo, `https` video files and the hosts you allow; iframes from allowed hosts are sandboxed. Media paths can't leave the CMS disk.
- JSON-LD is encoded so it can't close its script element, and renderers refuse JSON-LD that contains `<`.
- Public queries, the sitemap, menus, redirects and the API only return live content of the request's tenant. Previews require a valid, unexpired signature and are never indexed or cached.
- Publishing is authorised separately (`publish`), and the server ignores status changes from users without it.

## Translations

The plugin ships its strings in every AlfaKit language under `alfakit-cms::cms`; the renderers' strings are the `cms.*` group (`cms.ui`). Publish them to change the wording:

```bash
php artisan vendor:publish --tag=alfakit-cms-translations
```

## "Powered by" credit

The pages and emails your customers see carry no AlfaKit or Alfa Six branding by default. To credit AlfaKit, turn on the small "Powered by AlfaKit · Alfa Six" line for the public site, below the footer (your `cms:footer` component included):

```php
CmsPlugin::make()->poweredBy();
```

Without `poweredBy()`, the plugin follows `config('alfakit.credit.public_pages')` and `config('alfakit.credit.emails')`, both `false` by default. See [Credits](../panels/configuration#credits).
