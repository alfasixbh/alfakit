import { defineComponent, h } from 'vue'
import { lazyComponent } from '../../lib/lazy'
import FieldPlaceholder from './FieldPlaceholder.vue'

/** `ModalTableSelect`; its code (the picker's table) loads the first time one is shown. */
export const ModalTableSelectField = lazyComponent(
  'ModalTableSelectField',
  () => import('./ModalTableSelectField.vue').then((module) => module.default),
  FieldPlaceholder,
)

/** The query builder filter's rules; its code loads the first time one is shown. */
export const QueryBuilderRulesField = lazyComponent(
  'QueryBuilderRulesField',
  () => import('./QueryBuilderRulesField.vue').then((module) => module.default),
  defineComponent({
    name: 'QueryBuilderRulesPlaceholder',
    inheritAttrs: false,
    setup:
      (_, { attrs }) =>
      () =>
        h(FieldPlaceholder, { component: attrs.component as object, height: 'h-24' }),
  }),
)
