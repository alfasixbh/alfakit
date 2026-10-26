---
title: Fields
description: Every field type and its options.
---

# Fields

All fields share the base API: `label()`, `placeholder()`, `helperText()`, `hint()`, `hintIcon()`, `required()`, `rules()`, `default()`, `disabled()`, `readOnly()`, `hidden()`, `visibleOn()`, `live()`, `afterStateUpdated()`, `dehydrated()`, `saved()`, `columnSpan()`, `extraAttributes()`, `extraFieldWrapperAttributes()`, `extraInputAttributes()`, `autofocus()`, the [content slots](#content-slots) (`aboveLabel()`, `belowContent()`…), the [field actions](field-actions) `prefixActions()`, `suffixActions()` and `hintActions()`, and `inlineLabel()` (see [Inline labels](layout#inline-labels)). To fuse several fields into one control, see [FusedGroup](layout#fusedgroup).

`hiddenOn()`, `visibleOn()` and `disabledOn()` take an operation name, the `Operation` enum or a list of either: `TextInput::make('slug')->disabledOn(Operation::Edit)`, `->hiddenOn([Operation::Create, Operation::View])` (`use AlfaSix\Alfakit\Support\Enums\Operation;`).

## Content slots

Every field has slots around its label, its control and its validation error:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Schemas\Components\Icon;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Support\Enums\Alignment;

TextInput::make('slug')
    ->beforeLabel(Icon::make('link'))
    ->afterLabel(Text::make('Optional')->color('gray'))
    ->belowContent([
        'Used in the post URL.',
        Action::make('generate')->action(fn (Get $get, Set $set) => $set('slug', str($get('title'))->slug())),
    ])
    ->belowErrorMessage(Action::make('help')->url('/docs/slugs'), Alignment::End);
```

- Slots: `aboveLabel()`, `beforeLabel()`, `afterLabel()`, `belowLabel()`, `aboveContent()`, `beforeContent()`, `afterContent()`, `belowContent()`, and on fields only `aboveErrorMessage()` / `belowErrorMessage()`, which show only while the field has an error.
- Each takes a string (shown as escaped text), an `Htmlable` (trusted markup), a schema component (`Text`, `Icon`, `Html`, `Flex`…), an `Action` or `ActionGroup`, an array mixing these, or a closure returning any of them (`$get`, `$record`, `$state`… are injected).
- The second argument aligns the row: `Alignment::Start` (default), `End` or `Between`. `afterLabel()` sits at the end of the label row, next to `hint()`, unless you pass `Alignment::Start`.
- Actions in a slot run through the action endpoint like [field actions](field-actions): `$get` / `$set` work on the form and the refreshed form comes back. Hidden, unauthorised actions and the actions of hidden or disabled fields can't run. Put actions directly in the slot; an `Actions` component inside a slot is not resolvable.
- `hint()`, `hintIcon()` and `hintActions()` keep working and render in the `afterLabel` area; `helperText()` renders above `belowContent()`.

`extraFieldWrapperAttributes(['class' => 'gap-3'])` adds attributes to the element wrapping the label, control and error (`data-slot="field"`); they are merged with `extraAttributes()`, joining the classes. Pass `merge: true` to add to earlier calls instead of replacing them.

[Builder](builder), [ToggleButtons, Slider and CodeEditor](choice-and-input-fields) and [ModalTableSelect](modal-table-select) have pages of their own.

`TextInput`, `Textarea` and `RichEditor` can edit one value per language with `->translatable()`; see [Translatable content](../localization/translatable-content).

## TextInput

```php
TextInput::make('email')->email()->required()->maxLength(255)->prefixIcon('mail');
TextInput::make('price')->numeric()->minValue(0)->step(0.01)->prefix('$');
TextInput::make('password')->password()->revealable()->confirmed();
TextInput::make('phone')->tel()->mask('(999) 999-9999');
TextInput::make('website')->url()->datalist(['https://…']);
```

Mask tokens: `9` a digit, `a` a letter, `*` a letter or digit; other characters are inserted as typed. `hint()` and `helperText()` render HTML, so plain strings are escaped; pass an `HtmlString` for markup.

`integer()`, `numeric()`, `minLength()`, `maxLength()`, `length()`, `autocomplete()`, `inputMode()`, `suffix()`, `suffixIcon()`. `prefixIconColor()` and `suffixIconColor()` colour the affix icons (`primary`, `danger`, `success`…); they also work on `Select` and the date pickers.

```php
TextInput::make('name')->trim();                                   // strip surrounding whitespace
TextInput::make('amount')->mask('9,999,999')->stripCharacters(',')->numeric();
TextInput::make('phone')->tel()->telRegex('/^\+?[0-9 ]{7,15}$/');
TextInput::make('api_key')->readOnly()->copyable(copyMessage: 'Copied!', copyMessageDuration: 1500);
TextInput::make('one_time_code')->autocomplete(false);             // autocomplete="off"
```

- `trim()` (also on `Textarea`, and on `TagsInput` for each tag) and `stripCharacters()` (a string or an array of characters) change the value the validator sees and the value that is saved; the input keeps what the user typed. A value that is empty afterwards is saved as `null`. Enable trimming everywhere with `TextInput::configureUsing(fn (TextInput $input) => $input->trim())`.
- `telRegex()` replaces the pattern `tel()` validates against (default `TextInput::DEFAULT_TEL_REGEX`, Filament's).
- `copyable()` adds a copy button inside the input (needs HTTPS, or localhost, for the clipboard API). `copyMessage` replaces the screen-reader confirmation with visible text for `copyMessageDuration` milliseconds (default 1500).
- `autocomplete(false)` renders `autocomplete="off"`, `autocomplete()` renders `on`, a string is used as is.
- `autocapitalize('words')` sets the input's `autocapitalize` hint for on-screen keyboards: `'none'`/`'off'`, `'sentences'`/`'on'`, `'words'` or `'characters'`. `autocapitalize()` means `'on'`, `true`/`false` mean `'on'`/`'off'`, and a closure is evaluated.
- `mutateStateForValidationUsing(fn ($state) => ...)` works on every field for custom transformations before validation.

Try it: the fields below are `TextInput`s with affixes, an email and a revealable password.

```alfakit-example name="text-input-basic"

```

## OneTimeCodeInput

```php
use AlfaSix\Alfakit\Forms\Components\OneTimeCodeInput;

OneTimeCodeInput::make('code')
    ->length(6)            // digits, 6 by default
    ->submitOnCompletion() // submit the form once the last digit is in
```

A numeric input with `autocomplete="one-time-code"`, so browsers and password managers can fill the code from an SMS or email. It keeps digits only (pasted spaces and dashes are dropped), reads left to right in every language and validates `digits:{length}`. `submitOnCompletion()` submits each complete code once. The multi-factor authentication challenge and set-up forms use it.

## Textarea

`rows()`, `cols()`, `minLength()`, `maxLength()`, `length()` (exactly that many characters), `autosize()`, `trim()`, `disableGrammarly()` (adds `data-gramm="false"` and friends so the Grammarly extension leaves the textarea alone).

## RichEditor / MarkdownEditor

Tiptap-based editor storing HTML (or Markdown). `toolbarButtons([...])`, `disableToolbarButtons([...])`, `fileAttachmentsDisk()`, `fileAttachmentsDirectory()`, `fileAttachmentsVisibility()`, `fileAttachmentsAcceptedFileTypes()`, `fileAttachmentsMaxSize()`, `textColors()`, `customTextColors()`, `minHeight()`, `maxHeight()`. Besides the basics the toolbar offers text colour, highlight, sub/superscript, inline code, logical alignment, tables, collapsible details and clear formatting; see [Rich editor](rich-editor). Images are uploaded to the temporary disk while editing and moved to the attachments disk when the form is saved; the `src` is rewritten to the stored URL. SVG and non-image files are rejected. With private attachments (`fileAttachmentsVisibility('private')`, or a disk configured with `'visibility' => 'private'`) the content keeps the disk's plain URL and the editor shows temporary URLs; see [Rich editor](rich-editor#private-attachments).

RichEditor also stores Tiptap JSON (`json()`) and supports custom blocks (`customBlocks()`), mentions (`mentions()`) and merge tags (`mergeTags()`); see [Rich editor](rich-editor).

## Select

```php
Select::make('status')->options(['draft' => 'Draft'])->native(false)->selectablePlaceholder(false);
Select::make('status')->options(Status::class);                  // backed enum (uses getLabel() when present)
Select::make('author_id')->relationship('author', 'name')->searchable()->preload();
Select::make('tags')->relationship('tags', 'name')->multiple()->maxItems(5);
Select::make('country')->searchable()->getSearchResultsUsing(fn (string $search) => Country::search($search)->pluck('name', 'id'))
    ->getOptionLabelUsing(fn ($value) => Country::find($value)?->name);
Select::make('technologies')->multiple()->reorderable()->options([...]);     // keep the order users choose
Select::make('parent_id')->relationship(name: 'parent', titleAttribute: 'name', ignoreRecord: true);
```

- `reorderable()` on a `multiple()` select lists the chosen options under the field, where they can be dragged or moved with Alt + arrow keys (announced to screen readers); the state keeps that order. It has no effect on single selects.
- `relationship(ignoreRecord: true)` leaves the record being edited out of the options, for self-referencing relationships such as `parent`. The record is also rejected if submitted anyway. It accepts a closure, and has no effect while creating.

### Options from an API

Any option source works: return the matching options from `getSearchResultsUsing()` as the user types, and resolve labels for the values already selected with `getOptionLabelUsing()` (one value) or `getOptionLabelsUsing()` (several at once, better for `multiple()`):

```php
Select::make('supplier_id')
    ->searchable()
    ->searchDebounce(300)
    ->getSearchResultsUsing(fn (string $search): array => Http::get('https://api.example.com/suppliers', ['q' => $search])
        ->collect('data')->pluck('name', 'id')->all())
    ->getOptionLabelsUsing(fn (array $values): array => Http::get('https://api.example.com/suppliers', ['ids' => $values])
        ->collect('data')->pluck('name', 'id')->all());

// Options that depend on another field: read it with $get and make that field live().
Select::make('city')
    ->options(fn (Get $get): array => $get('country') ? Cities::forCountry($get('country')) : [])
    ->disabled(fn (Get $get): bool => blank($get('country')));
```

Submitted values are validated on the server: a static list with `in`, a relationship against its query, and options from an API through the label lookup (a value it can't resolve is refused). With only `getSearchResultsUsing()` and no label lookup there is nothing to check against, so add a `rule()` yourself. Select also offers `optionsLimit()`, `preload()`, `loadingMessage()`, `noSearchResultsMessage()`, `searchPrompt()`, `disableOptionWhen()`, `descriptions()`, `icons()`, `colors()` and [create or edit option forms](field-actions).

`disableOptionWhen()` takes a list of values, a closure returning one, or a closure asked for each option with `$value` and `$label`, as in Filament:

```php
Select::make('status')
    ->options(['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'])
    ->disableOptionWhen(fn (string $value): bool => $value === 'archived');
```

Disabled options are shown disabled and refused on submit, like unknown values, in `Select`, `Radio`, `CheckboxList` and `ToggleButtons`. A value the edited record already holds stays valid, so the record can still be saved after its option was disabled.

More Select options:

```php
Select::make('assignee_id')
    ->relationship('assignee', 'name')
    ->searchable()
    ->noOptionsMessage('Nobody can be assigned yet.')   // no options at all
    ->searchingMessage('Looking up people…')            // while search results load
    ->wrapOptionLabels(false);                          // truncate long labels

Select::make('plan')
    ->options(fn () => Plan::pluck('label_html', 'id'))
    ->allowHtml();
```

- `allowHtml()` renders option labels as HTML. The server sanitises them (`Support\Html::sanitize()`), in the options, the search results and the selected labels; native selects show the text only.
- `wrapOptionLabels(false)` truncates long labels instead of wrapping them.

Ready-made option lists, labelled in the user's language: `currencies()`, `languages()`, `panelLocales()` and `timezones()`. See [Currencies, numbers and dates](../localization/currencies-and-numbers#currency-language-and-timezone-pickers).

Relationship selects can create the related record in a modal (`createOptionForm([...])`) and edit the selected one (`editOptionForm([...])`); see [Creating and editing select options](field-actions#creating-and-editing-select-options).

Searchable selects load options from the server as you type (`searchDebounce()`, `optionsLimit()`, `noSearchResultsMessage()`). Relationship selects validate with `exists`; `BelongsToMany` selects are synced after save (`pivotData()` for extra columns). `boolean()` gives a Yes/No select. Groups: `['Group' => ['a' => 'A']]`. `descriptions()`, `icons()`, `colors()`, `disableOptionWhen()`.

### MorphToSelect

A polymorphic `MorphTo` relationship (`commentable`, `taggable`) is edited with `MorphToSelect`: a fieldset holding a type select and a select listing the records of the chosen type.

```php
use AlfaSix\Alfakit\Forms\Components\MorphToSelect;
use AlfaSix\Alfakit\Forms\Components\MorphToSelect\Type;

MorphToSelect::make('commentable')
    ->types([
        Type::make(Post::class)->titleAttribute('title'),
        Type::make(Product::class)
            ->getOptionLabelFromRecordUsing(fn (Product $record): string => "{$record->name} ({$record->sku})")
            ->modifyOptionsQueryUsing(fn (Builder $query) => $query->where('active', true)),
    ])
    ->searchable()
    ->preload()
    ->required();
```

- It fills and saves the record's morph columns, `commentable_type` and `commentable_id` (the columns of the model's `morphTo()` relationship when it declares other names), so make them fillable. The type is stored as the model's morph class: the [morph map](https://laravel.com/docs/eloquent-relationships#custom-polymorphic-types) alias when one is registered. Records saved with the class name before you added the alias are shown with the alias and saved with it.
- The record select appears once a type is chosen and is cleared when the type changes. Clearing the type also clears the id on save.
- On the server, the type must be one of `types()` and the id must be a record of that type's options query, which is scoped to the current tenant and narrowed by `modifyOptionsQueryUsing()`.
- `searchable()`, `preload()`, `native()` and `optionsLimit()` apply to the record select. `Type::label()` renames a type and `Type::searchColumns(['name', 'sku'])` sets the searched columns (the title attribute by default).
- `modifyTypeSelectUsing(fn (Select $select) => ...)` and `modifyKeySelectUsing(fn (Select $select) => ...)` customise the two selects (`Type::modifyKeySelectUsing()` for one type only). `typeSelectToggleButtons()` shows the types as inline toggle buttons; `modifyTypeSelectUsing()` then receives the `ToggleButtons`. `contained(false)` drops the fieldset border and legend.
- It works inside repeater items, each item with its own type. To edit the related record's own fields instead of choosing one, use a [layout relationship](layout#relationships) with `relatedModel:`.

A single and a searchable multiple select:

```alfakit-example name="select-searchable"

```

## Checkbox / Toggle

`inline()`, `accepted()` (must be on), `declined()` (must be off); Toggle adds `onIcon()`, `offIcon()`, `onColor()`, `offColor()`.

## CheckboxList / Radio

Share the options API with Select. CheckboxList: `searchable()`, `bulkToggleable()`, `columns()` (alias `gridColumns()`: lays the options out in that many columns from the `md` breakpoint; a breakpoint map uses its `lg` value), `gridDirection()`, `relationship()` (BelongsToMany), `allowHtml()`. Radio: `inline()`, `boolean()`.

```php
CheckboxList::make('technologies')
    ->relationship('technologies', 'name')
    ->getOptionDescriptionFromRecordUsing(fn (Technology $record): string => $record->tagline)
    ->columns(3)
    ->gridDirection('column')
    ->bulkToggleable()
    ->selectAllAction(fn (Action $action) => $action->label('Select every technology')->icon('check-check'))
    ->deselectAllAction(fn (Action $action) => $action->hidden(fn (string $operation) => $operation === 'view'));
```

- `gridDirection('column')` fills each column top to bottom; `row` (default) fills row by row. Filament's `GridDirection` enum is accepted too.
- `getOptionDescriptionFromRecordUsing()` adds a description to each relationship option from its record; `getOptionLabelFromRecordUsing(fn (Technology $record): string => "{$record->name} ({$record->code})")` builds its label.
- With `searchable()`: `searchPrompt()` sets the search input's placeholder, `noSearchResultsMessage()` the text shown when nothing matches, and `searchDebounce(300)` waits that many milliseconds after typing before filtering (default: immediately). The search runs in the browser.
- `selectAllAction()` / `deselectAllAction()` receive the `Action` used for the bulk toggle links (named `selectAll` / `deselectAll`); its label, icon and visibility are used. The toggling itself happens in the browser.
- `allowHtml()` renders option labels as sanitised HTML, like on `Select`.

## MoneyInput

```php
MoneyInput::make('price')->currency('EUR')->minValue(0);
MoneyInput::make('total')->currency(fn (Get $get) => $get('currency'))->minorUnits();
```

Shows the currency symbol where the user's locale puts it, accepts the locale's separators and digits, and rounds to the currency's precision (BHD 3, JPY 0). `minorUnits()` stores integers of the smallest unit. An amount outside `minValue()`/`maxValue()` is kept as typed and reported by validation (never silently changed). The currency defaults to the panel's. See [Entering money](../localization/currencies-and-numbers#entering-money).

## DatePicker / DateTimePicker / TimePicker

```php
DatePicker::make('published_at')->native(false)->minDate(now())->displayFormat('d/m/Y');
DateTimePicker::make('starts_at')->seconds(false)->timezone('Asia/Bahrain');
```

`format()` sets the stored format (defaults: `Y-m-d`; `Y-m-d H:i` and `H:i`, or `Y-m-d H:i:s` and `H:i:s` with `seconds()`). Values are normalised to that format on hydrate and dehydrate. Date-times are shown in the panel's timezone (or the field's `timezone()`) and converted back to the app timezone on save; dates and times of day are never shifted. Month and day names follow the user's language, and the week starts on the locale's first day (Monday in most of Europe, Sunday in the US) unless you set `firstDayOfWeek()`, `weekStartsOnMonday()` or `weekStartsOnSunday()`. Also `disabledDates()`, `closeOnDateSelection()`.

```php
DateTimePicker::make('starts_at')
    ->minutesStep(15)                     // also hoursStep(), secondsStep() (with seconds())
    ->defaultFocusedDate(now()->addMonth()->startOfMonth());
```

- `hoursStep()`, `minutesStep()` and `secondsStep()` set the step of the time input (the finest configured unit wins: `minutesStep(15)` gives a 15-minute step).
- `defaultFocusedDate()` sets the month the calendar opens on while the field is empty.

```php
DatePicker::make('starts_on')->locale('fr');                                // this field in French
TimePicker::make('opens_at')->datalist(['09:00:00', '12:30:00', '18:00:00']);
```

- `locale()` sets the language of this picker's month and weekday names, its default display format and its default first day of the week, instead of the panel's (also on `DateTimePicker` and `TimePicker`). Native pickers pass it as the input's `lang`; most browsers draw native pickers in the browser's own language anyway.
- `datalist()` offers suggested values (in the stored format, or date objects) in the browser's native picker. Only native pickers show them: `native()` (the default for `DatePicker` and `DateTimePicker`) and every `TimePicker`.

Date, time, toggle and checkbox fields:

```alfakit-example name="date-and-toggle"

```

## FileUpload

```php
FileUpload::make('cover')->image()->directory('posts')->disk('s3')->visibility('private')->maxSize(2048);
FileUpload::make('gallery')->multiple()->maxFiles(5)->reorderable()->downloadable();
FileUpload::make('avatar')->avatar();
```

Files are uploaded immediately to a temporary disk (`config('alfakit.uploads')`) and moved to the final disk when the form is submitted. `acceptedFileTypes()`, `preserveFilenames()`, `getUploadedFileNameForStorageUsing()`, `deleteRemovedFiles()`.

`getUploadedFileNameForStorageUsing()` names the stored file (inside `directory()`). Its closure receives `$file` (the upload: `getClientOriginalName()`, `getClientOriginalExtension()`, `mimeType()`, `size()`, as in Filament), `$originalName` and `$extension` (the extension of the detected file type):

```php
FileUpload::make('attachment')
    ->getUploadedFileNameForStorageUsing(fn ($file): string => now()->format('Ymd').'-'.$file->getClientOriginalName())
```

```php
FileUpload::make('attachments')->multiple()->minFiles(2)->maxFiles(5);
FileUpload::make('attachments')->multiple()->previewable(false);
FileUpload::make('import')->storeFiles(false);
FileUpload::make('attachment')->uploadingMessage('Uploading attachment…');
```

- `minFiles()` and `maxFiles()` limit the number of files of a `multiple()` field; both are validated on the server and accept closures.
- `previewable(false)` shows every file as a name and icon, without image previews.
- `storeFiles(false)` keeps files on the temporary disk: the state holds the temporary upload key (`tmp:…`) instead of a stored path, so your own code can read the file (an imported CSV, for example) with `FileUpload::getTemporaryDisk()`. Abandoned temporary files are removed by `alfakit:prune-uploads`.
- `uploadingMessage()` replaces the "Uploading…" text shown next to a file while it uploads.

### Large files and chunked uploads

Files larger than `alfakit.uploads.chunk_size` (5 MB, env `ALFAKIT_UPLOAD_CHUNK_SIZE`) are uploaded in chunks, automatically, by `FileUpload`, rich editor attachments and the file manager in every renderer. The upload is resumable: the server answers which chunks it already has (`POST /_alfakit/uploads/chunks`), each chunk is posted with its index, a failed chunk is retried (three times, with back-off) and picking the same file again after a failure continues where it stopped. Progress covers the whole file. On `complete` the chunks are assembled into a local temporary file, the detected type and size are checked like a single upload (`blocked_mime_types` included), and the file is stored on the temporary disk, so S3 and other remote disks work. Chunks live in a directory per user (or guest session) under `{temporary_directory}/chunks`, and `alfakit:prune-uploads` deletes unfinished ones after `max_age_hours`.

The size limit is the component's: `maxSize()` may be larger than `alfakit.uploads.max_size_kb` (the default limit for components without one). The field sends an encrypted, user-bound upload policy with each upload so the endpoint enforces its `maxSize()` and `acceptedFileTypes()` before the form is saved; the field still validates the file on save.

```php
FileUpload::make('video')->acceptedFileTypes(['video/mp4'])->maxSize(512000); // 500 MB, sent in 5 MB chunks
```

Custom frontends can use the same upload with `uploadTemporaryFile(endpoint, file, { ...panelUploadOptions(panel, component.uploadPolicy), onProgress })` from `@alfakit/core`. The web server's `upload_max_filesize` / `post_max_size` only need to fit one chunk.

### Original file names

```php
FileUpload::make('attachments')
    ->multiple()
    ->storeFileNamesIn('attachment_file_names');
```

The field stores generated names; `storeFileNamesIn()` saves the original names to another attribute of the same record (or Repeater item): `[path => name]` for a multiple field (cast the attribute to `array`), the name for a single one. The field shows the original names, and names of removed files are dropped on save. Without it a saved file is shown with its stored name; `preserveFilenames()` or `getUploadedFileNameForStorageUsing()` keep readable stored names instead.

### Layout and behaviour

```php
FileUpload::make('attachments')
    ->multiple()
    ->panelLayout('integrated')      // 'compact' (default), 'grid', 'integrated', 'circle'
    ->panelAspectRatio('2:1')
    ->imagePreviewHeight(250)
    ->removeUploadedFileButtonPosition('left')
    ->uploadProgressIndicatorPosition('left')
    ->uploadButtonPosition('center')
    ->maxParallelUploads(3)
    ->appendFiles(false);
```

- `panelLayout('grid')` lays files out in a grid, `'integrated'` draws the files and the drop zone in one panel, `'circle'` is the round avatar layout. `panelAspectRatio()` sizes the drop zone; `imagePreviewHeight()` (pixels, `'250px'` works too) sets the height of image previews.
- `removeUploadedFileButtonPosition()` and `uploadProgressIndicatorPosition()` (or `loadingIndicatorPosition()`) put the remove button or the upload spinner at the start (`'left'`) or end (`'right'`, default) of a file's row; positions are logical, so they mirror in right-to-left languages. `uploadButtonPosition()` aligns the drop zone's text (`'left'`, `'center'`, `'right'`). AlfaKit has one spinner per file, so the loading and progress positions set the same thing.
- `maxParallelUploads()` uploads that many files of one selection at once (default 1: one after the other, in the order they were picked; Filament's FilePond default is 2).
- New uploads are added after the existing files; `appendFiles(false)` puts them first.

### Links, file information and MIME types

```php
FileUpload::make('contract')
    ->openable()
    ->downloadable()
    ->getOpenableFileUrlUsing(fn (string $file): string => route('contracts.preview', ['path' => $file]))
    ->getDownloadableFileUrlUsing(fn (string $file): ?string => Storage::disk('s3')->temporaryUrl($file, now()->addMinutes(5)))
    ->fetchFileInformation(false)
    ->mimeTypeMap(['skp' => 'application/vnd.sketchup.skp']);
```

- `getOpenableFileUrlUsing()` and `getDownloadableFileUrlUsing()` give the open and download buttons their own URL per stored file (`$file` is the stored path; other utilities such as `$record` are injected). Returning `null` keeps the preview URL.
- When the form is rendered, the size of each stored file is read from its disk and files that no longer exist are flagged. `fetchFileInformation(false)` skips those disk calls, useful on slow remote disks.
- `mimeTypeMap()` maps extensions the server can't recognise to MIME types: a file with such an extension whose content is detected as a generic type (`application/octet-stream`, `application/zip`, `text/plain`) counts as the mapped type for `acceptedFileTypes()` and keeps its extension when stored. The extensions are also added to the file picker.

### Stored paths submitted back

A form can only submit stored paths it was filled with or that the record holds; anything else is rejected, so a user can't point the field at someone else's file. This is always on (Filament makes it opt-in with `preventFilePathTampering()`). Allow more paths with a callback, or opt out:

```php
FileUpload::make('attachment')
    ->preventFilePathTampering(allowFilePathUsing: fn (string $file): bool => str_starts_with($file, 'library/'))
    ->validationMessages(['tampered' => 'Pick a file from the library.']);

FileUpload::make('attachment')->preventFilePathTampering(false); // accepts any stored path
```

`visibility('private')` (the default on a disk configured with `'visibility' => 'private'`) stores files as private and serves previews, open and download links through `temporaryUrl()`, valid for `config('alfakit.temporary_file_url_expiry_minutes')` (30) minutes rounded up to the end of the hour; `temporaryUrlExpiry(60)` changes it per field (likewise on `ImageColumn`, `ImageEntry` and `RichEditor`). The disk must support temporary URLs: S3 does, and so does a `local` disk with `'serve' => true`. On other disks private files have no preview or link. Schedule `php artisan alfakit:prune-uploads` to clean abandoned temporary files.

### Image editor and image rules

```php
FileUpload::make('cover')
    ->image()
    ->imageEditor()
    ->imageEditorAspectRatios(['16:9', '4:3', null]) // null: free cropping
    ->imageAspectRatio('16:9')
    ->imageDimensions(minWidth: 1200, maxWidth: 4000);

FileUpload::make('avatar')->avatar()->imageEditor()->circleCropper();

FileUpload::make('banner')
    ->image()
    ->imageEditor()
    ->imageEditorMode(0)                 // the crop area may leave the image
    ->imageEditorEmptyFillColor('#000000')
    ->imageEditorViewportWidth(1920)
    ->imageEditorViewportHeight(1080);   // opens with a 16:9 crop
```

- `imageEditor()` opens a dialog for each picked, dropped or pasted image (JPEG, PNG, WebP) before it is uploaded: drag the crop area or its corners (arrow keys move it, Shift + arrow keys resize it), rotate, flip, pick an aspect ratio, then **Apply**; **Cancel** skips the file. `imageEditorAspectRatios()` (alias `imageEditorAspectRatioOptions()`) lists the ratios offered, the first one selected; it defaults to `imageAspectRatio()`, else free cropping. `circleCropper()` shows a round crop area and forces 1:1 (the stored image stays square).
- **Zoom**: the mouse wheel, a trackpad pinch, a two-finger pinch on touch screens, the zoom buttons and the `+` / `-` keys (with the crop area focused) zoom the image under the crop area, which stays where it is on screen, so zooming in crops tighter. Drag the image outside the crop area to pan it.
- **Numeric inputs**: X, Y, Width and Height (in pixels of the image, from its top-left after rotating) and Rotation (degrees, any angle; the rotate buttons turn a quarter at a time) sit beside the image, or under it on phones, together with **Scale X** / **Scale Y** toggles that flip the image. They follow the crop area as you drag and apply on Enter or when the field loses focus. Values are clamped to the image (and to the selected aspect ratio: a new width sets the height); an empty or invalid value snaps back.
- **Editing uploaded images**: with `imageEditor()`, every uploaded JPEG, PNG or WebP image in the field (stored ones and those uploaded in this session) gets an **Edit image** (pencil) button unless the field is disabled or read-only. It downloads the image from its URL (same-origin credentials, so signed and private URLs served by your app work; a file on another domain needs CORS), opens the editor, and on **Apply** uploads the result through the normal upload flow and puts it in the old file's place. The old file is dropped like any removed file: a temporary upload is deleted at once, a stored file when the form is saved and `deleteRemovedFiles()` is on. If the image can't be downloaded the field shows "The image could not be opened."
- `imageEditorMode()` follows Cropper.js's view modes: `0` lets the crop area extend past the image (the editing area grows to a square around it, and the empty space is transparent, or `imageEditorEmptyFillColor()`) and the image can be zoomed out below the editor's size; `1` (the default) keeps the crop area inside the image; `2` also stops the image being zoomed out below fitting the editor; `3` makes the image always fill the editor (it opens zoomed in when the image's shape differs from the editor's). `imageEditorEmptyFillColor()` only paints the empty space around the image (including the corners of an image rotated by a non-right angle), never transparent parts of the image itself.
- `imageEditorViewportWidth()` and `imageEditorViewportHeight()` together set the crop ratio the editor opens with (`1920` × `1080` opens a 16:9 crop); the user can still pick another of `imageEditorAspectRatios()`. They don't scale the output.
- `imageAspectRatio('16:9')` (or a list of ratios) and `imageDimensions(minWidth:, minHeight:, maxWidth:, maxHeight:)` are validated on the server against the file's real pixels when the form is submitted, with the same ratio tolerance as Laravel's `dimensions` rule. Files that aren't images fail them. Each argument may be a closure.
- `orientImagesFromExif()` rotates JPEG photos upright from their EXIF orientation when they are stored, using GD and the `exif` extension; without them the browser re-encodes JPEGs upright before upload. Off by default (Filament enables it by default); browsers already display EXIF-rotated photos correctly, so it matters mostly for server-side image processing.
- `pasteable()` (on by default) uploads images and files pasted with Ctrl/⌘ + V while the drop zone has focus; `pasteable(false)` turns it off.

#### Automatic crop and resize

```php
FileUpload::make('cover')
    ->image()
    ->imageCropAspectRatio('16:9')        // or Filament's automaticallyCropImagesToAspectRatio('16:9')
    ->imageResizeMode('cover')            // automaticallyResizeImagesMode('cover')
    ->imageResizeTargetWidth(1920)        // automaticallyResizeImagesToWidth(1920)
    ->imageResizeTargetHeight(1080);      // automaticallyResizeImagesToHeight(1080)
```

Images are cropped and resized in the browser before they are uploaded, without asking the user (use `imageEditor()` to let them choose). `imageCropAspectRatio()` crops the centre of the image to that ratio. `imageResizeMode()` takes `'force'` (exactly the target size, stretching if needed), `'cover'` (fill the target size, cropping the overflow) or `'contain'` (fit inside the target size); it needs a target width and/or height. Filament's names are aliases; `automaticallyCropImagesToAspectRatio()` without an argument uses the first `imageAspectRatio()`. Resizing happens in the browser, so validate dimensions with `imageDimensions()` if they matter.

Type and size rules are checked on the server when the form is submitted, the stored extension comes from the detected MIME type, and dangerous types (HTML, SVG, scripts, executables; `alfakit.uploads.blocked_mime_types`) are refused at upload. Only the user who uploaded a temporary file can attach it. See [Security](/docs/advanced/security#uploads).

## Repeater

```php
Repeater::make('items')->schema([TextInput::make('sku'), TextInput::make('qty')->integer()])
    ->defaultItems(1)->minItems(1)->maxItems(10)->reorderable()->collapsible()->cloneable()
    ->itemLabel(fn (array $state) => $state['sku'] ?? null)->grid(2);

Repeater::make('comments')->relationship()->orderColumn('sort')->schema([...]);   // HasMany
Repeater::make('aliases')->simple(TextInput::make('alias'));                        // flat list of values
```

```php
Repeater::make('sections')->deferLoading()->collapsed()->schema([...]);   // loads after the page
```

`deferLoading()` (also on `Builder`) sends the field without its items on the page's first response; a skeleton shows until it scrolls into view (or an item has a validation error), then the field loads from the server in full. Useful for repeaters with expensive item schemas. AlfaKit loads the whole field at once, where Filament loads each item when it is expanded; set it on the repeater, not on a `Schema` passed to `schema()`. Validation and saving are unchanged.

Lists with more than 50 items render only the visible items; `virtualize(false)` and `virtualizeThreshold(200)` change that (see [Performance](/docs/advanced/performance)). Each item has its own child schema, so closures (`hidden`, `options`, `afterStateUpdated`) see the item's state and `$get('../sibling')` works. Relationship repeaters create, update and delete related records in order. Inside a relationship repeater, `$record` in item closures is the item's record (null for new items), and `unique()`/`exists()` use the related table. `distinct()` on an item field fails when two items share a value (see [Validation](validation#distinct-values-in-repeaters)). `addable(false)`, `deletable(false)` and `reorderable(false)` are enforced on the server.

### Item actions

The add, delete, clone, move and collapse buttons are actions. Customise them like any `Action`:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Support\Enums\Alignment;

Repeater::make('members')
    ->schema([...])
    ->cloneable()
    ->collapsible()
    ->deleteAction(fn (Action $action) => $action->requiresConfirmation())
    ->addAction(fn (Action $action) => $action->label('Add member')->icon('user-plus'))
    ->cloneAction(fn (Action $action) => $action->hidden(fn (array $arguments): bool => $arguments['item'] === '0'))
    ->extraItemActions([
        Action::make('sendEmail')
            ->icon('mail')
            ->action(function (array $arguments, Repeater $component): void {
                $member = $component->getItemState($arguments['item']);
                // ...
            }),
    ])
    ->reorderableWithButtons()            // move up / down buttons (on by default)
    ->reorderableWithDragAndDrop(false)   // no drag handle
    ->addActionAlignment(Alignment::End)
    ->itemNumbers();
```

The customisers are `addAction()`, `deleteAction()`, `cloneAction()`, `reorderAction()` (the drag handle), `moveUpAction()`, `moveDownAction()`, `collapseAction()`, `expandAction()`, `collapseAllAction()` and `expandAllAction()`. `$arguments['item']` is the item key: its position (`'0'`, `'1'` …). A reorder gets `$arguments['items']`, the keys in their new order.

Item actions you only restyle (label, icon, colour, tooltip) run in the browser. When one needs the server (`requiresConfirmation()`, a form, `action()`, `before()` / `after()`), it runs through the field action endpoint and its default handler changes the state there. Collapse and expand are visual and always run in the browser. Extra item actions always run on the server and can change the field with `$component->state()` or `$set()`; `getItemState($key)` / `getRawItemState($key)`, `addItem()`, `deleteItem()`, `cloneItem()`, `moveItem()` and `reorderItems()` help. Visibility closures are evaluated per item; for items added in the browser, `$arguments['item']` is null until the next server round trip, and their extra item actions only appear after it (a `live()` field, another field action or saving the form): to have them right away, make the add action run on the server, for example `->addAction(fn (Action $action) => $action->action(fn (Repeater $component) => $component->addItem()))`. Hiding the add or delete action has the same effect as `addable(false)` / `deletable(false)`, including on the server.

`Select::make('product_id')->disableOptionsWhenSelectedInSiblingRepeaterItems()` disables the options other items already picked (it adds `distinct()` and `live()`).

`Toggle`, `Checkbox` and `Radio` inside a repeater take `fixIndistinctState()`: when one item changes, the same field in the other items is reset so the value stays distinct. Turning a toggle on turns the others off ("only one primary address"); for other values, items holding the same value are cleared. Pair it with `distinct()` to validate the rule on the server too:

```php
Repeater::make('addresses')->schema([
    TextInput::make('street'),
    Toggle::make('is_primary')->fixIndistinctState()->distinct(),
])
```

In tests, `$undo = Repeater::fake()` (and `Builder::fake()`) exist for Filament-style tests; item keys are always positions, so fill and assert repeaters as plain lists.

### Relationship repeaters

`relationship()` manages a `HasMany`, `MorphMany` or `BelongsToMany` relationship. Items are saved after the owner record, in order (`orderColumn()` writes each item's position), on resource pages, in modal actions and in [standalone forms](../standalone/forms) whose `submit()` returns the record.

Rows of a many-to-many with extra columns (order lines with a quantity) can be edited two ways:

```php
// 1. A HasMany to the pivot model (order_product has an incrementing id).
//    Order::orderProducts(): HasMany(OrderProduct::class); OrderProduct extends Pivot with $incrementing = true.
Repeater::make('orderProducts')
    ->relationship()
    ->orderColumn('sort')
    ->schema([
        Select::make('product_id')->relationship('product', 'name')->required(),
        TextInput::make('quantity')->integer()->required(),
    ]);

// 2. The BelongsToMany itself: items are pivot rows.
//    Order::products(): belongsToMany(Product::class)->using(OrderProduct::class)
Repeater::make('products')
    ->relationship()
    ->orderColumn('sort')
    ->schema([
        Select::make('product_id')->relationship('product', 'name')->required(),
        TextInput::make('quantity')->integer()->required(),
    ]);
```

In a `BelongsToMany` repeater, the item field named after the related pivot key (`product_id`) picks the related record; it is required and must be distinct across items. The other item fields are pivot columns: they're loaded with the rows (no `withPivot()` needed), written with `attach()` / `updateExistingPivot()`, and removed items are detached. Items are pivot records, so `$record` and relationship selects in items use the pivot model: give the relationship a pivot model with `using()` when item fields need relationships of their own.

Options and hooks:

- `relationship(modifyQueryUsing: fn (Builder $query) => $query->where('approved', true))` narrows the loaded records; `relationship(modifyRecordsUsing: fn (Collection $records): Collection => $records->where('group', 'start'))` filters the loaded collection. Records left out are neither shown nor updated or deleted, so several repeaters can split one relationship.
- `mutateRelationshipDataBeforeFillUsing(fn (array $data): array)`, `mutateRelationshipDataBeforeCreateUsing(fn (array $data): ?array)` and `mutateRelationshipDataBeforeSaveUsing(fn (array $data, Model $record): ?array)`. Returning `null` from the create or save hook skips that item (it isn't created, or is left unchanged).
- `afterCreate(fn (array $data, Model $record))`, `afterUpdate(fn (array $data, Model $record))` and `afterDelete(fn (Model $record))` run per item. For a `BelongsToMany` repeater, `afterCreate()` receives the attached related record and the other two the pivot record. In `afterDelete()` the record is gone from the database but its attributes are still readable.
- New items of a tenant-owned model belong to the current tenant.
- Cloning an item of a `BelongsToMany` repeater (`cloneable()`) copies its pivot data and empties the related record field, since each record can be attached once.

### Table layout

```php
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Support\Enums\Alignment;

Repeater::make('lines')
    ->table([
        TableColumn::make('Product')->width('50%'),
        TableColumn::make('Quantity')->alignment(Alignment::End),
        TableColumn::make('Unit price')->alignment(Alignment::End),
    ])
    ->schema([
        Select::make('product_id')->relationship('product', 'name')->required(),
        TextInput::make('quantity')->integer()->default(1),
        MoneyInput::make('unit_price'),
    ]);
```

Items render as table rows: the first column holds the item's first component, the second the second, and so on. Field labels stay available to screen readers; the headers show the column labels. `TableColumn` has `width()` (any CSS width), `alignment()` (`Start`, `Center`, `End`; logical, so it mirrors in right-to-left locales), `hiddenHeaderLabel()`, `wrapHeader()` and `markAsRequired()` (defaults to whether the column's field is required). Reordering, cloning and deleting move to the last column. A component hidden in one item leaves its cell empty. `simple()` repeaters ignore `table()`. `RepeatableEntry` has the same `table()` in [infolists](../infolists/overview).

`compact()` tightens the table's cells to fit more rows (`compact(fn (): bool => ...)` works too); it only affects the table layout.

A repeater with two default items and a limit of five:

```alfakit-example name="repeater-items"

```

## KeyValue

`keyLabel()`, `valueLabel()`, `keyPlaceholder()`, `valuePlaceholder()` (placeholders of the key and value inputs), `addable()`, `deletable()`, `reorderable()`, `editableKeys()`, `editableValues()`. Stored as an associative array (use an `array` cast).

The buttons are actions: `addAction()`, `deleteAction()` and `reorderAction()` take `fn (Action $action) => $action->…`. `$arguments['item']` is the row's position; a reorder gets `$arguments['items']`. As with repeaters, a customised action that needs the server (`requiresConfirmation()`, `action()`) runs there.

```php
KeyValue::make('meta')
    ->addAction(fn (Action $action) => $action->label('Add property'))
    ->deleteAction(fn (Action $action) => $action->requiresConfirmation());
```

## TagsInput

`separator(',')` stores a string instead of an array; `suggestions()`, `splitKeys()`, `nestedRecursiveRules()`, `color()`, `tagPrefix()` and `tagSuffix()` (added before / after each new tag: `TagsInput::make('sizes')->tagSuffix('cm')` stores `12cm`). With `reorderable()`, tags can be dragged, or focused and moved with Alt + Left/Right arrow (the arrows follow the reading direction in right-to-left languages); screen readers hear the new position.

## ColorPicker

`hex()` (default), `rgb()`, `rgba()`, `hsl()`. With `rgba()` an opacity slider sits under the swatch (the browser's colour picker has no alpha); it keeps the colour and changes only the alpha channel.

## IconPicker

Stores an icon name (`house`, `mdi-home`, `heroicon-o-user`) picked from Lucide and the [registered icon sets](../design/icons#iconify-icon-sets). The stored value works anywhere an icon is accepted: `->icon($record->icon)`, `IconColumn::make('icon')`, `IconEntry::make('icon')`, navigation items.

```php
use AlfaSix\Alfakit\Forms\Components\IconPicker;

IconPicker::make('icon')
    ->sets(['lucide', 'mdi'])       // default: Lucide and every registered Iconify or directory set
    ->exclude(['skull'])            // never offered or accepted
    ->gridColumns(8)                // icons per row (default 8)
    ->previewSize('lg')             // sm, md (default) or lg
    ->placeholder('Choose an icon');

IconPicker::make('status_icon')->allowedIcons(['circle-check', 'circle-x', 'mdi-progress-clock']);
IconPicker::make('logo')->allowCustomSvg(); // also accept pasted SVG markup
```

The popover has a search box (`searchable(false)` hides it), a set filter when there is more than one set, and a grid of icons. Searching runs on the server through the same authorised options endpoint as searchable selects, `perPage()` icons at a time (default 96): scrolling to the end of the grid or pressing "Load more icons" fetches the next page, so the browser never downloads a whole set (Lucide has about 1,900 icons, Material Design Icons over 7,000). Lucide's alias names are searched too (`home` finds `house`). The picker's code is loaded the first time one is shown.

Keyboard: the arrow keys move through the grid (left and right follow the reading direction), Home and End jump to the first and last icon, Enter picks the highlighted icon (press an arrow key first: nothing is highlighted after typing a search) and Escape closes. The grid is a listbox driven from the search box, and every icon is named by its value for screen readers.

`sets()` accepts `lucide`, the prefix of a set registered with `Icons::iconify()` or `Icons::registerSet()` with a directory, and `heroicon-o` / `heroicon-s` / `heroicon-m` / `heroicon-c` (Heroicon names, drawn as their Lucide equivalent unless a real Heroicons set is registered). Closure sets can't be listed; put their names in `allowedIcons()`. `allowIcons()` and `disallowIcons()` are aliases of `allowedIcons()` and `exclude()`.

Validation only accepts icons the picker offers. With `allowCustomSvg()`, SVG markup is accepted too; it is sanitised when it is saved and whenever it is drawn, and the picker shows "Custom SVG" until the server has sanitised it.

## Hidden

A hidden input, still validated and dehydrated.

> **Security:** hidden fields are not secret and not trusted. Their value is sent to the browser and posted back, so a user can read and change it with the browser's developer tools. Never use a `Hidden` field for values the user must not control (an owner id, a price, a role): set those on the server instead, for example in `mutateFormDataBeforeCreate()` or a model observer, and validate anything that comes back.
