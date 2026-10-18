<script setup lang="ts">
import type { HelpdeskInboxSchema } from '@alfakit/core'
import { HelpdeskInboxController } from '@alfakit/core'
import { LockIcon, SearchIcon } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner, useFormatter, useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import Button from '../ui/Button.vue'
import Card from '../ui/Card.vue'
import Input from '../ui/Input.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import HelpdeskBadge from './HelpdeskBadge.vue'
import HelpdeskTicketPane from './HelpdeskTicketPane.vue'

const props = defineProps<{ schema: HelpdeskInboxSchema }>()

const runner = useActionRunner()
const page = usePageActionContext()
const t = useT()
const formatter = useFormatter()
const controller = new HelpdeskInboxController(toRaw(props.schema), {
  runner,
  token: page.token,
  t,
})
const state = useStore(controller.store)
const search = ref<{ $el: HTMLInputElement } | HTMLInputElement | null>(null)
const pane = ref<InstanceType<typeof HelpdeskTicketPane> | null>(null)
const list = ref<HTMLUListElement | null>(null)
let stop: (() => void) | null = null
let stopShortcuts: (() => void) | null = null

watch(
  () => props.schema,
  (schema) => controller.setSchema(toRaw(schema)),
)

const searchElement = (): HTMLInputElement | null => {
  const value = search.value

  return value instanceof HTMLInputElement ? value : (value?.$el ?? null)
}

onMounted(() => {
  stop = controller.start()
  stopShortcuts = controller.registerShortcuts({
    focusComposer: () => requestAnimationFrame(() => pane.value?.focusComposer()),
    focusSearch: () => searchElement()?.focus(),
    focusTicket: (key) =>
      requestAnimationFrame(() =>
        list.value?.querySelector<HTMLElement>(`[data-ticket="${CSS.escape(key)}"]`)?.focus(),
      ),
  })
})

onBeforeUnmount(() => {
  stop?.()
  stopShortcuts?.()
})
</script>

<template>
  <Card
    data-slot="helpdesk-inbox"
    class="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
  >
    <nav
      data-slot="helpdesk-views"
      :aria-label="t('helpdesk.views', {}, 'Views')"
      :class="
        cn(
          'flex gap-1 overflow-x-auto border-b p-2 md:col-span-2 xl:col-span-1 xl:flex-col xl:overflow-visible xl:border-e xl:border-b-0',
          state.selected !== null && 'max-md:hidden',
        )
      "
    >
      <button
        v-for="view in state.list.views"
        :key="view.key"
        type="button"
        :aria-current="view.key === state.view ? 'page' : undefined"
        class="hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:text-foreground text-muted-foreground flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm font-medium"
        @click="controller.setView(view.key)"
      >
        <Icon :name="view.icon" class="size-4 shrink-0" />
        <span class="flex-1 truncate">{{ view.label }}</span>
        <span
          v-if="view.count !== undefined && view.count > 0"
          :class="
            cn(
              'rounded-full px-1.5 text-xs tabular-nums',
              view.color ? colorClass(badgeColorClasses, view.color) : 'bg-muted-foreground/10',
            )
          "
          >{{ formatter.number(view.count) }}</span
        >
      </button>
    </nav>

    <section
      data-slot="helpdesk-list"
      :aria-label="t('helpdesk.tickets', {}, 'Tickets')"
      :class="cn('flex min-h-0 flex-col border-e', state.selected !== null && 'max-md:hidden')"
    >
      <div class="relative border-b p-2">
        <SearchIcon
          aria-hidden="true"
          class="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
        />
        <Input
          ref="search"
          type="search"
          :model-value="state.search"
          :placeholder="
            t('helpdesk.search_placeholder', {}, 'Search by subject, requester or #number…')
          "
          :aria-label="t('helpdesk.search', {}, 'Search tickets')"
          class="ps-8"
          @update:model-value="controller.setSearch($event)"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto" :aria-busy="state.loadingList || undefined">
        <div
          v-if="state.list.tickets.length === 0"
          class="text-muted-foreground flex flex-col items-center gap-1 p-8 text-center text-sm"
        >
          <Spinner v-if="state.loadingList" />
          <template v-else>
            <p class="text-foreground font-medium">
              {{ t('helpdesk.empty', {}, 'No tickets here') }}
            </p>
            <p>
              {{
                t('helpdesk.empty_description', {}, 'Nothing needs your attention in this view.')
              }}
            </p>
          </template>
        </div>
        <ul v-else ref="list" class="divide-y">
          <li v-for="item in state.list.tickets" :key="item.key">
            <button
              type="button"
              :data-ticket="item.key"
              :aria-current="item.key === state.selected ? 'true' : undefined"
              class="hover:bg-muted/60 aria-[current=true]:bg-muted focus-visible:ring-ring/50 flex w-full flex-col gap-1 px-3 py-2.5 text-start outline-none focus-visible:ring-[3px]"
              @click="controller.select(item.key)"
            >
              <span class="flex items-center gap-2">
                <span
                  v-if="item.awaitingReply"
                  class="bg-primary size-2 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span v-if="item.awaitingReply" class="sr-only">{{
                  t('helpdesk.awaiting_reply', {}, 'Awaiting your reply')
                }}</span>
                <span class="text-muted-foreground text-xs tabular-nums">{{ item.reference }}</span>
                <span class="truncate text-sm font-medium">{{ item.subject }}</span>
                <time
                  v-if="item.lastActivityAt"
                  :datetime="item.lastActivityAt"
                  class="text-muted-foreground ms-auto shrink-0 text-xs"
                  >{{ formatter.relative(item.lastActivityAt) }}</time
                >
              </span>
              <span class="text-muted-foreground flex items-center gap-1 text-xs">
                <Icon :name="item.channelIcon" class="size-3 shrink-0" />
                <span class="truncate">{{ item.requester }}</span>
                <span v-if="item.assignee" class="truncate">· {{ item.assignee }}</span>
              </span>
              <span
                v-if="item.excerpt"
                :class="
                  cn('text-muted-foreground line-clamp-2 text-xs', item.excerptInternal && 'italic')
                "
              >
                <LockIcon
                  v-if="item.excerptInternal"
                  :aria-label="t('helpdesk.internal', {}, 'Internal note')"
                  class="me-1 inline size-3"
                />{{ item.excerpt }}
              </span>
              <span class="flex flex-wrap gap-1">
                <HelpdeskBadge :badge="item.status" />
                <HelpdeskBadge v-if="item.priority.value !== 'normal'" :badge="item.priority" />
                <HelpdeskBadge :sla="item.sla" :formatter="formatter" />
              </span>
            </button>
          </li>
        </ul>
        <div v-if="state.list.hasMore" class="p-2">
          <Button
            variant="ghost"
            size="sm"
            class="w-full"
            :disabled="state.loadingList"
            @click="controller.loadMore()"
          >
            <Spinner v-if="state.loadingList" />
            {{ t('helpdesk.load_more', {}, 'Load more') }}
          </Button>
        </div>
      </div>
    </section>

    <section
      data-slot="helpdesk-ticket"
      :aria-label="
        state.ticket
          ? `${state.ticket.reference} ${state.ticket.subject}`
          : t('helpdesk.conversation', {}, 'Conversation')
      "
      :class="cn('flex min-h-0 min-w-0 flex-col', state.selected === null && 'max-md:hidden')"
    >
      <div
        v-if="state.selected === null"
        class="text-muted-foreground m-auto flex max-w-xs flex-col items-center gap-1 p-8 text-center text-sm"
      >
        <p class="text-foreground font-medium">{{ t('helpdesk.select', {}, 'Select a ticket') }}</p>
        <p>
          {{
            t('helpdesk.select_description', {}, 'Pick a ticket on the list to read and answer it.')
          }}
        </p>
      </div>
      <div v-else-if="state.ticket === null" class="flex flex-col gap-3 p-4" aria-busy="true">
        <span class="sr-only">{{ t('helpdesk.loading', {}, 'Loading…') }}</span>
        <p v-if="state.ticketError" role="alert" class="text-destructive text-sm">
          {{ t('helpdesk.load_failed', {}, 'The ticket could not be loaded.') }}
        </p>
        <template v-else>
          <Skeleton class="h-6 w-2/3" />
          <Skeleton class="h-24" />
          <Skeleton class="h-24" />
        </template>
      </div>
      <HelpdeskTicketPane
        v-else
        ref="pane"
        :ticket="state.ticket"
        :controller="controller"
        :token="page.token"
        :action-component="props.schema.actionComponent"
      />
    </section>
    <div aria-live="polite" class="sr-only">{{ state.announcement }}</div>
  </Card>
</template>
