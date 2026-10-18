<script lang="ts">
  import { useShortcut, usePageMethod } from '../src/app/hooks.svelte'

  let { onShortcut }: { onShortcut?: () => void } = $props()

  let status = $state('pending')
  const move = usePageMethod('moveOrder', {
    optimistic: () => {
      const before = status
      status = 'shipped'

      return () => {
        status = before
      }
    },
  })

  useShortcut('f2', () => onShortcut?.())
</script>

<button data-testid="card" onclick={() => void move.call({ status: 'shipped' })}>{status}</button>
