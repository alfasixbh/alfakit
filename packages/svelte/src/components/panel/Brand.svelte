<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { usePanel } from '../../context.svelte'
  import { cn } from '../../lib/utils'

  let { class: className }: { class?: string } = $props()

  const panel = $derived(usePanel())
</script>

<Link href={panel.url ?? '/'} class={cn('flex items-center gap-2 overflow-hidden', className)}>
  {#if panel.brandLogo}
    <img
      src={panel.brandLogo}
      alt={panel.brandName}
      style:height={panel.brandLogoHeight ?? '1.75rem'}
      class={cn('max-w-full object-contain', panel.darkModeBrandLogo && 'dark:hidden')}
    />
    {#if panel.darkModeBrandLogo}
      <img
        src={panel.darkModeBrandLogo}
        alt={panel.brandName}
        style:height={panel.brandLogoHeight ?? '1.75rem'}
        class="hidden max-w-full object-contain dark:block"
      />
    {/if}
  {:else}
    <span
      class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
      >{panel.brandName.charAt(0)}</span
    >
    <span class="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden"
      >{panel.brandName}</span
    >
  {/if}
</Link>
