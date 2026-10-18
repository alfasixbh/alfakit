<script setup lang="ts">
import type { RecordVersionsSchema } from '@alfakit/core'
import { ArrowRightIcon } from '@lucide/vue'
import { useHydrated } from '../../composables/use-hydrated'
import { useActionRunner, useFormatter, usePageSchema, useT } from '../../context'
import { Icon } from '../../lib/icons'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

/**
 * The History slide-over's version list (`HistoryAction`): each version with its event,
 * author and time, the changed fields (old → new, long and rich text as a word diff) and
 * "Restore this version", which runs the nested restore action.
 */
const props = defineProps<{ component: RecordVersionsSchema }>()
const t = useT()
const runner = useActionRunner()
const page = usePageSchema()
const formatter = useFormatter()
// Times follow the panel's timezone; formatted after hydration so server and client agree.
const hydrated = useHydrated()

const time = (createdAt?: string) =>
  createdAt && hydrated.value ? formatter.value.dateTime(createdAt) : ''

const restore = (id: number) => {
  const action = props.component.restoreAction

  if (!action) return

  void runner.trigger(action, {
    token: page.value?.token ?? '',
    component: props.component.actionComponent ?? 'page',
    parents: props.component.actionPath ?? [],
    arguments: { version: id },
  })
}
</script>

<template>
  <p
    v-if="props.component.versions.length === 0"
    data-slot="record-versions"
    class="text-muted-foreground text-sm"
  >
    {{ props.component.emptyLabel }}
  </p>
  <ol
    v-else
    data-slot="record-versions"
    :aria-label="t('versions.list', {}, 'Versions')"
    class="flex flex-col gap-3"
  >
    <li
      v-for="version in props.component.versions"
      :key="version.id"
      data-slot="record-version"
      :data-event="version.event"
      class="bg-card rounded-lg border p-3"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
            {{ version.eventLabel }}
            <Badge v-if="version.current" variant="secondary">{{
              t('versions.current', {}, 'Current')
            }}</Badge>
          </span>
          <span class="text-muted-foreground text-xs">{{
            version.author
              ? t(
                  'versions.by',
                  { author: version.author, time: time(version.createdAt) },
                  `${version.author} · ${time(version.createdAt)}`,
                )
              : time(version.createdAt)
          }}</span>
        </div>
        <Button
          v-if="props.component.restoreAction && !version.current"
          type="button"
          variant="outline"
          size="sm"
          class="shrink-0"
          :aria-label="
            t(
              'versions.restore_label',
              { time: time(version.createdAt) },
              `Restore the version of ${time(version.createdAt)}`,
            )
          "
          @click="restore(version.id)"
        >
          <Icon
            v-if="props.component.restoreAction.icon"
            :name="props.component.restoreAction.icon"
            class="size-3.5"
          />
          {{ props.component.restoreAction.label }}
        </Button>
      </div>
      <dl v-if="version.changes.length > 0" class="mt-3 flex flex-col gap-2 text-sm">
        <div
          v-for="change in version.changes"
          :key="change.attribute"
          data-slot="record-version-change"
          :data-attribute="change.attribute"
        >
          <dt class="text-muted-foreground text-xs font-medium">{{ change.label }}</dt>
          <dd class="mt-0.5 break-words">
            <p v-if="change.diff" data-slot="record-version-diff" class="whitespace-pre-wrap">
              <template v-for="(part, index) in change.diff" :key="index"
                ><ins
                  v-if="part.type === 'insert'"
                  class="rounded-sm bg-emerald-500/15 text-emerald-700 no-underline dark:text-emerald-300"
                  ><span class="sr-only">{{ `${t('versions.added', {}, 'Added:')} ` }}</span
                  >{{ part.text }}</ins
                ><del
                  v-else-if="part.type === 'delete'"
                  class="bg-destructive/10 text-destructive rounded-sm"
                  ><span class="sr-only">{{ `${t('versions.removed', {}, 'Removed:')} ` }}</span
                  >{{ part.text }}</del
                ><span v-else>{{ part.text }}</span></template
              >
            </p>
            <p v-else class="flex flex-wrap items-center gap-1.5">
              <del class="text-muted-foreground"
                ><span class="sr-only">{{ `${t('versions.old_value', {}, 'Before:')} ` }}</span
                >{{ change.old ?? t('versions.empty_value', {}, 'Empty') }}</del
              >
              <ArrowRightIcon
                class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
                aria-hidden="true"
              />
              <ins class="no-underline"
                ><span class="sr-only">{{ `${t('versions.new_value', {}, 'After:')} ` }}</span
                >{{ change.new ?? t('versions.empty_value', {}, 'Empty') }}</ins
              >
            </p>
          </dd>
        </div>
      </dl>
      <p v-else class="text-muted-foreground mt-2 text-xs">
        {{ t('versions.no_changes', {}, 'No tracked fields changed.') }}
      </p>
    </li>
  </ol>
</template>
