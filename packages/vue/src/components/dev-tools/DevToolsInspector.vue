<script setup lang="ts">
import {
  byteLength,
  formatBytes,
  inspectableProps,
  jsonEntries,
  jsonScalar,
  latestServerTiming,
  prettyJson,
  searchJson,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { BracesIcon, CheckIcon, CopyIcon, ExternalLinkIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAlfakitProps, useDirection, useFormatter, useT } from '../../context'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import ScrollArea from '../ui/ScrollArea.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetDescription from '../ui/SheetDescription.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import SheetTrigger from '../ui/SheetTrigger.vue'
import DevToolsJsonNode from './DevToolsJsonNode.vue'

/**
 * The schema inspector: a floating developer button that opens a drawer with the page's
 * props as a searchable JSON tree (with a copy button), what the context token identifies,
 * the server time reported in `Server-Timing`, the payload size and editor links for the
 * PHP classes behind the page. Rendered only for pages that carry `alfakitDevTools`.
 */
const t = useT()
const formatter = useFormatter()
const direction = useDirection()
const props = useAlfakitProps()
const tools = computed(() => props.value.alfakitDevTools)
const data = computed(() => inspectableProps(props.value as unknown as Record<string, unknown>))
const payload = computed(() => byteLength(props.value))
const query = ref('')
const copied = ref(false)
const serverTime = ref<number | null>(null)
const search = computed(() => searchJson(data.value, query.value))
const roots = computed(() => jsonEntries(data.value))
const parameters = computed(() => Object.entries(tools.value?.context.parameters ?? {}))

let stop: (() => void) | undefined
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  serverTime.value = latestServerTiming()
  // Re-read after every visit: the latest response carries the newest header.
  stop = router.on('finish', () => {
    serverTime.value = latestServerTiming()
  })
})

onBeforeUnmount(() => {
  stop?.()
  clearTimeout(timer)
})

const copy = () => {
  void navigator.clipboard?.writeText(prettyJson(data.value)).then(() => {
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
  })
}

const time = (value: number | null) =>
  value === null ? t('dev_tools.never', {}, 'Never') : formatter.value.dateTime(value * 1000)
</script>

<template>
  <Sheet v-if="tools">
    <SheetTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="icon"
        :aria-label="t('dev_tools.open', {}, 'Open schema inspector')"
        data-slot="dev-tools-toggle"
        class="fixed end-4 bottom-16 z-40 rounded-full shadow-md [[data-slot=starter-kit-root]_&]:end-auto [[data-slot=starter-kit-root]_&]:right-4"
      >
        <BracesIcon />
      </Button>
    </SheetTrigger>
    <SheetContent
      :side="direction === 'rtl' ? 'left' : 'right'"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <div data-slot="dev-tools" class="flex min-h-0 flex-1 flex-col">
        <SheetHeader class="border-b">
          <SheetTitle class="flex items-center gap-2">
            <BracesIcon class="size-4" />
            {{ t('dev_tools.title', {}, 'Schema inspector') }}
          </SheetTitle>
          <SheetDescription class="truncate font-mono text-xs" :title="tools.context.page">
            {{ tools.context.page }}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea class="min-h-0 flex-1">
          <div class="space-y-5 p-4 text-sm">
            <dl class="grid grid-cols-2 gap-3">
              <div class="rounded-md border p-3">
                <dt class="text-muted-foreground text-xs">
                  {{ t('dev_tools.server_time', {}, 'Server time') }}
                </dt>
                <dd class="font-mono text-sm font-semibold tabular-nums">
                  {{
                    serverTime === null
                      ? t('dev_tools.not_measured', {}, 'Not measured')
                      : t(
                          'dev_tools.milliseconds',
                          { value: formatter.number(serverTime) },
                          ':value ms',
                        )
                  }}
                </dd>
              </div>
              <div class="rounded-md border p-3">
                <dt class="text-muted-foreground text-xs">
                  {{ t('dev_tools.payload', {}, 'Payload size') }}
                </dt>
                <dd class="font-mono text-sm font-semibold tabular-nums">
                  {{ formatBytes(payload) }}
                </dd>
              </div>
            </dl>

            <section data-slot="dev-tools-context">
              <h3 class="mb-2 text-sm font-medium">
                {{ t('dev_tools.context', {}, 'Context token') }}
              </h3>
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt class="text-muted-foreground">{{ t('dev_tools.panel', {}, 'Panel') }}</dt>
                <dd class="min-w-0 truncate font-mono">{{ tools.context.panel }}</dd>
                <dt class="text-muted-foreground">{{ t('dev_tools.page', {}, 'Page') }}</dt>
                <dd class="min-w-0 truncate font-mono" :title="tools.context.page">
                  {{ tools.context.page }}
                </dd>
                <template v-if="tools.context.component">
                  <dt class="text-muted-foreground">
                    {{ t('dev_tools.component', {}, 'Component') }}
                  </dt>
                  <dd class="min-w-0 truncate font-mono">{{ tools.context.component }}</dd>
                </template>
                <template v-if="tools.tenant !== null">
                  <dt class="text-muted-foreground">{{ t('dev_tools.tenant', {}, 'Tenant') }}</dt>
                  <dd class="min-w-0 truncate font-mono">{{ tools.tenant }}</dd>
                </template>
                <template v-for="[key, value] in parameters" :key="key">
                  <dt class="text-muted-foreground">{{ key }}</dt>
                  <dd class="min-w-0 truncate font-mono">{{ jsonScalar(value) }}</dd>
                </template>
                <dt class="text-muted-foreground">
                  {{ t('dev_tools.bound_to_user', {}, 'Bound to the user') }}
                </dt>
                <dd>
                  {{
                    tools.context.boundToUser
                      ? t('dev_tools.yes', {}, 'Yes')
                      : t('dev_tools.no', {}, 'No')
                  }}
                </dd>
                <dt class="text-muted-foreground">{{ t('dev_tools.issued_at', {}, 'Issued') }}</dt>
                <dd>{{ time(tools.context.issuedAt) }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('dev_tools.expires_at', {}, 'Expires') }}
                </dt>
                <dd>{{ time(tools.context.expiresAt) }}</dd>
              </dl>
            </section>

            <section data-slot="dev-tools-classes">
              <h3 class="mb-2 text-sm font-medium">{{ t('dev_tools.classes', {}, 'Classes') }}</h3>
              <ul class="divide-y rounded-md border text-xs">
                <li
                  v-for="item in tools.classes"
                  :key="item.role"
                  class="flex items-center gap-2 px-3 py-1.5"
                >
                  <span class="text-muted-foreground w-16 shrink-0">
                    {{ t(`dev_tools.roles.${item.role}`, {}, item.role) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 truncate font-mono"
                    :title="item.file ? `${item.file}:${item.line ?? 1}` : item.class"
                  >
                    {{ item.class }}
                  </span>
                  <a
                    v-if="item.url"
                    :href="item.url"
                    class="text-primary inline-flex shrink-0 items-center gap-1 hover:underline"
                    :aria-label="
                      t(
                        'dev_tools.open_in_editor',
                        { class: item.class, editor: tools.editor ?? '' },
                        'Open :class in :editor',
                      )
                    "
                  >
                    <ExternalLinkIcon class="size-3.5" />
                  </a>
                </li>
              </ul>
              <p v-if="tools.editor === null" class="text-muted-foreground mt-2 text-xs">
                {{
                  t(
                    'dev_tools.no_editor',
                    {},
                    'Set APP_EDITOR (config app.editor) to open these classes in your editor.',
                  )
                }}
              </p>
            </section>

            <section data-slot="dev-tools-schema">
              <div class="mb-2 flex items-center gap-2">
                <h3 class="me-auto text-sm font-medium">
                  {{ t('dev_tools.schema', {}, 'Schema') }}
                </h3>
                <Button type="button" variant="ghost" size="sm" @click="copy">
                  <CheckIcon v-if="copied" />
                  <CopyIcon v-else />
                  {{
                    copied
                      ? t('dev_tools.copied', {}, 'Copied')
                      : t('dev_tools.copy', {}, 'Copy JSON')
                  }}
                </Button>
              </div>
              <Input
                v-model="query"
                type="search"
                :placeholder="t('dev_tools.search', {}, 'Search keys and values')"
                :aria-label="t('dev_tools.search', {}, 'Search keys and values')"
                class="mb-2 h-8"
              />
              <p
                v-if="query.trim() !== '' && search.matches.size === 0"
                class="text-muted-foreground text-sm"
              >
                {{
                  t('dev_tools.no_matches', { query: query.trim() }, 'Nothing matches “:query”.')
                }}
              </p>
              <ul
                v-else
                dir="ltr"
                role="tree"
                :aria-label="t('dev_tools.schema', {}, 'Schema')"
                class="bg-muted/40 overflow-x-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
              >
                <DevToolsJsonNode
                  v-for="entry in roots"
                  :key="entry.path"
                  :entry="entry"
                  :depth="0"
                  :search="search"
                  :query="query"
                />
              </ul>
            </section>
          </div>
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
</template>
