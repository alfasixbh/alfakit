/**
 * Shared axe-core harness for the renderer accessibility suites: runs the WCAG 2.1 A/AA
 * rule set against a hydrated (or client-rendered) DOM and formats violations so a failing
 * test names the rule, the impact and the offending nodes.
 */
import axe, { type AxeResults, type Result, type RunOptions } from 'axe-core'

/** WCAG 2.1 A and AA success criteria, plus axe's own best-practice rules switched off. */
export const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/**
 * Rules that cannot be evaluated in jsdom and are therefore skipped here. Each is covered
 * elsewhere, as noted; none is disabled because the components fail it.
 */
export const JSDOM_SKIPPED_RULES: Record<string, string> = {
  // jsdom has no layout or computed colours; axe marks every node "incomplete". The theme
  // tokens of all built-in themes are checked by packages/core/tests/contrast.test.ts and the
  // live pages by the Playwright suite in e2e/ (which runs axe in a real browser).
  'color-contrast': 'No layout engine in jsdom; covered by core contrast.test.ts and e2e/',
}

export interface AxeViolation {
  id: string
  impact: string
  help: string
  nodes: string[]
}

export function axeOptions(extra: RunOptions = {}): RunOptions {
  return {
    runOnly: { type: 'tag', values: WCAG_21_AA_TAGS },
    rules: Object.fromEntries(
      Object.keys(JSDOM_SKIPPED_RULES).map((rule) => [rule, { enabled: false }]),
    ),
    // Avoid iframe traversal and scroll handling that jsdom does not implement.
    iframes: false,
    resultTypes: ['violations', 'incomplete'],
    ...extra,
  }
}

/** Runs axe against `root` (defaults to the document) with the WCAG 2.1 AA rule set. */
export async function runAxe(
  root?: Element | Document,
  extra: RunOptions = {},
): Promise<AxeResults> {
  const context = root ?? document

  return axe.run(context as Element | Document, axeOptions(extra))
}

export function formatViolations(results: Pick<AxeResults, 'violations'>): AxeViolation[] {
  return results.violations.map((violation: Result) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    nodes: violation.nodes.map(
      (node) =>
        `${node.target.join(' ')}\n      ${node.html.slice(0, 300)}${node.failureSummary ? `\n      ${node.failureSummary.replace(/\n/g, '\n      ')}` : ''}`,
    ),
  }))
}

/** Human readable report, used as the assertion message. */
export function describeViolations(violations: AxeViolation[]): string {
  if (violations.length === 0) return 'no violations'

  return violations
    .map(
      (violation) =>
        `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
        violation.nodes.map((node) => `    - ${node}`).join('\n'),
    )
    .join('\n')
}

/**
 * The jsdom environment has no `getComputedStyle` support for pseudo elements and no layout;
 * axe guards most of this itself but needs `window.getComputedStyle` to be stable and
 * `Element.prototype.getClientRects` to return something iterable.
 */
export function prepareAxeEnvironment(): void {
  if (typeof Element !== 'undefined' && !Element.prototype.getClientRects) {
    Element.prototype.getClientRects = function getClientRects() {
      return [] as unknown as DOMRectList
    }
  }

  // axe calls `getAnimations` when checking hidden content on newer rule sets.
  if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => []
  }
}
