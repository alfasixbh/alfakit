<script setup lang="ts">
import type { CodeEditorSchema, TextEdit } from '@alfakit/core'
import { countCodeLines, highlightCode, indentCode, newlineWithIndent } from '@alfakit/core'
import { computed, nextTick } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import { codeTokenClasses } from './code-tokens'

/**
 * A textarea layered over its highlighted copy: the browser keeps native editing,
 * selection, undo and screen reader support, and the copy underneath shows the colours.
 * Tab indents (Shift+Tab outdents); Escape then Tab moves focus on.
 */
const props = defineProps<{ component: CodeEditorSchema }>()
const t = useT()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
  () => props.component,
)
const code = computed(() => (typeof value.value === 'string' ? value.value : ''))
const tokens = computed(() => highlightCode(code.value, props.component.language))
const lines = computed(() => countCodeLines(code.value))
const locked = computed(() => disabled.value || readOnly.value)
const hintId = `${id}-tab-hint`
const describedBy = computed(
  () =>
    [aria.value['aria-describedby'], locked.value ? null : hintId].filter(Boolean).join(' ') ||
    undefined,
)
let releaseTab = false

const layer = computed(() =>
  cn(
    'col-start-1 row-start-1 m-0 min-w-0 border-0 p-3 font-mono text-sm leading-6',
    props.component.wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
  ),
)
const inputClass = computed(() =>
  cn(
    layer.value,
    'caret-foreground placeholder:text-muted-foreground selection:bg-primary/25 resize-none overflow-hidden bg-transparent text-transparent outline-none selection:text-transparent',
  ),
)

const apply = async (target: HTMLTextAreaElement, edit: TextEdit) => {
  setValue(edit.value)
  await nextTick()
  target.setSelectionRange(edit.selectionStart, edit.selectionEnd)
}

const onKeydown = (event: KeyboardEvent) => {
  if (locked.value) return

  const target = event.currentTarget as HTMLTextAreaElement

  if (event.key === 'Escape') {
    releaseTab = true
    return
  }

  if (event.key === 'Tab' && !releaseTab) {
    event.preventDefault()
    void apply(
      target,
      indentCode(
        code.value,
        target.selectionStart,
        target.selectionEnd,
        props.component.tabSize,
        event.shiftKey,
      ),
    )
  } else if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    void apply(target, newlineWithIndent(code.value, target.selectionStart, target.selectionEnd))
  }

  releaseTab = false
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      dir="ltr"
      data-slot="code-editor"
      :data-language="props.component.language"
      :class="
        cn(
          'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex overflow-auto rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )
      "
      :style="{
        minHeight: props.component.minHeight ? `${props.component.minHeight}px` : undefined,
        maxHeight: props.component.maxHeight ? `${props.component.maxHeight}px` : undefined,
      }"
    >
      <div
        v-if="props.component.lineNumbers"
        aria-hidden="true"
        class="bg-muted/40 text-muted-foreground sticky start-0 shrink-0 border-e py-3 ps-3 pe-2 text-end font-mono text-sm leading-6 select-none"
      >
        <div v-for="line in lines" :key="line">{{ line }}</div>
      </div>
      <div class="grid min-w-0 flex-1">
        <pre
          aria-hidden="true"
          :class="cn(layer, 'pointer-events-none')"
        ><template v-for="(token, index) in tokens" :key="index"><span v-if="token.kind !== 'plain'" :class="codeTokenClasses[token.kind]">{{ token.text }}</span><template v-else>{{ token.text }}</template></template>{{ '\n' }}</pre>
        <textarea
          :id="id"
          :name="props.component.name"
          :value="code"
          :disabled="disabled"
          :readonly="readOnly"
          :required="props.component.required"
          :autofocus="props.component.autofocus"
          :maxlength="props.component.maxLength"
          :placeholder="props.component.placeholder"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          :wrap="props.component.wrap ? 'soft' : 'off'"
          :aria-invalid="aria['aria-invalid']"
          :aria-required="aria['aria-required']"
          :aria-describedby="describedBy"
          v-bind="props.component.extraInputAttributes"
          :class="inputClass"
          :style="{ tabSize: props.component.tabSize }"
          @input="setValue(($event.target as HTMLTextAreaElement).value)"
          @keydown="onKeydown"
          @blur="blur()"
        />
      </div>
    </div>
    <span v-if="!locked" :id="hintId" class="sr-only">{{
      t('code_editor.tab_hint', {}, 'Tab indents. Press Escape, then Tab, to leave the editor.')
    }}</span>
  </FieldWrapper>
</template>
