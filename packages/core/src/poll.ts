import { router } from '@inertiajs/core'
import type { ContentBlock, PageSchema, PolledComponents } from './schema/panel'
import type { RelationManagerSchema } from './schema/table'
import type { WidgetSchema } from './schema/widgets'
import { parseInterval } from './utils/format'

/** Inertia prop that carries polled components (`Page::POLL_PROP`). */
export const POLL_PROP = 'alfakitPoll'

/** Request header naming the components a poll refreshes (`Page::POLL_HEADER`). */
export const POLL_HEADER = 'X-Alfakit-Poll'

/** The poll target of a widget (`widget:<id>`). Table widgets poll through their table. */
export function widgetPollTarget(widget: Pick<WidgetSchema, 'id'>): string {
  return `widget:${widget.id}`
}

/**
 * Put polled schemas into the page in place of the components they refresh. Blocks that
 * were not polled keep their identity, so forms and other state survive the merge.
 */
export function mergePolledComponents(page: PageSchema, polled: PolledComponents): PageSchema {
  let changed = false

  const replace = <T extends object>(current: T, ...targets: (string | undefined)[]): T => {
    for (const target of targets) {
      const next = target ? polled[target] : undefined

      if (next) {
        changed = true

        return next as unknown as T
      }
    }

    return current
  }

  const content = page.content.map((block) => {
    switch (block.type) {
      case 'Table':
        return replace(block, (block as { component?: string }).component ?? 'table')
      case 'RelationManagers': {
        const managers = (block as { managers: RelationManagerSchema[] }).managers
        const next = managers.map((manager) => replace(manager, manager.component))

        return next.some((manager, index) => manager !== managers[index])
          ? { ...block, managers: next }
          : block
      }
      case 'Widgets': {
        const widgets = (block as { widgets: WidgetSchema[] }).widgets
        const next = widgets.map((widget) =>
          replace(widget, widgetPollTarget(widget), widget.component),
        )

        return next.some((widget, index) => widget !== widgets[index])
          ? { ...block, widgets: next }
          : block
      }
      default:
        return block
    }
  }) as ContentBlock[]

  return changed ? { ...page, content } : page
}

/** Fetch the given components with one partial reload and merge them into the page. */
export function reloadPolledComponents(targets: string[]): Promise<void> {
  if (typeof window === 'undefined' || targets.length === 0) {
    return Promise.resolve()
  }

  const url = window.location.href

  return new Promise((resolve) => {
    router.reload({
      only: [POLL_PROP],
      headers: { [POLL_HEADER]: targets.join(',') },
      onSuccess: (page) => {
        const polled = (page.props as Record<string, unknown>)[POLL_PROP] as
          PolledComponents | undefined

        // The user navigated (sorted, filtered, paged) while the poll was in flight: the
        // page already has fresher data for that state.
        if (!polled || window.location.href !== url) return

        router.replaceProp('page', (current: unknown) =>
          current ? mergePolledComponents(current as PageSchema, polled) : current,
        )
      },
      onFinish: () => resolve(),
    })
  })
}

interface PollGroup {
  interval: number
  targets: Map<symbol, string>
  timer: ReturnType<typeof setInterval> | null
  lastRun: number
  inFlight: boolean
}

/**
 * Runs component polls. Components with the same interval share one timer and one request,
 * timers stop while the tab is hidden, and a poll that came due meanwhile runs as soon as
 * the tab is visible again.
 */
export class PollScheduler {
  private readonly groups = new Map<number, PollGroup>()
  private listening = false

  constructor(
    private readonly request: (targets: string[]) => Promise<void> | void = reloadPolledComponents,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Poll `target` every `interval` (`'10s'`). Returns a function that stops it. */
  subscribe(target: string, interval: string | number | null | undefined): () => void {
    const milliseconds = parseInterval(interval)

    if (!milliseconds || typeof window === 'undefined') {
      return () => {}
    }

    let group = this.groups.get(milliseconds)

    if (!group) {
      group = {
        interval: milliseconds,
        targets: new Map(),
        timer: null,
        lastRun: this.now(),
        inFlight: false,
      }
      this.groups.set(milliseconds, group)
    }

    const id = Symbol(target)
    group.targets.set(id, target)
    this.listen()

    if (this.visible()) this.start(group)

    return () => {
      const current = this.groups.get(milliseconds)

      if (!current) return

      current.targets.delete(id)

      if (current.targets.size === 0) {
        this.stop(current)
        this.groups.delete(milliseconds)
      }

      if (this.groups.size === 0) this.unlisten()
    }
  }

  /** Poll every group now (used in tests and when the tab becomes visible). */
  async tick(interval: number): Promise<void> {
    const group = this.groups.get(interval)

    if (!group || group.inFlight || !this.visible()) return

    group.lastRun = this.now()
    group.inFlight = true

    try {
      await this.request([...new Set(group.targets.values())])
    } finally {
      group.inFlight = false
    }
  }

  private visible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden'
  }

  private start(group: PollGroup): void {
    if (group.timer !== null) return

    group.timer = setInterval(() => void this.tick(group.interval), group.interval)
  }

  private stop(group: PollGroup): void {
    if (group.timer !== null) clearInterval(group.timer)
    group.timer = null
  }

  private readonly onVisibility = (): void => {
    if (!this.visible()) {
      for (const group of this.groups.values()) this.stop(group)

      return
    }

    for (const group of this.groups.values()) {
      if (group.timer !== null) continue

      if (this.now() - group.lastRun >= group.interval) void this.tick(group.interval)

      this.start(group)
    }
  }

  private listen(): void {
    if (this.listening || typeof document === 'undefined') return

    this.listening = true
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('focus', this.onVisibility)
  }

  private unlisten(): void {
    if (!this.listening) return

    this.listening = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('focus', this.onVisibility)
  }
}

/** The scheduler the renderers share, so polls across components coalesce. */
export const pollScheduler = new PollScheduler()

/** Poll a component (`table`, `relationManager:…`, `widget:…`). Returns an unsubscribe. */
export function pollComponent(
  target: string,
  interval: string | number | null | undefined,
): () => void {
  return pollScheduler.subscribe(target, interval)
}
