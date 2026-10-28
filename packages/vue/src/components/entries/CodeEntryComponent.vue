<script setup lang="ts">
import type { CodeEntrySchema } from '@alfakit/core'
import { highlightCode } from '@alfakit/core'
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { codeTokenClasses } from '../fields/code-tokens'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'

/** `CodeEntry`: read-only code highlighted with the CodeEditor field's tokenizer. */
const props = defineProps<{ component: CodeEntrySchema }>()
const t = useT()
const copied = ref(false)
const code = computed(() =>
  typeof props.component.state === 'string' ? props.component.state : '',
)
const tokens = computed(() => highlightCode(code.value, props.component.grammar))

const copy = () => {
  void navigator.clipboard?.writeText(code.value).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, props.component.copyMessageDuration ?? 1500)
  })
}
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder v-if="code === ''" :entry="props.component" />
    <div v-else>
      <!-- Code reads left to right in every panel, and the copy button sits at its end. The
        `<pre>` keeps its padding while the `<code>` scrolls inside it, so a long first line
        scrolls under the padding, never under the button. -->
      <div dir="ltr" class="relative">
        <!-- prettier-ignore -->
        <pre
          dir="ltr"
          data-slot="code-entry"
          :data-grammar="props.component.grammar ?? undefined"
          :data-light-theme="props.component.lightTheme ?? undefined"
          :data-dark-theme="props.component.darkTheme ?? undefined"
          :class="cn('bg-muted/40 m-0 rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre', props.component.copyable && 'pe-10')"
        ><code class="block overflow-x-auto"><template v-for="(token, index) in tokens" :key="index"><span v-if="token.kind !== 'plain'" :class="codeTokenClasses[token.kind]">{{ token.text }}</span><template v-else>{{ token.text }}</template></template></code></pre>
        <button
          v-if="props.component.copyable"
          type="button"
          data-slot="code-entry-copy"
          class="text-muted-foreground hover:text-foreground bg-background/80 absolute end-2 top-2 rounded-md p-1"
          :aria-label="t('copy', {}, 'Copy')"
          @click="copy"
        >
          <CheckIcon v-if="copied" class="size-4" />
          <CopyIcon v-else class="size-4" />
        </button>
      </div>
      <span
        v-if="props.component.copyable && copied"
        role="status"
        :class="cn('text-xs', !props.component.copyMessage && 'sr-only')"
        >{{ props.component.copyMessage ?? t('copied', {}, 'Copied') }}</span
      >
    </div>
  </EntryWrapper>
</template>
