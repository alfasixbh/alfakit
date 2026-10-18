<script setup lang="ts" generic="T extends SchemaComponent">
import type { SchemaComponent } from '@alfakit/core'
import {
  deferredHasErrors,
  isDeferredPlaceholder,
  loadDeferredComponent,
  mergeDeferredComponent,
  reportRequestError,
  whenVisible,
} from '@alfakit/core'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { usePanel, useT } from '../../context'
import { useStoreSelector } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import Skeleton from '../ui/Skeleton.vue'
import { emptyFormState } from './deferred'

/**
 * `deferLoading()`: a skeleton until the placeholder scrolls into view (or a field inside
 * has an error), then the default slot with the loaded component. Inside a form the
 * loaded component is merged into the form's tree. SSR renders the skeleton.
 */
const props = defineProps<{ component: T; class?: string }>()
defineSlots<{ default(props: { component: T }): unknown }>()

const form = useOptionalFormStore()
const panel = usePanel()
const page = usePageActionContext()
const t = useT()
const element = ref<HTMLElement | null>(null)
const loaded = shallowRef<T | null>(null)
const errors = useStoreSelector(form?.store ?? emptyFormState, (state) => state.errors)

const resolved = computed<T>(() =>
  isDeferredPlaceholder(props.component) && loaded.value ? loaded.value : props.component,
)
const deferred = computed(() => isDeferredPlaceholder(resolved.value))
const hasErrors = computed(() => deferred.value && deferredHasErrors(props.component, errors.value))

let started = false
let stop: () => void = () => {}
const controller = typeof AbortController === 'undefined' ? null : new AbortController()

function load(): void {
  const url = panel.value?.endpoints?.schemaDeferred

  if (started || !url || !deferred.value) return

  started = true
  stop()

  loadDeferredComponent<T>({
    url,
    token: page.token,
    key: props.component.key,
    form,
    signal: controller?.signal,
  })
    .then((full) => {
      if (!form || !mergeDeferredComponent(form, full)) loaded.value = full
    })
    .catch((error: Error) => {
      started = false
      if (error.name !== 'AbortError') reportRequestError(error)
    })
}

onMounted(() => {
  if (!deferred.value) return

  if (hasErrors.value) load()
  else stop = whenVisible(element.value, load)
})

watch(hasErrors, (next) => {
  if (next) load()
})

onBeforeUnmount(() => {
  stop()
  controller?.abort()
})
</script>

<template>
  <div
    v-if="deferred"
    ref="element"
    data-slot="deferred-schema"
    role="status"
    aria-busy="true"
    :class="cn('flex flex-col gap-3', props.class)"
  >
    <span class="sr-only">{{ t('loading', {}, 'Loading…') }}</span>
    <Skeleton class="h-4 w-1/4" />
    <Skeleton class="h-9 w-full" />
    <Skeleton class="h-9 w-2/3" />
  </div>
  <slot v-else :component="resolved" />
</template>
