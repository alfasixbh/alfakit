<script lang="ts">
  import type { Option } from '@alfakit/core'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'

  /**
   * An option's icon, label and description. `allowHtml` labels were sanitised by the
   * server; `wrap: false` truncates long labels.
   */
  let {
    option,
    allowHtml = false,
    wrap = true,
  }: { option: Option; allowHtml?: boolean; wrap?: boolean } = $props()
</script>

<span class="flex min-w-0 items-center gap-2">
  {#if option.icon}<Icon name={option.icon} />{/if}
  <span data-slot="option-label" class={cn(wrap ? 'break-words' : 'truncate')}
    >{#if allowHtml}{@html option.label}{:else}{option.label}{/if}</span
  >
  {#if option.description}<span class="text-muted-foreground text-xs">{option.description}</span
    >{/if}
</span>
