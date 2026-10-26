<script lang="ts">
  import { widgetPollTarget, type LazyWidgetSchema } from '@alfakit/core'
  import { useRefreshComponents, useT } from '../../context.svelte'
  import { Button } from '../ui/button'
  import LazyPlaceholder from './LazyPlaceholder.svelte'

  /**
   * A lazy widget's cell: the skeleton while its schema loads, or, when the request failed
   * (outside panels: a refused or failed fetch), a message with a retry.
   */
  let { widget }: { widget: LazyWidgetSchema } = $props()

  const t = useT()
  const refresh = useRefreshComponents()
  let retrying = $state(false)
  const variant = $derived(widget.type === 'TableWidget' ? 'table' : 'widget')

  function retry() {
    if (!refresh) return

    retrying = true
    void Promise.resolve(refresh([widgetPollTarget(widget)])).finally(() => {
      retrying = false
    })
  }
</script>

{#if widget.failed}
  <div
    data-slot="lazy-placeholder"
    data-variant={variant}
    data-failed=""
    role="alert"
    class="bg-card text-muted-foreground flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center text-sm"
  >
    <p>{t('widget_failed', {}, 'This widget could not be loaded.')}</p>
    {#if refresh}
      <Button type="button" variant="outline" size="sm" disabled={retrying} onclick={retry}>
        {t('retry', {}, 'Retry')}
      </Button>
    {/if}
  </div>
{:else}
  <LazyPlaceholder {variant} />
{/if}
