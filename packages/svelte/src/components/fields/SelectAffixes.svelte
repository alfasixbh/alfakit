<script lang="ts">
  import type { Affixes } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'

  let { component, error, children }: { component: Affixes; error?: string; children: Snippet } =
    $props()

  const hasPrefix = $derived(Boolean(component.prefix || component.prefixIcon))
  const hasSuffix = $derived(Boolean(component.suffix || component.suffixIcon))
</script>

<!-- Prefix/suffix text and icons (with their colours) around a select or date picker. -->
{#if hasPrefix || hasSuffix}
  <div
    data-slot="input-group"
    class={cn(
      'border-input dark:bg-input/30 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 flex min-h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[:focus-visible]:ring-[3px]',
      error && 'border-destructive',
    )}
  >
    {#if hasPrefix}
      <span
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm whitespace-nowrap"
      >
        <Icon
          name={component.prefixIcon}
          class={component.prefixIconColor && textColorClasses[component.prefixIconColor]}
        />
        {component.prefix ?? ''}
      </span>
    {/if}
    <div
      class="min-w-0 flex-1 *:h-full *:w-full *:rounded-none *:border-0 *:bg-transparent *:shadow-none *:focus-visible:ring-0 dark:*:bg-transparent"
    >
      {@render children()}
    </div>
    {#if hasSuffix}
      <span
        class="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm whitespace-nowrap"
      >
        {component.suffix ?? ''}
        <Icon
          name={component.suffixIcon}
          class={component.suffixIconColor && textColorClasses[component.suffixIconColor]}
        />
      </span>
    {/if}
  </div>
{:else}
  {@render children()}
{/if}
