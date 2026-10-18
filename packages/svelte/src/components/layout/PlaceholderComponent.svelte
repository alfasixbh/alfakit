<script lang="ts">
  import type { PlaceholderSchema } from '@alfakit/core'
  import { Label } from '../ui/label'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: PlaceholderSchema } = $props()
</script>

<div data-slot="field" {...extraProps(component.extraAttributes, 'flex flex-col gap-1.5')}>
  {#if component.label}<Label>{component.label}</Label>{/if}
  <div class="text-sm leading-6">{@html component.content ?? ''}</div>
  {#if component.helperText}<p class="text-muted-foreground text-xs">{component.helperText}</p>{/if}
</div>
