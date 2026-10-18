import { defineComponent, h } from 'vue'
import { lazyComponent } from '../../lib/lazy'

/** A streamed AI answer; its code loads the first time an answer streams. */
export const AiStream = lazyComponent(
  'AiStream',
  () => import('./AiStream.vue').then((module) => module.default),
  defineComponent({
    name: 'AiStreamLoading',
    render: () => h('div', { 'data-slot': 'ai-stream', class: 'h-12', 'aria-busy': 'true' }),
  }),
)
