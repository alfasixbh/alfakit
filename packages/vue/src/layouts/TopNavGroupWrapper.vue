<script setup lang="ts">
/**
 * Wraps a top navigation group in an element carrying its
 * `NavigationGroup::extraTopbarAttributes()` (Vue merges `class`); without them the group
 * renders unwrapped.
 */
const props = defineProps<{ attributes?: Record<string, unknown> | null }>()
</script>

<template>
  <div
    v-if="props.attributes"
    data-slot="topnav-group"
    class="flex shrink-0 items-center gap-1"
    v-bind="props.attributes"
  >
    <slot />
  </div>
  <slot v-else />
</template>
