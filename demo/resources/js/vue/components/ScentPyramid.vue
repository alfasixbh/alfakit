<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@alfakit/vue'
import { scentRows, type ScentPyramidProps } from '@/shared/catalog'

/**
 * The scent pyramid on the product view page: top, heart and base notes drawn as three tiers
 * of growing width. PHP sends the notes and the translated tier labels.
 */
const props = defineProps<ScentPyramidProps>()

const rows = computed(() => scentRows(props.state))
</script>

<template>
    <p v-if="rows.length === 0" class="text-muted-foreground text-sm">{{ labels.empty }}</p>
    <ol v-else data-slot="scent-pyramid" class="flex flex-col items-center gap-1.5">
        <li
            v-for="row in rows"
            :key="row.level"
            :class="
                cn(
                    'bg-muted/60 flex min-w-48 flex-col gap-1 rounded-lg border px-3 py-2 text-center',
                    row.width,
                )
            "
        >
            <span class="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {{ labels[row.level] }}
            </span>
            <span class="text-sm capitalize">{{ row.notes.join(' · ') }}</span>
        </li>
    </ol>
</template>
