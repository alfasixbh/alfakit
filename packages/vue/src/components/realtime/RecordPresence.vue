<script setup lang="ts">
import {
  PresenceRoom,
  presenceInitials,
  visiblePresenceMembers,
  type PresenceSchema,
} from '@alfakit/core'
import { computed, onMounted, onScopeDispose, shallowRef, watch } from 'vue'
import { useChoice, usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'

/**
 * Who else is on this record (`Panel::realtime()`): avatars of the other users on the
 * record page, with a dot for those editing it. A labelled list with screen-reader text
 * per user. Replace it with `components: { 'page:presence': … }`.
 */
const props = defineProps<{ presence: PresenceSchema }>()
const panel = usePanel()
const t = useT()
const choice = useChoice()

const room = shallowRef<PresenceRoom | null>(null)
const members = shallowRef<PresenceRoom['members']>([])
let stop: (() => void) | null = null
let unsubscribe: (() => void) | null = null

const connect = () => {
  stop?.()
  unsubscribe?.()

  const next = new PresenceRoom({
    channel: props.presence.channel,
    state: props.presence.state,
    self: panel.value.user?.id ?? null,
  })

  room.value = next
  members.value = next.members
  unsubscribe = next.store.subscribe((state) => (members.value = state.members))
  stop = next.start()
}

// Browser only: the server render never joins.
onMounted(() => {
  watch(() => [props.presence.channel, panel.value.user?.id], connect, { immediate: true })
  watch(
    () => props.presence.state,
    (state) => room.value?.setState(state),
  )
})

onScopeDispose(() => {
  stop?.()
  unsubscribe?.()
})

const visible = computed(() => visiblePresenceMembers(members.value))
const label = (member: PresenceRoom['members'][number]) =>
  member.state === 'editing'
    ? t('realtime.presence.editing', { name: member.name }, ':name is editing')
    : t('realtime.presence.viewing', { name: member.name }, ':name is viewing')
</script>

<template>
  <div v-if="members.length > 0" data-slot="presence" class="flex items-center">
    <ul
      :aria-label="t('realtime.presence.label', {}, 'Also on this record')"
      class="flex items-center -space-x-2 rtl:space-x-reverse"
    >
      <li
        v-for="member in visible.shown"
        :key="member.id"
        :data-state="member.state"
        :title="label(member)"
        class="relative inline-flex"
      >
        <Avatar
          :class="cn('ring-background size-8 ring-2', member.state === 'editing' && 'ring-primary')"
        >
          <AvatarImage v-if="member.avatar" :src="member.avatar" alt="" />
          <AvatarFallback aria-hidden="true">{{ presenceInitials(member.name) }}</AvatarFallback>
        </Avatar>
        <span
          v-if="member.state === 'editing'"
          aria-hidden="true"
          class="bg-primary ring-background absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2"
        />
        <span class="sr-only">{{ label(member) }}</span>
      </li>
      <li v-if="visible.overflow > 0" class="relative inline-flex">
        <span
          aria-hidden="true"
          class="bg-muted ring-background flex size-8 items-center justify-center rounded-full text-xs font-medium ring-2"
        >
          {{ `+${visible.overflow}` }}
        </span>
        <span class="sr-only">
          {{
            choice(
              'realtime.presence.more',
              visible.overflow,
              {},
              '{1} and :count other person|[2,*] and :count other people',
            )
          }}
        </span>
      </li>
    </ul>
  </div>
</template>
