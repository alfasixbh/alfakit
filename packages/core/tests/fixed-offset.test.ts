import { describe, expect, it } from 'vitest'
import { fixedContainingBlockOffset } from '../src/rich-editor'

// W-V4-08: the mention list of an editor in a modal was offset by the dialog's transform.
describe('fixedContainingBlockOffset', () => {
  it("returns the transformed ancestor's position", () => {
    const dialog = document.createElement('div')
    dialog.style.transform = 'translate(-50%, -50%)'
    dialog.getBoundingClientRect = () => ({ left: 120, top: 80 }) as DOMRect
    const editor = document.createElement('div')
    dialog.append(editor)
    document.body.append(dialog)

    expect(fixedContainingBlockOffset(editor)).toEqual({ x: 120, y: 80 })
    dialog.remove()
  })

  it('is zero without such an ancestor', () => {
    const editor = document.createElement('div')
    document.body.append(editor)

    expect(fixedContainingBlockOffset(editor)).toEqual({ x: 0, y: 0 })
    expect(fixedContainingBlockOffset(null)).toEqual({ x: 0, y: 0 })
    editor.remove()
  })
})
