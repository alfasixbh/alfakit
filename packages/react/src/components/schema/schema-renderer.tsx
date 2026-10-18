import type { Attributes, BaseField, Breakpoints, SchemaComponent } from '@alfakit/core'
import {
  columnOrderClasses,
  columnSpanClasses,
  columnStartClasses,
  containerColumnSpanClasses,
  containerGridColumnsClasses,
  gridColumnsClasses,
  hasContainerBreakpoints,
} from '@alfakit/core'
import { createElement, memo } from 'react'
import { useRegistry } from '../../context'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { TranslatableField } from './translatable-field'

export interface SchemaRendererProps {
  components: SchemaComponent[]
  columns?: Breakpoints
  className?: string
  /** `extraAttributes` of the layout component that owns this grid (Grid, Group, Tab, Step). */
  attributes?: Attributes
}

/**
 * Renders a list of schema components in a responsive grid, resolving each component's
 * `type` through the registry.
 */
export function SchemaRenderer({
  components,
  columns,
  className,
  attributes,
}: SchemaRendererProps) {
  const grid = (
    <div
      {...extraProps(
        attributes,
        cn(
          'grid gap-6',
          gridColumnsClasses(columns ?? { default: 1 }),
          containerGridColumnsClasses(columns),
          className,
        ),
      )}
      data-slot="schema"
    >
      {components.map((component) => (
        <RenderComponent key={component.key} component={component} />
      ))}
    </div>
  )

  // `@md`-style columns follow the width of this wrapper instead of the viewport.
  return hasContainerBreakpoints(columns) ? (
    <div data-slot="schema-container" className="@container">
      {grid}
    </div>
  ) : (
    grid
  )
}

/**
 * Memoised on the component object: a partial live refresh replaces only the components
 * that changed, so every other one keeps its identity and is not re-rendered.
 */
export const RenderComponent = memo(function RenderComponent({
  component,
}: {
  component: SchemaComponent
}) {
  const registry = useRegistry()
  const type =
    component.type === 'View'
      ? ((component as { component?: string }).component ?? 'View')
      : component.type
  const Component =
    registry.resolve(type) ?? (component.type === 'View' ? registry.resolve('View') : undefined)

  const span = cn(
    columnSpanClasses(component.columnSpan),
    containerColumnSpanClasses(component.columnSpan),
    columnStartClasses(component.columnStart),
    columnOrderClasses(component.columnOrder),
  )
  // Registered `View` components get the PHP `props` spread, as the docs describe.
  const viewProps =
    component.type === 'View'
      ? ((component as { props?: Record<string, unknown> }).props ?? {})
      : {}

  if (!Component) {
    return (
      <div
        className={cn(
          'border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs',
          span,
        )}
      >
        Unknown component type <code className="font-mono">{type}</code>. Register it with{' '}
        <code className="font-mono">
          createAlfakit({'{'} components {'}'})
        </code>
        .
      </div>
    )
  }

  return (
    <div
      data-slot="schema-item"
      data-type={component.type}
      className={cn('min-w-0', span || undefined)}
    >
      {isTranslatable(component) ? (
        <TranslatableField component={component} render={Component} />
      ) : (
        createElement(Component, { ...viewProps, component })
      )}
    </div>
  )
})

function isTranslatable(component: SchemaComponent): component is SchemaComponent & BaseField {
  return Boolean((component as Partial<BaseField>).translatable?.locales?.length)
}
