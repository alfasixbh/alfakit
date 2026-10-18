<script lang="ts">
  import type { FormStore } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { Badge } from '../ui/badge'

  /** The live state of one form store, for the debug panel's Form tab. */
  let { form }: { form: FormStore } = $props()

  const t = useT()
  // svelte-ignore state_referenced_locally
  const state = useStore(form.store)
  const dirty = $derived([...state.current.dirty])
  const errors = $derived(Object.keys(state.current.errors))

  function json(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
</script>

<section class="space-y-2 rounded-md border p-3">
  <header class="flex flex-wrap items-center gap-2 font-mono text-xs">
    <span class="font-semibold">{form.component}</span>
    {#if form.record !== null}<span class="text-muted-foreground">#{form.record}</span>{/if}
    {#if state.current.processing}<Badge variant="secondary">processing</Badge>{/if}
    {#if state.current.refreshing}<Badge variant="secondary">refreshing</Badge>{/if}
  </header>
  <h4 class="text-muted-foreground text-xs font-medium">{t('debug.values', {}, 'Values')}</h4>
  <pre
    dir="ltr"
    class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed">{json(
      state.current.values,
    )}</pre>
  {#if dirty.length > 0}
    <h4 class="text-muted-foreground text-xs font-medium">
      {t('debug.dirty', {}, 'Dirty fields')}
    </h4>
    <div class="flex flex-wrap gap-1">
      {#each dirty as path (path)}
        <Badge variant="outline" class="font-mono">{path}</Badge>
      {/each}
    </div>
  {/if}
  {#if errors.length > 0}
    <h4 class="text-destructive text-xs font-medium">{t('debug.errors', {}, 'Errors')}</h4>
    <pre
      dir="ltr"
      class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed">{json(
        state.current.errors,
      )}</pre>
  {/if}
</section>
