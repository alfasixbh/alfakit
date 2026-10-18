<script lang="ts">
  import type { HiddenSchema } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'

  let { component }: { component: HiddenSchema } = $props()

  const field = useField<string | number | null>(() => component)
</script>

<input type="hidden" id={field.id} name={component.name} value={field.value ?? ''} readonly />
