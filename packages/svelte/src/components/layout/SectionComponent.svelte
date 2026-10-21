<script lang="ts">
  import type { SectionSchema } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import {
    actionsAlignmentClass,
    headingTag,
    readPersisted,
    schemaGapClass,
    writePersisted,
  } from '@alfakit/core'
  import { onMount, untrack } from 'svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { fieldActionContext } from '@alfakit/core'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import ActionList from '../actions/ActionList.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Button } from '../ui/button'
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
  import { useT } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'
  import DeferredSchema from './DeferredSchema.svelte'
  import MixedContent from './MixedContent.svelte'

  let { component }: { component: SectionSchema } = $props()

  let open = $state(untrack(() => !component.collapsed))
  // Inside a form the section's actions run as field actions, so `$get` / `$set` work.
  const sectionForm = useOptionalFormStore()
  const pageContext = usePageActionContext()
  const context = $derived(
    sectionForm
      ? fieldActionContext({ token: pageContext.token, form: sectionForm, key: component.key })
      : pageContext,
  )
  const hasHeader = $derived(
    Boolean(
      component.heading ||
      component.description ||
      component.icon ||
      component.headerActions?.length ||
      component.afterHeader?.length,
    ),
  )
  const heading = $derived(headingTag(component.headingLevel))

  // Stored after mounting, so the server render and hydration use the schema's default.
  onMount(() => {
    if (!component.persistCollapsed) return

    const stored = readPersisted(component.persistCollapsed)

    if (stored !== null) open = stored !== 'collapsed'
  })

  function setOpen(next: boolean) {
    open = next

    if (component.persistCollapsed) {
      writePersisted(component.persistCollapsed, next ? 'expanded' : 'collapsed')
    }
  }
  const hasFooter = $derived(
    Boolean(component.footerActions?.length) || Boolean(component.footer?.length),
  )

  const t = useT()
</script>

{#snippet header()}
  {#if hasHeader}
    <div
      class={cn(
        'flex flex-wrap items-start gap-3',
        component.aside ? 'lg:col-span-1' : 'border-b px-6 py-4',
        component.compact && !component.aside && 'px-4 py-3',
      )}
    >
      {#if component.icon}<Icon
          name={component.icon}
          class="text-muted-foreground mt-0.5 size-5"
        />{/if}
      <div class="min-w-0 flex-1 basis-48">
        {#if component.heading}<svelte:element
            this={heading}
            class="text-base leading-6 font-semibold break-words"
          >
            {component.heading}
          </svelte:element>{/if}
        {#if component.description}<p class="text-muted-foreground mt-1 text-sm break-words">
            {component.description}
          </p>{/if}
      </div>
      {#if component.headerActions && component.headerActions.length > 0}
        <ActionList actions={component.headerActions} {context} size="sm" />
      {/if}
      <MixedContent items={component.afterHeader} name="section-after-header" />
      {#if component.collapsible}
        <CollapsibleTrigger>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('toggle_section', {}, 'Toggle section')}
              {...props}
            >
              <Icon
                name="alfakit::schemas.section.collapse-button"
                fallback={ChevronDownIcon}
                class={cn('transition-transform', open && 'rotate-180')}
              />
            </Button>
          {/snippet}
        </CollapsibleTrigger>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet content()}
  <DeferredSchema {component}>
    {#snippet children(loaded)}
      <SchemaRenderer
        components={loaded.schema ?? []}
        columns={loaded.columns}
        class={schemaGapClass(loaded) || undefined}
      />
    {/snippet}
  </DeferredSchema>
{/snippet}

{#snippet footer()}
  {#if hasFooter}
    <div
      data-slot="section-footer"
      class={cn(
        'flex flex-wrap items-center gap-3 border-t px-6 py-4',
        component.compact && 'px-4 py-3',
      )}
    >
      {#if component.footerActions?.length}
        <ActionList
          actions={component.footerActions}
          {context}
          class={actionsAlignmentClass(component.footerActionsAlignment) || undefined}
        />
      {/if}
      <MixedContent items={component.footer} name="section-footer-content" />
    </div>
  {/if}
{/snippet}

{#if component.aside}
  <Collapsible open={!component.collapsible || open} onOpenChange={setOpen}>
    {#snippet child({ props })}
      <section
        {...extraProps(component.extraAttributes, 'grid gap-6 lg:grid-cols-3')}
        {...props}
        data-slot="section"
      >
        {@render header()}
        <CollapsibleContent>
          {#snippet child({ props: contentProps })}
            <div
              data-surface="section"
              {...contentProps}
              class={cn(
                'bg-card rounded-xl border shadow-xs lg:col-span-2',
                component.secondary && 'bg-muted/40',
              )}
            >
              <div class={cn('p-6', component.compact && 'p-4')}>{@render content()}</div>
              {@render footer()}
            </div>
          {/snippet}
        </CollapsibleContent>
      </section>
    {/snippet}
  </Collapsible>
{:else}
  <Collapsible open={!component.collapsible || open} onOpenChange={setOpen}>
    {#snippet child({ props })}
      <section
        {...extraProps(
          component.extraAttributes,
          cn('bg-card rounded-xl border shadow-xs', component.secondary && 'bg-muted/40'),
        )}
        {...props}
        data-slot="section"
        data-surface="section"
      >
        {@render header()}
        <CollapsibleContent>
          <div class={cn('p-6', component.compact && 'p-4')}>{@render content()}</div>
          {@render footer()}
        </CollapsibleContent>
      </section>
    {/snippet}
  </Collapsible>
{/if}
