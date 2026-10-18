import {
  type AiCopilotSchema,
  CopilotController,
  type CopilotState,
  shortcuts,
} from '@alfakit/core'
import { SparklesIcon } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useT } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { Button } from '../ui/button'

/** The chat slide-over; its code loads the first time the copilot opens. */
const CopilotPanel = lazyComponent<{ controller: CopilotController }>(
  () => import('./copilot-panel').then((module) => module.CopilotPanel),
  () => null,
)

export function useCopilotState(controller: CopilotController): CopilotState {
  return useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.state,
    () => controller.state,
  )
}

/**
 * The copilot of alfasix/alfakit-ai (`ai:copilot`): a topbar button (and `mod+j`) opening
 * a chat slide-over. Questions, tools and actions run on the server; proposed actions
 * run only when the user confirms them in the chat.
 */
export function AiCopilot({ component }: { component: AiCopilotSchema }) {
  const t = useT()
  // One controller per panel: Inertia visits pass new props objects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const controller = useMemo(() => new CopilotController(component), [component.endpoints.send])
  const state = useCopilotState(controller)
  const [mounted, setMounted] = useState(false)
  const keys = JSON.stringify(component.keyBindings ?? [])
  const label = t('ai.open', {}, 'Open AI copilot')

  // The panel mounts the first time the copilot opens (button or shortcut), then stays.
  useEffect(() => controller.subscribe((next) => next.open && setMounted(true)), [controller])

  useEffect(() => {
    const bindings = JSON.parse(keys) as string[]

    if (bindings.length === 0) return

    return shortcuts.register({
      id: 'ai.copilot',
      keys: bindings,
      label,
      group: 'general',
      allowInInputs: true,
      handler: () => controller.toggle(),
    })
  }, [controller, keys, label])

  if (component.canUse === false) return null

  return (
    <div data-slot="ai-copilot" className="contents">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-slot="ai-copilot-trigger"
        aria-label={label}
        aria-expanded={state.open}
        aria-haspopup="dialog"
        title={label}
        onClick={() => controller.open()}
        onPointerEnter={() => void CopilotPanel.preload()}
        onFocus={() => void CopilotPanel.preload()}
      >
        <SparklesIcon aria-hidden="true" />
      </Button>
      {mounted && <CopilotPanel controller={controller} />}
    </div>
  )
}
