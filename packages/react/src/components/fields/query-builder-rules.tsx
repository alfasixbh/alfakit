import type {
  FieldSchema,
  Option,
  QueryBuilderConstraintRule,
  QueryBuilderConstraintSchema,
  QueryBuilderGroup,
  QueryBuilderRulesSchema,
  RulePath,
} from '@alfakit/core'
import {
  addGroup,
  addRule,
  canNestGroup,
  constraintPickerClasses,
  constraintPickerSections,
  createRule,
  filterQueryBuilderOptions,
  findConstraint,
  findOperator,
  normalizeRuleTree,
  queryBuilderInputType,
  queryBuilderOptions,
  removeRule,
  setCombinator,
  updateRule,
} from '@alfakit/core'
import { PlusIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'

const SELECT_CLASS =
  'border-input dark:bg-input/30 focus-visible:ring-ring/50 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50'

interface EditorContext {
  constraints: QueryBuilderConstraintSchema[]
  picker: ReturnType<typeof constraintPickerClasses>
  maxDepth: number
  locked: boolean
  tree: QueryBuilderGroup
  change: (tree: QueryBuilderGroup) => void
}

/**
 * The query builder's rule editor: rules (constraint, operator, value) combined with
 * AND / OR, in nested groups. The tree is the field's state; the server validates it.
 */
export function QueryBuilderRulesField({ component }: { component: QueryBuilderRulesSchema }) {
  const { value, setValue, id, disabled, readOnly } = useField<unknown>(
    component as unknown as FieldSchema,
  )
  const tree = useMemo(() => normalizeRuleTree(value), [value])

  const context: EditorContext = {
    constraints: component.constraints,
    picker: constraintPickerClasses(component),
    maxDepth: component.maxDepth,
    locked: Boolean(disabled || readOnly),
    tree,
    change: (next) => setValue(next),
  }

  return (
    <FieldWrapper field={component} htmlFor={id} hideLabel>
      <div id={id} role="group" aria-label={component.label ?? undefined}>
        <RuleGroup group={tree} path={[]} context={context} />
      </div>
    </FieldWrapper>
  )
}

function RuleGroup({
  group,
  path,
  context,
}: {
  group: QueryBuilderGroup
  path: RulePath
  context: EditorContext
}) {
  const t = useT()
  const { constraints, locked, tree, change } = context
  const sections = constraintPickerSections(constraints)
  const grouped = sections.some((section) => section.label)
  const pickerItems = (list: QueryBuilderConstraintSchema[]) =>
    list.map((constraint) => (
      <DropdownMenuItem
        key={constraint.name}
        onSelect={() => change(addRule(tree, path, createRule(constraint)))}
      >
        {constraint.icon && <Icon name={constraint.icon} />}
        {constraint.label}
      </DropdownMenuItem>
    ))

  return (
    <div data-slot="query-builder-group" className="flex flex-col gap-2">
      {group.rules.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {t('query_builder.combinator', {}, 'Combine rules with')}
          </span>
          <div className="inline-flex rounded-md border p-0.5">
            {(['and', 'or'] as const).map((combinator) => (
              <button
                key={combinator}
                type="button"
                disabled={locked}
                aria-pressed={group.combinator === combinator}
                className={cn(
                  'rounded-sm px-2 py-0.5 font-medium uppercase',
                  group.combinator === combinator
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => change(setCombinator(tree, path, combinator))}
              >
                {t(`query_builder.${combinator}`, {}, combinator)}
              </button>
            ))}
          </div>
        </div>
      )}
      {group.rules.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {t('query_builder.empty', {}, 'No rules yet.')}
        </p>
      )}
      {group.rules.map((rule, index) => {
        const rulePath = [...path, index]

        if (rule.type === 'group') {
          return (
            <div
              key={index}
              className="bg-muted/30 flex items-start gap-2 rounded-md border border-s-2 p-2"
            >
              <div className="min-w-0 flex-1">
                <RuleGroup group={rule} path={rulePath} context={context} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={locked}
                aria-label={t('query_builder.remove_group', {}, 'Remove group')}
                onClick={() => change(removeRule(tree, rulePath))}
              >
                <XIcon />
              </Button>
            </div>
          )
        }

        return <RuleRow key={index} rule={rule} path={rulePath} context={context} />
      })}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={locked || constraints.length === 0}
            >
              <PlusIcon /> {t('query_builder.add_rule', {}, 'Add rule')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={context.picker.width}>
            <div
              data-slot="query-builder-constraint-picker"
              className={grouped ? undefined : context.picker.grid}
            >
              {/* `constraints(['Group' => [...]])`: a labelled section per group. */}
              {grouped
                ? sections.map((section) =>
                    section.label ? (
                      <DropdownMenuGroup
                        key={section.label}
                        aria-label={section.label}
                        data-slot="query-builder-constraint-group"
                      >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                          {section.label}
                        </DropdownMenuLabel>
                        <div className={context.picker.grid}>
                          {pickerItems(section.constraints)}
                        </div>
                      </DropdownMenuGroup>
                    ) : (
                      <div key="" className={context.picker.grid}>
                        {pickerItems(section.constraints)}
                      </div>
                    ),
                  )
                : pickerItems(constraints)}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {canNestGroup(path, context.maxDepth) && constraints[0] && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={locked}
            onClick={() => change(addGroup(tree, path, createRule(constraints[0]!)))}
          >
            <PlusIcon /> {t('query_builder.add_group', {}, 'Add group')}
          </Button>
        )}
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  path,
  context,
}: {
  rule: QueryBuilderConstraintRule
  path: RulePath
  context: EditorContext
}) {
  const t = useT()
  const { constraints, locked, tree, change } = context
  const constraint = findConstraint(constraints, rule.constraint)
  const operator = findOperator(constraint, rule.operator)
  const update = (changes: Partial<Omit<QueryBuilderConstraintRule, 'type'>>) =>
    change(updateRule(tree, path, changes, constraints))

  return (
    <div data-slot="query-builder-rule" className="flex flex-wrap items-center gap-2">
      <select
        className={SELECT_CLASS}
        value={rule.constraint}
        disabled={locked}
        aria-label={t('query_builder.constraint', {}, 'Field')}
        onChange={(event) => update({ constraint: event.target.value })}
      >
        {!constraint && <option value={rule.constraint}>{rule.constraint}</option>}
        {constraintPickerSections(constraints).map((section) => {
          const options = section.constraints.map((item) => (
            <option key={item.name} value={item.name}>
              {item.label}
            </option>
          ))

          return section.label ? (
            <optgroup key={section.label} label={section.label}>
              {options}
            </optgroup>
          ) : (
            options
          )
        })}
      </select>
      {constraint && (
        <select
          className={SELECT_CLASS}
          value={rule.operator}
          disabled={locked}
          aria-label={t('query_builder.operator', {}, 'Operator')}
          onChange={(event) => update({ operator: event.target.value })}
        >
          {constraint.operators.map((item) => (
            <option key={item.name} value={item.name}>
              {item.label}
            </option>
          ))}
        </select>
      )}
      {constraint && operator && operator.input !== 'none' && (
        <RuleValue
          constraint={constraint}
          options={queryBuilderOptions(constraint, operator)}
          // A custom operator's own options take one value.
          multiple={Boolean(constraint.multiple && !operator.options)}
          input={operator.input}
          value={rule.value}
          locked={locked}
          onChange={(value) => update({ value })}
        />
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="ms-auto"
        disabled={locked}
        aria-label={t('query_builder.remove_rule', {}, 'Remove rule')}
        onClick={() => change(removeRule(tree, path))}
      >
        <XIcon />
      </Button>
    </div>
  )
}

function RuleValue({
  constraint,
  options: allOptions,
  multiple,
  input,
  value,
  locked,
  onChange,
}: {
  constraint: QueryBuilderConstraintSchema
  options: Option[]
  multiple: boolean
  input: string
  value: unknown
  locked: boolean
  onChange: (value: unknown) => void
}) {
  const t = useT()
  const [search, setSearch] = useState('')
  const label = t('query_builder.value', {}, 'Value')

  if (input === 'select') {
    // `searchable()`: a search box narrows the options.
    const options = constraint.searchable
      ? filterQueryBuilderOptions(allOptions, search)
      : allOptions
    const searchBox = constraint.searchable ? (
      <Input
        type="search"
        data-slot="query-builder-search"
        className="h-8 w-40"
        value={search}
        disabled={locked}
        placeholder={t('form.search_placeholder', {}, 'Type to search…')}
        aria-label={t('query_builder.search_options', {}, 'Search options')}
        onChange={(event) => setSearch(event.target.value)}
      />
    ) : null
    // A selected option stays listed while the search hides it.
    const selectedValues = Array.isArray(value)
      ? value.map(String)
      : value !== undefined && value !== null && value !== ''
        ? [String(value)]
        : []
    const shown = [
      ...allOptions.filter(
        (option) =>
          selectedValues.includes(String(option.value)) &&
          !options.some((item) => item.value === option.value),
      ),
      ...options,
    ]

    if (multiple) {
      const selected = selectedValues

      return (
        <div className="flex flex-wrap items-center gap-2">
          {searchBox}
          <div
            role="group"
            aria-label={label}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {shown.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  disabled={locked}
                  checked={selected.includes(String(option.value))}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, String(option.value)]
                        : selected.filter((item) => item !== String(option.value)),
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )
    }

    const select = (
      <select
        className={SELECT_CLASS}
        value={
          value === undefined || value === null
            ? ''
            : String(Array.isArray(value) ? value[0] : value)
        }
        disabled={locked}
        aria-label={label}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">{t('query_builder.select_placeholder', {}, 'Select…')}</option>
        {shown.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    )

    return searchBox ? (
      <div className="flex flex-wrap items-center gap-2">
        {searchBox}
        {select}
      </div>
    ) : (
      select
    )
  }

  return (
    <Input
      type={queryBuilderInputType(input)}
      step={input === 'number' ? (constraint.step ?? 'any') : input === 'year' ? 1 : undefined}
      min={input === 'year' ? 1 : undefined}
      max={input === 'year' ? 9999 : undefined}
      className="h-8 w-auto min-w-32 flex-1"
      value={value === undefined || value === null ? '' : String(value)}
      disabled={locked}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
