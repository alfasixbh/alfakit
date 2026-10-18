<script setup lang="ts">
import {
  CMS_PREVIEW_DEVICES,
  CmsAutosave,
  callCmsAutosave,
  cmsPreviewFitsBeside,
  cmsPreviewOpensOnLoad,
  rememberedCmsPreview,
  resolveStickyOffset,
  reserveCmsPreviewSpace,
  type CmsAutosaveSnapshot,
  type CmsLivePreviewSchema,
  type CmsPreviewDevice,
} from '@alfakit/core'
import {
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  Minimize2Icon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { usePageSchema, usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useOptionalFormStore } from '../form/form-context'
import ActionList from '../actions/ActionList.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

/**
 * The page editor's autosave status and live preview (schema type `CmsLivePreview`).
 * Changes are autosaved as a draft a moment after typing stops; the preview pane shows
 * the signed preview of that draft beside the form, full screen, or at tablet and phone
 * widths.
 */
const props = defineProps<{ component: CmsLivePreviewSchema }>()

const t = useT()
const form = useOptionalFormStore()
const page = usePageSchema()
const panel = usePanel()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
const fullScreen = ref(false)
// Too narrow for the form beside the pane (e.g. 1280px with the sidebar): full-screen overlay.
const overlay = ref(false)
const expanded = computed(() => fullScreen.value || overlay.value)
const device = ref<CmsPreviewDevice>('desktop')
const snapshot = shallowRef<CmsAutosaveSnapshot>({
  status: props.component.savedAt ? 'saved' : 'idle',
  savedAt: props.component.savedAt ?? null,
  previewUrl: props.component.previewUrl,
  version: 0,
  hasChanges: props.component.hasChanges ?? false,
})
const top = ref('0px')
const actionContext = computed(() => ({ token: page.value?.token ?? '', component: 'page' }))
const status = computed(() =>
  snapshot.value.hasChanges && props.component.changedStatus
    ? props.component.changedStatus
    : props.component.status,
)
/** Badge colours of the status (the server's `PageState` colours). */
const STATUS_COLORS: Record<string, string> = {
  gray: 'border-border bg-muted text-foreground',
  success: 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  danger: 'border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

const devices = Object.keys(CMS_PREVIEW_DEVICES) as CmsPreviewDevice[]
const icons = { desktop: MonitorIcon, tablet: TabletIcon, phone: SmartphoneIcon }
const labels = { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' }
const width = computed(() => CMS_PREVIEW_DEVICES[device.value])

const statusLabel = computed(() => {
  switch (snapshot.value.status) {
    case 'saving':
      return t('cms.saving', {}, 'Saving…')
    case 'saved':
      return t('cms.saved', {}, 'Draft saved automatically')
    case 'pending':
      return t('cms.unsaved', {}, 'Unsaved changes')
    case 'error':
      return t(
        'cms.save_failed',
        {},
        "Your latest changes couldn't be saved. They will be tried again.",
      )
    default:
      return ''
  }
})

let autosave: CmsAutosave | null = null
let unsubscribe: (() => void) | null = null
let release: () => void = () => {}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  if (fullScreen.value && !overlay.value) fullScreen.value = false
  else setOpen(false)
}

/** Open or collapse the pane, remembering the choice for the next visit. */
function setOpen(next: boolean) {
  open.value = next
  rememberedCmsPreview(next ? 'open' : 'closed')
}

function measure() {
  if (open.value) overlay.value = !cmsPreviewFitsBeside(root.value)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', measure)
  // Stick right under the panel's topbar when it sticks too.
  top.value = resolveStickyOffset(null)
  // Wide screens open the pane beside the form; the viewer's last choice wins.
  if (props.component.previewUrl && cmsPreviewOpensOnLoad(root.value)) open.value = true

  if (!form) return

  autosave = new CmsAutosave({
    debounce: props.component.debounce,
    previewUrl: props.component.previewUrl,
    savedAt: props.component.savedAt,
    hasChanges: props.component.hasChanges,
    save: (state) =>
      callCmsAutosave(props.component.autosaveMethod, state, {
        token: page.value?.token ?? '',
        endpoint: panel.value?.endpoints?.pageCall ?? '',
      }),
    onChange: (next) => (snapshot.value = next),
  })

  let values = form.state.values
  unsubscribe = form.subscribe((state) => {
    if (state.values !== values) {
      values = state.values
      autosave?.schedule(state.values)
    }
  })
})

// Side by side, the form makes room for the pane.
watch(open, measure)
watch([open, expanded], ([isOpen, isFull]) => {
  release()
  release = isOpen && !isFull ? reserveCmsPreviewSpace(root.value, 'min(50vw, 56rem)') : () => {}
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', measure)
  unsubscribe?.()
  release()
  const current = autosave
  void current?.flush().finally(() => current.dispose())
})
</script>

<template>
  <div
    ref="root"
    data-slot="cms-live-preview"
    :style="{ top }"
    class="bg-background sticky z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2.5 shadow-sm"
  >
    <div class="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
      <p
        v-if="status"
        class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        data-slot="cms-editor-status"
      >
        <Badge
          variant="outline"
          :data-color="status.color"
          :class="STATUS_COLORS[status.color] ?? ''"
          >{{ status.label }}</Badge
        >
        <span class="text-muted-foreground">{{ status.description }}</span>
      </p>
      <p
        class="text-muted-foreground flex min-h-4 items-center gap-1.5 text-xs"
        role="status"
        aria-live="polite"
      >
        <LoaderCircleIcon
          v-if="snapshot.status === 'saving'"
          class="size-4 animate-spin"
          aria-hidden="true"
        />
        <CircleAlertIcon
          v-else-if="snapshot.status === 'error'"
          class="text-destructive size-4"
          aria-hidden="true"
        />
        <CheckIcon v-else-if="snapshot.status === 'saved'" class="size-4" aria-hidden="true" />
        {{ statusLabel }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-if="snapshot.previewUrl"
        type="button"
        :variant="open ? 'secondary' : 'outline'"
        size="sm"
        :aria-pressed="open"
        :title="
          t('cms.live_preview_help', {}, 'See the page as visitors will, updated as you type.')
        "
        data-slot="cms-live-preview-toggle"
        @click="setOpen(!open)"
      >
        <EyeIcon aria-hidden="true" />
        {{
          open
            ? t('cms.hide_preview', {}, 'Hide preview')
            : t('cms.live_preview', {}, 'Live preview')
        }}
      </Button>
      <div v-if="props.component.actions?.length" @pointerdown.capture="autosave?.flush()">
        <ActionList :actions="props.component.actions" :context="actionContext" size="sm" />
      </div>
    </div>
    <section
      v-if="open && snapshot.previewUrl"
      :aria-label="t('cms.live_preview', {}, 'Live preview')"
      data-slot="cms-live-preview-pane"
      :data-full-screen="expanded || undefined"
      :style="{ top: expanded ? '0px' : top }"
      :class="
        cn(
          'bg-background fixed end-0 bottom-0 z-50 flex flex-col border-s shadow-xl',
          expanded ? 'inset-x-0 border-s-0' : 'w-full lg:w-[min(50vw,56rem)]',
        )
      "
    >
      <header class="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div
          class="flex items-center gap-1"
          role="group"
          :aria-label="t('cms.preview_width', {}, 'Preview width')"
        >
          <Button
            v-for="name in devices"
            :key="name"
            type="button"
            :variant="device === name ? 'secondary' : 'ghost'"
            size="icon-sm"
            :aria-pressed="device === name"
            @click="device = name"
          >
            <component :is="icons[name]" aria-hidden="true" />
            <span class="sr-only">{{ t(`cms.device_${name}`, {}, labels[name]) }}</span>
          </Button>
        </div>
        <p class="text-muted-foreground hidden truncate text-xs sm:block">{{ statusLabel }}</p>
        <div class="flex items-center gap-1">
          <Button
            v-if="!overlay"
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-pressed="fullScreen"
            @click="fullScreen = !fullScreen"
          >
            <Minimize2Icon v-if="fullScreen" aria-hidden="true" />
            <Maximize2Icon v-else aria-hidden="true" />
            <span class="sr-only">{{
              fullScreen
                ? t('cms.exit_full_screen', {}, 'Exit full screen')
                : t('cms.full_screen', {}, 'Full screen')
            }}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" @click="setOpen(false)">
            <XIcon aria-hidden="true" />
            <span class="sr-only">{{ t('cms.close_preview', {}, 'Close preview') }}</span>
          </Button>
        </div>
      </header>
      <div class="bg-muted/40 flex flex-1 justify-center overflow-auto p-3">
        <iframe
          :key="snapshot.version"
          :src="snapshot.previewUrl"
          :title="t('cms.preview_frame', {}, 'Page preview')"
          class="bg-background h-full rounded-md border shadow-sm"
          :style="{ width: width === null ? '100%' : `${width}px`, maxWidth: '100%' }"
        />
      </div>
    </section>
  </div>
</template>
