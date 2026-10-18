<script lang="ts">
  import type { TextSchema } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import { useT } from '../../context.svelte'
  import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
  import { extraProps } from '../../lib/attributes'

  const SIZES: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }
  const WEIGHTS: Record<string, string> = {
    thin: 'font-thin',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-black',
  }
  const FONT_FAMILIES: Record<string, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }

  let { component }: { component: TextSchema } = $props()
  const t = useT()
  let copied = $state(false)

  // `color('neutral')` is the regular text colour (and a gray badge).
  const textColor = $derived(
    !component.color
      ? undefined
      : component.color === 'neutral'
        ? 'text-foreground'
        : textColorClasses[component.color],
  )
  const fontFamily = $derived(
    component.fontFamily ? FONT_FAMILIES[component.fontFamily] : undefined,
  )

  function copy(event: MouseEvent) {
    // The text may sit inside a link.
    event.preventDefault()
    event.stopPropagation()
    void navigator.clipboard?.writeText(component.content).then(() => {
      copied = true
      setTimeout(() => (copied = false), component.copyMessageDuration ?? 1500)
    })
  }
</script>

{#snippet copyButton()}
  {#if component.copyable}
    <button
      type="button"
      data-slot="text-copy"
      class="text-muted-foreground hover:text-foreground"
      aria-label={t('copy', {}, 'Copy')}
      onclick={copy}
    >
      {#if copied}<CheckIcon class="size-3.5" />{:else}<CopyIcon class="size-3.5" />{/if}
    </button>
    {#if copied}
      <span role="status" class={cn('text-xs', !component.copyMessage && 'sr-only')}
        >{component.copyMessage ?? t('copied', {}, 'Copied')}</span
      >
    {/if}
  {/if}
{/snippet}

{#snippet body(props: Record<string, unknown>)}
  {#if component.badge}
    <Badge
      variant="outline"
      {...extraProps(
        component.extraAttributes,
        cn(
          colorClass(
            badgeColorClasses,
            component.color === 'neutral' ? 'gray' : component.color,
            'gray',
          ),
          fontFamily,
        ),
      )}
      {...props}
    >
      {#if component.icon}<Icon name={component.icon} />{/if}
      {component.content}
      {@render copyButton()}
    </Badge>
  {:else}
    <p
      {...extraProps(
        component.extraAttributes,
        cn(
          'flex items-center gap-1.5 text-sm',
          component.size && SIZES[component.size],
          component.weight && WEIGHTS[component.weight],
          fontFamily,
          textColor,
        ),
      )}
      {...props}
    >
      {#if component.icon}<Icon name={component.icon} />{/if}
      {component.content}
      {@render copyButton()}
    </p>
  {/if}
{/snippet}

{#if component.tooltip}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        {@render body(props)}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>{component.tooltip}</TooltipContent>
  </Tooltip>
{:else}
  {@render body({})}
{/if}
