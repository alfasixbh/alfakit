<script lang="ts">
  import { initials } from '@alfakit/core'
  import { usePanel } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

  let { class: className }: { class?: string } = $props()

  const user = $derived(usePanel().user)
</script>

{#if user}
  <Avatar class={cn('size-8 rounded-lg', className)}>
    {#if user.avatar}<AvatarImage src={user.avatar} alt={user.name} />{/if}
    <AvatarFallback class="rounded-lg" aria-hidden="true">{initials(user.name)}</AvatarFallback>
  </Avatar>
{/if}
