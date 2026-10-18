<script setup lang="ts">
import type { FormStore } from '@alfakit/core'
import { byteLength, debugRecorder, formatBytes } from '@alfakit/core'
import { BugIcon, ChevronRightIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useStore } from '../../composables/use-store'
import { useAlfakitProps, useDirection, useT } from '../../context'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import CollapsibleTrigger from '../ui/CollapsibleTrigger.vue'
import ScrollArea from '../ui/ScrollArea.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetDescription from '../ui/SheetDescription.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import SheetTrigger from '../ui/SheetTrigger.vue'
import Tabs from '../ui/Tabs.vue'
import TabsContent from '../ui/TabsContent.vue'
import TabsList from '../ui/TabsList.vue'
import TabsTrigger from '../ui/TabsTrigger.vue'
import DebugFormState from './DebugFormState.vue'
import DebugTreeNode from './DebugTreeNode.vue'

/**
 * The developer debug panel: a top bar toggle that opens a drawer with the page's resolved
 * schema tree (visibility and authorisation per component, closures evaluated), the live
 * form state, the internal requests captured by `requestJson()` and timings. Rendered only
 * when the page carries the `alfakitDebug` prop, which PHP adds while `Panel::debugPanel()`
 * is active and `app.debug` is on. Replace it with `components: { 'panel:debug-panel': … }`.
 */
const t = useT()
const props = useAlfakitProps()
const direction = useDirection()
const debug = computed(() => props.value.alfakitDebug)
const state = useStore(debugRecorder.store)
const payloadBytes = computed(() => byteLength(props.value))

const json = (value: unknown): string => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const pathOf = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://localhost')

    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

const forms = computed(() => state.value.forms as FormStore[])
</script>

<template>
  <Sheet v-if="debug">
    <SheetTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="t('debug.open', {}, 'Open debug panel')"
        data-slot="debug-toggle"
      >
        <BugIcon />
      </Button>
    </SheetTrigger>
    <SheetContent
      :side="direction === 'rtl' ? 'left' : 'right'"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <div data-slot="debug-panel" class="flex min-h-0 flex-1 flex-col">
        <SheetHeader class="border-b">
          <SheetTitle class="flex items-center gap-2">
            <BugIcon class="size-4" />
            {{ t('debug.title', {}, 'Debug') }}
          </SheetTitle>
          <SheetDescription class="truncate font-mono text-xs" :title="debug.page">
            {{ debug.page }}
          </SheetDescription>
        </SheetHeader>
        <Tabs default-value="schema" class="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList class="mx-4 mt-3 grid w-auto grid-cols-4">
            <TabsTrigger value="schema">{{ t('debug.schema', {}, 'Schema') }}</TabsTrigger>
            <TabsTrigger value="form">
              {{ t('debug.form', {}, 'Form') }}
              <span
                v-if="forms.length > 0"
                class="bg-muted text-muted-foreground ms-1.5 rounded-full px-1.5 font-mono text-[10px] tabular-nums"
                >{{ forms.length }}</span
              >
            </TabsTrigger>
            <TabsTrigger value="requests">
              {{ t('debug.requests', {}, 'Requests') }}
              <span
                v-if="state.requests.length > 0"
                class="bg-muted text-muted-foreground ms-1.5 rounded-full px-1.5 font-mono text-[10px] tabular-nums"
                >{{ state.requests.length }}</span
              >
            </TabsTrigger>
            <TabsTrigger value="timings">{{ t('debug.timings', {}, 'Timings') }}</TabsTrigger>
          </TabsList>
          <ScrollArea class="min-h-0 flex-1">
            <TabsContent value="schema" class="p-4 text-sm">
              <p v-if="debug.tree.length === 0" class="text-muted-foreground text-sm">
                {{ t('debug.no_tree', {}, 'The server sent no schema tree for this page.') }}
              </p>
              <ul v-else class="space-y-0.5 font-mono text-xs">
                <DebugTreeNode
                  v-for="(node, index) in debug.tree"
                  :key="`${node.key ?? node.type}-${index}`"
                  :node="node"
                  :depth="0"
                />
              </ul>
            </TabsContent>
            <TabsContent value="form" class="space-y-4 p-4 text-sm">
              <p v-if="forms.length === 0" class="text-muted-foreground text-sm">
                {{ t('debug.no_forms', {}, 'No forms on this page.') }}
              </p>
              <DebugFormState v-for="(form, index) in forms" :key="index" :form="form" />
            </TabsContent>
            <TabsContent value="requests" class="space-y-2 p-4 text-sm">
              <p v-if="state.requests.length === 0" class="text-muted-foreground text-sm">
                {{ t('debug.no_requests', {}, 'No internal requests yet.') }}
              </p>
              <template v-else>
                <div class="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="debugRecorder.clearRequests()"
                  >
                    {{ t('debug.clear', {}, 'Clear') }}
                  </Button>
                </div>
                <Collapsible
                  v-for="request in state.requests"
                  :key="request.id"
                  class="rounded-md border"
                >
                  <CollapsibleTrigger
                    class="flex w-full items-center gap-2 px-3 py-2 text-start [&[data-state=open]>svg]:rotate-90"
                  >
                    <ChevronRightIcon
                      class="text-muted-foreground size-3.5 shrink-0 transition-transform rtl:rotate-180"
                    />
                    <span class="font-mono text-xs font-semibold">{{ request.method }}</span>
                    <span class="min-w-0 flex-1 truncate font-mono text-xs" :title="request.url">{{
                      pathOf(request.url)
                    }}</span>
                    <Badge
                      :variant="
                        request.status === 0 || request.status >= 400 ? 'destructive' : 'secondary'
                      "
                      class="font-mono"
                      >{{
                        request.status === 0 ? t('debug.failed', {}, 'failed') : request.status
                      }}</Badge
                    >
                    <span class="text-muted-foreground font-mono text-xs tabular-nums"
                      >{{ request.duration }} ms</span
                    >
                  </CollapsibleTrigger>
                  <CollapsibleContent class="space-y-2 border-t px-3 py-2">
                    <dl
                      class="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs"
                    >
                      <dt>{{ t('debug.duration', {}, 'Duration') }}</dt>
                      <dd class="font-mono tabular-nums">
                        {{ request.duration }} ms
                        <template v-if="request.serverDuration !== null">
                          ({{ t('debug.server_time', {}, 'Server time') }}:
                          {{ request.serverDuration }} ms)
                        </template>
                      </dd>
                      <dt>{{ t('debug.size', {}, 'Size') }}</dt>
                      <dd class="font-mono tabular-nums">
                        ↑ {{ formatBytes(request.requestBytes) }} · ↓
                        {{ formatBytes(request.responseBytes) }}
                      </dd>
                    </dl>
                    <pre
                      v-if="request.request !== undefined && request.request !== null"
                      dir="ltr"
                      class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
                      >{{ json(request.request) }}</pre>
                    <pre
                      dir="ltr"
                      class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
                      >{{ json(request.response) }}</pre>
                  </CollapsibleContent>
                </Collapsible>
              </template>
            </TabsContent>
            <TabsContent value="timings" class="space-y-4 p-4 text-sm">
              <dl class="grid grid-cols-2 gap-3">
                <div class="rounded-md border p-3">
                  <dt class="text-muted-foreground text-xs">
                    {{ t('debug.server_time', {}, 'Server time') }}
                  </dt>
                  <dd class="font-mono text-sm font-semibold tabular-nums">
                    {{ debug.server.duration }} ms
                  </dd>
                </div>
                <div class="rounded-md border p-3">
                  <dt class="text-muted-foreground text-xs">
                    {{ t('debug.queries', {}, 'Queries') }}
                  </dt>
                  <dd class="font-mono text-sm font-semibold tabular-nums">
                    {{ debug.server.queries }} · {{ debug.server.queryTime }} ms
                  </dd>
                </div>
                <div class="rounded-md border p-3">
                  <dt class="text-muted-foreground text-xs">
                    {{ t('debug.memory', {}, 'Peak memory') }}
                  </dt>
                  <dd class="font-mono text-sm font-semibold tabular-nums">
                    {{ formatBytes(debug.server.memory) }}
                  </dd>
                </div>
                <div class="rounded-md border p-3">
                  <dt class="text-muted-foreground text-xs">
                    {{ t('debug.payload', {}, 'Page payload') }}
                  </dt>
                  <dd class="font-mono text-sm font-semibold tabular-nums">
                    {{ formatBytes(payloadBytes) }}
                  </dd>
                </div>
              </dl>
              <p class="text-muted-foreground font-mono text-xs">
                PHP {{ debug.server.php }} · Laravel {{ debug.server.laravel }}
              </p>
              <section>
                <h3 class="mb-2 text-sm font-medium">
                  {{ t('debug.closures', {}, 'Closures evaluated') }}
                  <span
                    v-if="debug.closures.length > 0"
                    class="bg-muted text-muted-foreground ms-1.5 rounded-full px-1.5 font-mono text-[10px] tabular-nums"
                    >{{ debug.closures.length }}</span
                  >
                </h3>
                <p v-if="debug.closures.length === 0" class="text-muted-foreground text-sm">
                  {{ t('debug.no_closures', {}, 'No closures were evaluated.') }}
                </p>
                <ul v-else class="divide-y rounded-md border font-mono text-xs">
                  <li
                    v-for="(closure, index) in debug.closures"
                    :key="index"
                    class="flex items-center gap-2 px-3 py-1.5"
                  >
                    <span class="font-semibold">{{ closure.owner }}</span>
                    <span
                      class="text-muted-foreground min-w-0 flex-1 truncate"
                      :title="closure.file"
                      >{{ closure.file }}:{{ closure.line }}</span
                    >
                    <Badge v-if="closure.count > 1" variant="secondary">{{
                      t('debug.times', { count: closure.count }, '×:count')
                    }}</Badge>
                  </li>
                </ul>
              </section>
              <section v-if="(debug.deprecations ?? []).length > 0">
                <h3 class="mb-2 text-sm font-medium">
                  {{ t('debug.deprecations', {}, 'Deprecations') }}
                  <span class="bg-muted ms-1 rounded px-1.5 py-0.5 font-mono text-xs">{{
                    debug.deprecations?.length
                  }}</span>
                </h3>
                <ul class="divide-y rounded-md border text-xs">
                  <li
                    v-for="item in debug.deprecations"
                    :key="item.subject"
                    class="flex flex-col gap-0.5 px-3 py-1.5"
                  >
                    <span class="font-mono font-semibold"
                      >{{ item.subject
                      }}<span v-if="item.since" class="text-muted-foreground font-normal">
                        · {{ item.since }}</span
                      ></span
                    >
                    <span class="text-muted-foreground">{{ item.message }}</span>
                  </li>
                </ul>
              </section>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </SheetContent>
  </Sheet>
</template>
