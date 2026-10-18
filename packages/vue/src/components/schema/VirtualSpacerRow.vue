<script setup lang="ts">
/**
 * Reserves the height of table rows outside the rendered window, so the scrollbar and the
 * positions of the rendered rows stay right. Hidden from assistive technology: the
 * `aria-rowcount` on the table tells the real count.
 */
defineProps<{ height: number; colSpan: number }>()
</script>

<template>
  <tr
    v-if="height > 0"
    aria-hidden="true"
    data-slot="virtual-spacer"
    :style="{ height: `${height}px` }"
  >
    <td :colspan="colSpan" class="border-0 p-0" />
  </tr>
</template>
