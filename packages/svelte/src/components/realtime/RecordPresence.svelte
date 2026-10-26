<script lang="ts">
  import {
    PresenceRoom,
    presenceInitials,
    visiblePresenceMembers,
    type PresenceMember,
    type PresenceSchema,
  } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { useChoice, usePanel, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

  /**
   * Who else is on this record (`Panel::realtime()`): avatars of the other users on the
   * record page, with a dot for those editing it. A labelled list with screen-reader text
   * per user. Replace it with `components: { 'page:presence': … }`.
   */
  let { presence }: { presence: PresenceSchema } = $props()

  const t = useT()
  const choice = useChoice()
  const self = $derived(usePanel()?.user?.id ?? null)
  const channel = $derived(presence.channel)

  let room: PresenceRoom | null = null
  let members = $state.raw<PresenceMember[]>([])

  // Effects only run in the browser: a server render never joins.
  $effect(() => {
    // Only the channel and the user re-create the room; a new `presence` prop object (every
    // page update) would leave and re-join it (W-S5-05). The state follows below.
    const next = new PresenceRoom({ channel, state: untrack(() => presence.state), self })
    room = next
    members = next.members

    const unsubscribe = next.store.subscribe((state) => (members = state.members))
    const stop = next.start()

    return () => {
      stop()
      unsubscribe()
    }
  })

  $effect(() => {
    room?.setState(presence.state)
  })

  const visible = $derived(visiblePresenceMembers(members))
  const label = (member: PresenceMember) =>
    member.state === 'editing'
      ? t('realtime.presence.editing', { name: member.name }, ':name is editing')
      : t('realtime.presence.viewing', { name: member.name }, ':name is viewing')
</script>

{#if members.length > 0}
  <div data-slot="presence" class="flex items-center">
    <ul
      aria-label={t('realtime.presence.label', {}, 'Also on this record')}
      class="flex items-center -space-x-2 rtl:space-x-reverse"
    >
      {#each visible.shown as member (member.id)}
        <li data-state={member.state} title={label(member)} class="relative inline-flex">
          <Avatar
            class={cn(
              'ring-background size-8 ring-2',
              member.state === 'editing' && 'ring-primary',
            )}
          >
            {#if member.avatar}<AvatarImage src={member.avatar} alt="" />{/if}
            <AvatarFallback aria-hidden="true">{presenceInitials(member.name)}</AvatarFallback>
          </Avatar>
          {#if member.state === 'editing'}
            <span
              aria-hidden="true"
              class="bg-primary ring-background absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2"
            ></span>
          {/if}
          <span class="sr-only">{label(member)}</span>
        </li>
      {/each}
      {#if visible.overflow > 0}
        <li class="relative inline-flex">
          <span
            aria-hidden="true"
            class="bg-muted ring-background flex size-8 items-center justify-center rounded-full text-xs font-medium ring-2"
            >{`+${visible.overflow}`}</span
          >
          <span class="sr-only"
            >{choice(
              'realtime.presence.more',
              visible.overflow,
              {},
              '{1} and :count other person|[2,*] and :count other people',
            )}</span
          >
        </li>
      {/if}
    </ul>
  </div>
{/if}
