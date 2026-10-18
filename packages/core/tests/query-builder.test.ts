import { describe, expect, it } from 'vitest'
import type { QueryBuilderConstraintSchema } from '../src'
import {
  addGroup,
  addRule,
  canNestGroup,
  createRule,
  groupAt,
  normalizeRuleTree,
  removeRule,
  setCombinator,
  updateRule,
} from '../src'

const constraints: QueryBuilderConstraintSchema[] = [
  {
    name: 'title',
    label: 'Title',
    type: 'text',
    operators: [
      { name: 'contains', label: 'contains', input: 'text' },
      { name: 'equals', label: 'equals', input: 'text' },
      { name: 'is_blank', label: 'is blank', input: 'none' },
    ],
  },
  {
    name: 'rating',
    label: 'Rating',
    type: 'number',
    operators: [{ name: 'gt', label: '>', input: 'number' }],
  },
]

describe('query builder tree', () => {
  it('normalises query-string state', () => {
    expect(normalizeRuleTree(undefined)).toEqual({ combinator: 'and', rules: [] })
    expect(
      normalizeRuleTree({
        combinator: 'or',
        rules: {
          0: { constraint: 'title', operator: 'contains', value: 'x' },
          1: { type: 'group', rules: [] },
          2: 'junk',
        },
      }),
    ).toEqual({
      combinator: 'or',
      rules: [
        { type: 'constraint', constraint: 'title', operator: 'contains', value: 'x' },
        { type: 'group', combinator: 'and', rules: [] },
      ],
    })
  })

  it('adds, nests, updates and removes rules immutably', () => {
    const empty = normalizeRuleTree(null)
    let tree = addRule(empty, [], createRule(constraints[0]!))
    tree = addGroup(tree, [], createRule(constraints[1]!))

    expect(empty.rules).toHaveLength(0)
    expect(tree.rules[1]).toMatchObject({ type: 'group', combinator: 'or' })
    expect(groupAt(tree, [1])?.rules).toEqual([
      { type: 'constraint', constraint: 'rating', operator: 'gt' },
    ])
    expect(groupAt(tree, [0])).toBeUndefined()

    tree = updateRule(tree, [1, 0], { value: 4 }, constraints)
    expect(groupAt(tree, [1])?.rules[0]).toMatchObject({ value: 4 })

    tree = updateRule(tree, [0], { value: 'a' }, constraints)
    // Same input type: the value stays.
    tree = updateRule(tree, [0], { operator: 'equals' }, constraints)
    expect(tree.rules[0]).toMatchObject({ operator: 'equals', value: 'a' })
    // No value input: the value goes.
    tree = updateRule(tree, [0], { operator: 'is_blank' }, constraints)
    expect(tree.rules[0]).not.toHaveProperty('value')
    // Another constraint starts over with its first operator.
    tree = updateRule(tree, [0], { constraint: 'rating' }, constraints)
    expect(tree.rules[0]).toEqual({ type: 'constraint', constraint: 'rating', operator: 'gt' })

    tree = setCombinator(tree, [1], 'and')
    expect(groupAt(tree, [1])?.combinator).toBe('and')

    tree = removeRule(tree, [1, 0])
    expect(groupAt(tree, [1])?.rules).toEqual([])
    tree = removeRule(tree, [1])
    expect(tree.rules).toHaveLength(1)
  })

  it('limits nesting depth', () => {
    expect(canNestGroup([], 0)).toBe(false)
    expect(canNestGroup([], 2)).toBe(true)
    expect(canNestGroup([0, 1], 2)).toBe(false)
  })
})
