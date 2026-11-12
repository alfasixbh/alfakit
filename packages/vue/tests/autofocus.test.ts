import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Input from '../src/components/ui/Input.vue'
import Textarea from '../src/components/ui/Textarea.vue'

describe('autofocus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses an autofocus input or textarea when it mounts', () => {
    const input = mount(() => h(Input, { autofocus: true }), { attachTo: document.body })
    expect(document.activeElement).toBe(input.find('input').element)
    input.unmount()

    const textarea = mount(() => h(Textarea, { autofocus: true }), { attachTo: document.body })
    expect(document.activeElement).toBe(textarea.find('textarea').element)
    textarea.unmount()
  })

  it('leaves focus alone without the attribute, or when something else has it', () => {
    const plain = mount(() => h(Input), { attachTo: document.body })
    expect(document.activeElement).toBe(document.body)
    plain.unmount()

    const other = document.createElement('button')
    document.body.append(other)
    other.focus()
    mount(() => h(Input, { autofocus: true }), { attachTo: document.body })
    expect(document.activeElement).toBe(other)
  })
})
