import type { ActionSchema, AnyActionSchema } from './actions'
import type {
  BuilderSchema,
  CodeEditorSchema,
  ModalTableSelectSchema,
  SliderSchema,
  ToggleButtonsSchema,
} from './advanced-fields'
import type {
  Alignment,
  Attributes,
  Breakpoints,
  Color,
  ColumnSpanValue,
  IconName,
  IconPosition,
  Operation,
  OptionOrGroup,
  Size,
  VirtualizeSchema,
} from './common'
import type { FileManagerPickerSchema } from './file-manager'
import type { IconPickerSchema } from './icon-picker'

/** Properties every schema component carries. */
export interface BaseComponent {
  type: string
  key: string
  id?: string
  label?: string | null
  disabled?: boolean
  columns?: Breakpoints
  columnSpan?: Breakpoints<ColumnSpanValue>
  columnStart?: Breakpoints<number | string | null>
  /** `columnOrder()`: CSS `order` in the parent grid, per breakpoint. */
  columnOrder?: Breakpoints<number | null>
  extraAttributes?: Attributes
  meta?: Record<string, unknown>
  /** `false` keeps the component at its natural width inside a `Flex`. */
  grow?: boolean
  /** Child components (layout containers). */
  schema?: SchemaComponent[]
  /** `dense()`: half the gap between the children (layout containers). */
  dense?: boolean
  /** `gap(false)`: no gap between the children (layout containers). */
  gap?: false
  /** `exposeContext()`: what a custom frontend component may read about its schema. */
  context?: SchemaComponentContext
  /**
   * `deferLoading()`: sent without its children on the page's first response; the
   * renderer loads them from `schemaDeferred` once the placeholder is in view.
   */
  deferred?: boolean
  /** State paths of the fields inside a deferred component (loaded early on errors). */
  deferredPaths?: string[]
}

/** Server-provided context of a component (`exposeContext()`), read with the renderers' context helper. */
export interface SchemaComponentContext {
  operation?: Operation | null
  recordKey?: string | number | null
  /** The record attributes listed in `exposeContext(record: [...])`. */
  record?: Record<string, unknown> | null
  /** `exposeContext(data: [...])`. */
  data?: Record<string, unknown> | null
  /** The state path of the component's container (e.g. `items.0` in a repeater item); relative `get()` paths start here. */
  basePath?: string | null
}

export interface LiveConfig {
  onBlur: boolean
  debounce: number | null
}

/**
 * Actions attached to a field or entry: before (`prefixActions`) and after
 * (`suffixActions`) the control, and next to the label (`hintActions`). They run as field
 * actions (`field:{schema}::{key}`, see `fieldActionContext()`).
 */
export interface FieldActions {
  prefixActions?: ActionSchema[]
  suffixActions?: ActionSchema[]
  hintActions?: ActionSchema[]
}

/**
 * Content slots of a field or entry (`aboveLabel()`, `afterContent()`…). The error message
 * slots exist on fields only and show while the field has a validation error.
 */
export type ContentSlotName =
  | 'aboveLabel'
  | 'beforeLabel'
  | 'afterLabel'
  | 'belowLabel'
  | 'aboveContent'
  | 'beforeContent'
  | 'afterContent'
  | 'belowContent'
  | 'aboveErrorMessage'
  | 'belowErrorMessage'

/**
 * One item of a content slot: a schema component (strings arrive as `Text`, `Htmlable`
 * values as `Html`) or an action / action group, run as a field action.
 */
export type ContentSlotItem =
  { component: SchemaComponent; action?: never } | { action: AnyActionSchema; component?: never }

export interface ContentSlotSchema {
  items: ContentSlotItem[]
  /** `afterLabel` defaults to `end`, every other slot to `start`. */
  alignment: 'start' | 'end' | 'between'
}

export interface ContentSlots {
  slots?: Partial<Record<ContentSlotName, ContentSlotSchema>>
}

/** Properties every form field carries. */
export interface BaseField extends BaseComponent, FieldActions, ContentSlots {
  name: string
  statePath: string
  required?: boolean
  readOnly?: boolean
  autofocus?: boolean
  placeholder?: string
  helperText?: string
  /** HTML: plain strings are escaped by the server, `Htmlable` values are sent as is. */
  hint?: string
  hintIcon?: IconName
  hintColor?: Color
  /** `inlineLabel()`: the label sits beside the control from the `sm` breakpoint up. */
  inlineLabel?: boolean
  live?: LiveConfig
  extraInputAttributes?: Attributes
  /** Attributes for the `data-slot="field"` wrapper, merged with `extraAttributes`. */
  extraFieldWrapperAttributes?: Attributes
  /** `allowHtmlValidationMessages()`: the error message is rendered as HTML. */
  allowHtmlValidationMessages?: boolean
  /**
   * `->translatable()`: the state is a `{ [locale code]: value }` object and the renderer
   * shows one input per language (see `translatableLocaleField()`).
   */
  translatable?: TranslatableSchema
}

/** A language of a translatable field. */
export interface TranslatableLocaleSchema {
  code: string
  /** BCP 47 tag for the `lang` attribute. */
  tag: string
  /** The language's own name. */
  label: string
  direction: 'ltr' | 'rtl'
  /** Must be filled when the field is required. */
  required?: boolean | null
}

export interface TranslatableSchema {
  locales: TranslatableLocaleSchema[]
  defaultLocale: string
}

export interface Affixes {
  prefix?: string
  suffix?: string
  prefixIcon?: IconName
  suffixIcon?: IconName
  prefixIconColor?: Color
  suffixIconColor?: Color
}

// ---------------------------------------------------------------- Fields

export interface TextInputSchema extends BaseField, Affixes {
  type: 'TextInput'
  inputType: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | (string & {})
  revealable?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  step?: number | string
  mask?: string
  /** `autocomplete(false)` arrives as `off`. */
  autocomplete?: string
  inputMode?: string
  datalist?: string[]
  /** HTML `autocapitalize` hint (`on`, `off`, `none`, `sentences`, `words`, `characters`). */
  autocapitalize?: 'on' | 'off' | 'none' | 'sentences' | 'words' | 'characters' | (string & {})
  /** `copyable()`: a button in the input copies its value. */
  copyable?: boolean
  copyMessage?: string
  /** Milliseconds the copied confirmation stays visible. */
  copyMessageDuration?: number
}

export interface TextareaSchema extends BaseField {
  type: 'Textarea'
  rows?: number
  cols?: number
  minLength?: number
  maxLength?: number
  autosize?: boolean
}

export interface HiddenSchema extends BaseField {
  type: 'Hidden'
}

/** `OneTimeCodeInput`: a numeric code with `autocomplete="one-time-code"`. */
export interface OneTimeCodeInputSchema extends BaseField {
  type: 'OneTimeCodeInput'
  /** Number of digits. */
  length: number
  /** `submitOnCompletion()`: submit the form once every digit is entered. */
  submitOnCompletion?: boolean
}

export interface CheckboxSchema extends BaseField {
  type: 'Checkbox'
  inline: boolean
}

export interface ToggleSchema extends BaseField {
  type: 'Toggle'
  inline: boolean
  onIcon?: IconName
  offIcon?: IconName
  onColor?: Color
  offColor?: Color
}

export interface SelectSchema extends BaseField, Affixes {
  type: 'Select'
  options: OptionOrGroup[]
  /** Labels for the currently selected values of a searchable select. */
  selectedLabels?: Record<string, string>
  multiple?: boolean
  searchable?: boolean
  native?: boolean
  selectablePlaceholder: boolean
  searchDebounce?: number
  noSearchResultsMessage?: string
  searchPrompt?: string
  loadingMessage?: string
  /** Shown when the select has no options at all. */
  noOptionsMessage?: string
  /** Shown while search results load. */
  searchingMessage?: string
  /** Option labels are HTML (sanitised by the server). */
  allowHtml?: boolean
  /** `false`: long option labels are truncated instead of wrapping. */
  wrapOptionLabels?: false
  maxItems?: number
  minItems?: number
  /** `reorderable()` on a multi-select: chosen chips can be reordered (drag or keyboard). */
  reorderable?: boolean
}

export interface CheckboxListSchema extends BaseField {
  type: 'CheckboxList'
  options: OptionOrGroup[]
  searchable?: boolean
  /** `noSearchResultsMessage()`: shown when the search matches no option. */
  noSearchResultsMessage?: string
  /** `searchPrompt()`: placeholder of the search input. */
  searchPrompt?: string
  /** `searchDebounce()`: milliseconds to wait after typing before filtering. */
  searchDebounce?: number
  bulkToggleable?: boolean
  inline?: boolean
  gridColumns?: number
  /** `column` fills the grid column by column; row by row otherwise. */
  gridDirection?: OptionsGridDirection
  /** Option labels are HTML (sanitised by the server). */
  allowHtml?: boolean
  /** Customised bulk toggle links (`selectAllAction()` / `deselectAllAction()`). */
  selectAllAction?: BulkToggleActionSchema
  deselectAllAction?: BulkToggleActionSchema
}

export type OptionsGridDirection = 'row' | 'column'

export interface BulkToggleActionSchema {
  label?: string
  icon?: IconName
  hidden?: boolean
}

export interface RadioSchema extends BaseField {
  type: 'Radio'
  options: OptionOrGroup[]
  inline?: boolean
}

export interface DatePickerSchema extends BaseField, Affixes {
  type: 'DatePicker' | 'DateTimePicker' | 'TimePicker'
  /** PHP date format of the stored value. */
  format: string
  displayFormat?: string
  hasDate: boolean
  hasTime: boolean
  hasSeconds?: boolean
  minDate?: string
  maxDate?: string
  disabledDates?: string[]
  native: boolean
  timezone: string
  firstDayOfWeek: number
  closeOnDateSelection: boolean
  /** Steps of the time inputs (`hoursStep()`, `minutesStep()`, `secondsStep()`). */
  hoursStep?: number
  minutesStep?: number
  secondsStep?: number
  /** The month the calendar opens on while empty, in the storage format. */
  defaultFocusedDate?: string
  /** `locale()`: BCP 47 tag for this picker's names and display format (the panel's otherwise). */
  locale?: string
  /** `datalist()`: suggested values in the storage format (native pickers only). */
  datalist?: string[]
}

export interface MoneyInputSchema extends BaseField, Affixes {
  type: 'MoneyInput'
  /** ISO 4217 code. */
  currency: string
  /** Minor-unit digits of the currency (USD 2, BHD 3, JPY 0). */
  decimals: number
  min?: number
  max?: number
}

export interface ColorPickerSchema extends BaseField {
  type: 'ColorPicker'
  format: 'hex' | 'rgb' | 'rgba' | 'hsl'
}

export interface TagsInputSchema extends BaseField {
  type: 'TagsInput'
  suggestions?: string[]
  splitKeys: string[]
  color?: Color
  reorderable?: boolean
  tagPrefix?: string
  tagSuffix?: string
}

export interface KeyValueSchema extends BaseField {
  type: 'KeyValue'
  keyLabel: string
  valueLabel: string
  keyPlaceholder?: string
  valuePlaceholder?: string
  addActionLabel: string
  addable: boolean
  deletable: boolean
  reorderable: boolean
  editableKeys: boolean
  editableValues: boolean
  /** `addAction()`, `deleteAction()`, `reorderAction()`; null = hidden. */
  itemActions?: Partial<Record<'add' | 'delete' | 'reorder', ItemActionSchema | null>>
}

export interface UploadedFile {
  path: string
  name: string
  url?: string
  /** `getOpenableFileUrlUsing()`: where "open" links to, when not `url`. */
  openUrl?: string
  /** `getDownloadableFileUrlUsing()`: where "download" links to, when not `url`. */
  downloadUrl?: string
  /** `fetchFileInformation()`: the stored file no longer exists on its disk. */
  missing?: boolean
  temporary?: boolean
  size?: number
}

/** Logical sides of a file upload's controls (`removeUploadedFileButtonPosition()`…). */
export interface FileUploadPositions {
  removeButton?: 'start' | 'end'
  progressIndicator?: 'start' | 'end'
  uploadButton?: 'start' | 'center' | 'end'
}

export interface FileUploadSchema extends BaseField {
  type: 'FileUpload'
  multiple?: boolean
  image?: boolean
  avatar?: boolean
  acceptedFileTypes?: string[]
  maxSize?: number
  minSize?: number
  /** Encrypted limits sent with each upload so the endpoint applies the field's `maxSize()`. */
  uploadPolicy?: string | null
  maxFiles?: number
  minFiles?: number
  downloadable?: boolean
  openable?: boolean
  previewable: boolean
  reorderable?: boolean
  deletable: boolean
  panelLayout: 'compact' | 'grid' | 'integrated' | 'circle' | (string & {})
  /** `panelAspectRatio()`: aspect ratio of the drop zone, e.g. `'2:1'`. */
  panelAspectRatio?: string
  imagePreviewHeight?: number | string
  /** `maxParallelUploads()`: files of one selection uploading at once (default 1). */
  maxParallelUploads?: number
  /** `appendFiles(false)`: new uploads go before the existing files. */
  appendFiles?: boolean
  /** `mimeTypeMap()`: extension → MIME type, for extensions browsers don't recognise. */
  mimeTypeMap?: Record<string, string>
  positions?: FileUploadPositions
  /** Images are cropped/resized in the browser before upload with these options. */
  imageCropAspectRatio?: string
  imageResizeMode?: 'cover' | 'contain' | 'force' | (string & {})
  imageResizeTargetWidth?: number
  imageResizeTargetHeight?: number
  uploadingMessage?: string
  /** `imageEditor()`: crop / rotate / flip each image before it is uploaded. */
  imageEditor?: FileUploadImageEditorSchema | null
  /** `imageAspectRatio()`: ratios the server accepts (checked on the file's pixels). */
  imageAspectRatio?: string[] | null
  /** `imageDimensions()`: pixel limits the server checks. */
  imageDimensions?: {
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  } | null
  /** Re-encode JPEGs upright in the browser (sent only when the server can't do it). */
  orientImagesFromExif?: boolean | null
  /** `pasteable()`: accept files pasted while the drop zone has focus. */
  pasteable?: boolean
  files: UploadedFile[]
}

export interface FileUploadImageEditorSchema {
  /** `'16:9'`-style ratios; `null` is free cropping. The first one is selected. */
  aspectRatios: Array<string | null>
  /** `circleCropper()`: a round viewport (the output stays square). */
  circle: boolean
  /** `imageEditorMode()` (Cropper.js `viewMode`): `0` lets the crop leave the image. */
  mode?: 0 | 1 | 2 | 3
  /** `imageEditorEmptyFillColor()`: colour of the empty space around the image. */
  emptyFillColor?: string | null
  /** `imageEditorViewportWidth()/Height()`: the crop ratio the editor opens with. */
  viewportWidth?: number | null
  viewportHeight?: number | null
}

/** A custom block a RichEditor can insert (`RichEditor::blocks()`). */
export interface RichEditorCustomBlockSchema {
  id: string
  label: string
  icon?: IconName
  /** The panel group (`customBlocks(['Marketing' => [...]])`). */
  group?: string
  /**
   * The field action (`customBlock:{id}`) that inserts the block: with a modal when the
   * block has a configuration form. It returns `{ id, config, preview }`.
   */
  action: ActionSchema
}

/** A mention trigger (`RichEditor::mentions()`). */
export interface RichEditorMentionSchema {
  /** The character that starts a mention, e.g. `@` or `#`. */
  trigger: string
  /** Static items; omitted when the server searches them (`getSearchResultsUsing`). */
  items?: Array<{ id: string; label: string }>
  /** Search on the server through the options endpoint as the user types. */
  searchable?: boolean
  searchDebounce?: number
}

/** A merge tag (`RichEditor::mergeTags()`), stored as `{{ id }}`. */
export interface RichEditorMergeTagSchema {
  id: string
  label: string
}

/** A toolbar dropdown (`ToolbarButtonGroup::make()`), referenced as `group:{n}` in a toolbar. */
export interface RichEditorToolbarGroupSchema {
  label: string
  /** Fixed trigger icon; without one the trigger shows the active (or first) button's icon. */
  icon?: IconName
  buttons: string[]
  /** `textualButtons()`: list the buttons with their labels. */
  textual?: boolean
}

/** A toolbar button from a rich content plugin (`RichEditorTool`). */
export interface RichEditorToolSchema {
  name: string
  label: string
  icon?: IconName
  /** Tiptap chain commands run on click: `[name, ...args]` each. */
  commands?: Array<[string, ...unknown[]]>
  /**
   * The plugin's editor action (opened with `editorSelection` and `attributes` arguments).
   * It may return `{ editorCommands, editorSelection }` (`RichEditor::runCommands()`).
   */
  action?: ActionSchema
  /** Pressed while this mark or node (with these attributes) is active. */
  active?: { name: string; attributes?: Record<string, unknown> }
}

export interface RichEditorSchema extends BaseField {
  type: 'RichEditor' | 'MarkdownEditor'
  /** Button names, `'|'` separators and `group:{n}` dropdowns (see `toolbarButtonGroups`). */
  toolbarButtons: string[]
  toolbarButtonGroups?: Record<string, RichEditorToolbarGroupSchema> | null
  /**
   * `floatingToolbars()`: buttons shown next to the selection, keyed by node name
   * (`paragraph`, `heading`, `table`, `image`, …).
   */
  floatingToolbars?: Record<string, string[]> | null
  stickyToolbar?: boolean | null
  stickyPanels?: boolean | null
  /** CSS length; null measures the panel's sticky topbar. */
  stickyOffset?: string | null
  /** `resizableImages()`: drag handles; the width is stored on the image. */
  resizableImages?: boolean | null
  minimalCustomBlockControls?: boolean | null
  customBlocksGrid?: boolean | null
  searchableCustomBlocks?: boolean | null
  /** The panel open on load (`activePanel()`). */
  activePanel?: 'customBlocks' | 'mergeTags' | null
  /** Plugin toolbar buttons, usable by name in the toolbars. */
  editorTools?: RichEditorToolSchema[] | null
  /** Registry keys of plugin Tiptap extensions (`createAlfakit({ richEditorExtensions })`). */
  extensions?: string[] | null
  fileAttachments: {
    disk: string
    directory: string | null
    /** MIME types an inserted image may have; the server checks them on save. */
    acceptedFileTypes?: string[]
    /** Kilobytes. */
    maxSize?: number
    /** Encrypted limits sent with each upload (size and types of attachments). */
    uploadPolicy?: string | null
  }
  /** The `textColor` button's palette (`textColors()`); only sent with that button. */
  textColors?: Array<{ value: string; label: string }> | null
  /** `customTextColors()`: also offer a free colour picker. */
  customTextColors?: boolean | null
  minHeight?: number
  maxHeight?: number
  /**
   * `linkProtocols()`: URL schemes links may use (relative links always can); null keeps
   * the defaults. The server drops other links when the content is saved.
   */
  linkProtocols?: string[] | null
  /**
   * MarkdownEditor: the Markdown state rendered as HTML, which is what the editor loads.
   * A translatable editor gets one document per language code (see
   * `translatableLocaleField()`, which picks the current one).
   */
  html?: string | Record<string, string | null> | null
  /** RichEditor: the state is a Tiptap JSON document instead of HTML. */
  json?: boolean
  customBlocks?: RichEditorCustomBlockSchema[]
  mentions?: RichEditorMentionSchema[]
  mergeTags?: RichEditorMergeTagSchema[]
}

/** A column of a Repeater or RepeatableEntry shown as a table (`->table([...])`). */
export interface TableColumnSchema {
  label: string
  /** The item component the column shows: a field's relative state path or an entry's name. */
  name?: string
  hiddenLabel?: boolean
  required?: boolean
  /** CSS width, e.g. `200px` or `30%`. */
  width?: string
  alignment?: 'start' | 'center' | 'end'
  wrapHeader?: boolean
}

/** Built-in actions of a Repeater, Builder or KeyValue (`deleteAction(fn ($a) => …)`). */
export type ItemActionName =
  | 'add'
  | 'delete'
  | 'clone'
  | 'reorder'
  | 'moveUp'
  | 'moveDown'
  | 'collapse'
  | 'expand'
  | 'collapseAll'
  | 'expandAll'

/**
 * A built-in item action. Without `server` the renderer applies it in the browser; with
 * it (customised with a modal, handler or hooks) it runs through the field action
 * endpoint with `arguments.item` (`items` for reorder, `block` for a Builder's add).
 */
export interface ItemActionSchema extends ActionSchema {
  server?: boolean
}

/** Customised built-in actions by name; null = hidden. Absent names use the renderer's default. */
export type ItemActionsSchema = Partial<Record<ItemActionName, ItemActionSchema | null>>

/** Item action props shared by Repeater and Builder. */
export interface ItemActionsProps {
  /** Field-level built-in actions (item actions evaluated without an item). */
  itemActions?: ItemActionsSchema
  /** `reorderableWithButtons(false)`: no move up / down buttons. */
  reorderableWithButtons?: boolean
  /** `reorderableWithDragAndDrop(false)`: no drag handle. */
  reorderableWithDragAndDrop?: boolean
  addActionAlignment?: Alignment
  itemNumbers?: boolean
}

/** Per-item action props: customised built-ins for this item, `extraItemActions()`. */
export interface ItemActionsItemProps {
  itemActions?: ItemActionsSchema
  actions?: ActionSchema[]
}

export interface RepeaterItemSchema extends ItemActionsItemProps {
  key: string
  label?: string | null
  schema: SchemaComponent[]
}

export interface RepeaterSchema extends BaseField, ItemActionsProps {
  type: 'Repeater'
  items: RepeaterItemSchema[]
  /** Blank item schema; `__INDEX__` placeholders must be replaced with the new index. */
  template: SchemaComponent[]
  templateState: Record<string, unknown>
  simple?: boolean
  minItems?: number
  maxItems?: number
  addable: boolean
  deletable: boolean
  reorderable: boolean
  cloneable?: boolean
  collapsible?: boolean
  collapsed?: boolean
  addActionLabel: string
  grid?: Breakpoints
  /** Render items as table rows: one column per item field, in schema order. */
  table?: TableColumnSchema[]
  /** `compact()`: a table layout with tighter cells. */
  compact?: boolean
  /** Render only the visible items above a threshold (`virtualize()`, on by default). */
  virtualize?: VirtualizeSchema
}

export type FieldSchema =
  | TextInputSchema
  | TextareaSchema
  | HiddenSchema
  | OneTimeCodeInputSchema
  | CheckboxSchema
  | ToggleSchema
  | SelectSchema
  | CheckboxListSchema
  | RadioSchema
  | DatePickerSchema
  | MoneyInputSchema
  | ColorPickerSchema
  | TagsInputSchema
  | KeyValueSchema
  | FileUploadSchema
  | RichEditorSchema
  | RepeaterSchema
  | BuilderSchema
  | ToggleButtonsSchema
  | SliderSchema
  | CodeEditorSchema
  | ModalTableSelectSchema
  | IconPickerSchema
  | FileManagerPickerSchema

export const FIELD_TYPES = [
  'TextInput',
  'Textarea',
  'Hidden',
  'OneTimeCodeInput',
  'Checkbox',
  'Toggle',
  'Select',
  'CheckboxList',
  'Radio',
  'DatePicker',
  'DateTimePicker',
  'MoneyInput',
  'TimePicker',
  'ColorPicker',
  'TagsInput',
  'KeyValue',
  'FileUpload',
  'RichEditor',
  'MarkdownEditor',
  'Repeater',
  'Builder',
  'ToggleButtons',
  'Slider',
  'CodeEditor',
  'ModalTableSelect',
  'IconPicker',
  // alfasix/alfakit-file-manager
  'FileManagerPicker',
] as const

export function isField(component: SchemaComponent): component is FieldSchema {
  return (
    'statePath' in component &&
    typeof (component as BaseField).statePath === 'string' &&
    (FIELD_TYPES as readonly string[]).includes(component.type)
  )
}

// ---------------------------------------------------------------- Layout

export interface GridSchema extends BaseComponent {
  type: 'Grid'
}

export interface GroupSchema extends BaseComponent {
  type: 'Group'
}

/**
 * Fields fused into one control (shared border, no gaps). Child labels become
 * screen-reader text and their errors are listed below the group.
 */
export interface FusedGroupSchema extends BaseComponent {
  type: 'FusedGroup'
}

export interface SectionSchema extends BaseComponent {
  type: 'Section'
  heading?: string
  /** The heading's level (`2` = `h2`): `rootHeadingLevel()` plus the nesting depth. */
  headingLevel?: number
  description?: string
  icon?: IconName
  collapsible?: boolean
  collapsed?: boolean
  /** `persistCollapsed()`: the local storage key the collapsed state is kept under. */
  persistCollapsed?: string
  compact?: boolean
  aside?: boolean
  secondary?: boolean
  headerActions?: AnyActionSchema[]
  /** `afterHeader()`: actions and components at the end of the header. */
  afterHeader?: ContentSlotItem[]
  footerActions?: AnyActionSchema[]
  /** `footerActionsAlignment()`: alignment of `footerActions` (default `start`). */
  footerActionsAlignment?: Alignment
  /** `footer()`: actions and components in the footer, after `footerActions`. */
  footer?: ContentSlotItem[]
}

export interface FieldsetSchema extends BaseComponent {
  type: 'Fieldset'
  /** `contained(false)`: no border or padding around the fields. */
  contained?: false
}

export interface TabSchema extends BaseComponent {
  type: 'Tab'
  icon?: IconName
  iconPosition?: IconPosition
  badge?: string | number
  badgeColor?: Color
  /** `Tab::badgeTooltip()`: shown on hover (title) of the badge. */
  badgeTooltip?: string
  /** `deferBadge()`: the badge is loaded from `schemaDeferred` after the page renders. */
  badgeDeferred?: boolean
}

/** What `schemaDeferred` returns for a `Tab::deferBadge()` tab. */
export interface DeferredBadgeSchema {
  badge?: string | number | null
  badgeColor?: Color | null
  badgeTooltip?: string | null
}

export interface TabsSchema extends BaseComponent {
  type: 'Tabs'
  schema: TabSchema[]
  activeTab: number
  contained?: boolean
  vertical?: boolean
  queryStringKey?: string
  /** `scrollable(false)`: the tab list wraps instead of scrolling sideways. */
  scrollable?: false
  /** `persistTab()`: where the active tab is remembered in the browser. */
  persistTab?: { key: string; storage: 'local' | 'session' }
}

export interface StepSchema extends BaseComponent {
  type: 'Step'
  description?: string
  icon?: IconName
  /** Icon once the step is completed (falls back to the wizard's, then a check mark). */
  completedIcon?: IconName
}

export interface WizardSchema extends BaseComponent {
  type: 'Wizard'
  schema: StepSchema[]
  startStep: number
  skippable?: boolean
  submitActionLabel?: string
  /** `submitAction(Action)`: rendered on the last step, runs through the action endpoint. */
  submitAction?: ActionSchema
  /** `submitAction(Htmlable)`: markup rendered on the last step. */
  submitActionHtml?: string
  nextActionLabel: string
  previousActionLabel: string
  /**
   * `nextAction(fn)` / `previousAction(fn)`: the button's appearance; `false` hides it.
   * Absent when not customised (the default buttons render).
   */
  nextAction?: ActionSchema | false
  previousAction?: ActionSchema | false
  completedIcon?: IconName
  /** Query-string key the current step is kept under (`true` from older servers = `step`). */
  persistStepInQueryString?: string | boolean
  /**
   * `goToStep()`: the server asked the wizard to show the step with this key. `id` is new
   * on every response, so the same step can be requested again.
   */
  goToStep?: { step: string; id: string }
}

export interface PlaceholderSchema extends BaseComponent {
  type: 'Placeholder'
  content?: string
  helperText?: string
}

export interface HtmlSchema extends BaseComponent {
  type: 'Html'
  content: string
}

export interface TextSchema extends BaseComponent {
  type: 'Text'
  content: string
  color?: Color
  icon?: IconName
  size?: string
  weight?: string
  badge?: boolean
  /** `sans`, `serif` or `mono`. */
  fontFamily?: string
  tooltip?: string
  /** `copyable()`: a button copies `content` to the clipboard. */
  copyable?: boolean
  copyMessage?: string
  /** Milliseconds the copy confirmation shows. */
  copyMessageDuration?: number
}

/** A custom frontend component registered in the renderer. */
export interface ViewSchema extends BaseComponent {
  type: 'View'
  component: string
  props?: Record<string, unknown>
}

/** Children side by side, stacked below the `from` breakpoint. */
export interface FlexSchema extends BaseComponent {
  type: 'Flex'
  from: 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  verticalAlignment?: 'start' | 'center' | 'end'
  /** `alignment()`: horizontal alignment of the children (`justify` spreads them like `between`). */
  alignment?: Alignment
}

/** A highlighted message box. `description` is HTML (plain strings escaped by the server). */
export interface CalloutSchema extends BaseComponent {
  type: 'Callout'
  heading?: string
  description?: string
  icon?: IconName
  /** `iconSize()`: `sm`, `md` or `lg` (default). */
  iconSize?: Size
  color?: Color
  /**
   * `status()` / `danger()`…: kept after `color(null)` so the icon keeps its status colour
   * and danger/warning callouts keep `role="alert"`.
   */
  status?: Color
  /** `iconColor()`: overrides the icon's colour. */
  iconColor?: Color
  actions?: AnyActionSchema[]
  /** `footerActionsAlignment()`: alignment of `actions` (default `start`). */
  footerActionsAlignment?: Alignment
  /** `controls()` and `controlActions()`: shown in the top end corner. */
  controls?: ContentSlotItem[]
  /** `footer()`: actions and components under the description. */
  footer?: ContentSlotItem[]
}

/**
 * A row of action buttons placed freely in a form or infolist. The actions run in the
 * component's field context (`field:{schema}::{key}`), like a field's suffix actions.
 */
export interface ActionsComponentSchema extends BaseComponent {
  type: 'Actions'
  actions: AnyActionSchema[]
  alignment?: Alignment
  verticalAlignment?: 'start' | 'center' | 'end'
  fullWidth?: boolean
}

/** Placeholder for missing content. `description` is HTML (escaped by the server). */
export interface EmptyStateComponentSchema extends BaseComponent {
  type: 'EmptyState'
  heading?: string
  description?: string
  icon?: IconName
  color?: Color
  contained: boolean
  actions?: AnyActionSchema[]
  /** `footer()`: actions and components under the description (after `actions`). */
  footer?: ContentSlotItem[]
}

export interface IconSchema extends BaseComponent {
  type: 'Icon'
  icon: IconName
  color?: Color
  size?: Size | string
  tooltip?: string
}

export interface ImageSchema extends BaseComponent {
  type: 'Image'
  url: string
  alt: string
  /** CSS lengths. */
  imageWidth?: string
  imageHeight?: string
  alignment?: Alignment
  circular?: boolean
  tooltip?: string
}

/** A bulleted list; every child component is one item. */
export interface UnorderedListSchema extends BaseComponent {
  type: 'UnorderedList'
  size?: Size | string
}

export type LayoutSchema =
  | FlexSchema
  | CalloutSchema
  | ActionsComponentSchema
  | EmptyStateComponentSchema
  | IconSchema
  | ImageSchema
  | UnorderedListSchema
  | GridSchema
  | GroupSchema
  | FusedGroupSchema
  | SectionSchema
  | FieldsetSchema
  | TabsSchema
  | TabSchema
  | WizardSchema
  | StepSchema
  | PlaceholderSchema
  | HtmlSchema
  | TextSchema
  | ViewSchema

// ---------------------------------------------------------------- Infolist entries

export interface BaseEntry extends BaseComponent, FieldActions, ContentSlots {
  name: string
  state?: unknown
  url?: string
  openUrlInNewTab?: boolean
  tooltip?: string
  helperText?: string
  /** HTML: plain strings are escaped by the server, `Htmlable` values are sent as is. */
  hint?: string
  hintIcon?: IconName
  hintColor?: Color
  placeholder?: string
  /** `inlineLabel()`: the label sits beside the value from the `sm` breakpoint up. */
  inlineLabel?: boolean
  /**
   * Attributes for the `data-slot="entry"` wrapper. `extraAttributes` go on the value
   * (`data-slot="entry-value"`).
   */
  extraEntryWrapperAttributes?: Attributes
  /** `alignment()`: horizontal alignment of the value. */
  alignment?: Alignment
}

export interface TextStyleProps {
  size?: string
  weight?: string
  fontFamily?: string
  lineClamp?: number
  badge?: boolean
  copyable?: boolean
  copyMessage?: string
  /** Milliseconds the copy confirmation shows (`copyMessageDuration()`, default 1500). */
  copyMessageDuration?: number
  wrap?: boolean
}

export interface FormattedStateProps {
  html?: boolean
  listWithLineBreaks?: boolean
  bulleted?: boolean
  placeholder?: string
  boolean?: boolean
  /**
   * `limitList()` + `expandableLimitedList()`: every item is sent; the first `listLimit`
   * show with a "+N more" toggle for the rest.
   */
  expandableLimitedList?: boolean
  listLimit?: number
}

/** `ring()` / `overlap()` / `extraImgAttributes()` of image columns and entries. */
export interface ImageStackProps {
  /** Ring width in pixels around stacked images (0–8, default 2). */
  ring?: number
  /** Overlap of stacked images in quarter rems (0–8, default 2). */
  overlap?: number
}

export interface TextEntrySchema extends BaseEntry, TextStyleProps, FormattedStateProps {
  type: 'TextEntry'
  state?: string | number | boolean | Array<string | number> | null
  color?: Color
  icon?: IconName
  iconPosition?: IconPosition
  iconColor?: Color
  /** Per-item colours of a list state (enums whose items differ), aligned with the items. */
  itemColors?: Array<Color | null>
  /** Per-item icons of a list state, aligned with the items. */
  itemIcons?: Array<IconName | null>
  /** Per-item links of a relationship list (`tags.name` with a `url()` closure). */
  itemUrls?: Array<string | null>
  prose?: boolean
}

export interface IconEntrySchema extends BaseEntry {
  type: 'IconEntry'
  icon?: IconName
  color?: Color
  size?: Size | string
}

export interface ImageEntrySchema extends BaseEntry, ImageStackProps {
  type: 'ImageEntry'
  /** HTML attributes for every `<img>` (`extraImgAttributes()`). */
  extraImgAttributes?: Attributes
  state?: string[]
  circular?: boolean
  square?: boolean
  size?: number | string
  height?: number | string
  width?: number | string
  stacked?: boolean
  limit?: number
  /** `limitedRemainingText(false)` hides the "+N" of images past `limit` (shown by default). */
  limitedRemainingText?: boolean
  /** Text size of the "+N" (`limitedRemainingText(size:)`). */
  limitedRemainingTextSize?: 'xs' | 'sm' | 'md' | 'lg'
  /** Alternative text shared by every image. */
  alt?: string
  /** Alternative text per image, aligned with `state`, when a closure gives different texts. */
  alts?: Array<string | null>
}

/** Highlighted read-only code. Array state arrives as pretty-printed JSON. */
export interface CodeEntrySchema extends BaseEntry {
  type: 'CodeEntry'
  state?: string | null
  /** Highlighting grammar (`json`, `php`, `js`…); unknown grammars render as plain code. */
  grammar?: string
  /** Theme names exposed to CSS as `data-light-theme` / `data-dark-theme`. */
  lightTheme?: string
  darkTheme?: string
  copyable?: boolean
  copyMessage?: string
  /** Milliseconds the copy confirmation shows. */
  copyMessageDuration?: number
}

export interface ColorEntrySchema extends BaseEntry, TextStyleProps {
  type: 'ColorEntry'
  state?: string | string[] | null
}

export interface KeyValueEntrySchema extends BaseEntry {
  type: 'KeyValueEntry'
  state?: Record<string, unknown>
  keyLabel: string
  valueLabel: string
}

export interface RepeatableEntrySchema extends BaseEntry {
  type: 'RepeatableEntry'
  items: SchemaComponent[][]
  contained: boolean
  grid?: Breakpoints
  /** Render items as table rows: one column per item entry, in schema order. */
  table?: TableColumnSchema[]
}

/** An entry rendered by an application component registered under `component`. */
export interface ViewEntrySchema extends BaseEntry {
  type: 'ViewEntry'
  component?: string
  props?: Record<string, unknown>
}

export type EntrySchema =
  | ViewEntrySchema
  | TextEntrySchema
  | IconEntrySchema
  | ImageEntrySchema
  | CodeEntrySchema
  | ColorEntrySchema
  | KeyValueEntrySchema
  | RepeatableEntrySchema

export type SchemaComponent =
  FieldSchema | LayoutSchema | EntrySchema | (BaseComponent & { type: string })

export type { Alignment }
