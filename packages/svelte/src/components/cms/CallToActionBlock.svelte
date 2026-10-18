<script lang="ts">
  import type { CmsBlockSchema, CmsCallToActionBlockData } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import CmsLinkButton from './CmsLinkButton.svelte'
  import { useSectionClass } from './context'

  let {
    data,
  }: { block: CmsBlockSchema<CmsCallToActionBlockData>; data: CmsCallToActionBlockData } = $props()

  const sectionClass = useSectionClass()
  const primary = $derived(data.tone === 'primary')
</script>

<section data-slot="cms-call-to-action" class={sectionClass}>
  <div
    class={cn(
      'mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center sm:px-12',
      primary && 'bg-primary text-primary-foreground',
      data.tone === 'muted' && 'bg-muted',
      data.tone === 'default' && 'border',
    )}
  >
    <h2 class="text-3xl font-semibold tracking-tight text-balance">{data.heading}</h2>
    {#if data.body}
      <p
        class={cn(
          'max-w-2xl text-lg text-pretty',
          primary ? 'text-primary-foreground/85' : 'text-muted-foreground',
        )}
      >
        {data.body}
      </p>
    {/if}
    {#if data.primaryAction || data.secondaryAction}
      <div class="flex flex-wrap justify-center gap-3 pt-2">
        <CmsLinkButton link={data.primaryAction} variant={primary ? 'secondary' : 'default'} />
        <CmsLinkButton
          link={data.secondaryAction}
          variant="outline"
          class={primary
            ? 'text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 bg-transparent'
            : undefined}
        />
      </div>
    {/if}
  </div>
</section>
