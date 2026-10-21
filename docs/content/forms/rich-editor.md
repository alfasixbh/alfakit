---
title: Rich editor
description: Toolbar, floating toolbars, attachments, JSON storage, custom blocks, mentions, merge tags, model configuration, plugins and fake content.
---

# Rich editor

`RichEditor` is a Tiptap editor that stores HTML (or, with `json()`, a Tiptap JSON document). `MarkdownEditor` shares the toolbar and attachments and stores Markdown; the extensions on this page are RichEditor only.

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor;

RichEditor::make('content')
    ->toolbarButtons(['bold', 'italic', 'link', '|', 'h2', 'h3', 'bulletList', 'orderedList', '|', 'attachFiles', 'undo', 'redo'])
    ->fileAttachmentsDisk('s3')
    ->fileAttachmentsDirectory('posts')
    ->minHeight(240)
    ->columnSpanFull();
```

Toolbar buttons:

| Group     | Buttons                                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text      | `bold`, `italic`, `underline`, `strike`, `subscript`, `superscript`, `code` (inline), `highlight`, `textColor`, `small`, `link`, `clearFormatting`                                                                                                                |
| Blocks    | `h1`–`h6`, `heading`, `paragraph`, `lead`, `blockquote`, `codeBlock`, `bulletList`, `orderedList`, `horizontalRule`, `details` (a collapsible section), `grid`, `gridAddColumnBefore`, `gridAddColumnAfter`, `gridDeleteColumn` and `gridDelete` (column layouts) |
| Alignment | `alignStart`, `alignCenter`, `alignEnd`, `alignJustify`                                                                                                                                                                                                           |
| Tables    | `table`, `tableAddColumnBefore`, `tableAddColumnAfter`, `tableDeleteColumn`, `tableAddRowBefore`, `tableAddRowAfter`, `tableDeleteRow`, `tableMergeCells`, `tableSplitCell`, `tableToggleHeaderRow`, `tableToggleHeaderCell`, `tableDelete`                       |
| Other     | `attachFiles`, `undo`, `redo`, `customBlocks`, `mergeTags`, `\|` (a separator)                                                                                                                                                                                    |

`disableToolbarButtons([...])` removes some, `disableAllToolbarButtons()` all of them. The default toolbar is unchanged (`bold`, `italic`, `underline`, `strike`, `link`, `h2`, `h3`, `blockquote`, `codeBlock`, `bulletList`, `orderedList`, `attachFiles`, `undo`, `redo`); add the others you want:

```php
RichEditor::make('content')->toolbarButtons([
    'bold', 'italic', 'underline', 'textColor', 'highlight', 'subscript', 'superscript', 'code', '|',
    'h2', 'h3', 'alignStart', 'alignCenter', 'alignEnd', '|',
    'bulletList', 'orderedList', 'table', 'details', '|',
    'clearFormatting', 'attachFiles', 'undo', 'redo',
]);
```

- **Alignment** is logical: `alignStart` and `alignEnd` follow the reading direction, so the same content lines up correctly in Arabic and English. Pressing the active alignment again removes it. Stored as `<p style="text-align: center">`.
- **Tables**: `table` inserts a 3×3 table with a header row. While the cursor is in a table a second toolbar row offers the other table buttons (add/delete rows and columns, merge/split cells, header row/cell, delete table); you can also list them in the main toolbar.
- **Details** inserts `<details><summary>…</summary><div data-type="detailsContent">…</div></details>`. It stays open while editing and is collapsible when rendered.
- **Headings and paragraphs**: `h1` to `h6` toggle a heading level; `paragraph` turns the current block back into a plain paragraph.
- **Columns**: `grid` asks for a number of columns (2 to 6) and inserts a column layout with an empty paragraph in each column; `gridAddColumnBefore` / `gridAddColumnAfter` add a column next to the one the cursor is in (up to 6), `gridDeleteColumn` deletes it with its content (a two-column grid is unwrapped), and `gridDelete` removes the layout the cursor is in. With `grid` in the toolbar these four buttons show in a floating toolbar next to the grid, unless `floatingToolbars()` sets a `grid` one. Stored as `<div data-type="grid" class="alfakit-grid alfakit-grid-cols-2"><div data-type="gridColumn" class="alfakit-grid-column">…</div>…</div>`; columns stack on small screens.
- **Lead and small text**: `lead` toggles a larger intro paragraph (`<p class="alfakit-lead">`; Filament's `<p class="lead">` is read too), `small` toggles `<small>` text.
- The `alfakit-grid*` and `alfakit-lead` styles ship in the panel's CSS (`themes.css`). When you render content outside a panel, copy those rules into your own stylesheet. The sanitiser only keeps `alfakit-*` classes, so the strict defaults are unchanged.
- **Text colour** opens a palette. Colours are stored as `<span data-color="#dc2626" style="color: #dc2626">`.

```php
RichEditor::make('content')
    ->toolbarButtons(['bold', 'textColor'])
    ->textColors([
        '#dc2626' => 'Red',
        '#2563eb' => 'Blue',
        ...RichEditor::getDefaultTextColors(),
    ])
    ->customTextColors(); // also offer a free colour picker
```

`textColors()` maps a CSS colour (`#hex`, `rgb()`, `hsl()` or a colour name) to its label; other values are dropped. The default palette is Tailwind's 600 shades (red, orange, amber, green, teal, blue, indigo, purple, pink, gray), which read on light and dark backgrounds.

### Grouped buttons

`ToolbarButtonGroup` collapses buttons into one dropdown. Place it in `toolbarButtons()` (or a floating toolbar) like a button name:

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor\ToolbarButtonGroup;

RichEditor::make('content')->toolbarButtons([
    ToolbarButtonGroup::make('Heading', ['h1', 'h2', 'h3'])->icon('heading'),
    ToolbarButtonGroup::make('Align', ['alignStart', 'alignCenter', 'alignEnd'])->textualButtons(),
    'bold', 'italic', 'link',
]);
```

The label is the trigger's tooltip and accessible name. Without `icon()` the trigger shows the icon of the active button (or the first one). The dropdown is a row of icon buttons; `textualButtons()` lists them with their labels instead. `disableToolbarButtons()` also removes buttons from groups, and a group left empty is dropped.

### Floating toolbars

```php
RichEditor::make('content')->floatingToolbars([
    'paragraph' => ['bold', 'italic', 'underline', 'link', 'textColor'],
    'heading' => ['alignStart', 'alignCenter', 'alignEnd'],
    'table' => ['tableAddRowAfter', 'tableAddColumnAfter', 'tableDeleteRow', 'tableDeleteColumn', 'tableDelete'],
]);
```

A floating toolbar shows above the selection, keyed by the node it belongs to: `paragraph` and `heading` toolbars appear while text is selected; other nodes (`table`, `blockquote`, `codeBlock`, `bulletList`, `orderedList`, `details`) while the cursor is inside; `image` and `customBlock` while the node is selected. The innermost node with a toolbar wins. A `table` floating toolbar replaces the table row of buttons. Buttons used only in floating toolbars load their editor extensions too (a `textColor` button there gets its palette).

### Keyboard

The toolbars follow the WAI-ARIA toolbar pattern: each is one tab stop, the arrow keys (swapped right to left), Home and End move between its buttons, and Escape goes back to the text. Alt+F10 in the text moves to the floating toolbar (or the main one) and cycles between them.

### Links

```php
RichEditor::make('content')->linkProtocols(['https', 'mailto']);
```

`linkProtocols()` limits the URL schemes links may use. The editor won't create other links, links with another scheme lose their `href` when the form is saved, and `RichContentRenderer::linkProtocols()` (or `registerRichContent()->linkProtocols()`, which the editor reads too) keeps only those schemes when rendering. Relative links are always allowed. Without it, `http`, `https`, `mailto` and `tel` are allowed.

### Sticky toolbar and panels

```php
RichEditor::make('content')
    ->stickyToolbar()
    ->stickyPanels()
    ->stickyOffset('4rem'); // optional
```

`stickyToolbar()` keeps the toolbar in view while long content scrolls; `stickyPanels()` does the same for the custom block and merge tag panels when they sit beside the content. The offset defaults to the height of the panel's topbar when it sticks to the top of the page; `stickyOffset()` takes a plain CSS length (`px`, `rem`, `em`, `vh`, `%`), other values are ignored.

### Resizable images

```php
RichEditor::make('content')->resizableImages();
```

Selected (or hovered) images get corner handles; dragging keeps the aspect ratio. The width is stored on the image as whole pixels (`<img src="…" width="320">`), the height follows it so images still shrink on narrow screens. The sanitiser keeps `width` and `height` on images only as pixel sizes up to 10000 or percentages up to 100%.

### Attachments

Images are uploaded to the temporary disk while editing and moved to the attachments disk when the form is saved; the `src` is rewritten to the stored URL.

```php
RichEditor::make('content')
    ->fileAttachmentsAcceptedFileTypes(['image/png', 'image/jpeg'])
    ->fileAttachmentsMaxSize(2048); // kilobytes
```

`fileAttachmentsAcceptedFileTypes()` defaults to PNG, JPEG, GIF and WebP (`image/*` wildcards work) and `fileAttachmentsMaxSize()` to `config('alfakit.uploads.max_size_kb')` (12 MB). The editor checks both before uploading, and the server checks them again against the detected type and real size when the form is saved: a file that breaks them fails validation. Only raster images can be inserted: SVG and non-image files are always rejected. Images whose temporary upload expired or belongs to someone else are removed from the content.

Images that point at a file on the attachments disk are only kept when the stored content already referenced that file, or when it was uploaded while editing. A crafted request can't make the content reference (and get signed URLs for) another record's attachment. This is on by default, like `FileUpload::preventFilePathTampering()`:

```php
RichEditor::make('content')
    ->preventFileAttachmentTampering(allowFilePathUsing: fn (string $file): bool => str_starts_with($file, 'library/'));

RichEditor::make('content')->preventFileAttachmentTampering(false); // keep every image
```

`$file` is the disk path. Images on other hosts are not affected.

### File attachment providers

By default images are stored on `fileAttachmentsDisk()`. A `FileAttachmentProvider` stores them somewhere else (a media library, for example):

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor\FileAttachmentProviders\Contracts\FileAttachmentProvider;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentAttribute;
use AlfaSix\Alfakit\Support\TemporaryUpload;
use App\Models\Media; // your media library model

class MediaAttachments implements FileAttachmentProvider
{
    public function attribute(RichContentAttribute $attribute): static { return $this; }

    public function saveUploadedFileAttachment(TemporaryUpload $file): ?string
    {
        return Media::storeFrom($file->path())->url; // the URL the content stores
    }

    public function getFileAttachmentUrl(mixed $file): ?string { return null; } // shown as stored

    public function getDefaultFileAttachmentVisibility(): ?string { return null; }

    public function isExistingRecordRequiredToSaveNewFileAttachments(): bool { return false; }

    public function cleanUpFileAttachments(array $exceptIds): void {}
}

RichEditor::make('content')->fileAttachmentProvider(new MediaAttachments);
```

AlfaKit content references an attachment by its URL, so the provider returns the URL to store and receives it back. `getFileAttachmentUrl()` gives `RichContentRenderer` the URL to display (a temporary URL, say). When `isExistingRecordRequiredToSaveNewFileAttachments()` is true, images inserted on a create form are stored right after the record is created and the content is updated. `cleanUpFileAttachments()` is called after each save with the URLs the content still references. Set a provider on the field, on the model's rich content attribute (`registerRichContent('content')->fileAttachmentProvider(...)`), or from a plugin implementing `Plugins\Contracts\HasFileAttachmentProvider`. Without one, `DiskFileAttachmentProvider` keeps the behaviour above.

### MarkdownEditor

`MarkdownEditor` supports `bold`, `italic`, `strike`, `link`, `heading`, `h1`–`h3`, `blockquote`, `codeBlock`, `code`, `bulletList`, `orderedList`, `horizontalRule`, `table` (and the table buttons), `attachFiles`, `undo` and `redo`; buttons Markdown can't express (colours, alignment, highlight, sub/superscript, details) are ignored. Tables are stored as GitHub-flavoured Markdown tables (`| A | B |`), one line per row.

## Private attachments

```php
RichEditor::make('content')->fileAttachmentsDisk('s3')->fileAttachmentsVisibility('private');
```

A private file has no URL that works forever, so the saved content keeps the disk's plain `url()` and the editor swaps it for a `temporaryUrl()` when the form is filled, and back when it's saved. Temporary URLs are never stored. Temporary URLs live `config('alfakit.temporary_file_url_expiry_minutes')` (30) minutes, rounded up to the end of the hour so browsers can cache the images; `temporaryUrlExpiry(60)` changes it for one editor (`RichContentRenderer::fileAttachments(..., temporaryUrlExpiry: 60)` for rendering). Visibility defaults to `private` on a disk configured with `'visibility' => 'private'`, and on a local disk without a public `url` (Laravel's default `local` disk), in the editor and in `RichContentRenderer` alike. Only images the editor stored itself (in the attachments directory, on that disk) are swapped. The disk must support temporary URLs (S3, or a `local` disk with `'serve' => true`); otherwise the plain URL is kept.

To show the content elsewhere, give the renderer the same disk, directory and visibility (or configure them on the model, see [Rich content models](#rich-content-models)):

```php
RichContentRenderer::make($post->content)
    ->fileAttachments(disk: 's3', directory: 'posts', visibility: 'private')
    ->toHtml();
```

With `Panel::tenantUploadDirectory()` the directory is the current tenant's, so only that tenant's attachments are signed.

## JSON storage

```php
RichEditor::make('content')->json();
```

The state is a Tiptap document (`['type' => 'doc', 'content' => [...]]`), validated as an array. Cast the attribute to `array`. Uploaded images are stored on save as in HTML mode, and an empty document is saved as `null`.

## Custom blocks

A custom block is a class extending `RichContentCustomBlock`. The editor stores its id and configuration, shows a preview rendered by the server, and opens the block's modal to insert or edit it.

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentCustomBlock;
use AlfaSix\Alfakit\Forms\Components\TextInput;

class CallToActionBlock extends RichContentCustomBlock
{
    public static function getLabel(): string
    {
        return 'Call to action';
    }

    public static function getIcon(): ?string
    {
        return 'megaphone';
    }

    public static function configureEditorAction(Action $action): Action
    {
        return $action
            ->modalWidth('md')
            ->schema([
                TextInput::make('label')->required(),
                TextInput::make('url')->url()->required(),
            ]);
    }

    public static function toPreviewHtml(array $config): string
    {
        return '<p><strong>'.e($config['label'] ?? '').'</strong> → '.e($config['url'] ?? '').'</p>';
    }

    public static function toHtml(array $config, array $data): string
    {
        return '<a class="button" href="'.e($config['url'] ?? '#').'">'.e($config['label'] ?? '').'</a>';
    }
}

RichEditor::make('content')->customBlocks([CallToActionBlock::class]);
```

- `getId()` defaults to the class name without `Block` in kebab case (`call-to-action`), `getLabel()` to its headline.
- `configureEditorAction()` receives the insert/edit `Action`. Give it a `schema()` for a configuration form; without one the block is inserted as is. Its closures receive `$arguments['config']` (the current configuration when editing).
- `toPreviewHtml()` renders the block inside the editor. `toHtml()` renders it for display (see [Rendering content](#rendering-content)) and defaults to the preview.

The configuration comes from the browser: escape every value you put into the HTML, as above. The modal runs as a [field action](field-actions), so a hidden, disabled or read-only editor can't insert blocks, and previews are only rendered for blocks the field defines.

A `customBlocks` toolbar button is added when the toolbar doesn't place one. It opens the custom blocks panel: beside the content on wide editors, above it on narrow ones. Click a block to insert it.

```php
RichEditor::make('content')
    ->customBlocks([
        DividerBlock::class,
        'Marketing' => [HeroBlock::class, CallToActionBlock::class],
        'Media' => [VideoBlock::class],
    ])
    ->searchableCustomBlocks()
    ->customBlocksGrid()
    ->minimalCustomBlockControls()
    ->activePanel('customBlocks');
```

- String keys group blocks under a heading. Ungrouped blocks come first, then the groups in their order.
- `searchableCustomBlocks()` adds a search field matching block labels and group names (case and surrounding spaces ignored).
- `customBlocksGrid()` shows the blocks as a two-column grid instead of a list.
- `minimalCustomBlockControls()` replaces the block header with compact edit and remove buttons over the preview; the block's label stays available to screen readers.
- `activePanel('customBlocks')` (or `'mergeTags'`) opens that panel when the editor loads.

Previews keep their own markup: the editor's prose styles (headings, paragraph spacing, lists) don't apply to them. A block opts in, per configuration:

```php
public static function shouldApplyProseStylingToPreview(array $config): bool
{
    return true;
}
```

## Mentions

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor\MentionProvider;

RichEditor::make('content')->mentions([
    MentionProvider::make('@')
        ->getSearchResultsUsing(fn (string $search): array => User::query()
            ->where('name', 'like', "%{$search}%")
            ->limit(10)
            ->pluck('name', 'id')
            ->all()),
    MentionProvider::make('#')->items(['php' => 'PHP', 'laravel' => 'Laravel']),
]);
```

Typing the trigger character lists matching items under the cursor (arrow keys, Enter or Tab to insert, Escape to close). `items()` are filtered in the browser; `getSearchResultsUsing()` searches on the server as the user types (`searchDebounce()`, default 250 ms; `limit()`, default 10). A mention is stored with its id, label and trigger: `<span data-type="mention" data-id="5" data-label="Jane" data-char="@">@Jane</span>`. `getLabelsUsing(fn (array $ids): array => [id => label])` resolves current labels: the renderer and the editor show them (one call per provider for all mentioned ids), falling back to the stored label, then the id. Without it, `items()` labels are used.

```php
MentionProvider::make('@')
    ->getSearchResultsUsing(...)
    ->url(fn (string $id, string $label): string => route('users.show', $id));
```

With `url()`, rendered mentions become links: `<a href="/users/5" data-type="mention" data-id="5">@Jane</a>`. Pass the providers to the renderer with `RichContentRenderer::make($content)->mentions([...])` (models registered with `registerRichContent()->mentions([...])` do it for you). The closure receives the mention's `$id` and `$label`; returning `null` keeps a plain mention, and unsafe URLs (`javascript:`…) are dropped.

## Merge tags

```php
RichEditor::make('body')->mergeTags(['name', 'order_number', 'today' => 'Today’s date']);
```

Insert them from the merge tags panel (its `mergeTags` toolbar button is added automatically) or by typing `{{`. They are stored as `<span data-type="mergeTag" data-id="name">{{ name }}</span>` and replaced when the content is rendered.

`mergeTagLabels()` names tags given as a list; labels are display only (the content stores the id):

```php
RichEditor::make('body')
    ->mergeTags(['name', 'order_number'])
    ->mergeTagLabels(['name' => 'Full name']);
```

## Rendering content

`RichContentRenderer` turns stored content into display HTML: it replaces merge tags and custom blocks, and converts JSON documents to HTML.

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentRenderer;

$html = RichContentRenderer::make($post->content)
    ->mergeTags(['name' => $user->name, 'today' => now()->toFormattedDateString()])
    ->customBlocks([CallToActionBlock::class, HeroBlock::class => ['locale' => app()->getLocale()]])
    ->toHtml();
```

- Merge tag values that are plain strings are escaped; pass an `HtmlString` for markup. Unknown tags stay as `{{ tag }}`.
- `customBlocks()` takes block classes, optionally mapped to extra `$data` for `toHtml()`. Blocks that aren't listed are removed.
- `mentions([...])` renders mentions of providers with a `url()` as links (see [Mentions](#mentions)).
- JSON documents are rebuilt from known nodes and marks (paragraphs, lead paragraphs, headings, alignment, lists, quotes, code, links, images, tables, details, column grids, text colours, highlights, sub/superscript, small text, mentions, merge tags, custom blocks) with every text and attribute escaped; links and images keep only `http(s)`, `mailto`, `tel` and relative URLs.
- HTML content is sanitised first (scripts, event handlers and unsafe URLs are removed; inline `style` keeps only `color`, `background-color` and `text-align` with plain values; see [HTML output](../advanced/security#html-output)), then merge tags and custom blocks are inserted. Everything the editor produces survives. Call `->sanitize(false)` only when no user can write the stored HTML, and use `Panel::htmlSanitizer()` to allow more.

- `plugins([...])` adds what [plugins](#plugins) allow to the sanitiser and renders their JSON nodes; `fileAttachments()` signs [private attachments](#private-attachments).

The renderer is `Htmlable`, so `{{ RichContentRenderer::make($post->content) }}` works in Blade, and `TextEntry::make('content')->html()->prose()->state(fn (Post $record) => RichContentRenderer::make($record->content))` shows it in an infolist. Return the renderer itself rather than `->toHtml()`: an `Htmlable` state is not sanitised a second time, so custom block markup keeps its classes.

### Security

HTML stored by a RichEditor is never trusted: anyone who can submit the form can post any HTML in the field. `RichContentRenderer` (and so `renderRichContent()`) sanitises HTML content with `Support\Html::sanitize()` before display, using the panel's `htmlSanitizer()` configuration (or the default one) extended by the plugins' `configureHtmlSanitizer()`. JSON content is rebuilt node by node from known types with every value escaped. Rendering stored HTML any other way (`{!! $post->content !!}`, `TextEntry::html()` without sanitising) bypasses this: use the renderer.

## Rich content models

Configure an attribute's rich content once on the model. Every `RichEditor::make('content')` on a form for that model uses it for the settings it doesn't set itself, and the model renders it:

```php
use AlfaSix\Alfakit\Forms\Components\RichEditor\MentionProvider;
use AlfaSix\Alfakit\Forms\Components\RichEditor\Models\Concerns\InteractsWithRichContent;
use AlfaSix\Alfakit\Forms\Components\RichEditor\Models\Contracts\HasRichContent;
use App\Alfakit\Forms\Components\RichEditor\RichContentCustomBlocks\HeroBlock;
use Illuminate\Database\Eloquent\Model;

class Post extends Model implements HasRichContent
{
    use InteractsWithRichContent;

    public function setUpRichContent(): void
    {
        $this->registerRichContent('content')
            ->fileAttachmentsDisk('s3')
            ->fileAttachmentsDirectory('posts')
            ->fileAttachmentsVisibility('private')
            ->customBlocks(['Marketing' => [HeroBlock::class]])
            ->mergeTags(['name' => fn () => auth()->user()?->name, 'today' => fn () => now()->toFormattedDateString()])
            ->mergeTagLabels(['name' => 'Full name'])
            ->mentions([MentionProvider::make('@')->items(['5' => 'Jane'])])
            ->textColors(['#dc2626' => 'Red'])
            ->plugins([HighlightPlugin::make()]);
    }
}
```

```blade
{!! $post->renderRichContent('content') !!}
{{ $post->getRichContentAttribute('content') }} {{-- the same, as an Htmlable --}}
```

- The editor picks the configuration up from the form's record, or from the model class on create pages. Settings on the field win (`RichEditor::make('content')->fileAttachmentsDisk('public')`).
- `mergeTags()` here takes the **values** used when rendering (a closure is called then; plain strings are escaped, `HtmlString`s are not); the editor offers the same ids with the labels from `mergeTagLabels()`. A tag listed without a value (`->mergeTags(['today'])`) is offered in the editor and left as `{{ today }}` when rendered.
- `renderRichContent()` sanitises HTML content, renders custom blocks and merge tags, applies plugins and signs private attachments. `setUpRichContent()` runs once per model instance.
- `json()` registers a JSON attribute (cast it to `array`).

## Plugins

A plugin adds Tiptap extensions, toolbar buttons and modal actions to the editor. It has a PHP half (the plugin class) and a browser half (the Tiptap extension in your frontend bundle).

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor\EditorCommand;
use AlfaSix\Alfakit\Forms\Components\RichEditor\Plugins\RichContentPlugin;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichEditorTool;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

class HighlightPlugin extends RichContentPlugin
{
    /** Registry keys of the Tiptap extensions (see below). */
    public function getTipTapJsExtensions(): array
    {
        return ['highlight-color'];
    }

    public function getEditorTools(): array
    {
        return [
            RichEditorTool::make('highlightColor')
                ->label('Highlight colour')
                ->icon('highlighter')
                ->action()                       // opens the action of the same name
                ->activeWhen('highlight'),       // pressed while the mark is active
            RichEditorTool::make('unhighlight')
                ->icon('eraser')
                ->command('unsetMark', 'highlight'), // runs Tiptap commands
        ];
    }

    public function getEditorActions(): array
    {
        return [
            Action::make('highlightColor')
                ->schema([ColorPicker::make('color')->required()])
                ->fillForm(fn (array $arguments): array => ['color' => $arguments['attributes']['color'] ?? null])
                ->action(fn (array $data, array $arguments, RichEditor $component): array => $component->runCommands(
                    [EditorCommand::make('setMark', 'highlight', ['color' => $data['color']])],
                    editorSelection: $arguments['editorSelection'] ?? null,
                )),
        ];
    }

    /** Shown without being listed in `toolbarButtons()`. */
    public function getEnabledToolbarButtons(): array
    {
        return ['highlightColor'];
    }

    public function configureHtmlSanitizer(HtmlSanitizerConfig $config): HtmlSanitizerConfig
    {
        return $config->allowElement('mark', ['data-color']);
    }

    /** HTML for the plugin's nodes and marks in JSON content. */
    public function renderJson(array $node, string $content): ?string
    {
        return ($node['type'] ?? null) === 'highlight'
            ? '<mark data-color="'.e($node['attrs']['color'] ?? '').'">'.$content.'</mark>'
            : null;
    }
}

RichEditor::make('content')->plugins([HighlightPlugin::make()]);
```

- **Tools** are toolbar buttons available by name in `toolbarButtons()` and `floatingToolbars()`; they show only where placed (or when the plugin's `getEnabledToolbarButtons()` returns them; `getDisabledToolbarButtons()` removes buttons). Plugin changes apply before `disableToolbarButtons()`.
- `command()` runs Tiptap chain commands by name (several calls chain). There is no `jsHandler()`: JavaScript from PHP is never evaluated. For custom logic, export a command from the extension module (below) under the tool's name.
- `action()` opens the plugin's editor action named like the tool, as a [field action](field-actions) (hidden for disabled and read-only editors). It receives `$arguments['editorSelection']` (`from`, `to`) and `$arguments['attributes']` (the attributes of the `activeWhen()` mark or node). Return `$component->runCommands([...], editorSelection: ...)`, or a list of `EditorCommand`s, to change the content.
- **Sanitiser**: content is sanitised strictly; `configureHtmlSanitizer()` allows exactly the elements and attributes the plugin stores. Never allow event handlers or `style`.

Register the browser half once in your panel entry, keyed like `getTipTapJsExtensions()`:

```ts
createAlfakit({
    richEditorExtensions: {
        'highlight-color': () => import('./editor/highlight-color'),
    },
})
```

```ts
// editor/highlight-color.ts
import { Mark } from '@tiptap/core'

export default Mark.create({
    name: 'highlight',
    addAttributes: () => ({ color: { default: null } }),
    parseHTML: () => [{ tag: 'mark' }],
    renderHTML: ({ HTMLAttributes }) => ['mark', { 'data-color': HTMLAttributes.color }, 0],
})

// Optional: toolbar commands by button name.
export const commands = {
    unhighlight: {
        key: 'unhighlight',
        label: 'Remove highlight',
        run: (editor) => editor.chain().focus().unsetMark('highlight').run(),
    },
}
```

A loader may return an extension, an array of extensions, or `{ extensions, commands }` (default export or the module itself). Extensions load the first time an editor that needs them is shown (a skeleton shows meanwhile); an unknown key logs a warning and is skipped. Import Tiptap from `@tiptap/core` / `@tiptap/pm` so the editor and your extension share one ProseMirror. This works the same in the React, Vue and Svelte renderers.

## Fake content

`RichContentFaker` builds fake rich content for factories and tests; `MarkdownFaker` does the same for `MarkdownEditor`. Both are registered on Faker too: `fake()->alfakitRichContent()` / `fake()->alfakitMarkdown()` (with Filament's `filamentRichContent()` / `filamentMarkdown()` names as aliases). Both need `fakerphp/faker` (a Laravel dev dependency) and accept a seeded `Faker\Generator` for reproducible output.

```php
use AlfaSix\Alfakit\Forms\Components\MarkdownEditor\MarkdownFaker;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentFaker;

// PostFactory
'content' => RichContentFaker::make()->heading()->paragraphs(3, links: true, bold: true)->bulletList()->image()->toHtml(),
'body_json' => RichContentFaker::make()->paragraphs(2)->table()->toArray(),   // `json()` editors
'notes' => MarkdownFaker::make()->heading()->paragraphs(2)->codeBlock('php')->toMarkdown(),
```

`RichContentFaker` methods: `heading()`, `paragraph()`, `paragraphs(count, links, bold, italic, underline, strike, code, highlight, subscript, superscript)`, `bulletList()`, `orderedList()`, `blockquote()`, `codeBlock()`, `horizontalRule()`, `table()`, `details()`, `image()`, `mergeTag()`, `mergeTags()`, `mention()`, `textColor()`, `textAlignment()`, `hardBreak()`, `customBlock(HeroBlock::class, $config)` (without arguments it picks one of the attribute's blocks that implement `Contracts\CanGenerateFakeConfiguration`, whose `generateFakeConfiguration(Generator $faker)` makes up the configuration), and `block()` / `inline()` for raw Tiptap nodes (it is macroable, so plugins can add their own). Pass a rich content attribute (`fake()->alfakitRichContent($post->getRichContentAttribute('content'))`) to pick its custom blocks; `toValue()` then returns the JSON document for a `json()` attribute, else the HTML. Output: `toHtml()` (what the editor stores, merge tags and custom blocks kept as editor markers), `toArray()` / `toJson()` (the Tiptap document), `toMarkdown()`, `toRenderedHtml(?RichContentRenderer)` and `toText()`.

`MarkdownFaker` methods: `heading()`, `paragraph()`, `paragraphs(count, links, bold, italic, strike, code)`, `bulletList()`, `orderedList()`, `blockquote()`, `codeBlock(language)`, `horizontalRule()`, `table()`, `image()`, `block()`; output `toMarkdown()` and `toHtml()`.

`RichContentRenderer::make($json)->toEditorHtml()` converts any JSON document to the HTML the editor stores.
