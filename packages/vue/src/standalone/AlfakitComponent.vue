<script setup lang="ts">
import {
  StandaloneComponentState,
  findStandalonePropName,
  registerStandaloneProp,
  standalonePanelSchema,
  type ContentBlock,
  type StandaloneComponentSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { ConfigProvider } from 'reka-ui'
import { computed, onMounted, onScopeDispose, provide, ref, watch, type HTMLAttributes } from 'vue'
import { providePageActionContext } from '../components/actions/action-context'
import ActionList from '../components/actions/ActionList.vue'
import ActionModals from '../components/actions/ActionModals.vue'
import TooltipProvider from '../components/ui/TooltipProvider.vue'
import {
  ALFAKIT_KEY,
  provideStandalone,
  useOptionalAlfakit,
  type AlfakitContextValue,
  type AnyComponent,
} from '../context'
import { cn } from '../lib/utils'
import ContentBlockRenderer from '../pages/ContentBlockRenderer.vue'
import AlfakitToaster from './AlfakitToaster.vue'
import {
  claimToaster,
  createStandaloneContext,
  createStandaloneRegistry,
  ensureStandaloneRuntime,
  hasToaster,
} from './runtime'

/**
 * Renders an Alfakit component outside a panel: a form, table, infolist, widgets or any mix
 * (`AlfaSix\Alfakit\Standalone\*`) in any Inertia page of the application. Needs no
 * `createAlfakit()` and no panel layout: it provides its own translator, registry, action
 * runner and modals, and inherits the application's shadcn tokens.
 *
 * ```vue
 * <AlfakitComponent :component="orders" class="max-w-4xl" />
 * ```
 *
 * Slots: `header` (above the content blocks), `footer` (below), and the default slot to
 * render the blocks yourself: `<template #default="{ blocks }">…<ContentBlockRenderer :block="…" />`.
 */
const props = defineProps<{
  /** The payload: `ContactForm::make()` passed as an Inertia prop. */
  component: StandaloneComponentSchema
  /** Renderer overrides for this instance (`{ TextInput: MyInput }`), on top of `configureAlfakit()`. */
  components?: Record<string, AnyComponent>
  class?: HTMLAttributes['class']
}>()

defineSlots<{
  header?: () => unknown
  footer?: () => unknown
  default?: (props: { blocks: ContentBlock[]; page: StandaloneComponentSchema }) => unknown
}>()

const parent = useOptionalAlfakit()
const inertiaPage = usePage()

// Lazy and polled schemas of this component, merged into the page it renders.
const version = ref(0)
const state = new StandaloneComponentState(props.component, () => version.value++)
const poll = (target: string, interval: string | number | null | undefined) =>
  state.poll(target, interval)
const refresh = (targets: string[]) => state.refresh(targets)

// Inside a panel page: the panel's registry and translator, but this component's own action
// runner, so its actions post to its own endpoints with its own token (not the panel's: 403).
const context: AlfakitContextValue = parent
  ? {
      ...parent,
      actions: createStandaloneContext(
        { action: props.component.endpoints.action, modal: props.component.endpoints.modal },
        props.components,
        poll,
      ).actions,
      registry: createStandaloneRegistry(props.components, parent.registry),
      poll,
      refresh,
    }
  : {
      ...createStandaloneContext(
        { action: props.component.endpoints.action, modal: props.component.endpoints.modal },
        props.components,
        poll,
      ),
      refresh,
    }

provide(ALFAKIT_KEY, context)

const panel = computed(() => standalonePanelSchema(props.component))
const page = computed(() => {
  void version.value
  state.setComponent(props.component)

  return state.page
})
const direction = computed(() => props.component.localization?.direction ?? 'ltr')
const actionContext = computed(() => ({ token: props.component.token, component: 'page' }))

provideStandalone({ panel, page })
providePageActionContext(actionContext.value)

// Endpoints and strings follow the latest payload (they change per locale or path).
watch(
  () => props.component,
  (component) => {
    context.actions.setEndpoints({
      action: component.endpoints.action,
      modal: component.endpoints.modal,
    })

    // Inside `createAlfakit()` the panel feeds the shared translator; on a page without the
    // `alfakit` prop (the rest of the app) the component's own translations apply.
    if (!parent || !(inertiaPage.props as Record<string, unknown>).alfakit) {
      context.translator.setTranslations(component.translations ?? {})
      context.translator.setLocale(component.localization?.tag ?? 'en')
    }
  },
  { immediate: true, flush: 'sync' },
)

// Toasts: use the layout's <AlfakitToaster /> when there is one, else the first component
// on the page renders one (checked after every component mounted).
const ownsToaster = ref(false)

onMounted(() => {
  ensureStandaloneRuntime()

  // Partial reloads (sorting, paging, inline edits) request this component's own prop.
  watch(
    () => findStandalonePropName(inertiaPage.props as Record<string, unknown>, props.component),
    (name, _old, onCleanup) => onCleanup(registerStandaloneProp(name ?? null)),
    { immediate: true },
  )

  // The watcher runs before the new payload renders: hand it over, or the response would
  // count as stale and lazy widgets (a calendar after its action) keep their old schema.
  watch(
    () => props.component.token,
    () => void state.loadLazy(props.component),
    { immediate: true },
  )

  if (parent) return

  let release: (() => void) | null = null
  let cancelled = false

  queueMicrotask(() => {
    if (cancelled || hasToaster()) return

    release = claimToaster()
    ownsToaster.value = true
  })

  onScopeDispose(() => {
    cancelled = true
    release?.()
  })
})
</script>

<template>
  <component
    :is="parent ? 'div' : ConfigProvider"
    :dir="parent ? undefined : direction"
    :class="parent ? 'contents' : undefined"
  >
    <TooltipProvider :delay-duration="0">
      <div
        data-slot="standalone"
        :data-alfakit-component="props.component.class"
        :dir="direction"
        :class="cn('flex flex-col gap-6', props.class)"
      >
        <header
          v-if="page.heading || page.headerActions?.length"
          data-slot="page-header"
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="min-w-0">
            <h2 v-if="page.heading" class="text-xl font-semibold tracking-tight">
              {{ page.heading }}
            </h2>
            <p v-if="page.subheading" class="text-muted-foreground mt-1 text-sm">
              {{ page.subheading }}
            </p>
          </div>
          <ActionList
            v-if="page.headerActions && page.headerActions.length > 0"
            :actions="page.headerActions"
            :context="actionContext"
            align="end"
            class="max-w-full shrink-0"
          />
        </header>
        <slot name="header" />
        <slot :blocks="page.content" :page="props.component">
          <ContentBlockRenderer v-for="block in page.content" :key="block.key" :block="block" />
        </slot>
        <slot name="footer" />
      </div>
      <ActionModals />
      <AlfakitToaster v-if="ownsToaster" claimed :dir="direction" />
    </TooltipProvider>
  </component>
</template>
