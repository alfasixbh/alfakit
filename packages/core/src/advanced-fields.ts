import type { FormStore, FormStoreOptions } from './form'
import type {
  BuilderBlockSchema,
  BuilderItemState,
  BuilderSchema,
  SliderBehavior,
  SliderSchema,
} from './schema/advanced-fields'
import type { FileUploadSchema, SchemaComponent, UploadedFile } from './schema/components'
import type { AnyPaginationSchema } from './schema/table'
import type { TableQuery } from './table'
import { tableQueryKey } from './table'
import { cloneState } from './utils/clone'
import { templateForIndex } from './utils/path'

// ---------------------------------------------------------------- Builder

/** The Builder items in a state value, keeping only well-formed `{type, data}` items. */
export function builderItems(value: unknown): BuilderItemState[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (item): item is BuilderItemState =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as BuilderItemState).type === 'string',
  )
}

/** Insert a fresh item of `block` at `index` (the end by default). */
export function insertBuilderItem(
  items: BuilderItemState[],
  block: BuilderBlockSchema,
  index: number = items.length,
): BuilderItemState[] {
  const copy = [...items]
  copy.splice(Math.max(0, Math.min(index, items.length)), 0, cloneState(block.state))

  return copy
}

/** How many items of each block type the builder holds. */
export function builderBlockCounts(items: BuilderItemState[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1

  return counts
}

/**
 * Blocks whose label (or group heading) contains `query` (case-insensitive), for
 * `Builder::searchable()`.
 */
export function filterBuilderBlocks<T extends Pick<BuilderBlockSchema, 'label' | 'group'>>(
  blocks: T[],
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase()

  return needle === ''
    ? blocks
    : blocks.filter(
        (block) =>
          block.label.toLocaleLowerCase().includes(needle) ||
          (block.group ?? '').toLocaleLowerCase().includes(needle),
      )
}

export interface BuilderBlockGroup<T> {
  /** The heading; null for ungrouped blocks (listed first, without a heading). */
  group: string | null
  blocks: T[]
}

/**
 * Picker blocks under their headings (`Builder::blocks(['Group' => [...]])`): ungrouped
 * blocks first, then each group in the order it first appears. Empty groups are dropped.
 */
export function groupBuilderBlocks<T extends Pick<BuilderBlockSchema, 'group'>>(
  blocks: T[],
): BuilderBlockGroup<T>[] {
  const groups = new Map<string | null, T[]>([[null, []]])

  for (const block of blocks) {
    const group = block.group ?? null

    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(block)
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([group, items]) => ({ group, blocks: items }))
}

/** Whether another item of `block` may be added (its own `maxItems` and the builder's). */
export function canAddBuilderBlock(
  component: Pick<BuilderSchema, 'maxItems'>,
  block: Pick<BuilderBlockSchema, 'name' | 'maxItems'>,
  items: BuilderItemState[],
): boolean {
  // `null` (sent by PHP for "no limit") and `undefined` both mean unlimited.
  if (component.maxItems != null && items.length >= component.maxItems) return false

  return block.maxItems == null || (builderBlockCounts(items)[block.name] ?? 0) < block.maxItems
}

/**
 * The schema to render for the item at `index`: the server's per-item schema when it
 * describes the same block, else the block template with the index filled in (items the
 * browser just added, cloned or moved before the server has seen them).
 */
export function builderItemSchema(
  component: Pick<BuilderSchema, 'items' | 'blocks'>,
  items: BuilderItemState[],
  index: number,
): SchemaComponent[] {
  const type = items[index]?.type
  const server = component.items[index]

  if (server && server.type === type) {
    return server.schema
  }

  const block = component.blocks.find((candidate) => candidate.name === type)

  return block ? templateForIndex(block.schema, index) : []
}

/** Label of the item at `index`: the server's when it describes the same block. */
export function builderItemLabel(
  component: Pick<BuilderSchema, 'items' | 'blocks'>,
  items: BuilderItemState[],
  index: number,
): string | null {
  const type = items[index]?.type
  const server = component.items[index]

  if (server && server.type === type && server.label) return server.label

  return component.blocks.find((block) => block.name === type)?.label ?? type ?? null
}

/** Where an option of the block picker sits (`getBoundingClientRect()` is enough). */
export interface BuilderPickerRect {
  top: number
  left: number
}

/**
 * Keyboard movement in the block picker grid: the index of the option to focus after
 * `key` on option `current`, or null when the key moves nowhere. Left/right follow the
 * reading direction (`rtl`), up/down go to the closest option of the row above/below
 * (rows may be ragged: groups start new rows), Home/End jump to the first/last option.
 */
export function builderPickerMove(
  key: string,
  current: number,
  rects: BuilderPickerRect[],
  rtl = false,
): number | null {
  const count = rects.length

  if (count === 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1

  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft'

  if (key === forward) return current < count - 1 ? current + 1 : null
  if (key === backward) return current > 0 ? current - 1 : null
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null

  const here = rects[current]

  if (!here) return null

  const below = key === 'ArrowDown'
  let rowTop: number | null = null

  // The nearest row in that direction (options on one row share their top, ±2px).
  rects.forEach((rect) => {
    const ahead = below ? rect.top > here.top + 2 : rect.top < here.top - 2

    if (ahead && (rowTop === null || (below ? rect.top < rowTop : rect.top > rowTop))) {
      rowTop = rect.top
    }
  })

  if (rowTop === null) return null

  let best: number | null = null

  rects.forEach((rect, index) => {
    if (Math.abs(rect.top - (rowTop as number)) > 2) return

    const candidate = rects[best ?? -1]

    if (
      best === null ||
      !candidate ||
      Math.abs(rect.left - here.left) < Math.abs(candidate.left - here.left)
    ) {
      best = index
    }
  })

  return best
}

// ---------------------------------------------------------------- ToggleButtons

/** The next state after a toggle button for `option` was pressed. */
export function toggleButtonsNext(
  current: unknown,
  option: string,
  multiple: boolean,
): string | string[] | null {
  if (multiple) {
    const values = Array.isArray(current) ? current.map(String) : []

    return values.includes(option)
      ? values.filter((value) => value !== option)
      : [...values, option]
  }

  return toggleButtonsSelected(current, false).includes(option) ? null : option
}

/** The option values a toggle buttons state selects. */
export function toggleButtonsSelected(current: unknown, multiple: boolean): string[] {
  if (multiple) return Array.isArray(current) ? current.map(String) : []
  if (current === null || current === undefined || current === '') return []
  if (typeof current === 'boolean') return [current ? '1' : '0']

  return [String(current)]
}

// ---------------------------------------------------------------- Slider

function roundTo(value: number, step: number, min: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length

  return Number((Math.round((value - min) / step) * step + min).toFixed(decimals))
}

/** The slider's thumb values: always numbers within bounds, sorted for ranges. */
export function sliderValues(
  value: unknown,
  schema: Pick<SliderSchema, 'min' | 'max' | 'multiple'>,
): number[] {
  const clamp = (input: unknown, fallback: number): number => {
    const number = typeof input === 'number' ? input : Number(input)

    return Number.isFinite(number) && input !== null && input !== ''
      ? Math.min(schema.max, Math.max(schema.min, number))
      : fallback
  }

  if (schema.multiple) {
    const list = Array.isArray(value) && value.length > 0 ? value : [schema.min, schema.max]

    return list.map((item) => clamp(item, schema.min)).sort((a, b) => a - b)
  }

  return [clamp(value, schema.min)]
}

/** The state to store for the given thumb values. */
export function sliderState(
  values: number[],
  schema: Pick<SliderSchema, 'multiple'>,
): number | number[] | null {
  return schema.multiple ? [...values].sort((a, b) => a - b) : (values[0] ?? null)
}

export interface SliderPip {
  value: number
  /** Position from the start of the track, 0–100. */
  percent: number
  /** Whether the pip shows a label (at most 11 are labelled by default). */
  labelled: boolean
  /** A small label (`pipsFilter()` returned 2, or `PipsMode::Steps` between range points). */
  small?: boolean
}

/**
 * Tick marks along the track: the server's `pipList` (modes, `steppedPips()`,
 * `pipsFilter()`), or every `pipsDensity` units / every step for schemas without one.
 */
export function sliderPips(
  schema: Pick<SliderSchema, 'min' | 'max' | 'step' | 'pipsDensity' | 'pipList'>,
): SliderPip[] {
  if (schema.pipList) {
    return schema.pipList.map((pip) => ({
      value: pip.value,
      percent: pip.percent,
      labelled: pip.type !== 0,
      ...(pip.type === 2 ? { small: true } : {}),
    }))
  }

  const range = schema.max - schema.min

  if (!(range > 0)) return []

  let interval = schema.pipsDensity && schema.pipsDensity > 0 ? schema.pipsDensity : schema.step

  // Never draw more than 100 ticks.
  while (range / interval > 100) interval *= 2

  const values: number[] = []

  for (let value = schema.min; value < schema.max + interval / 1e6; value += interval) {
    values.push(roundTo(Math.min(value, schema.max), schema.step, schema.min))
  }

  if (values[values.length - 1] !== schema.max) values.push(schema.max)

  const labelEvery = Math.max(1, Math.ceil((values.length - 1) / 10))

  return values.map((value, index) => ({
    value,
    percent: ((value - schema.min) / range) * 100,
    labelled: index % labelEvery === 0 || index === values.length - 1,
  }))
}

type SliderTrack = Pick<SliderSchema, 'min' | 'max' | 'step' | 'nonLinearPoints'>

interface SliderSection {
  fromPercent: number
  toPercent: number
  fromValue: number
  toValue: number
  step: number
}

/** The sections of the track between its ends and `nonLinearPoints`. */
function sliderSections(schema: SliderTrack): SliderSection[] {
  const points = [
    { percent: 0, value: schema.min, step: schema.step },
    ...(schema.nonLinearPoints ?? []),
    { percent: 100, value: schema.max },
  ]
  const sections: SliderSection[] = []
  let step = schema.step

  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index]!
    const to = points[index + 1]!
    step = from.step ?? step
    sections.push({
      fromPercent: from.percent,
      toPercent: to.percent,
      fromValue: from.value,
      toValue: to.value,
      step,
    })
  }

  return sections
}

/** Where a value sits on the track, 0–100 (non-linear tracks included). */
export function sliderPercent(value: number, schema: SliderTrack): number {
  for (const section of sliderSections(schema)) {
    if (value <= section.toValue || section.toPercent >= 100) {
      if (section.toValue === section.fromValue) return section.fromPercent

      const ratio = Math.min(
        1,
        Math.max(0, (value - section.fromValue) / (section.toValue - section.fromValue)),
      )

      return section.fromPercent + ratio * (section.toPercent - section.fromPercent)
    }
  }

  return 100
}

/** The value at a position on the track (0–100), snapped to its section's step by default. */
export function sliderValueAt(percent: number, schema: SliderTrack, snap = true): number {
  for (const section of sliderSections(schema)) {
    if (percent <= section.toPercent || section.toPercent >= 100) {
      const span = section.toPercent - section.fromPercent
      const ratio =
        span === 0 ? 0 : Math.min(1, Math.max(0, (percent - section.fromPercent) / span))
      const value = section.fromValue + ratio * (section.toValue - section.fromValue)

      return snap && section.step > 0
        ? Math.min(section.toValue, roundTo(value, section.step, section.fromValue))
        : value
    }
  }

  return schema.max
}

/** Round a value to the step of its section of the track. */
export function sliderSnap(value: number, schema: SliderTrack): number {
  return sliderValueAt(sliderPercent(value, schema), schema)
}

/** The lowest and highest value a thumb can take (the track minus `rangePadding()`). */
export function sliderBounds(
  schema: Pick<SliderSchema, 'min' | 'max' | 'rangePadding'>,
): [number, number] {
  const [start, end] = schema.rangePadding ?? [0, 0]

  return [schema.min + start, schema.max - end]
}

/** Whether thumb `index` shows its value (`tooltips()`, or `tooltips([true, false])`). */
export function sliderShowsTooltip(schema: Pick<SliderSchema, 'tooltips'>, index: number): boolean {
  return Array.isArray(schema.tooltips) ? schema.tooltips[index] === true : Boolean(schema.tooltips)
}

/** Whether any thumb shows its value (the slider leaves room above the track). */
export function sliderHasTooltips(schema: Pick<SliderSchema, 'tooltips'>): boolean {
  return Array.isArray(schema.tooltips) ? schema.tooltips.includes(true) : Boolean(schema.tooltips)
}

/**
 * Filled sections of the track for `fillTrack([false, true, false])`, as positions (0–100)
 * from the minimum. Null when `fillTrack` is not an array: the primitive's range is used.
 */
export function sliderFillSections(
  values: number[],
  schema: Pick<SliderSchema, 'fillTrack'> & SliderTrack,
): Array<{ start: number; end: number }> | null {
  if (!Array.isArray(schema.fillTrack)) return null

  const stops = [0, ...values.map((value) => sliderPercent(value, schema)), 100]

  return schema.fillTrack.flatMap((filled, index) => {
    const start = stops[index]
    const end = stops[index + 1]

    return filled && start !== undefined && end !== undefined && end > start ? [{ start, end }] : []
  })
}

/** Inline position of a fill section: from the minimum's edge of the track. */
export function sliderFillStyle(
  section: { start: number; end: number },
  options: { vertical: boolean; topToBottom?: boolean; direction: 'ltr' | 'rtl' },
): Record<string, string> {
  const size = `${section.end - section.start}%`
  const offset = `${section.start}%`

  if (options.vertical) {
    return options.topToBottom ? { top: offset, height: size } : { bottom: offset, height: size }
  }

  return options.direction === 'rtl'
    ? { right: offset, width: size }
    : { left: offset, width: size }
}

/** The pointer behaviours of a slider (`behavior()`); `tap` by default. */
export function sliderBehavior(schema: Pick<SliderSchema, 'behavior'>): Set<SliderBehavior> {
  return new Set(schema.behavior ?? ['tap'])
}

/** The slider's direction: `rtl()` when set, else the panel's. */
export function sliderDirection(
  schema: Pick<SliderSchema, 'rtl'>,
  panel: 'ltr' | 'rtl',
): 'ltr' | 'rtl' {
  return schema.rtl === undefined || schema.rtl === null ? panel : schema.rtl ? 'rtl' : 'ltr'
}

/**
 * What the slider primitive works with: values directly, or positions (0–100) on a
 * non-linear track. `smooth` (`Behavior::SmoothSteps` while dragging) drops the step.
 */
export function sliderPrimitive(
  schema: SliderTrack,
  smooth = false,
): { min: number; max: number; step: number; nonLinear: boolean } {
  if (schema.nonLinearPoints && schema.nonLinearPoints.length > 0) {
    return { min: 0, max: 100, step: smooth ? 0.01 : 0.1, nonLinear: true }
  }

  return {
    min: schema.min,
    max: schema.max,
    step: smooth ? (schema.max - schema.min) / 1000 || schema.step : schema.step,
    nonLinear: false,
  }
}

/** Thumb values as the primitive's values. */
export function sliderToPrimitive(values: number[], schema: SliderTrack): number[] {
  return sliderPrimitive(schema).nonLinear
    ? values.map((value) => sliderPercent(value, schema))
    : values
}

/** The primitive's values as thumb values (snapped unless dragging smoothly). */
export function sliderFromPrimitive(values: number[], schema: SliderTrack, snap = true): number[] {
  return sliderPrimitive(schema).nonLinear
    ? values.map((position) => sliderValueAt(position, schema, snap))
    : values
}

type SliderRules = SliderTrack &
  Pick<SliderSchema, 'rangePadding' | 'behavior' | 'minDifference' | 'multiple'>

/**
 * The thumb values to store after the primitive moved from `previous` to `next` (both
 * sorted): kept inside `rangePadding()`; with `fixed` every thumb moves by the same
 * amount; without `unconstrained` a thumb stops at its neighbours (`minDifference()` apart)
 * instead of passing them.
 */
export function sliderNextValues(
  previous: number[],
  next: number[],
  schema: SliderRules,
): number[] {
  const [low, high] = sliderBounds(schema)
  const behavior = sliderBehavior(schema)
  const clamp = (value: number) => Math.min(high, Math.max(low, value))

  if (next.length !== previous.length || previous.length < 2) {
    return next.map(clamp)
  }

  const moved = sliderMovedThumb(previous, next)

  if (!moved) return next.map(clamp)

  const [index, value] = moved

  if (behavior.has('fixed')) {
    return sliderShift(previous, value - previous[index]!, schema)
  }

  if (behavior.has('unconstrained')) {
    return [...next].map(clamp).sort((a, b) => a - b)
  }

  const gap = schema.minDifference ?? 0
  const lower = index > 0 ? previous[index - 1]! + gap : low
  const upper = index < previous.length - 1 ? previous[index + 1]! - gap : high
  const result = [...previous]
  result[index] = Math.min(Math.min(high, upper), Math.max(Math.max(low, lower), value))

  return result
}

/**
 * Which thumb of `previous` moved, and where to, when exactly one value changed (the
 * primitive may have re-sorted the thumbs after one passed another).
 */
function sliderMovedThumb(previous: number[], next: number[]): [number, number] | null {
  const remaining = [...next]
  const removed: number[] = []

  for (const [index, value] of previous.entries()) {
    const found = remaining.indexOf(value)

    if (found === -1) removed.push(index)
    else remaining.splice(found, 1)
  }

  if (removed.length !== 1 || remaining.length !== 1) return null

  return [removed[0]!, remaining[0]!]
}

/**
 * Move every thumb by `delta` (in values), keeping their distances and stopping at the
 * ends of the track (minus `rangePadding()`).
 */
export function sliderShift(values: number[], delta: number, schema: SliderRules): number[] {
  if (values.length === 0) return values

  const [low, high] = sliderBounds(schema)
  const first = Math.min(...values)
  const last = Math.max(...values)
  const allowed = Math.min(high - last, Math.max(low - first, delta))

  return values.map((value) => value + allowed)
}

/**
 * `Behavior::Drag`: follow a pointer that grabbed the filled range between the thumbs and
 * move them together, until the pointer is released. Positions are measured on `track`
 * in the slider's direction (bottom to top when vertical).
 */
export function startSliderRangeDrag(
  event: PointerEvent,
  options: {
    track: HTMLElement
    values: number[]
    schema: SliderRules
    direction: 'ltr' | 'rtl'
    vertical: boolean
    /** `vertical(isTopToBottom: true)`: the minimum is at the top. */
    topToBottom?: boolean
    onChange: (values: number[]) => void
    onEnd?: () => void
  },
): void {
  const { track, values, schema, direction, vertical } = options
  const rect = track.getBoundingClientRect()
  const size = vertical ? rect.height : rect.width

  if (!(size > 0) || values.length < 2) return

  event.preventDefault()
  event.stopPropagation()

  const start = vertical ? event.clientY : event.clientX
  const percents = values.map((value) => sliderPercent(value, schema))

  const move = (moveEvent: PointerEvent) => {
    const current = vertical ? moveEvent.clientY : moveEvent.clientX
    let delta = ((current - start) / size) * 100

    if (vertical ? !options.topToBottom : direction === 'rtl') delta = -delta

    const [low, high] = sliderBounds(schema).map((bound) => sliderPercent(bound, schema)) as [
      number,
      number,
    ]
    const allowed = Math.min(
      high - Math.max(...percents),
      Math.max(low - Math.min(...percents), delta),
    )
    const moved = percents.map((percent) => sliderValueAt(percent + allowed, schema))
    // Snapping each thumb separately could change their distance: keep the first one's.
    options.onChange(
      sliderPrimitive(schema).nonLinear
        ? moved
        : sliderShift(values, moved[0]! - values[0]!, schema),
    )
  }

  const end = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    options.onEnd?.()
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}

/**
 * Whether a pointer press on the slider should be swallowed before the primitive sees it:
 * a press on the track when `tap` (and `snap`) are off. Thumbs always respond.
 */
export function sliderBlocksTap(
  target: EventTarget | null,
  schema: Pick<SliderSchema, 'behavior'>,
): boolean {
  const behavior = sliderBehavior(schema)

  if (behavior.has('tap') || behavior.has('snap')) return false

  return !(target instanceof Element && target.closest('[role="slider"]'))
}

// ---------------------------------------------------------------- CodeEditor

export interface TextEdit {
  value: string
  selectionStart: number
  selectionEnd: number
}

/**
 * Indent (or with `outdent`, unindent) the lines touched by the selection. A collapsed
 * selection without `outdent` inserts spaces at the caret.
 */
export function indentCode(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  tabSize: number,
  outdent = false,
): TextEdit {
  const indent = ' '.repeat(Math.max(1, tabSize))

  if (!outdent && selectionStart === selectionEnd) {
    return {
      value: value.slice(0, selectionStart) + indent + value.slice(selectionEnd),
      selectionStart: selectionStart + indent.length,
      selectionEnd: selectionStart + indent.length,
    }
  }

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const block = value.slice(lineStart, selectionEnd)
  const lines = block.split('\n')
  let firstDelta = 0
  let totalDelta = 0

  const next = lines.map((line, index) => {
    if (outdent) {
      const removable = line.match(new RegExp(`^ {1,${indent.length}}|^\\t`))?.[0].length ?? 0

      if (index === 0) firstDelta = -removable
      totalDelta -= removable

      return line.slice(removable)
    }

    if (index === 0) firstDelta = indent.length
    totalDelta += indent.length

    return indent + line
  })

  return {
    value: value.slice(0, lineStart) + next.join('\n') + value.slice(selectionEnd),
    selectionStart: Math.max(lineStart, selectionStart + firstDelta),
    selectionEnd: Math.max(lineStart, selectionEnd + totalDelta),
  }
}

/** Keep the indentation of the current line when Enter is pressed. */
export function newlineWithIndent(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TextEdit {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const indent = value.slice(lineStart, selectionStart).match(/^[ \t]*/)?.[0] ?? ''
  const insert = `\n${indent}`

  return {
    value: value.slice(0, selectionStart) + insert + value.slice(selectionEnd),
    selectionStart: selectionStart + insert.length,
    selectionEnd: selectionStart + insert.length,
  }
}

// ---------------------------------------------------------------- ModalTableSelect

/** Query parameters for the picker table, prefixed with the table state identifier. */
export function modalTableQuery(identifier: string, query: TableQuery): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(query) as [keyof TableQuery, unknown][]) {
    if (value === null || value === undefined || value === '') continue

    params[tableQueryKey(identifier, name)] = value
  }

  return params
}

/**
 * The selection after the record `key` was toggled in the picker. Single selects keep
 * one key; multiple selects stop at `maxItems`.
 */
export function toggleModalTableKey(
  selected: string[],
  key: string,
  multiple: boolean,
  maxItems?: number,
): string[] {
  if (selected.includes(key)) {
    return selected.filter((candidate) => candidate !== key)
  }

  if (!multiple) return [key]

  if (maxItems != null && selected.length >= maxItems) return selected

  return [...selected, key]
}

/**
 * The store options of a picker's filters form. Searchable selects among the filters load
 * their options through the owning form's endpoint, addressed by the ModalTableSelect's
 * `path` (`pickerFilters`), so the server resolves the picker table (and its tenant-scoped
 * relationships) the same way it does for the table itself.
 */
export function pickerFilterFormOptions(owner: FormStore, path: string): FormStoreOptions {
  return {
    token: owner.token,
    component: owner.component,
    record: owner.record,
    optionsUrl: owner.optionsUrl,
    params: () => ({
      ...owner.requestContext(),
      pickerFilters: path,
      ownerState: owner.state.values,
    }),
  }
}

// ---------------------------------------------------------------- FileUpload

/**
 * The stored or temporary paths in a FileUpload state value. The server always holds a
 * list (a single field's is at most one long) and accepts one path too, so a value from
 * either side normalises the same way.
 */
export function fileUploadPaths(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((path): path is string => typeof path === 'string' && path !== '')
  }

  return typeof value === 'string' && value !== '' ? [value] : []
}

/**
 * The file entry of each path: the server's (`component.files`), or the one this session
 * uploaded. A temporary upload comes back from the server without a `url` after a round trip,
 * so the session's entry (with its local image preview) wins over it then (W-S2-02).
 */
export function fileUploadEntries<T extends UploadedFile>(
  paths: readonly string[],
  serverFiles: readonly UploadedFile[],
  uploaded: readonly T[],
): Array<T | UploadedFile> {
  return paths.map((path) => {
    const server = serverFiles.find((file) => file.path === path)
    const local = uploaded.find((file) => file.path === path)

    if (local && !server?.url) return { ...server, ...local }

    return server ?? local ?? { path, name: path.replace(/^tmp:/, '') }
  })
}

/** The picker's `accept`: the accepted types plus the extensions of `mimeTypeMap()`. */
export function fileUploadAccept(
  schema: Pick<FileUploadSchema, 'acceptedFileTypes' | 'mimeTypeMap'>,
): string | undefined {
  if (!schema.acceptedFileTypes || schema.acceptedFileTypes.length === 0) return undefined

  const mapped = Object.entries(schema.mimeTypeMap ?? {})
    .filter(([, type]) => schema.acceptedFileTypes!.includes(type))
    .map(([extension]) => `.${extension}`)

  return [...new Set([...schema.acceptedFileTypes, ...mapped])].join(',')
}

/** A `'2:1'` / `'16/9'` ratio as a CSS `aspect-ratio` value. */
export function cssAspectRatio(ratio: string | null | undefined): string | undefined {
  const [width, height] = (ratio ?? '').split(/[:/]/).map((part) => Number(part.trim()))

  return width && height && width > 0 && height > 0 ? `${width} / ${height}` : undefined
}

/**
 * The field's paths after an upload finished: the new key after the existing files, or
 * before them with `appendFiles(false)`, keeping at most `maxFiles`.
 */
export function insertUploadedFile(
  paths: string[],
  key: string,
  schema: Pick<FileUploadSchema, 'appendFiles'>,
  maxFiles: number,
): string[] {
  return schema.appendFiles === false
    ? [key, ...paths].slice(0, maxFiles)
    : [...paths, key].slice(-maxFiles)
}

/** Where a file's "open" and "download" buttons link to. */
export function uploadedFileLinks(file: Pick<UploadedFile, 'url' | 'openUrl' | 'downloadUrl'>): {
  open?: string
  download?: string
} {
  return { open: file.openUrl ?? file.url, download: file.downloadUrl ?? file.url }
}

/**
 * A queue that runs at most `limit` tasks at once, in the order they were added
 * (`maxParallelUploads()`).
 */
export function concurrencyLimiter(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  const max = Math.max(1, Math.floor(limit) || 1)
  const waiting: Array<() => void> = []
  let running = 0

  const release = () => {
    running--
    waiting.shift()?.()
  }

  return <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const start = () => {
        running++
        task().then(resolve, reject).finally(release)
      }

      if (running < max) start()
      else waiting.push(start)
    })
}

/** The selected record keys in a ModalTableSelect state value. */
export function modalTableSelected(value: unknown, multiple: boolean): string[] {
  if (multiple) return Array.isArray(value) ? value.map(String) : []

  return value === null || value === undefined || value === '' ? [] : [String(value)]
}

export interface ModalTablePaging {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  from: number
  to: number
  total?: number
}

/** Page-by-page navigation for the picker table, whatever the table's pagination mode. */
export function modalTablePaging(
  pagination: AnyPaginationSchema | null | undefined,
): ModalTablePaging | null {
  if (!pagination) return null

  const page = 'currentPage' in pagination ? pagination.currentPage : 1
  const hasNext =
    'lastPage' in pagination
      ? page < pagination.lastPage
      : 'currentPage' in pagination && 'hasMorePages' in pagination && pagination.hasMorePages

  return {
    page,
    hasPrevious: 'currentPage' in pagination && page > 1,
    hasNext: Boolean(hasNext),
    from: pagination.from,
    to: pagination.to,
    total: 'total' in pagination ? pagination.total : undefined,
  }
}
