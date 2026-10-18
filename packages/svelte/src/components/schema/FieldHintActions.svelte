<script lang="ts">
  import type { FieldActions } from '@alfakit/core'
  import { fieldActionContext } from '@alfakit/core'
  import ActionList from '../actions/ActionList.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'

  let { component }: { component: FieldActions & { key: string } } = $props()

  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
</script>

<!-- Hint actions of a field or entry, next to its label. -->
{#if component.hintActions?.length}
  <ActionList actions={component.hintActions} {context} size="xs" class="gap-1" />
{/if}
