import {
  standaloneWidgetCount,
  starterKitDashboardWidgets,
  type StandaloneComponentSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import type { AnyComponent } from '../context'
import { lazyComponent } from '../lib/lazy'
import { cn } from '../lib/utils'

/** Props of `<AlfakitWidgets>`. */
export interface AlfakitWidgetsProps {
  /** The `starterKit()` panel whose widgets to show (the first one by default). */
  panel?: string
  /** Frontend components of custom widgets (`{ RevenueWidget }`), as for `<AlfakitComponent>`. */
  components?: Record<string, AnyComponent>
  className?: string
  /** Rendered instead when there are no widgets to show. */
  children?: ReactNode
}

interface LoadedProps {
  component: StandaloneComponentSchema
  components?: Record<string, AnyComponent>
  className?: string
}

const LoadedWidgets = lazyComponent<LoadedProps>(
  () => import('../standalone/alfakit-component').then((module) => module.AlfakitComponent),
  (props) => <WidgetsPlaceholder {...props} />,
)

/** Widget-sized boxes until the widgets' code has loaded (also during SSR). */
function WidgetsPlaceholder({ component, className }: LoadedProps) {
  const count = standaloneWidgetCount(component)

  return (
    <div
      data-slot="starter-kit-widgets-placeholder"
      aria-busy="true"
      className={cn('grid auto-rows-min gap-4 md:grid-cols-2', className)}
    >
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        <div key={index} aria-hidden="true" className="bg-muted h-28 animate-pulse rounded-xl" />
      ))}
    </div>
  )
}

/**
 * The dashboard widgets of a `starterKit()` panel on the host's own dashboard. Reads the
 * `alfakitWidgets` prop (shared on the panel's `starterKitDashboard()` pages only, the
 * starter kit's `/dashboard` by default) and renders the widgets with the host's theme, as
 * `<AlfakitComponent>` renders standalone widgets: lazy widgets, polling and table widget
 * actions go through the panel's endpoints. Its code loads in the browser; the server
 * render and hydration show placeholders. Renders `children` (the kit's placeholder boxes)
 * when there are no widgets to show: other pages, guests, users who may not open the panel.
 *
 * ```tsx
 * import { AlfakitWidgets } from '@alfakit/react'
 *
 * <AlfakitWidgets>
 *   <MyEmptyState />
 * </AlfakitWidgets>
 * ```
 */
export function AlfakitWidgets({ panel, components, className, children }: AlfakitWidgetsProps) {
  const component = starterKitDashboardWidgets(usePage().props, panel)

  if (!component) return <>{children}</>

  return (
    <div data-slot="starter-kit-widgets">
      <LoadedWidgets component={component} components={components} className={className} />
    </div>
  )
}
