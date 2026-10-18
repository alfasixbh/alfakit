<script lang="ts">
  import type { FieldActions } from '@alfakit/core'
  import { fieldActionContext } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import ActionList from '../actions/ActionList.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'

  let { component, children }: { component: FieldActions & { key: string }; children?: Snippet } =
    $props()

  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const prefix = $derived(component.prefixActions ?? [])
  const suffix = $derived(component.suffixActions ?? [])
</script>

<!-- Prefix and suffix actions of a field or entry, on either side of the control. -->
{#if prefix.length > 0 || suffix.length > 0}
  <div data-slot="field-affix-actions" class="flex items-start gap-2">
    {#if prefix.length > 0}
      <ActionList actions={prefix} {context} class="shrink-0 flex-nowrap gap-1" />
    {/if}
    <div class="min-w-0 flex-1">{@render children?.()}</div>
    {#if suffix.length > 0}
      <ActionList actions={suffix} {context} class="shrink-0 flex-nowrap gap-1" />
    {/if}
  </div>
{:else}
  {@render children?.()}
{/if}
