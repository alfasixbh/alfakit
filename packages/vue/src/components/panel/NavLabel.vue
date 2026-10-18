<script setup lang="ts">
/**
 * A navigation label or tenant name: text, or the sanitised HTML of an `Htmlable` value
 * (`labelHtml` / `nameHtml`, sanitised on the server like other HTML in the schema).
 */
defineProps<{ text: string; html?: boolean }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitised on the server (Html::sanitize) -->
  <span v-if="html" v-html="text" />
  <span v-else>{{ text }}</span>
</template>
