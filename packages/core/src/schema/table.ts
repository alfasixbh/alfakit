import type { ActionSchema, AnyActionSchema } from './actions'
import type {
  Alignment,
  Attributes,
  Breakpoints,
  Color,
  ColumnSpanValue,
  IconName,
  IconPosition,
  OptionOrGroup,
  RecordKey,
  VerticalAlignment,
  VirtualizeSchema,
} from './common'
import type {
  FormattedStateProps,
  ImageStackProps,
  SchemaComponent,
  TextStyleProps,
} from './components'
import type { LiveUpdatesSchema } from './realtime'
import type { ListTabsProps, RelationGroupSchema } from './resources'
import type {
  TableGroupingSchema,
  TableGroupOptionSchema,
  TableRecordGroupSchema,
  TableSummariesSchema,
} from './table-grouping'

export interface BaseColumnSchema {
  type: string
  name: string
  label: string
  sortable?: boolean
  /** Individually searchable (has its own search input). */
  searchable?: boolean
  toggleable?: boolean
  toggledHiddenByDefault?: boolean
  alignment?: Alignment
  verticalAlignment?: VerticalAlignment
  width?: string
  /** `false` when the column must not grow. */
  grow?: false
  wrapHeader?: boolean
  /** Shown from this breakpoint up (`visibleFrom()`); header and cells are hidden below it. */
  visibleFrom?: Breakpoint
  /** Hidden from this breakpoint up (`hiddenFrom()`). */
  hiddenFrom?: Breakpoint
  extraHeaderAttributes?: Attributes
  /** `headerTooltip()`: shown on hover over the column header. */
  headerTooltip?: string
}

export interface TextColumnSchema extends BaseColumnSchema, TextStyleProps, FormattedStateProps {
  type: 'TextColumn'
  descriptionPosition?: 'above' | 'below'
}

export interface IconColumnSchema extends BaseColumnSchema {
  type: 'IconColumn'
  /** Several icons (a list state) wrap onto more lines (`wrap()`). */
  wrap?: boolean
}

/** One icon of an `IconColumn` cell whose state is a list. */
export interface IconCellItem {
  icon: IconName
  color?: Color | null
}

export interface ImageColumnSchema extends BaseColumnSchema, ImageStackProps {
  type: 'ImageColumn'
  circular?: boolean
  square?: boolean
  size?: number | string
  height?: number | string
  width?: string
  stacked?: boolean
  limit?: number
  limitedRemainingText?: boolean
  /** Text size of the "+N" (`limitedRemainingText(size:)`, default `sm`). */
  limitedRemainingTextSize?: 'xs' | 'sm' | 'md' | 'lg'
  /** Several images wrap onto more lines (`wrap()`). */
  wrap?: boolean
}

/** Cell data of an `ImageColumn`. */
export interface ImageCellSchema extends CellSchema {
  /** `alt()` text of the images (per record). */
  alt?: string
}

export interface ColorColumnSchema extends BaseColumnSchema, TextStyleProps {
  type: 'ColorColumn'
}

export interface EditableColumnSchema extends BaseColumnSchema {
  editable: true
}

export interface ToggleColumnSchema extends EditableColumnSchema {
  type: 'ToggleColumn'
  onColor?: Color
  offColor?: Color
  onIcon?: IconName
  offIcon?: IconName
}

export interface CheckboxColumnSchema extends EditableColumnSchema {
  type: 'CheckboxColumn'
}

export interface SelectColumnSchema extends EditableColumnSchema {
  type: 'SelectColumn'
  /** Empty when `optionsSearchPath` is set: options are searched on the server. */
  options: OptionOrGroup[]
  selectablePlaceholder: boolean
  placeholder?: string
  /** `native(false)`: a combobox instead of the browser select. */
  native?: false
  /** The combobox has a search input (`searchableOptions()`). */
  searchableOptions?: boolean
  /** Most options the combobox lists (`optionsLimit()`). */
  optionsLimit?: number
  /** Option labels are sanitised HTML (`allowOptionsHtml()`), rendered as HTML. */
  allowOptionsHtml?: boolean
  /** `optionsRelationship(ignoreRecord: true)`: the record itself is not an option. */
  ignoreRecord?: boolean
  /** Combobox messages (`loadingMessage()` …); absent ones use the translated defaults. */
  loadingMessage?: string
  noOptionsMessage?: string
  noSearchResultsMessage?: string
  searchPrompt?: string
  searchingMessage?: string
  /** Milliseconds to wait after typing before searching server options (default 300). */
  optionsSearchDebounce?: number
  /** `wrapOptionLabels(false)`: long option labels are truncated instead of wrapped. */
  wrapOptionLabels?: false
  /**
   * Field path in the table's filters schema (`{component}.filters`) to search the options
   * with the schema options endpoint (relationship or custom search).
   */
  optionsSearchPath?: string
}

export interface TextInputColumnSchema extends EditableColumnSchema {
  type: 'TextInputColumn'
  inputType: string
  placeholder?: string
  inputMode?: string
  step?: number | string
  prefixIcon?: IconName
  prefixIconColor?: Color
  suffixIcon?: IconName
  suffixIconColor?: Color
}

/** A cell rendered by an application component registered under `component`. */
export interface ViewColumnSchema extends BaseColumnSchema {
  type: 'ViewColumn'
  component?: string
}

export type ColumnSchema =
  | ViewColumnSchema
  | TextColumnSchema
  | IconColumnSchema
  | ImageColumnSchema
  | ColorColumnSchema
  | ToggleColumnSchema
  | CheckboxColumnSchema
  | SelectColumnSchema
  | TextInputColumnSchema
  | (BaseColumnSchema & { type: string })

/** Per-record cell data. Static presentation lives on the column. */
export interface CellSchema {
  state?: unknown
  url?: string
  openUrlInNewTab?: boolean
  /** Name of a record action to run on click. */
  action?: string
  tooltip?: string
  hidden?: boolean
  disabled?: boolean
  extraAttributes?: Attributes
  // TextColumn
  color?: Color
  icon?: IconName
  iconPosition?: IconPosition
  iconColor?: Color
  /** Per-item colours of a list state (enums whose items differ), aligned with the items. */
  itemColors?: Array<Color | null>
  /** Per-item icons of a list state, aligned with the items. */
  itemIcons?: Array<IconName | null>
  /** Per-item links of a relationship list (`url()` closures with `$relatedRecord`). */
  itemUrls?: Array<string | null>
  description?: string
  // IconColumn
  size?: string
  /** A list state: one icon per item (`icon` / `color` are then absent). */
  icons?: IconCellItem[]
  // TextInputColumn: text before / after the input (`prefix()` / `suffix()`).
  prefix?: string
  suffix?: string
  // ViewColumn: per-record props for the registered component.
  props?: Record<string, unknown>
  // SelectColumn with server-searched options: the label of the current value.
  optionLabel?: string
  // ImageColumn
  alt?: string
  /** `extraImgAttributes()` of an image column, per record. */
  extraImgAttributes?: Attributes
  /** `disabledClick()`: the cell runs neither the row's URL / action nor its own. */
  disabledClick?: boolean
  /** Spreadsheet mode: the raw value an `editable()` text column edits (`state` is formatted). */
  editState?: unknown
}

export interface TableRecordSchema {
  key: RecordKey
  url?: string
  openUrlInNewTab?: boolean
  selectable?: boolean
  classes?: string
  cells: Record<string, CellSchema>
  actions?: AnyActionSchema[]
  /** Key of the row's group (`recordGroups`) while the table is grouped. */
  group?: string
}

/** What waits for the `tableTotals` request of a `deferTotals()` table. */
export interface TableDeferredTotalsSchema {
  key: string
  /** The summary rows load with the totals. */
  summaries?: boolean
}

/** The `tableTotals` endpoint's answer. */
export interface TableTotalsSchema {
  total?: number
  lastPage?: number
  summaries?: TableSummariesSchema
}

/** Numbered pages with a total (the default pagination mode). */
export interface PaginationSchema {
  mode?: 'default'
  currentPage: number
  lastPage: number
  perPage: number | 'all'
  total: number
  from: number
  to: number
  pageOptions: Array<number | 'all'>
  simple?: boolean
}

/** Previous / next without a count query (`PaginationMode::Simple`). */
export interface SimplePaginationSchema {
  mode: 'simple'
  currentPage: number
  perPage: number
  from: number
  to: number
  pageOptions: Array<number | 'all'>
  simple: true
  hasMorePages: boolean
  /**
   * `Table::deferTotals()` on numbered pagination: the total is loading (show a
   * placeholder); `withTableTotals()` turns this into a `PaginationSchema` once it arrived.
   */
  pendingTotal?: boolean
}

/** Previous / next by opaque cursor (`PaginationMode::Cursor`). */
export interface CursorPaginationSchema {
  mode: 'cursor'
  perPage: number
  from: number
  to: number
  pageOptions: Array<number | 'all'>
  hasMorePages: boolean
  nextCursor?: string | null
  previousCursor?: string | null
}

/**
 * Load more / infinite scroll: the records hold every page up to `currentPage`; the
 * renderer asks for `currentPage + 1` to append the next one.
 */
export interface AppendingPaginationSchema {
  mode: 'load-more' | 'infinite'
  currentPage: number
  perPage: number
  from: number
  to: number
  pageOptions: Array<number | 'all'>
  hasMorePages: boolean
}

export type AnyPaginationSchema =
  PaginationSchema | SimplePaginationSchema | CursorPaginationSchema | AppendingPaginationSchema

export interface FilterSchema {
  type: 'Filter' | 'SelectFilter' | 'TernaryFilter' | 'TrashedFilter' | (string & {})
  name: string
  label: string
  /** Span of the filter's fields in the filters form. */
  columnSpan?: Breakpoints<ColumnSpanValue>
  default?: Record<string, unknown> | null
  /** Form components whose state paths are prefixed with the filter name. */
  schema: SchemaComponent[]
  multiple?: boolean
}

export interface FilterIndicator {
  filter: string
  label: string
  /** `Indicator::removeField()`: removing the badge clears only this field of the filter. */
  removeField?: string
  /** `Indicator::removable(false)`: no remove button. */
  removable?: false
}

/**
 * A toolbar button restyled with `filtersTriggerAction()` & co.: only its look; the table
 * decides what it does. `hidden` drops the button.
 */
export interface TableTriggerActionSchema {
  label?: string | null
  icon?: IconName
  iconPosition?: IconPosition
  color?: Color
  variant?: ActionSchema['variant']
  outlined?: boolean
  size?: ActionSchema['size']
  badge?: string | number
  badgeColor?: Color
  tooltip?: string
  disabled?: boolean
  extraAttributes?: Attributes
  hidden?: boolean
  /**
   * Modal options set on `columnManagerTriggerAction()` (`slideOver()`, `modalWidth()`,
   * `modalHeading()`, `modalDescription()`), honoured by the column manager in
   * `ColumnManagerLayout::Modal`. Only options set explicitly are sent.
   */
  modal?: TableTriggerModalSchema
}

export interface TableTriggerModalSchema {
  heading?: string
  description?: string
  /** A `Width` value (`sm`, `md`, … `7xl`, `full`, `screen`). */
  width?: string
  slideOver?: boolean
  slideOverPosition?: 'start'
}

export type TableTriggerActionKey =
  | 'filters'
  | 'filtersApply'
  | 'filtersReset'
  | 'filtersRemoveAll'
  | 'columnManager'
  | 'columnManagerApply'
  | 'columnManagerReset'
  | 'groupRecords'
  | 'reorderRecords'
  | 'reorderRecordsActive'

export interface TableSortSchema {
  column: string
  direction: 'asc' | 'desc'
}

export interface EmptyStateSchema {
  heading: string
  description?: string
  icon: IconName
  actions?: ActionSchema[]
}

/** A column referenced from a content layout. */
export interface ColumnLayoutColumnRef {
  type: 'Column'
  name: string
  /** Columns spanned inside a `Grid` (`columnSpan()`). */
  columnSpan?: Breakpoints<ColumnSpanValue>
  /** Column it starts at inside a `Grid` (`columnStart()`). */
  columnStart?: Breakpoints<number | string | null>
}

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface BaseColumnLayoutSchema {
  schema: ColumnLayoutNode[]
  visibleFrom?: Breakpoint
  hiddenFrom?: Breakpoint
  /** `false` when the layout must not take the remaining width of a `Split`. */
  grow?: false
  extraAttributes?: Attributes
  /** Columns spanned inside a `Grid` (`columnSpan()`). */
  columnSpan?: Breakpoints<ColumnSpanValue>
  /** Column it starts at inside a `Grid` (`columnStart()`). */
  columnStart?: Breakpoints<number | string | null>
}

/** Columns side by side, stacked below `from`. */
export interface SplitLayoutSchema extends BaseColumnLayoutSchema {
  type: 'Split'
  from?: Breakpoint
}

/** Columns stacked vertically. */
export interface StackLayoutSchema extends BaseColumnLayoutSchema {
  type: 'Stack'
  space?: 1 | 2 | 3
  alignment?: Alignment
}

/** A muted box for secondary details, optionally collapsible per record. */
export interface PanelLayoutSchema extends BaseColumnLayoutSchema {
  type: 'Panel'
  collapsible?: boolean
  /** A collapsible panel that starts closed. */
  collapsed?: boolean
}

/** Columns in a responsive grid. */
export interface GridLayoutSchema extends BaseColumnLayoutSchema {
  type: 'Grid'
  columns: Breakpoints
}

export type ColumnLayoutSchema =
  SplitLayoutSchema | StackLayoutSchema | PanelLayoutSchema | GridLayoutSchema

export type ColumnLayoutNode = ColumnLayoutColumnRef | ColumnLayoutSchema

/** A header spanning several adjacent columns (`ColumnGroup`). */
export interface ColumnGroupSchema {
  label: string
  columns: string[]
  alignment?: Alignment
  wrapHeader?: boolean
  extraHeaderAttributes?: Attributes
}

export interface TableSchema {
  type: 'Table'
  /** Query-string prefix when several tables share a page. */
  identifier?: string
  heading?: string
  description?: string
  modelLabel: string
  pluralModelLabel: string
  columns: ColumnSchema[]
  visibleColumns: string[]
  toggleableColumns?: boolean
  /** Header groups above adjacent columns. */
  columnGroups?: ColumnGroupSchema[]
  /**
   * Present when records render as layout blocks (`Split`, `Stack`, `Panel`, `Grid`, or
   * `contentGrid()`) instead of a row of cells.
   */
  contentLayout?: ColumnLayoutNode[]
  /** Records as cards in a responsive grid. */
  contentGrid?: Breakpoints
  /** Users may reorder columns; the order is stored per user on the server. */
  reorderableColumns?: boolean
  filters?: FilterSchema[]
  filtersLayout:
    | 'dropdown'
    | 'above-content'
    | 'above-content-collapsible'
    | 'below-content'
    | 'modal'
    | 'before-content'
    | 'before-content-collapsible'
    | 'after-content'
    | 'after-content-collapsible'
    | (string & {})
  /** Width of the filters dropdown, modal or sidebar (`xs` … `7xl`). */
  filtersFormWidth?: FiltersFormWidth
  /** Max height of the filters dropdown (a CSS length); the form scrolls. */
  filtersFormMaxHeight?: string
  /**
   * `filtersFormSchema()`: the filters form laid out by the application (sections,
   * grids…) with each filter's fields in a `Group` keyed `filter:{name}`. Replaces the
   * form built from `filters`.
   */
  filtersFormSchema?: SchemaComponent[]
  /** Active filter badges are hidden (`hiddenFilterIndicators()`). */
  hiddenFilterIndicators?: boolean
  /** Filter changes wait for the "Apply" button. */
  deferFilters?: boolean
  /**
   * Query-string keys kept in the session (`filters`, `search`, `columnSearch`, `sort`,
   * `perPage`, `columns`, `group`):
   * cleared values are sent as empty keys so the server stores them.
   */
  persistedState?: TablePersistedStateKey[]
  filtersFormColumns?: Breakpoints
  filterState?: Record<string, Record<string, unknown>>
  filterIndicators?: FilterIndicator[]
  headerActions?: AnyActionSchema[]
  bulkActions?: AnyActionSchema[]
  recordActionsPosition:
    'after-columns' | 'before-columns' | 'after-cells' | 'before-cells' | (string & {})
  recordAction?: string
  records?: TableRecordSchema[]
  pagination?: AnyPaginationSchema | null
  sort?: TableSortSchema
  search?: string
  columnSearches?: Record<string, string>
  searchable?: boolean
  searchPlaceholder: string
  searchDebounce: number
  searchOnBlur?: boolean
  /** Below `md`, rows render as cards with the column labels (`stackedOnMobile()`). */
  stackedOnMobile?: boolean
  striped?: boolean
  selectable?: boolean
  selectCurrentPageOnly?: boolean
  /** The most records that can be selected (`maxSelectableRecords()`); no "select all". */
  maxSelectableRecords?: number
  /**
   * `selectGroupsOnly()` while grouped: the selection holds records of one group only;
   * group headings get a checkbox.
   */
  selectGroupsOnly?: boolean
  /**
   * Fingerprint of the filters, search and list tab (`deselectAllRecordsWhenFiltered()`,
   * on by default). The selection is cleared when it changes; absent keeps the selection.
   */
  selectionScope?: string
  pollingInterval?: string
  /** `live()`: refresh when records change (broadcast), with a "new records" pill. */
  live?: LiveUpdatesSchema
  /** `savedViews()` / `views()`: the views shown as tabs or a dropdown above the table. */
  views?: TableViewsSchema
  /** `spreadsheet()`: the grid editing mode offered from the toolbar. */
  spreadsheet?: TableSpreadsheetSchema
  reorderable?: boolean
  /**
   * The table is in reorder mode (`?reordering=1`). Unless `paginatedWhileReordering`, the
   * server then lists every record and sends no `pagination`.
   */
  reordering?: boolean
  /** `paginatedWhileReordering()`: reorder mode keeps the pages instead of listing every record. */
  paginatedWhileReordering?: boolean
  /**
   * True when `records`/`pagination` were left out of this response: the renderer requests
   * them with an Inertia partial reload (`only: ['page']`), which the server always fills.
   */
  deferLoading?: boolean
  emptyState: EmptyStateSchema
  /** Summary rows for the current page and for every matching record. */
  summaries?: TableSummariesSchema
  /**
   * `Table::deferTotals()`: the total (`pagination.pendingTotal`) and the summaries load
   * after the rows from the `tableTotals` endpoint. `key` changes whenever they can.
   */
  deferredTotals?: TableDeferredTotalsSchema
  /** Groups users can pick; absent when the picker is hidden. */
  groups?: TableGroupOptionSchema[]
  groupingDirectionSettingHidden?: boolean
  grouping?: TableGroupingSchema
  /** Group headings in display order (every group for groups-only tables). */
  recordGroups?: TableRecordGroupSchema[]
  /** Render only the visible rows above a threshold (`virtualize()`, on by default). */
  virtualize?: VirtualizeSchema
  /** Label of the "default sort" option of the sort select (`defaultSortOptionLabel()`). */
  defaultSortOptionLabel?: string
  /** Toolbar buttons restyled on the server (`filtersTriggerAction()` & co.). */
  triggerActions?: Partial<Record<TableTriggerActionKey, TableTriggerActionSchema>>
  /** Column toggles wait for an "Apply" button (`deferColumnManager()`). */
  deferColumnManager?: boolean
  /** The column manager opens in a dialog instead of a dropdown. */
  columnManagerLayout?: 'dropdown' | 'modal'
  /** The column manager's reset button sits above the list (default: below). */
  columnManagerResetActionPosition?: 'header' | 'footer'
  /** Grid columns of the column manager's list. */
  columnManagerColumns?: Breakpoints
  /** The filters form's reset button sits above the fields (default: below). */
  filtersResetActionPosition?: 'header' | 'footer'
  /** First / last page buttons on numbered pagination. */
  extremePaginationLinks?: boolean
  /** Skeleton rows cover the records while the table reloads. */
  loadingSkeleton?: boolean
  /** The grouping settings stay in a dropdown on desktop (default: inline from `sm`). */
  groupingSettingsInDropdownOnDesktop?: boolean
}

export type TablePersistedStateKey =
  'filters' | 'search' | 'columnSearch' | 'sort' | 'perPage' | 'columns' | 'group'

export type FiltersFormWidth =
  | '3xs'
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'none'
  | 'full'
  | 'min'
  | 'max'
  | 'fit'
  | 'prose'
  | 'container'
  | 'screen-sm'
  | 'screen-md'
  | 'screen-lg'
  | 'screen-xl'
  | 'screen-2xl'
  | 'screen'
  | (string & {})

/** A page-level table block (`Table` + its context component name). */
export interface TableBlock extends TableSchema, ListTabsProps {
  key: string
  /** `table`, `relationManager:Class` or `widget:Class`. */
  component: string
}

export interface RelationManagerSchema {
  type: 'RelationManager'
  key: string
  component: string
  title: string
  icon?: string
  badge?: string
  /** `RelationManager::$badgeColor` / `getBadgeColor()`. */
  badgeColor?: string
  /** `RelationManager::$badgeTooltip` / `getBadgeTooltip()`, shown on hover and to screen readers. */
  badgeTooltip?: string
  /**
   * `$isBadgeDeferred`: the badge arrives in the `alfakitLazy` deferred prop
   * (`relationManagerBadge:…`, merged by `resolveLazyComponents()`).
   */
  badgeDeferred?: boolean
  /** The manager's key in `getRelations()`: its tab in the `?relation=` query string. */
  slug?: string
  table: TableSchema
}

/**
 * A lazy relation manager's stand-in on a full page response
 * (`RelationManager::toLazySchema()`): its tab label, but no table until the
 * `alfakitLazy` deferred prop brings it.
 */
export interface LazyRelationManagerSchema extends Omit<RelationManagerSchema, 'table'> {
  lazy: true
}

export interface RelationManagersBlock {
  type: 'RelationManagers'
  key: string
  managers: Array<RelationManagerSchema | LazyRelationManagerSchema>
  /** `RelationGroup`s: managers shown together under one tab. */
  groups?: RelationGroupSchema[]
  /**
   * `hasCombinedRelationManagerTabsWithContent()`: the page's form or infolist, shown as a
   * tab before or after the relation manager tabs.
   */
  content?: RelationManagersContentTabSchema
  /**
   * `getCombinedTabComponents()` with a custom order: tab keys (manager components, group
   * keys, `content` for the content tab) in order. Tabs not listed are left out.
   */
  tabOrder?: string[]
}

/** The form / infolist tab of a combined relation managers block. */
export interface RelationManagersContentTabSchema {
  /** `getContentTabComponent()` / `getContentTabLabel()`, "Edit" or "View" by default. */
  label: string
  /** `getContentTabIcon()`. */
  icon?: string
  badge?: string
  badgeColor?: string
  /** `getContentTabPosition()`. */
  position: 'before' | 'after'
  /** The page block shown in the tab (a `Form` or `Infolist` content block). */
  block: { type: string; key: string; [key: string]: unknown }
}

/** One saved view: defined in code (`preset`), shared with the team, or the user's own. */
export interface TableViewItemSchema {
  key: string
  label: string
  icon?: IconName
  type: 'preset' | 'shared' | 'personal'
  /** The user may update, rename and delete it (and share / unshare it when shared). */
  editable?: boolean
  /** It applies when the URL names no view. */
  default?: boolean
}

/** `Table::savedViews()` / `views()`. */
export interface TableViewsSchema {
  layout: 'tabs' | 'dropdown'
  items: TableViewItemSchema[]
  /** Key of the active view; absent when none is. */
  active?: string
  /** Query-string key naming the view (`view`, or `{identifier}_view`). */
  queryKey: string
  /** The table differs from the active view (changes on top of it are in the URL). */
  modified?: boolean
  /** The user may save their own views. */
  canSave?: boolean
  /** The user may publish, update and delete shared views. */
  canShare?: boolean
  /** The user may choose a default view. */
  canSetDefault?: boolean
  /** The user's own default: a view key, or `''` for "no view". */
  userDefault?: string
}

/** `Table::spreadsheet()`. */
export interface TableSpreadsheetSchema {
  /** The editable columns, in display order. */
  columns: string[]
  /** `spreadsheet(atomic: false)`: valid cells are saved even when others fail. */
  atomic?: false
  /** Most cells one save may change. */
  maxChanges: number
}
