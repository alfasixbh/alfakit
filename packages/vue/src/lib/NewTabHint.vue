<script setup lang="ts">
import { useT } from '../context'

/** Screen-reader text for a link that opens in a new tab. */
const t = useT()
</script>

<template>
  <span class="sr-only"> {{ t('opens_in_new_tab', {}, '(opens in a new tab)') }}</span>
</template>
