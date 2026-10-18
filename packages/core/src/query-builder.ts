import type { Option } from './schema/common'
import type {
  QueryBuilderConstraintRule,
  QueryBuilderConstraintSchema,
  QueryBuilderGroup,
  QueryBuilderOperatorSchema,
  QueryBuilderRule,
  QueryBuilderRulesSchema,
} from './schema/table-grouping'
import { gridColumnsClasses } from './utils/breakpoints'

/**
 * Pure helpers for the query builder's rule tree. The tree is only edited here; the
 * server validates every rule (constraint, operator, value, depth) when it applies them.
 *
 * Positions are paths of rule indexes from the root group: `[]` is the root, `[2]` its
 * third rule, `[2, 0]` the first rule of the group at `[2]`.
 */
export type RulePath = readonly number[]

/** Coerce state from the query string (or nothing) into a well-formed tree. */
export function normalizeRuleTree(value: unknown): QueryBuilderGroup {
  const source = isRecord(value) ? value : {}
  const rules = Array.isArray(source.rules)
    ? source.rules
    : isRecord(source.rules)
      ? Object.values(source.rules) // `rules[0]=…` may arrive as an object
      : []

  return {
    combinator: source.combinator === 'or' ? 'or' : 'and',
    rules: rules.filter(isRecord).map((rule): QueryBuilderRule => {
      if (rule.type === 'group') {
        return { type: 'group', ...normalizeRuleTree(rule) }
      }

      return {
        type: 'constraint',
        constraint: typeof rule.constraint === 'string' ? rule.constraint : '',
        operator: typeof rule.operator === 'string' ? rule.operator : '',
        ...(rule.value !== undefined && rule.value !== null
          ? { value: normalizeValue(rule.value) }
          : {}),
      }
    }),
  }
}

function normalizeValue(value: unknown): unknown {
  return isRecord(value) ? Object.values(value) : value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A new rule for a constraint, using its first operator. */
export function createRule(constraint: QueryBuilderConstraintSchema): QueryBuilderConstraintRule {
  return {
    type: 'constraint',
    constraint: constraint.name,
    operator: constraint.operators[0]?.name ?? '',
  }
}

export function findConstraint(
  constraints: QueryBuilderConstraintSchema[],
  name: string,
): QueryBuilderConstraintSchema | undefined {
  return constraints.find((constraint) => constraint.name === name)
}

export function findOperator(
  constraint: QueryBuilderConstraintSchema | undefined,
  name: string,
): QueryBuilderOperatorSchema | undefined {
  return constraint?.operators.find((operator) => operator.name === name)
}

/** The group at `path` (the root for `[]`), or undefined when `path` is not a group. */
export function groupAt(tree: QueryBuilderGroup, path: RulePath): QueryBuilderGroup | undefined {
  let group: QueryBuilderGroup = tree

  for (const index of path) {
    const rule = group.rules[index]

    if (!rule || rule.type !== 'group') return undefined

    group = rule
  }

  return group
}

/** Replace the group at `path` with `update(group)`, copying every level above it. */
export function updateGroup(
  tree: QueryBuilderGroup,
  path: RulePath,
  update: (group: QueryBuilderGroup) => QueryBuilderGroup,
): QueryBuilderGroup {
  if (path.length === 0) {
    return update(tree)
  }

  const [index, ...rest] = path as [number, ...number[]]
  const rule = tree.rules[index]

  if (!rule || rule.type !== 'group') return tree

  const { type: _type, ...nested } = rule
  const next = updateGroup(nested, rest, update)

  return {
    ...tree,
    rules: tree.rules.map((item, i) => (i === index ? { type: 'group', ...next } : item)),
  }
}

export function addRule(
  tree: QueryBuilderGroup,
  path: RulePath,
  rule: QueryBuilderRule,
): QueryBuilderGroup {
  return updateGroup(tree, path, (group) => ({ ...group, rules: [...group.rules, rule] }))
}

/** Add a nested group holding one rule (empty groups disappear on the server). */
export function addGroup(
  tree: QueryBuilderGroup,
  path: RulePath,
  firstRule: QueryBuilderConstraintRule,
): QueryBuilderGroup {
  const parent = groupAt(tree, path)
  const combinator = parent?.combinator === 'and' ? 'or' : 'and'

  return addRule(tree, path, { type: 'group', combinator, rules: [firstRule] })
}

export function removeRule(tree: QueryBuilderGroup, path: RulePath): QueryBuilderGroup {
  if (path.length === 0) return tree

  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]!

  return updateGroup(tree, parentPath, (group) => ({
    ...group,
    rules: group.rules.filter((_, i) => i !== index),
  }))
}

/** Change a constraint rule; switching constraint or operator drops a value that no longer fits. */
export function updateRule(
  tree: QueryBuilderGroup,
  path: RulePath,
  changes: Partial<Omit<QueryBuilderConstraintRule, 'type'>>,
  constraints: QueryBuilderConstraintSchema[],
): QueryBuilderGroup {
  if (path.length === 0) return tree

  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]!

  return updateGroup(tree, parentPath, (group) => ({
    ...group,
    rules: group.rules.map((rule, i) => {
      if (i !== index || rule.type !== 'constraint') return rule

      if (changes.constraint !== undefined && changes.constraint !== rule.constraint) {
        const constraint = findConstraint(constraints, changes.constraint)

        return constraint ? createRule(constraint) : rule
      }

      const next: QueryBuilderConstraintRule = { ...rule, ...changes }

      if (changes.operator !== undefined && changes.operator !== rule.operator) {
        const constraint = findConstraint(constraints, rule.constraint)
        const before = findOperator(constraint, rule.operator)?.input
        const after = findOperator(constraint, changes.operator)?.input

        if (before !== after) delete next.value
      }

      return next
    }),
  }))
}

export function setCombinator(
  tree: QueryBuilderGroup,
  path: RulePath,
  combinator: 'and' | 'or',
): QueryBuilderGroup {
  return updateGroup(tree, path, (group) => ({ ...group, combinator }))
}

/** Whether a group at `path` may hold another nested group. */
export function canNestGroup(path: RulePath, maxDepth: number): boolean {
  return path.length < maxDepth
}

/** Max widths of the "add rule" constraint picker (`constraintPickerWidth()`). */
export const CONSTRAINT_PICKER_WIDTH_CLASSES: Record<string, string> = {
  '3xs': 'w-3xs',
  '2xs': 'w-2xs',
  xs: 'w-xs',
  sm: 'w-sm',
  md: 'w-md',
  lg: 'w-lg',
  xl: 'w-xl',
  '2xl': 'w-2xl',
  '3xl': 'w-3xl',
  '4xl': 'w-4xl',
  '5xl': 'w-5xl',
  '6xl': 'w-6xl',
  '7xl': 'w-7xl',
  none: 'w-auto',
  min: 'w-min',
  max: 'w-max',
  fit: 'w-fit',
  prose: 'w-[65ch]',
  container: 'container',
  'screen-sm': 'w-(--breakpoint-sm)',
  'screen-md': 'w-(--breakpoint-md)',
  'screen-lg': 'w-(--breakpoint-lg)',
  'screen-xl': 'w-(--breakpoint-xl)',
  'screen-2xl': 'w-(--breakpoint-2xl)',
  full: 'w-full',
  screen: 'w-screen',
}

/**
 * Classes of the "add rule" constraint picker: a grid when `constraintPickerColumns()`
 * asks for more than one column, and the `constraintPickerWidth()` width (capped to the
 * viewport).
 */
export function constraintPickerClasses(
  schema: Pick<QueryBuilderRulesSchema, 'constraintPickerColumns' | 'constraintPickerWidth'>,
): { grid: string | undefined; width: string | undefined } {
  const columns = schema.constraintPickerColumns
  const multi = columns ? Object.values(columns).some((value) => (value ?? 1) > 1) : false
  const width = schema.constraintPickerWidth
    ? CONSTRAINT_PICKER_WIDTH_CLASSES[schema.constraintPickerWidth]
    : undefined

  return {
    grid: multi ? `grid gap-1 ${gridColumnsClasses(columns)}` : undefined,
    width: width ? `${width} max-w-[calc(100vw-2rem)]` : undefined,
  }
}

/** A section of the constraint picker: ungrouped constraints (no `label`) or one group. */
export interface ConstraintPickerSection {
  label?: string
  constraints: QueryBuilderConstraintSchema[]
}

/**
 * The constraint picker's sections (`constraints(['Group' => [...]])`): ungrouped
 * constraints first, then each group in the order it first appears.
 */
export function constraintPickerSections(
  constraints: readonly QueryBuilderConstraintSchema[],
): ConstraintPickerSection[] {
  const ungrouped: QueryBuilderConstraintSchema[] = []
  const groups = new Map<string, QueryBuilderConstraintSchema[]>()

  for (const constraint of constraints) {
    if (constraint.group) {
      const list = groups.get(constraint.group) ?? []
      list.push(constraint)
      groups.set(constraint.group, list)
    } else {
      ungrouped.push(constraint)
    }
  }

  return [
    ...(ungrouped.length > 0 ? [{ constraints: ungrouped }] : []),
    ...[...groups].map(([label, list]) => ({ label, constraints: list })),
  ]
}

/** The HTML `<input type>` for a value input kind (`datetime` → `datetime-local`). */
export function queryBuilderInputType(input: string): string {
  switch (input) {
    case 'number':
    case 'year':
      return 'number'
    case 'date':
      return 'date'
    case 'datetime':
      return 'datetime-local'
    case 'month':
      return 'month'
    default:
      return 'text'
  }
}

/** The options of a rule's select input: the operator's own (custom operators) or the constraint's. */
export function queryBuilderOptions(
  constraint: QueryBuilderConstraintSchema,
  operator: QueryBuilderOperatorSchema | undefined,
): Option[] {
  return operator?.options ?? constraint.options ?? []
}

/** `searchable()` constraints: the options whose label contains the search (case-insensitive). */
export function filterQueryBuilderOptions(options: Option[], search: string): Option[] {
  const needle = search.trim().toLocaleLowerCase()

  if (needle === '') return options

  return options.filter((option) => String(option.label).toLocaleLowerCase().includes(needle))
}
