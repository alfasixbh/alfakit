import type { SectionSchema } from '@alfakit/core'
import {
  actionsAlignmentClass,
  headingTag,
  readPersisted,
  schemaGapClass,
  writePersisted,
} from '@alfakit/core'
import { ChevronDownIcon } from 'lucide-react'
import { createElement, useState } from 'react'
import { useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { useOptionalFormStore } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { DeferredSchema } from './deferred'
import { MixedContent } from './mixed-content'

export function SectionComponent({ component }: { component: SectionSchema }) {
  const t = useT()
  const [choice, setChoice] = useState<boolean | null>(null)
  // Inside a form the section's actions run as field actions, so `$get` / `$set` work.
  const form = useOptionalFormStore()
  const pageContext = usePageActionContext()
  const fieldContext = useFieldActionContext(component)
  const context = form ? fieldContext : pageContext
  const persistKey = component.persistCollapsed
  const hydrated = useHydrated()
  // Read only after hydration, so the server render and hydration use the schema's default.
  const stored = hydrated && persistKey ? readPersisted(persistKey) : null
  const open = choice ?? (stored !== null ? stored !== 'collapsed' : !component.collapsed)
  const hasHeader =
    component.heading ||
    component.description ||
    component.icon ||
    component.headerActions?.length ||
    component.afterHeader?.length

  const setOpen = (next: boolean) => {
    setChoice(next)

    if (persistKey) writePersisted(persistKey, next ? 'expanded' : 'collapsed')
  }

  const content = (
    <DeferredSchema component={component}>
      {(loaded) => (
        <SchemaRenderer
          components={loaded.schema ?? []}
          columns={loaded.columns}
          className={schemaGapClass(loaded)}
        />
      )}
    </DeferredSchema>
  )

  const header = hasHeader ? (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3',
        component.aside ? 'lg:col-span-1' : 'border-b px-6 py-4',
        component.compact && !component.aside && 'px-4 py-3',
      )}
    >
      {component.icon && (
        <Icon name={component.icon} className="text-muted-foreground mt-0.5 size-5" />
      )}
      <div className="min-w-0 flex-1 basis-48">
        {component.heading &&
          createElement(
            headingTag(component.headingLevel),
            { className: 'text-base leading-6 font-semibold break-words' },
            component.heading,
          )}
        {component.description && (
          <p className="text-muted-foreground mt-1 text-sm break-words">{component.description}</p>
        )}
      </div>
      {component.headerActions && component.headerActions.length > 0 && (
        <ActionList actions={component.headerActions} context={context} size="sm" />
      )}
      <MixedContent items={component.afterHeader} name="section-after-header" context={context} />
      {component.collapsible && (
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('toggle_section', {}, 'Toggle section')}
          >
            <Icon
              name="alfakit::schemas.section.collapse-button"
              fallback={ChevronDownIcon}
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>
      )}
    </div>
  ) : null

  const hasFooterActions = Boolean(component.footerActions?.length)
  const footer =
    hasFooterActions || component.footer?.length ? (
      <div
        data-slot="section-footer"
        className={cn(
          'flex flex-wrap items-center gap-3 border-t px-6 py-4',
          component.compact && 'px-4 py-3',
        )}
      >
        {hasFooterActions && (
          <ActionList
            actions={component.footerActions ?? []}
            context={context}
            className={actionsAlignmentClass(component.footerActionsAlignment) || undefined}
          />
        )}
        <MixedContent items={component.footer} name="section-footer-content" context={context} />
      </div>
    ) : null

  if (component.aside) {
    return (
      <Collapsible open={!component.collapsible || open} onOpenChange={setOpen} asChild>
        <section
          data-slot="section"
          {...extraProps(component.extraAttributes, 'grid gap-6 lg:grid-cols-3')}
        >
          {header}
          <CollapsibleContent asChild>
            <div
              data-surface="section"
              className={cn(
                'bg-card rounded-xl border shadow-xs lg:col-span-2',
                component.secondary && 'bg-muted/40',
              )}
            >
              <div className={cn('p-6', component.compact && 'p-4')}>{content}</div>
              {footer}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    )
  }

  return (
    <Collapsible open={!component.collapsible || open} onOpenChange={setOpen} asChild>
      <section
        data-slot="section"
        data-surface="section"
        {...extraProps(
          component.extraAttributes,
          cn('bg-card rounded-xl border shadow-xs', component.secondary && 'bg-muted/40'),
        )}
      >
        {header}
        <CollapsibleContent>
          <div className={cn('p-6', component.compact && 'p-4')}>{content}</div>
          {footer}
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
