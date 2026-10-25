<script setup lang="ts">
import {
  customPageProps,
  openDefaultAction,
  resolveLazyComponents,
  type DefaultActionOpener,
} from '@alfakit/core'
import { Head } from '@inertiajs/vue3'
import { computed, onMounted, watch } from 'vue'
import { providePageActionContext } from '../components/actions/action-context'
import { useActionRunner, useAlfakit, useAlfakitProps, usePanel, useT } from '../context'
import PageContent from './PageContent.vue'
import PageShell from './PageShell.vue'

/**
 * `Alfakit/Page`: renders any schema-driven page. Custom pages (`Page::$component`) are
 * resolved from the `pages` map passed to `createAlfakit()`.
 */
const props = useAlfakitProps()
const panel = usePanel()
const t = useT()
const { pages } = useAlfakit()
// Lazy widgets and relation managers arrive in a deferred prop after the first response.
const page = computed(() =>
  props.value.page ? resolveLazyComponents(props.value.page, props.value.alfakitLazy) : undefined,
)
// Starter kit mode: the host's `title` callback adds the application name.
const title = computed(() =>
  page.value
    ? panel.value.starterKit
      ? page.value.title
      : `${page.value.title} - ${panel.value.brandName}`
    : panel.value.brandName,
)
const custom = computed(() => (page.value?.view ? pages[page.value.view.component] : undefined))
// A custom component brings its own `PageShell` (as in panel mode, where it is the Inertia
// page itself) and takes the live props, so `reloadProps()` reaches it.
const customProps = computed(() =>
  customPageProps(page.value?.view?.props, props.value as Record<string, unknown>),
)

// The page's default action (`$defaultAction`, `?tableAction=`) opens once the page has
// hydrated, and once per page: re-renders after the action ran don't open it again.
const runner = useActionRunner()
const opener: DefaultActionOpener = { opened: null }
const openDefault = () =>
  openDefaultAction(page.value, opener, (action, context) => runner.trigger(action, context))

onMounted(() => {
  openDefault()
  watch(page, openDefault)
})

providePageActionContext({
  get token() {
    return page.value?.token ?? ''
  },
  component: 'page',
})
</script>

<template>
  <template v-if="page">
    <Head :title="title" />
    <div v-if="page.view && !custom" class="text-destructive p-6">
      {{
        t(
          'page_not_registered',
          { component: page.view.component },
          `Page component ${page.view.component} is not registered in createAlfakit({ pages }).`,
        )
      }}
    </div>
    <component :is="custom" v-else-if="page.view && custom" v-bind="customProps" :page="page" />
    <PageShell v-else :page="page">
      <PageContent :page="page" />
    </PageShell>
  </template>
</template>
