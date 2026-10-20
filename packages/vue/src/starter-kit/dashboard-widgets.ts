import {
  standaloneWidgetCount,
  starterKitDashboardWidgets,
  type StandaloneComponentSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, defineComponent, h, type PropType } from 'vue'
import type { AnyComponent } from '../context'
import { lazyComponent } from '../lib/lazy'

/** Widget-sized boxes until the widgets' code has loaded (also during SSR). */
const WidgetsPlaceholder = defineComponent({
  name: 'AlfakitWidgetsPlaceholder',
  props: {
    component: { type: Object as PropType<StandaloneComponentSchema>, required: true },
    // Declared so it does not fall through as an attribute.
    components: { type: Object as PropType<Record<string, AnyComponent>>, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          'data-slot': 'starter-kit-widgets-placeholder',
          'aria-busy': 'true',
          class: 'grid auto-rows-min gap-4 md:grid-cols-2',
        },
        Array.from({ length: Math.max(standaloneWidgetCount(props.component), 1) }, (_, index) =>
          h('div', {
            key: index,
            'aria-hidden': 'true',
            class: 'bg-muted h-28 animate-pulse rounded-xl',
          }),
        ),
      )
  },
})

const LoadedWidgets = lazyComponent(
  'AlfakitLoadedWidgets',
  () => import('../standalone/AlfakitComponent.vue').then((module) => module.default),
  WidgetsPlaceholder,
)

/**
 * The dashboard widgets of a `starterKit()` panel on the host's own dashboard. Reads the
 * `alfakitWidgets` prop (shared on the panel's `starterKitDashboard()` pages only, the
 * starter kit's `/dashboard` by default) and renders the widgets with the host's theme, as
 * `<AlfakitComponent>` renders standalone widgets: lazy widgets, polling and table widget
 * actions go through the panel's endpoints. Its code loads once mounted; the server render
 * and hydration show placeholders. Renders its default slot (the kit's placeholder boxes)
 * when there are no widgets to show: other pages, guests, users who may not open the panel.
 *
 * ```vue
 * <script setup lang="ts">
 * import { AlfakitWidgets } from '@alfakit/vue'
 * </script>
 *
 * <template>
 *   <AlfakitWidgets>
 *     <MyEmptyState />
 *   </AlfakitWidgets>
 * </template>
 * ```
 */
export const AlfakitWidgets = defineComponent({
  name: 'AlfakitWidgets',
  inheritAttrs: false,
  props: {
    /** The `starterKit()` panel whose widgets to show (the first one by default). */
    panel: { type: String as PropType<string | undefined>, default: undefined },
    /** Frontend components of custom widgets (`{ RevenueWidget }`), as for `<AlfakitComponent>`. */
    components: {
      type: Object as PropType<Record<string, AnyComponent> | undefined>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots }) {
    const page = usePage()
    const component = computed(() => starterKitDashboardWidgets(page.props, props.panel))

    return () =>
      component.value
        ? h('div', { 'data-slot': 'starter-kit-widgets' }, [
            h(LoadedWidgets, {
              component: component.value,
              components: props.components,
              class: attrs.class,
            }),
          ])
        : slots.default?.()
  },
})
