import type { ActionContext, RichEditorSchema } from '@alfakit/core'
import {
  customBlockNodeConfig,
  EditorSuggestions,
  fieldActionContext,
  isCustomBlockResult,
  mentionNodeConfig,
  mergeTagNodeConfig,
  RichEditorRemote,
} from '@alfakit/core'
import { Node, type Editor, type Extensions } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, type ComputedRef, type ShallowRef } from 'vue'
import { useActionRunner, useT } from '../../context'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'

type NodeConfig = Parameters<typeof Node.create>[0]

export interface RichEditorExtensions {
  extensions: Extensions
  suggestions: EditorSuggestions
  /** Insert a custom block (opening its modal first when it has a form). */
  insertBlock: (id: string) => Promise<void>
  context: ComputedRef<ActionContext>
}

/**
 * Mentions, merge tags and custom blocks for a RichEditor. `editor` is the live editor the
 * custom block node views and suggestions act on.
 */
export function useRichEditorExtensions(
  component: () => RichEditorSchema,
  editor: ShallowRef<Editor | undefined>,
): RichEditorExtensions {
  const t = useT()
  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const runner = useActionRunner()
  const context = computed(() =>
    fieldActionContext({ token: page.token, form, key: component().key }),
  )
  const remote = new RichEditorRemote(form, component().statePath)
  const suggestions = new EditorSuggestions({
    mentions: component().mentions ?? [],
    mergeTags: component().mergeTags ?? [],
    search: (trigger, query) => remote.searchMentions(trigger, query),
  })

  onBeforeUnmount(() => suggestions.destroy())

  const runBlock = async (id: string, config?: Record<string, unknown>) => {
    const block = component().customBlocks?.find((candidate) => candidate.id === id)

    if (!block) return null

    const result = await runner.runField(block.action, {
      ...context.value,
      arguments: config ? { config, editing: true } : {},
    })

    if (!isCustomBlockResult(result)) return null

    if (result.preview !== undefined) {
      remote.primePreview(result.id, result.config, result.preview, result.prose === true)
    }

    return result
  }

  const extensions: Extensions = [
    Node.create(mentionNodeConfig() as NodeConfig),
    Node.create(mergeTagNodeConfig() as NodeConfig),
    Node.create(
      customBlockNodeConfig({
        get blocks() {
          return component().customBlocks ?? []
        },
        loadPreview: (id, config) => remote.loadPreview(id, config),
        onEdit: ({ id, config, pos }) => {
          void runBlock(id, config).then((result) => {
            const instance = editor.value

            if (!result || !instance || instance.isDestroyed) return

            instance.view.dispatch(
              instance.state.tr.setNodeMarkup(pos, undefined, { id, config: result.config }),
            )
          })
        },
        labels: {
          edit: t('editor.edit_block', {}, 'Edit block'),
          remove: t('editor.remove_block', {}, 'Remove block'),
        },
        minimal: Boolean(component().minimalCustomBlockControls),
      }) as NodeConfig,
    ),
  ]

  const insertBlock = async (id: string) => {
    const result = await runBlock(id)
    const instance = editor.value

    if (!result || !instance || instance.isDestroyed) return

    instance
      .chain()
      .focus()
      .insertContent({ type: 'customBlock', attrs: { id: result.id, config: result.config } })
      .run()
  }

  return { extensions, suggestions, insertBlock, context }
}
