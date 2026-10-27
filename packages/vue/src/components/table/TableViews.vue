<script setup lang="ts">
import type { TableSchema, TableViewItemSchema, TableViewOperation } from '@alfakit/core'
import {
  activeTableView,
  groupTableViews,
  inertiaReload,
  requestTableView,
  tabKeyTarget,
  tableViewError,
  tableViewFollowUp,
  visitTableView,
} from '@alfakit/core'
import { BookmarkIcon, ChevronDownIcon, RotateCcwIcon, StarIcon, UsersIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { showToast } from '../notifications/flash-toasts'
import Slot from '../panel/Slot.vue'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuRadioGroup from '../ui/DropdownMenuRadioGroup.vue'
import DropdownMenuRadioItem from '../ui/DropdownMenuRadioItem.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import Input from '../ui/Input.vue'
import Label from '../ui/Label.vue'

/**
 * Saved views above a table (`Table::savedViews()` / `views()`): the views as tabs (or a
 * dropdown) and a menu to save the current state as a new view, update, rename, share
 * or delete the active one, pick a default and reset changes. Each view is a URL
 * (`?view=slug`), so it can be shared.
 */
const props = defineProps<{ table: TableSchema; token: string; component: string }>()

type NameDialog = { mode: 'create' } | { mode: 'rename'; view: TableViewItemSchema } | null

const t = useT()
const panel = usePanel()
const direction = useDirection()
const dialog = ref<NameDialog>(null)
const confirmDelete = ref<TableViewItemSchema | null>(null)
const name = ref('')
const shared = ref(false)
const error = ref<string | undefined>()
const busy = ref(false)
const tabs: Array<HTMLButtonElement | null> = []

const views = computed(() => props.table.views)
const active = computed(() => activeTableView(views.value))
const groups = computed(() => groupTableViews(views.value?.items ?? []))
const activeKey = computed(() => views.value?.active ?? null)
const items = computed<Array<TableViewItemSchema | null>>(() => [
  null,
  ...(views.value?.items ?? []),
])
const focusable = computed(() => {
  const index = items.value.findIndex((item) => (item?.key ?? null) === activeKey.value)

  return index === -1 ? 0 : index
})
const canUpdate = computed(() => Boolean(active.value?.editable && views.value?.canSave))
const hasMenu = computed(() =>
  Boolean(views.value?.canSave || views.value?.canSetDefault || views.value?.modified),
)
const isDefault = computed(
  () => Boolean(active.value?.default) || (!active.value && views.value?.userDefault === ''),
)
const sections = computed(
  () =>
    [
      ['preset', t('table.views.presets', {}, 'Views')],
      ['shared', t('table.views.shared', {}, 'Team views')],
      ['personal', t('table.views.personal', {}, 'My views')],
    ] as const,
)

const open = (key: string | null) => visitTableView(props.table, key)

async function run(operation: TableViewOperation, success?: string): Promise<boolean> {
  const endpoint = panel.value.endpoints.tableViews

  if (!endpoint) return false

  busy.value = true
  error.value = undefined

  try {
    const response = await requestTableView(endpoint, props.token, props.component, operation)
    const next = tableViewFollowUp(props.table, operation, response)

    if ('open' in next) {
      open(next.open)
    } else {
      inertiaReload()
    }

    if (success) {
      showToast({ id: 'alfakit-table-view', title: success, status: 'success', format: 'alfakit' })
    }

    return true
  } catch (failure) {
    const message = tableViewError(failure)

    if (dialog.value) {
      error.value = message ?? t('table.views.failed', {}, "Couldn't save the view")
    } else {
      showToast({
        id: 'alfakit-table-view-failed',
        title: t('table.views.failed', {}, "Couldn't save the view"),
        body: message,
        status: 'danger',
        format: 'alfakit',
      })
    }

    return false
  } finally {
    busy.value = false
  }
}

function openDialog(next: NameDialog) {
  name.value = next?.mode === 'rename' ? next.view.label : ''
  shared.value = false
  error.value = undefined
  dialog.value = next
}

async function submitName() {
  const current = dialog.value

  if (!current) return

  const ok =
    current.mode === 'create'
      ? await run(
          { operation: 'create', name: name.value, shared: shared.value },
          t('table.views.saved', {}, 'View saved'),
        )
      : await run({ operation: 'rename', view: current.view.key, name: name.value })

  if (ok) dialog.value = null
}

async function deleteView() {
  const view = confirmDelete.value

  if (!view) return

  if (
    await run({ operation: 'delete', view: view.key }, t('table.views.deleted', {}, 'View deleted'))
  ) {
    confirmDelete.value = null
  }
}

function onTabKeyDown(event: KeyboardEvent, index: number) {
  const target = tabKeyTarget(event.key, index, items.value.length, direction.value)

  if (target === null) return

  event.preventDefault()
  tabs[target]?.focus()
}

const nameId = computed(() => `${props.component}-view-name`)
const sharedId = computed(() => `${props.component}-view-shared`)
</script>

<template>
  <div v-if="views" data-slot="table-views" class="flex flex-wrap items-center gap-2">
    <Slot name="table.views.before" :scope="props.component" />
    <DropdownMenu v-if="views.layout === 'dropdown'">
      <DropdownMenuTrigger as-child>
        <Button type="button" variant="outline" size="sm" data-slot="table-views-trigger">
          <Icon name="alfakit::tables.views.trigger" :fallback="BookmarkIcon" />
          <span class="max-w-48 truncate">{{
            active?.label ?? t('table.views.all', {}, 'All')
          }}</span>
          <ChevronDownIcon class="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="min-w-56">
        <DropdownMenuRadioGroup
          :model-value="activeKey ?? ''"
          @update:model-value="(key) => open(key === '' ? null : String(key))"
        >
          <DropdownMenuRadioItem value="">{{
            t('table.views.all', {}, 'All')
          }}</DropdownMenuRadioItem>
          <template v-for="[type, label] in sections" :key="type">
            <div v-if="groups[type].length > 0" role="group" :aria-label="label">
              <DropdownMenuSeparator />
              <DropdownMenuLabel class="text-muted-foreground text-xs">{{
                label
              }}</DropdownMenuLabel>
              <DropdownMenuRadioItem
                v-for="item in groups[type]"
                :key="item.key"
                :value="item.key"
                class="gap-2"
              >
                <Icon v-if="item.icon" :name="item.icon" class="size-4" />
                <span class="truncate">{{ item.label }}</span>
                <Icon
                  v-if="item.type === 'shared'"
                  name="alfakit::tables.views.shared"
                  :fallback="UsersIcon"
                  class="text-muted-foreground size-3.5"
                  :aria-label="t('table.views.shared_badge', {}, 'Shared')"
                />
                <Icon
                  v-if="item.default"
                  name="alfakit::tables.views.default"
                  :fallback="StarIcon"
                  class="text-muted-foreground size-3.5"
                  :aria-label="t('table.views.default_badge', {}, 'Default')"
                />
              </DropdownMenuRadioItem>
            </div>
          </template>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <div
      v-else
      role="tablist"
      :aria-label="t('table.views.label', {}, 'Views')"
      data-slot="table-views-tabs"
      class="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
    >
      <button
        v-for="(item, index) in items"
        :key="item?.key ?? ''"
        :ref="(element) => (tabs[index] = element as HTMLButtonElement | null)"
        type="button"
        role="tab"
        :aria-selected="(item?.key ?? null) === activeKey"
        :tabindex="index === focusable ? 0 : -1"
        :data-state="(item?.key ?? null) === activeKey ? 'active' : 'inactive'"
        :class="
          cn(
            'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50',
            (item?.key ?? null) === activeKey
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/70 hover:text-foreground',
          )
        "
        @click="(item?.key ?? null) !== activeKey && open(item?.key ?? null)"
        @keydown="onTabKeyDown($event, index)"
      >
        <template v-if="item">
          <Icon v-if="item.icon" :name="item.icon" class="size-4" />
          <span class="truncate">{{ item.label }}</span>
          <Icon
            v-if="item.type === 'shared'"
            name="alfakit::tables.views.shared"
            :fallback="UsersIcon"
            class="text-muted-foreground size-3.5"
            :aria-label="t('table.views.shared_badge', {}, 'Shared')"
          />
          <Icon
            v-if="item.default"
            name="alfakit::tables.views.default"
            :fallback="StarIcon"
            class="text-muted-foreground size-3.5"
            :aria-label="t('table.views.default_badge', {}, 'Default')"
          />
        </template>
        <template v-else>{{ t('table.views.all', {}, 'All') }}</template>
      </button>
    </div>
    <span
      v-if="views.modified"
      data-slot="table-views-modified"
      class="text-muted-foreground text-xs italic"
    >
      {{ t('table.views.modified', {}, 'Modified') }}
    </span>
    <DropdownMenu v-if="hasMenu">
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="busy"
          :aria-label="t('table.views.actions', {}, 'View options')"
        >
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="min-w-52">
        <DropdownMenuItem v-if="views.canSave" @select="openDialog({ mode: 'create' })">
          {{ t('table.views.save_new', {}, 'Save as new view') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="canUpdate && active && views.modified"
          @select="
            run({ operation: 'update', view: active.key }, t('table.views.saved', {}, 'View saved'))
          "
        >
          {{ t('table.views.update', {}, 'Update view') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="views.modified" @select="open(activeKey)">
          <RotateCcwIcon />
          {{ t('table.views.reset', {}, 'Reset changes') }}
        </DropdownMenuItem>
        <template v-if="canUpdate && active">
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="openDialog({ mode: 'rename', view: active })">
            {{ t('table.views.rename', {}, 'Rename view') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="views.canShare"
            @select="
              run({ operation: 'share', view: active.key, shared: active.type !== 'shared' })
            "
          >
            {{
              active.type === 'shared'
                ? t('table.views.unshare', {}, 'Stop sharing')
                : t('table.views.share', {}, 'Share with team')
            }}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" @select="confirmDelete = active">
            {{ t('table.views.delete', {}, 'Delete view') }}
          </DropdownMenuItem>
        </template>
        <template v-if="views.canSetDefault">
          <DropdownMenuSeparator />
          <DropdownMenuItem v-if="isDefault" @select="run({ operation: 'default', view: null })">
            {{ t('table.views.clear_default', {}, 'Clear my default') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-else @select="run({ operation: 'default', view: active?.key ?? '' })">
            {{ t('table.views.set_default', {}, 'Set as my default') }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
    <Slot name="table.views.after" :scope="props.component" />

    <Dialog :open="dialog !== null" @update:open="(value) => !value && (dialog = null)">
      <DialogContent class="sm:max-w-md">
        <form data-slot="table-view-form" class="flex flex-col gap-4" @submit.prevent="submitName">
          <DialogHeader>
            <DialogTitle>
              {{
                dialog?.mode === 'rename'
                  ? t('table.views.rename', {}, 'Rename view')
                  : t('table.views.save_new', {}, 'Save as new view')
              }}
            </DialogTitle>
            <DialogDescription class="sr-only">
              {{
                t(
                  'table.views.name_help',
                  {},
                  'Saves the filters, search, sort, columns and grouping.',
                )
              }}
            </DialogDescription>
          </DialogHeader>
          <div class="flex flex-col gap-2">
            <Label :for="nameId">{{ t('table.views.name', {}, 'Name') }}</Label>
            <Input
              :id="nameId"
              v-model="name"
              maxlength="120"
              autofocus
              required
              :aria-invalid="error ? true : undefined"
              :aria-describedby="error ? `${nameId}-error` : undefined"
            />
            <p v-if="error" :id="`${nameId}-error`" class="text-destructive text-sm">{{ error }}</p>
          </div>
          <div v-if="dialog?.mode === 'create' && views.canShare" class="flex items-center gap-2">
            <Checkbox
              :id="sharedId"
              :model-value="shared"
              @update:model-value="(value) => (shared = value === true)"
            />
            <Label :for="sharedId">{{ t('table.views.share', {}, 'Share with team') }}</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="dialog = null">{{
              t('cancel', {}, 'Cancel')
            }}</Button>
            <Button type="submit" :disabled="busy || name.trim() === ''">{{
              t('save', {}, 'Save')
            }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="confirmDelete !== null"
      @update:open="(value) => !value && (confirmDelete = null)"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('table.views.delete', {}, 'Delete view') }}</DialogTitle>
          <DialogDescription>
            {{
              t(
                'table.views.delete_confirm',
                { name: confirmDelete?.label ?? '' },
                'Delete the view ":name"?',
              )
            }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="confirmDelete = null">{{
            t('cancel', {}, 'Cancel')
          }}</Button>
          <Button type="button" variant="destructive" :disabled="busy" @click="deleteView">
            {{ t('table.views.delete', {}, 'Delete view') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
