<script lang="ts">
  import type { EmptyStateComponentSchema } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { colorClass, iconBackgroundColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'
  import MixedContent from './MixedContent.svelte'

  let { component }: { component: EmptyStateComponentSchema } = $props()
  const context = usePageActionContext()
</script>

<div
  data-slot="empty-state"
  {...extraProps(
    component.extraAttributes,
    cn(
      'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
      component.contained && 'rounded-xl border border-dashed',
    ),
  )}
>
  {#if component.icon}
    <div
      class={cn(
        'flex size-12 items-center justify-center rounded-full',
        colorClass(iconBackgroundColorClasses, component.color),
      )}
    >
      <Icon name={component.icon} class="size-6" />
    </div>
  {/if}
  {#if component.heading}<h3 class="text-base font-semibold">{component.heading}</h3>{/if}
  {#if component.description}
    <!-- Escaped by the server (`Html::from`). -->
    <div class="text-muted-foreground max-w-md text-sm">{@html component.description}</div>
  {/if}
  {#if component.actions && component.actions.length > 0}
    <ActionList actions={component.actions} {context} class="mt-2 justify-center" />
  {/if}
  <MixedContent items={component.footer} name="empty-state-footer" class="justify-center" />
</div>
