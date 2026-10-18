<script lang="ts">
  import type { SchemaComponentContext } from '@alfakit/core'
  import { useSchemaComponentContext } from '../src/components/layout/component-context.svelte'

  let { context, statePath }: { context?: SchemaComponentContext; statePath?: string } = $props()

  const schema = useSchemaComponentContext(() => ({ context, statePath }))
</script>

<span data-testid="probe"
  >{schema.current.operation}|{schema.current.recordKey}|{String(
    schema.current.record?.name,
  )}|{String(schema.current.get('street'))}|{String(schema.current.get('title', true))}|{String(
    schema.current.state === null,
  )}</span
>
