import type { Breakpoints, IconName, OptionOrGroup, VirtualizeSchema, Width } from './common'
import type {
  BaseField,
  ItemActionsItemProps,
  ItemActionsProps,
  SchemaComponent,
} from './components'
import type { TableSchema } from './table'

// ---------------------------------------------------------------- Builder

/** A Builder item in the state: the block name and the block's own data. */
export interface BuilderItemState {
  type: string
  data: Record<string, unknown>
}

export interface BuilderBlockSchema {
  name: string
  label: string
  icon?: IconName
  /** `Block::description()`: a short explanation shown under the label in the picker. */
  description?: string
  /** The picker heading the block is listed under (`blocks(['Group' => [...]])`, `Block::group()`). */
  group?: string
  maxItems?: number
  columns?: Breakpoints
  /** Blank item schema; `__INDEX__` placeholders must be replaced with the new index. */
  schema: SchemaComponent[]
  /** State of a freshly added item of this block. */
  state: BuilderItemState
  /** `Block::previewComponent()`: registry key `builder-preview:{name}`. */
  previewComponent?: string
  /**
   * `Block::summary()`: items show a summary made on the server, so collapsing one
   * refreshes the field (its summary follows the edits).
   */
  summary?: boolean
}

export interface BuilderItemSchema extends ItemActionsItemProps {
  /** `Block::preview()` HTML (with `blockPreviews()`), rendered by the server. */
  preview?: string
  previewComponent?: string
  key: string
  type: string | null
  label?: string | null
  /** `Block::summary()`: a plain-text line shown after the label (when collapsed, too). */
  summary?: string
  icon?: IconName
  columns?: Breakpoints
  schema: SchemaComponent[]
}

export interface BuilderSchema extends BaseField, ItemActionsProps {
  type: 'Builder'
  items: BuilderItemSchema[]
  blocks: BuilderBlockSchema[]
  blockPickerColumns?: Breakpoints
  blockPickerWidth?: Width
  /** `searchable()`: a search field in the block picker (matches labels in the browser). */
  blockSearch?: boolean
  /** `searchDebounce()`: milliseconds to wait after typing before filtering blocks. */
  blockSearchDebounce?: number
  /** `searchPrompt()`: placeholder and label of the search field (else a translated default). */
  blockSearchPrompt?: string
  /** `noSearchResultsMessage()`: shown when no block matches (else a translated default). */
  blockNoSearchResultsMessage?: string
  /** Show items as their block preview; the form opens with the edit button. */
  blockPreviews?: boolean
  /** Previews keep their links and buttons clickable. */
  interactivePreviews?: boolean
  blockNumbers: boolean
  blockIcons?: boolean
  blockLabels: boolean
  /** `blockActionsMenu()`: item actions sit in a compact "More" menu in each header. */
  blockActionsMenu?: boolean
  minItems?: number
  maxItems?: number
  addable: boolean
  deletable: boolean
  reorderable: boolean
  cloneable?: boolean
  collapsible?: boolean
  collapsed?: boolean
  addActionLabel: string
  /** Render only the visible items above a threshold (`virtualize()`, on by default). */
  virtualize?: VirtualizeSchema
}

// ---------------------------------------------------------------- ToggleButtons

export interface ToggleButtonsSchema extends BaseField {
  type: 'ToggleButtons'
  options: OptionOrGroup[]
  multiple?: boolean
  inline?: boolean
  grouped?: boolean
  boolean?: boolean
  /** Show only the option icons; labels become the buttons' accessible names. */
  iconsOnly?: boolean
  /** `columns()`: lay the buttons out in a grid (when not inline or grouped). */
  gridColumns?: number
  gridDirection?: 'row' | 'column'
  /** `tooltips()`: option value → tooltip text. */
  tooltips?: Record<string, string> | null
  /** `size()`: `xs`, `sm`, `lg`, `xl` (absent is medium); other strings are CSS classes. */
  size?: 'xs' | 'sm' | 'lg' | 'xl' | (string & {}) | null
  /** `fullWidth()`: buttons stretch to fill the field. */
  fullWidth?: boolean
}

// ---------------------------------------------------------------- Slider

export interface SliderSchema extends BaseField {
  type: 'Slider'
  min: number
  max: number
  step: number
  decimalPlaces?: number
  /** Several thumbs: the state is a list of numbers. */
  multiple?: boolean
  /** `true` for every thumb, or one flag per thumb (`tooltips([true, false])`). */
  tooltips?: boolean | boolean[]
  pips?: boolean
  pipsDensity?: number
  /** The pips to draw, computed on the server (modes, `steppedPips()`, `pipsFilter()`). */
  pipList?: SliderPipSchema[] | null
  /** `true`, or one flag per track section (one more than thumbs: `[false, true, false]`). */
  fillTrack?: boolean | boolean[]
  vertical?: boolean
  /** `vertical(isTopToBottom: true)`: the minimum is at the top. */
  topToBottom?: boolean
  minDifference?: number
  maxDifference?: number
  /** `rangePadding()`: how far (in values) thumbs stay from the start and end. */
  rangePadding?: [number, number] | null
  /** `rtl()`: forced direction; absent follows the panel. */
  rtl?: boolean | null
  /** `behavior()`: absent is `['tap']`, `[]` turns everything off. */
  behavior?: SliderBehavior[] | null
  /** `nonLinearPoints()`: points between the ends of a non-linear track. */
  nonLinearPoints?: SliderNonLinearPoint[] | null
}

export type SliderBehavior = 'tap' | 'drag' | 'fixed' | 'snap' | 'unconstrained' | 'smooth-steps'

export interface SliderPipSchema {
  value: number
  /** Position on the track, 0–100. */
  percent: number
  /** `1` large label, `2` small label, `0` tick without a label. */
  type: 0 | 1 | 2
}

export interface SliderNonLinearPoint {
  /** Position on the track, 0–100. */
  percent: number
  value: number
  /** Step from this point on. */
  step?: number
}

// ---------------------------------------------------------------- CodeEditor

export interface CodeEditorSchema extends BaseField {
  type: 'CodeEditor'
  language?: string
  lineNumbers: boolean
  wrap?: boolean
  tabSize: number
  minHeight?: number
  maxHeight?: number
  maxLength?: number
}

// ---------------------------------------------------------------- ModalTableSelect

export interface ModalTableSelectSchema extends BaseField {
  type: 'ModalTableSelect'
  multiple?: boolean
  /** Labels of the selected records, keyed by record key. */
  selectedLabels?: Record<string, string>
  maxItems?: number
  minItems?: number
  modalHeading: string
  selectActionLabel: string
  /** `selectAction()`: the select button's icon. */
  selectActionIcon?: IconName
  /** `selectAction()`: text under the modal heading. */
  modalDescription?: string
  /** `selectAction()`: label of the modal's confirm button ("Select"). */
  modalSubmitActionLabel?: string
  /** `selectAction()`: modal width (`xs` … `7xl`, `full`); `3xl` when absent. */
  modalWidth?: string
  /** Prefix of the table state query keys (`table_search`, `table_page`…). */
  tableStateIdentifier: string
}

/** Response of the picker table endpoint (`schema/options?table=1`). */
export interface ModalTableSelectResponse {
  table: TableSchema
  labels: Record<string, string>
}
