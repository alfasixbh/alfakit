<script lang="ts">
  import { Popover, PopoverContent, PopoverTrigger } from '../src/components/ui/popover'

  let { onOpenChange }: { onOpenChange?: (open: boolean) => void } = $props()
  let open = $state(true)
</script>

<Popover bind:open {onOpenChange}>
  <PopoverTrigger>Pick</PopoverTrigger>
  <PopoverContent><button type="button">Inside</button></PopoverContent>
</Popover>
<button type="button">Outside</button>
<span data-testid="state">{open ? 'open' : 'closed'}</span>
