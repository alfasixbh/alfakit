<script lang="ts">
  import type { BaseEntry, TextEntrySchema } from '@alfakit/core'
  import { isolationDirection, limitedListItems } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { useT } from '../../context.svelte'
  import EntryLink from './EntryLink.svelte'

  const SIZES: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }
  const WEIGHTS: Record<string, string> = {
    thin: 'font-thin',
    extralight: 'font-extralight',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  }
  const FAMILIES: Record<string, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }

  let {
    value,
    schema,
    class: className,
  }: { value: unknown; schema: Partial<TextEntrySchema>; class?: string } = $props()

  let copied = $state(false)
  // `expandableLimitedList()`: the items past `listLimit` show behind a toggle.
  let expanded = $state(false)

  const empty = $derived(
    value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0),
  )
  const items = $derived(Array.isArray(value) ? value : [value])
  const limited = $derived(limitedListItems(items, schema, expanded))
  const canCollapse = $derived(expanded && limitedListItems(items, schema, false).hidden > 0)
  const showToggle = $derived(limited.hidden > 0 || canCollapse)

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      copied = true
      setTimeout(() => (copied = false), schema.copyMessageDuration ?? 1500)
    })
  }

  const t = useT()

  // Relationship lists (`tags.name` with a `url()` closure) link each item on its own.
  const itemLink = (index: number) =>
    ({
      url: schema.itemUrls?.[index] ?? undefined,
      openUrlInNewTab: schema.openUrlInNewTab,
    }) as BaseEntry
</script>

{#snippet toggle()}
  <button
    type="button"
    data-slot="list-expand"
    aria-expanded={expanded}
    class="text-primary text-xs hover:underline"
    onclick={(event) => {
      event.preventDefault()
      event.stopPropagation()
      expanded = !expanded
    }}
  >
    {expanded
      ? t('list.show_less', {}, 'Show less')
      : t('list.show_more', { count: limited.hidden }, `+${limited.hidden} more`)}
  </button>
{/snippet}

{#snippet item(entry: unknown, index: number)}
  <EntryLink entry={itemLink(index)}>{@render itemContent(entry, index)}</EntryLink>
{/snippet}

{#snippet itemContent(entry: unknown, index: number)}
  {@const color = schema.itemColors?.[index] ?? schema.color}
  {@const icon = schema.itemIcons?.[index] ?? schema.icon}
  {@const text = String(entry)}
  {#snippet inner()}
    <!-- `min-w-0 break-words`: a long value (a URL, a token) breaks inside its column instead
         of pushing the copy button and the icons past it. -->
    {#if schema.html}
      <span class={cn('min-w-0 break-words', schema.prose && 'alfakit-prose')}>{@html text}</span>
    {:else}
      <!-- <bdi> isolates each value's direction (an English email inside an Arabic page). -->
      <bdi
        dir={isolationDirection(text)}
        class={cn(
          'min-w-0 break-words',
          schema.lineClamp && `line-clamp-${schema.lineClamp}`,
          !schema.wrap && !schema.lineClamp && 'whitespace-pre-line',
        )}>{text}</bdi
      >
    {/if}
  {/snippet}
  {#if schema.badge}
    <Badge variant="outline" class={colorClass(badgeColorClasses, color, 'gray')}>
      {#if icon && schema.iconPosition !== 'after'}<Icon
          name={icon}
          class={cn(schema.iconColor && textColorClasses[schema.iconColor])}
        />{/if}
      {@render inner()}
      {#if icon && schema.iconPosition === 'after'}<Icon name={icon} />{/if}
    </Badge>
  {:else}
    <span
      class={cn(
        'inline-flex max-w-full items-center gap-1.5',
        color && textColorClasses[color],
        schema.size && SIZES[schema.size],
        schema.weight && WEIGHTS[schema.weight],
        schema.fontFamily && FAMILIES[schema.fontFamily],
      )}
    >
      {#if icon && schema.iconPosition !== 'after'}<Icon
          name={icon}
          class={cn(schema.iconColor && textColorClasses[schema.iconColor])}
        />{/if}
      {@render inner()}
      {#if icon && schema.iconPosition === 'after'}<Icon
          name={icon}
          class={cn(schema.iconColor && textColorClasses[schema.iconColor])}
        />{/if}
      {#if schema.copyable}
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground shrink-0"
          onclick={(event) => {
            // The entry may sit inside a link or a clickable table row.
            event.preventDefault()
            event.stopPropagation()
            copy(text)
          }}
          aria-label={t('copy', {}, 'Copy')}
        >
          {#if copied}<CheckIcon class="size-3.5" />{:else}<CopyIcon class="size-3.5" />{/if}
        </button>
        {#if copied}
          <span role="status" class={cn('text-xs', !schema.copyMessage && 'sr-only')}
            >{schema.copyMessage ?? t('copied', {}, 'Copied')}</span
          >
        {/if}
      {/if}
    </span>
  {/if}
{/snippet}

{#if empty}
  <span class="text-muted-foreground">{schema.placeholder ?? '—'}</span>
{:else if schema.boolean}
  <Icon
    name={value ? 'circle-check' : 'circle-x'}
    class={cn('size-5', value ? 'text-success' : 'text-danger')}
  />
{:else if items.length > 1 || Array.isArray(value)}
  {#if schema.listWithLineBreaks}
    <ul class={cn('flex flex-col gap-0.5', schema.bulleted && 'list-disc ps-4', className)}>
      {#each limited.items as entry, index (index)}
        <li>{@render item(entry, index)}</li>
      {/each}
      {#if showToggle}<li class="list-none">{@render toggle()}</li>{/if}
    </ul>
  {:else}
    <span class={cn('flex flex-wrap items-center gap-1', className)}>
      {#each limited.items as entry, index (index)}
        {@render item(entry, index)}
      {/each}
      {#if showToggle}{@render toggle()}{/if}
    </span>
  {/if}
{:else}
  <span class={className}>{@render item(items[0], 0)}</span>
{/if}
