import { defineComponent } from 'vue'
import { lazyComponent } from '../../lib/lazy'

/** The chat slide-over; its code loads the first time the copilot opens. */
export const CopilotPanel = lazyComponent(
  'AiCopilotPanel',
  () => import('./CopilotPanel.vue').then((module) => module.default),
  defineComponent({ name: 'AiCopilotPanelLoading', render: () => null }),
)

export function preloadCopilotPanel(): void {
  void import('./CopilotPanel.vue')
}
