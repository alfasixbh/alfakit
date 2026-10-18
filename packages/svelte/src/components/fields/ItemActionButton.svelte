<script lang="ts">
  import type { ActionContext, ActionSchema, ItemActionSchema } from '@alfakit/core'
  import { itemActionContext, withItemActionState } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import { useActionRunner } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'
  import { colorClass, ghostButtonColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import ActionButton from '../actions/ActionButton.svelte'
  import { Button } from '../ui/button'

  /**
   * A built-in item action (Repeater, Builder, KeyValue). Uncustomised actions call
   * `onClient` and change the state in the browser; customised ones (`server`) run
   * through the field action endpoint with `args` (`item`, `items`, `block`).
   */
  interface Props {
    action: ItemActionSchema | null
    context: ActionContext
    args?: Record<string, unknown>
    onClient?: () => void
    disabled?: boolean
    attributes?: Record<string, string>
    size?: 'xs' | 'sm' | 'default'
    class?: string
  }

  let {
    action,
    context,
    args,
    onClient,
    disabled,
    attributes,
    size = 'xs',
    class: className,
  }: Props = $props()

  const runner = useActionRunner()
  const schema = $derived(action ? withItemActionState(action, { disabled, attributes }) : null)
  const scoped = $derived(itemActionContext(context, args ?? {}))
  /** The common item action icons, bundled so headers don't wait for dynamic icons. */
  const STATIC_ICONS: Record<string, typeof ChevronUpIcon> = {
    'chevron-up': ChevronUpIcon,
    'chevron-down': ChevronDownIcon,
    copy: CopyIcon,
    'trash-2': Trash2Icon,
    'grip-vertical': GripVerticalIcon,
    plus: PlusIcon,
  }
  // Plain icon buttons that change the state in the browser repeat on every item: render
  // them light (no runner subscription, no tooltip, static icons).
  const light = $derived(
    schema !== null && !schema.server && schema.variant === 'icon-button' && !schema.badge,
  )
  const label = $derived(schema?.label ?? schema?.tooltip ?? schema?.name)
  const StaticIcon = $derived(schema?.icon ? STATIC_ICONS[schema.icon] : undefined)
  const trigger = (schema: ActionSchema, ctx: ActionContext) =>
    action?.server ? runner.trigger(schema, ctx) : onClient?.()
</script>

{#if schema && light}
  <Button
    type="button"
    variant="plain"
    size={size === 'xs' ? 'icon-xs' : size === 'sm' ? 'icon-sm' : 'icon'}
    disabled={schema.disabled}
    aria-label={label}
    title={schema.tooltip ?? label}
    onclick={() => onClient?.()}
    {...extraProps(
      schema.extraAttributes,
      cn(colorClass(ghostButtonColorClasses, schema.color, 'gray'), className),
    )}
  >
    {#if StaticIcon}<StaticIcon />{:else}<Icon name={schema.icon} />{/if}
  </Button>
{:else if schema}
  <ActionButton
    action={schema}
    context={scoped}
    {size}
    class={className}
    withKeyBindings={false}
    onTrigger={trigger}
  />
{/if}
