<script setup lang="ts">
import {
  ConflictMonitor,
  PresenceRoom,
  conflictMessage,
  findPageFormBlock,
  type ConflictMonitorState,
  type PageSchema,
} from '@alfakit/core'
import { RefreshCwIcon, TriangleAlertIcon, XIcon } from '@lucide/vue'
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useFormatter, usePanel, useT } from '../../context'
import Button from '../ui/Button.vue'

/**
 * Edit pages (`detectConflicts()`): a non-blocking banner when somebody else saved the
 * record ("Dana saved changes 10 seconds ago", over `Panel::realtime()`) or the server
 * refused a save, with review (the changed fields against your unsaved values), reload
 * and keep mine. Replace it with `components: { 'page:conflict-banner': … }`.
 */
const props = defineProps<{ page: PageSchema }>()
const panel = usePanel()
const t = useT()
const formatter = useFormatter()

const monitor = shallowRef<ConflictMonitor | null>(null)
const state = shallowRef<ConflictMonitorState>({
  conflict: null,
  fields: null,
  loading: false,
  failed: false,
})
const reviewing = ref(false)
const tick = ref(0)
let stop: (() => void) | null = null
let unsubscribe: (() => void) | null = null
let timer: ReturnType<typeof setInterval> | null = null

const connect = () => {
  stop?.()
  unsubscribe?.()

  const channel = props.page.presence?.channel ?? null
  const next = new ConflictMonitor({
    version: props.page.conflicts?.version ?? '',
    token: props.page.token,
    endpoint: panel.value.endpoints.conflicts,
    channel,
    original: (findPageFormBlock(props.page)?.state as Record<string, unknown> | undefined) ?? {},
    self: panel.value.user?.id ?? null,
    resolveName: (id) => (channel ? (PresenceRoom.find(channel)?.memberName(id) ?? null) : null),
  })

  monitor.value = next
  state.value = next.state
  reviewing.value = false
  unsubscribe = next.store.subscribe((value) => {
    state.value = value

    if (!value.conflict) reviewing.value = false
  })
  stop = next.start()
}

onMounted(() => {
  // A new version (after saving or reloading) starts over.
  watch(() => [props.page.conflicts?.version, props.page.presence?.channel], connect, {
    immediate: true,
  })
  watch(
    () => props.page.token,
    (token) => monitor.value?.setToken(token),
  )
  // "10 seconds ago" keeps counting.
  timer = setInterval(() => (tick.value += 1), 15_000)
})

onScopeDispose(() => {
  stop?.()
  unsubscribe?.()
  if (timer !== null) clearInterval(timer)
})

const conflict = computed(() => state.value.conflict)
const text = computed(() => {
  void tick.value

  if (!conflict.value) return ''

  const message = conflictMessage(conflict.value)

  return t(
    message.key,
    { name: conflict.value.name ?? '', time: formatter.value.relative(conflict.value.at) },
    message.fallback,
  )
})
const deleted = computed(() => conflict.value?.event === 'deleted')
const fields = computed(() => state.value.fields ?? [])
const empty = computed(() => t('realtime.conflict.empty', {}, 'Empty'))

const review = () => {
  const opening = !reviewing.value
  reviewing.value = opening

  if (opening && state.value.fields === null) void monitor.value?.review()
}
</script>

<template>
  <div
    v-if="conflict"
    data-slot="conflict-banner"
    :data-source="conflict.source"
    role="status"
    aria-live="polite"
    class="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <TriangleAlertIcon class="size-4 shrink-0" aria-hidden="true" />
      <p class="min-w-0 flex-1 font-medium">{{ text }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="!deleted"
          type="button"
          size="sm"
          variant="outline"
          :aria-expanded="reviewing"
          aria-controls="alfakit-conflict-review"
          @click="review"
        >
          {{ t('realtime.conflict.review', {}, 'Review changes') }}
        </Button>
        <Button type="button" size="sm" variant="outline" @click="monitor?.reload()">
          <RefreshCwIcon aria-hidden="true" />
          {{ t('realtime.conflict.reload', {}, 'Reload') }}
        </Button>
        <Button v-if="!deleted" type="button" size="sm" @click="monitor?.keepMine()">
          {{ t('realtime.conflict.keep_mine', {}, 'Keep mine') }}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          :aria-label="t('realtime.conflict.dismiss', {}, 'Dismiss')"
          @click="monitor?.dismiss()"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
    <div
      v-if="reviewing"
      id="alfakit-conflict-review"
      data-slot="conflict-review"
      class="flex flex-col gap-2"
    >
      <p v-if="state.loading" class="text-muted-foreground">
        {{ t('realtime.conflict.loading', {}, 'Loading changes…') }}
      </p>
      <p v-else-if="state.failed">
        {{ t('realtime.conflict.failed', {}, 'The changes could not be loaded.') }}
      </p>
      <p v-else-if="fields.length === 0">
        {{ t('realtime.conflict.no_changes', {}, 'No field differs from what you loaded.') }}
      </p>
      <table
        v-else
        class="bg-background/60 text-foreground w-full overflow-hidden rounded-md text-start text-sm"
      >
        <caption class="sr-only">
          {{
            t('realtime.conflict.caption', {}, 'Fields changed since you opened the record')
          }}
        </caption>
        <thead>
          <tr class="border-b">
            <th scope="col" class="px-3 py-2 text-start font-medium">
              {{ t('realtime.conflict.field', {}, 'Field') }}
            </th>
            <th scope="col" class="px-3 py-2 text-start font-medium">
              {{ t('realtime.conflict.theirs', {}, 'Saved') }}
            </th>
            <th scope="col" class="px-3 py-2 text-start font-medium">
              {{ t('realtime.conflict.mine', {}, 'Yours') }}
            </th>
            <th scope="col" class="px-3 py-2">
              <span class="sr-only">{{ t('realtime.conflict.actions', {}, 'Actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="field in fields"
            :key="field.path"
            :data-conflicting="field.conflicting || undefined"
            class="border-b last:border-b-0"
          >
            <th scope="row" class="px-3 py-2 text-start font-medium">
              {{ field.label }}
              <span
                v-if="field.conflicting"
                class="ms-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-normal text-amber-950 dark:bg-amber-800 dark:text-amber-50"
              >
                {{ t('realtime.conflict.both_changed', {}, 'Changed by both') }}
              </span>
            </th>
            <td class="px-3 py-2 break-words">{{ field.theirs ?? empty }}</td>
            <td class="px-3 py-2 break-words">{{ field.mine ?? empty }}</td>
            <td class="px-3 py-2 text-end">
              <Button
                type="button"
                size="xs"
                variant="outline"
                :aria-label="
                  t(
                    'realtime.conflict.use_theirs_label',
                    { field: field.label },
                    'Use the saved value of :field',
                  )
                "
                @click="monitor?.useTheirs(field.path)"
              >
                {{ t('realtime.conflict.use_theirs', {}, 'Use saved value') }}
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
