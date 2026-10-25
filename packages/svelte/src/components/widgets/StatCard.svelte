<script lang="ts">
  import type { StatSchema } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import {
    colorClass,
    cssColor,
    iconBackgroundColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Card } from '../ui/card'
  import Sparkline from './Sparkline.svelte'
  import { extraProps } from '../../lib/attributes'
  import NewTabHint from '../../lib/NewTabHint.svelte'

  let { stat }: { stat: StatSchema } = $props()
</script>

{#snippet content()}
  <Card
    {...extraProps(
      stat.extraAttributes,
      cn(
        'relative gap-2 overflow-hidden px-5 py-4',
        stat.url && 'hover:bg-accent/40 transition-colors',
      ),
    )}
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-sm font-medium"><bdi>{stat.label}</bdi></span>
        {#if (stat.value === null || stat.value === '') && stat.placeholder}
          <span
            class="text-muted-foreground text-2xl font-semibold tracking-tight"
            data-slot="stat-placeholder">{stat.placeholder}</span
          >
        {:else}
          <span
            class={cn(
              'text-2xl font-semibold tracking-tight',
              stat.color && textColorClasses[stat.color],
            )}><bdi>{stat.value}</bdi></span
          >
        {/if}
        {#if stat.description}
          <span
            class={cn(
              'inline-flex items-center gap-1 text-xs',
              stat.descriptionColor
                ? textColorClasses[stat.descriptionColor]
                : 'text-muted-foreground',
            )}
          >
            {#if stat.descriptionIcon && stat.descriptionIconPosition !== 'after'}<Icon
                name={stat.descriptionIcon}
                class="size-3.5"
              />{/if}
            <!-- Mixed-direction text (a Latin "-3% this month" in Arabic) keeps its order. -->
            <bdi>{stat.description}</bdi>
            {#if stat.descriptionIcon && stat.descriptionIconPosition === 'after'}<Icon
                name={stat.descriptionIcon}
                class="size-3.5"
              />{/if}
          </span>
        {/if}
      </div>
      {#if stat.icon}
        <span
          class={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            colorClass(iconBackgroundColorClasses, stat.color, 'gray'),
          )}
        >
          <Icon name={stat.icon} class="size-5" />
        </span>
      {/if}
    </div>
    {#if stat.chart && stat.chart.length > 1}<Sparkline
        data={stat.chart}
        color={cssColor(stat.chartColor ?? stat.color)}
      />{/if}
  </Card>
{/snippet}

{#if stat.url && stat.openUrlInNewTab}
  <a href={stat.url} target="_blank" rel="noopener noreferrer">{@render content()}<NewTabHint /></a>
{:else if stat.url}
  <Link href={stat.url}>{@render content()}</Link>
{:else}
  {@render content()}
{/if}
