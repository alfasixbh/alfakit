import type { ActionContext, ActionRunner, FormStore, RichEditorSchema } from '@alfakit/core'
import {
  customBlockNodeConfig,
  EditorSuggestions,
  fieldActionContext,
  isCustomBlockResult,
  mentionNodeConfig,
  mergeTagNodeConfig,
  RichEditorRemote,
} from '@alfakit/core'
import { Node, type Editor, type Extensions } from '@tiptap/core'

type NodeConfig = Parameters<typeof Node.create>[0]

export interface RichEditorExtensions {
  extensions: Extensions
  suggestions: EditorSuggestions
  /** Insert a custom block (opening its modal first when it has a form). */
  insertBlock: (id: string) => Promise<void>
  /** The field's action context (for plugin tools that open an editor action). */
  context: () => ActionContext
}

/**
 * Mentions, merge tags and custom blocks for a RichEditor. The getters return the latest
 * props and the live editor, which the node views and suggestions act on.
 */
export function createRichEditorExtensions(options: {
  component: () => RichEditorSchema
  editor: () => Editor | null
  form: FormStore | null
  token: () => string
  runner: ActionRunner
  t: (key: string, replace: Record<string, string | number>, fallback: string) => string
}): RichEditorExtensions {
  const initial = options.component()
  const remote = new RichEditorRemote(options.form, initial.statePath)
  const suggestions = new EditorSuggestions({
    mentions: initial.mentions ?? [],
    mergeTags: initial.mergeTags ?? [],
    search: (trigger, query) => remote.searchMentions(trigger, query),
  })

  const context = (): ActionContext =>
    fieldActionContext({ token: options.token(), form: options.form, key: options.component().key })

  const runBlock = async (id: string, config?: Record<string, unknown>) => {
    const block = options.component().customBlocks?.find((candidate) => candidate.id === id)

    if (!block) return null

    const result = await options.runner.runField(block.action, {
      ...context(),
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
          return options.component().customBlocks ?? []
        },
        loadPreview: (id, config) => remote.loadPreview(id, config),
        onEdit: ({ id, config, pos }) => {
          void runBlock(id, config).then((result) => {
            const editor = options.editor()

            if (!result || !editor || editor.isDestroyed) return

            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, { id, config: result.config }),
            )
          })
        },
        labels: {
          edit: options.t('editor.edit_block', {}, 'Edit block'),
          remove: options.t('editor.remove_block', {}, 'Remove block'),
        },
        minimal: Boolean(initial.minimalCustomBlockControls),
      }) as NodeConfig,
    ),
  ]

  const insertBlock = async (id: string) => {
    const result = await runBlock(id)
    const editor = options.editor()

    if (!result || !editor || editor.isDestroyed) return

    const block = { type: 'customBlock', attrs: { id: result.id, config: result.config } }
    // A block inserted just before is still selected (a node selection): insert after it
    // instead of replacing it (W-S2-05).
    const { selection } = editor.state
    const chain = editor.chain().focus()
    ;('node' in selection && selection.node
      ? chain.insertContentAt(selection.to, block)
      : chain.insertContent(block)
    ).run()
  }

  return { extensions, suggestions, insertBlock, context }
}
