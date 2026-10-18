<script lang="ts">
  import type { ToggleSchema } from '@alfakit/core'
  import {
    colorClass,
    switchOffColorClasses,
    switchOnColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Switch } from '../ui/switch'

  let { component }: { component: ToggleSchema } = $props()

  const field = useField<boolean | null>(() => component)
  const on = $derived(Boolean(field.value))
  const icon = $derived(on ? component.onIcon : component.offIcon)
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error} inline={component.inline}>
  <div class="flex items-center gap-2">
    <Switch
      id={field.id}
      name={component.name}
      checked={on}
      onCheckedChange={(checked) => field.setValue(checked)}
      disabled={field.disabled || field.readOnly}
      aria-readonly={field.readOnly || undefined}
      {...field.aria}
      class={cn(
        component.onColor && colorClass(switchOnColorClasses, component.onColor),
        component.offColor && colorClass(switchOffColorClasses, component.offColor),
      )}
    />
    {#if icon}<Icon
        name={icon}
        class={colorClass(textColorClasses, on ? component.onColor : component.offColor, 'gray')}
      />{/if}
  </div>
</FieldWrapper>
