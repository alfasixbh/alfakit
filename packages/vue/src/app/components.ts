import { resolveLazyComponents, type ContentBlock, type PageSchema } from '@alfakit/core'
import { Head } from '@inertiajs/vue3'
import { computed, defineComponent, h, type ComputedRef, type PropType } from 'vue'
import { providePageActionContext } from '../components/actions/action-context'
import { useAlfakitProps, usePageSchema, usePanel } from '../context'
import { cn } from '../lib/utils'
import ContentBlockRenderer from '../pages/ContentBlockRenderer.vue'
import PageShell from '../pages/PageShell.vue'

/**
 * Building blocks for custom page components: the page shell with the panel layout, and the
 * page's PHP-defined pieces rendered by name, with live fields, actions, uploads and polling
 * working exactly as on schema-driven pages.
 */

/** The current page with its lazy components resolved. */
export function useAppPage(): ComputedRef<PageSchema | undefined> {
  const props = useAlfakitProps()
  const page = usePageSchema()

  return computed(() =>
    page.value ? resolveLazyComponents(page.value, props.value.alfakitLazy) : undefined,
  )
}

/** A content block of the page by key (`form:customer`, `table`, `headerWidgets`…). */
export function usePageBlock(key: string): ComputedRef<ContentBlock | undefined> {
  const page = useAppPage()

  return computed(() => page.value?.content.find((block) => block.key === key))
}

/**
 * The page's layout (sidebar and topbar, `fullscreen`…), heading, header actions and
 * document title around a custom component: `<AppPage>…</AppPage>`.
 */
export const AppPage = defineComponent({
  name: 'AppPage',
  setup(_, { slots }) {
    const page = useAppPage()
    const panel = usePanel()

    providePageActionContext({
      get token() {
        return page.value?.token ?? ''
      },
      component: 'page',
    })

    return () => {
      if (!page.value) return slots.default?.()

      return [
        h(Head, { title: `${page.value.title} - ${panel.value.brandName}` }),
        h(PageShell, { page: page.value }, { default: () => slots.default?.() }),
      ]
    }
  },
})

/** Render any content block of the page by key; the `fallback` slot when it has none. */
export const PageBlock = defineComponent({
  name: 'PageBlock',
  props: {
    /** `form:customer`, `table:products`, `infolist:summary`, `form`, `table`, `content`… */
    name: { type: String, required: true },
    class: { type: [String, Array, Object] as PropType<unknown>, default: undefined },
  },
  setup(props, { slots }) {
    const page = useAppPage()
    const block = computed(() => page.value?.content.find((item) => item.key === props.name))

    return () =>
      block.value
        ? h(
            'div',
            {
              'data-slot': 'page-block',
              'data-block': props.name,
              class: cn('min-w-0', props.class as string | undefined),
            },
            [h(ContentBlockRenderer, { block: block.value })],
          )
        : slots.fallback?.()
  },
})

function namedBlock(name: string, prefix: string, fallbackKey: string) {
  return defineComponent({
    name,
    props: {
      name: { type: String, default: undefined },
      class: { type: [String, Array, Object] as PropType<unknown>, default: undefined },
    },
    setup(props, { slots }) {
      return () =>
        h(
          PageBlock,
          { name: props.name ? `${prefix}:${props.name}` : fallbackKey, class: props.class },
          slots,
        )
    },
  })
}

/** A form defined by `{name}Form(Schema $schema)` (or the page's `form()` without a name). */
export const PageForm = namedBlock('PageForm', 'form', 'form')

/** A table defined by `{name}Table(Table $table)` (or the page's `table()` without a name). */
export const PageTable = namedBlock('PageTable', 'table', 'table')

/** An infolist defined by `{name}Infolist(Schema $schema)` (or the page's `infolist()`). */
export const PageInfolist = namedBlock('PageInfolist', 'infolist', 'infolist')

/** The page's header (default) or footer widgets. */
export const PageWidgets = defineComponent({
  name: 'PageWidgets',
  props: {
    position: { type: String as PropType<'header' | 'footer'>, default: 'header' },
    class: { type: [String, Array, Object] as PropType<unknown>, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h(
        PageBlock,
        {
          name: props.position === 'footer' ? 'footerWidgets' : 'headerWidgets',
          class: props.class,
        },
        slots,
      )
  },
})
