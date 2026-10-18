<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import ActionList from '../components/actions/ActionList.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import RecordPresence from '../components/realtime/RecordPresence.svelte'
  import { useRegistry, type AnyComponent } from '../context.svelte'
  import { cn } from '../lib/utils'

  let { page }: { page: PageSchema } = $props()

  // Record pages with `Panel::realtime()`: who else is on the record.
  const registry = useRegistry()
  const Presence: AnyComponent = $derived(registry.resolve('page:presence') ?? RecordPresence)

  const actions = $derived(page.headerActions ?? [])
  // `$headerActionsAlignment`: the default (end) sits beside the heading; the others stack
  // the actions under it.
  const alignment = $derived(page.headerActionsAlignment)
  const alignmentClass = $derived(
    alignment === 'start'
      ? 'justify-start'
      : alignment === 'center'
        ? 'justify-center'
        : alignment === 'between' || alignment === 'justify'
          ? 'justify-between'
          : 'justify-end',
  )
</script>

<Slot name="page.header.before" />
<header
  data-slot="page-header"
  data-actions-alignment={alignment}
  class={cn('flex flex-col gap-4', !alignment && 'sm:flex-row sm:items-start sm:justify-between')}
>
  <div class="min-w-0">
    <Slot name="page.heading.before" />
    <h1 class="text-2xl font-semibold tracking-tight">{page.heading ?? page.title}</h1>
    {#if page.subheading}<p class="text-muted-foreground mt-1 text-sm">{page.subheading}</p>{/if}
    <Slot name="page.heading.after" />
  </div>
  <div class={cn('flex shrink-0 flex-wrap items-center gap-2', alignmentClass)}>
    {#if page.presence}<Presence presence={page.presence} />{/if}
    <Slot name="page.actions.before" />
    {#if actions.length > 0}
      <ActionList
        {actions}
        context={{ token: page.token, component: 'page' }}
        align="end"
        class="max-w-full shrink-0"
      />
    {/if}
    <Slot name="page.actions.after" />
  </div>
</header>
<Slot name="page.header.after" />
