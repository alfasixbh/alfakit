<script setup lang="ts">
import type { ShortcutListGroup, ShortcutListItem } from '@alfakit/core'
import {
  ShortcutRecorder,
  flattenActionGroup,
  saveShortcutOverrides,
  shortcutOverlayGroups,
  shortcuts,
} from '@alfakit/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageSchema, useT } from '../../context'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import ShortcutKeys from './ShortcutKeys.vue'

/** The `?` overlay: every shortcut on the page, grouped; users may change their keys. */
const props = defineProps<{ open: boolean; customizable: boolean; endpoint?: string }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const t = useT()
const page = usePageSchema()
const version = ref(shortcuts.getVersion())
const recording = ref<string | null>(null)
const message = ref('')

// Subscribed once mounted: a server render must not leave listeners on the shared registry.
let unsubscribe = () => {}

onMounted(() => {
  version.value = shortcuts.getVersion()
  unsubscribe = shortcuts.subscribe(() => {
    version.value = shortcuts.getVersion()
  })
})

onBeforeUnmount(() => unsubscribe())

const groups = computed(() => {
  void version.value

  return shortcutOverlayGroups(
    shortcuts.list(),
    flattenActionGroup(page.value?.headerActions ?? []),
  )
})

const groupLabel = (group: ShortcutListGroup['group']) =>
  ({
    general: t('shortcuts.groups.general', {}, 'General'),
    navigation: t('shortcuts.groups.navigation', {}, 'Navigation'),
    commands: t('shortcuts.groups.commands', {}, 'Commands'),
    actions: t('shortcuts.groups.actions', {}, 'Actions on this page'),
  })[group]

const save = async (id: string, keys: string[] | null) => {
  if (!props.endpoint) return

  try {
    shortcuts.setOverrides(await saveShortcutOverrides(props.endpoint, { [id]: keys }))
    message.value = t('shortcuts.saved', {}, 'Shortcut saved.')
  } catch {
    message.value = t('shortcuts.save_failed', {}, 'The shortcut could not be saved.')
  }
}

const change = (item: ShortcutListItem) => {
  message.value = t(
    'shortcuts.recording',
    { label: item.label },
    `Press the new keys for “${item.label}”. Escape cancels.`,
  )
  recording.value = item.id
}

// While recording, the keys pressed are the new binding: one key (with modifiers) or a
// sequence ("g o"), finished a second after the last key (Escape cancels). Listening in
// the capture phase keeps the keys from closing the dialog or running another shortcut.
watch(recording, (id, _old, onCleanup) => {
  if (!id || typeof window === 'undefined') return

  shortcuts.setPaused(true)

  const recorder = new ShortcutRecorder({
    onDone: (binding) => {
      recording.value = null

      const conflict = shortcuts.conflict([binding], id)

      if (conflict) {
        message.value = t(
          'shortcuts.conflict',
          { label: conflict.label },
          `Already used by “${conflict.label}”.`,
        )

        return
      }

      void save(id, [binding])
    },
  })

  const listener = (event: KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      recorder.cancel()
      recording.value = null
      message.value = t('shortcuts.cancelled', {}, 'Change cancelled.')

      return
    }

    recorder.press(event)
  }

  window.addEventListener('keydown', listener, true)
  onCleanup(() => {
    recorder.cancel()
    window.removeEventListener('keydown', listener, true)
    shortcuts.setPaused(false)
  })
})

const update = (next: boolean) => {
  recording.value = null
  message.value = ''
  emit('update:open', next)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="update">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <div data-slot="shortcuts-overlay" class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ t('shortcuts.title', {}, 'Keyboard shortcuts') }}</DialogTitle>
          <DialogDescription>{{
            t('shortcuts.description', {}, 'Shortcuts available on this page.')
          }}</DialogDescription>
        </DialogHeader>
        <div role="status" aria-live="polite" class="text-muted-foreground min-h-5 text-sm">
          {{ message }}
        </div>
        <div class="flex flex-col gap-5">
          <section
            v-for="group in groups"
            :key="group.group"
            :data-group="group.group"
            :aria-labelledby="`shortcuts-${group.group}`"
          >
            <h3
              :id="`shortcuts-${group.group}`"
              class="text-muted-foreground mb-2 text-xs font-medium uppercase"
            >
              {{ groupLabel(group.group) }}
            </h3>
            <ul class="flex flex-col divide-y rounded-md border">
              <li
                v-for="item in group.items"
                :key="item.id"
                :data-shortcut="item.id"
                class="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <span v-if="recording === item.id" class="text-primary text-xs">{{
                  t('shortcuts.press_keys', {}, 'Press keys…')
                }}</span>
                <span v-else-if="item.keys.length === 0" class="text-muted-foreground text-xs">{{
                  t('shortcuts.off', {}, 'Off')
                }}</span>
                <span v-else class="flex flex-wrap items-center justify-end gap-2">
                  <ShortcutKeys v-for="key in item.keys" :key="key" :binding="key" />
                </span>
                <span v-if="props.customizable && item.customizable" class="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    :aria-label="
                      t(
                        'shortcuts.change_label',
                        { label: item.label },
                        `Change the shortcut for ${item.label}`,
                      )
                    "
                    @click="change(item)"
                    >{{ t('shortcuts.change', {}, 'Change') }}</Button
                  >
                  <Button
                    v-if="item.keys.length > 0"
                    type="button"
                    variant="ghost"
                    size="xs"
                    :aria-label="
                      t(
                        'shortcuts.turn_off_label',
                        { label: item.label },
                        `Turn off the shortcut for ${item.label}`,
                      )
                    "
                    @click="save(item.id, [])"
                    >{{ t('shortcuts.turn_off', {}, 'Turn off') }}</Button
                  >
                  <Button
                    v-if="item.customized"
                    type="button"
                    variant="ghost"
                    size="xs"
                    :aria-label="
                      t(
                        'shortcuts.reset_label',
                        { label: item.label },
                        `Restore the default shortcut for ${item.label}`,
                      )
                    "
                    @click="save(item.id, null)"
                    >{{ t('shortcuts.reset', {}, 'Reset') }}</Button
                  >
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
