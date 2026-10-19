import type { Breakpoints, Color, IconName, Option } from './common'
import type { BaseField } from './components'

// ---------------------------------------------------------------- Summaries

/** One summarizer's formatted value (`Sum::make()` → `{ label: 'Sum', value: '€9.00' }`). */
export interface SummaryValueSchema {
  label?: string
  /** `hiddenLabel()`: the label is for screen readers only. */
  hiddenLabel?: boolean
  value: string | null
  /** `Count::icons()`: how often each icon of an `IconColumn` occurs. */
  icons?: Array<{ icon: IconName; color?: string | null; count: number }>
}

/** Summaries keyed by column name; a column may have several summarizers. */
export type ColumnSummariesSchema = Record<string, SummaryValueSchema[]>

export interface TableSummaryRowSchema {
  /** "This page", "All posts". */
  label: string
  values: ColumnSummariesSchema
}

export interface TableSummariesSchema {
  /** Only present when the current page does not hold every matching record. */
  page?: TableSummaryRowSchema
  /** Absent with `summaries(allTableCondition: false)`. */
  all?: TableSummaryRowSchema
}

// ---------------------------------------------------------------- Grouping

/** A group users can pick in the "group by" menu. */
export interface TableGroupOptionSchema {
  id: string
  label: string
}

/** The active grouping. */
export interface TableGroupingSchema {
  group: string
  label: string
  direction: 'asc' | 'desc'
  collapsible?: boolean
  collapsedByDefault?: boolean
  /** Only group headings and their summaries are shown, no rows. */
  groupsOnly?: boolean
}

/** A group heading on the current page; records carry its `key` in `group`. */
export interface TableRecordGroupSchema {
  /** `''` is the group of rows without a value. */
  key: string
  title: string
  description?: string
  /** The enum's icon (`HasIcon`) when the group state is an enum. */
  icon?: IconName
  /** The enum's colour (`HasColor`), applied to the icon. */
  color?: Color
  summary?: ColumnSummariesSchema
  collapsible?: boolean
}

// ---------------------------------------------------------------- Query builder

export type QueryBuilderInput =
  'text' | 'number' | 'date' | 'datetime' | 'month' | 'year' | 'select' | 'none' | (string & {})

export interface QueryBuilderOperatorSchema {
  name: string
  label: string
  /** The value input this operator needs. */
  input: QueryBuilderInput
  /** Options of a custom operator's `select` input (else the constraint's `options`). */
  options?: Option[]
}

export interface QueryBuilderConstraintSchema {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'relationship' | (string & {})
  icon?: IconName
  operators: QueryBuilderOperatorSchema[]
  /** Select and relationship constraints. */
  options?: Option[]
  multiple?: boolean
  /** A search box filters the options (`searchable()`). */
  searchable?: boolean
  step?: number
  /** Label of the picker section (`constraints(['Group' => [...]])`); ungrouped come first. */
  group?: string
}

/** The rule editor field of a `QueryBuilder` filter. Its state is a `QueryBuilderGroup`. */
export interface QueryBuilderRulesSchema extends BaseField {
  type: 'QueryBuilderRules'
  constraints: QueryBuilderConstraintSchema[]
  /** How deep groups may nest; `0` allows only top-level rules. */
  maxDepth: number
  /** Grid columns of the "add rule" constraint picker (`constraintPickerColumns()`). */
  constraintPickerColumns?: Breakpoints
  /** Width of the constraint picker (`constraintPickerWidth()`: `xs` … `7xl`). */
  constraintPickerWidth?: string
}

export interface QueryBuilderConstraintRule {
  type: 'constraint'
  constraint: string
  operator: string
  value?: unknown
}

export interface QueryBuilderGroup {
  combinator: 'and' | 'or'
  rules: QueryBuilderRule[]
}

export interface QueryBuilderGroupRule extends QueryBuilderGroup {
  type: 'group'
}

export type QueryBuilderRule = QueryBuilderConstraintRule | QueryBuilderGroupRule
