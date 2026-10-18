<script setup lang="ts">
import { cn, useFormatter } from '@alfakit/vue'
import { computed } from 'vue'
import { STOCK_TONE_CLASSES, stockLevel, type StockMeterProps } from '@/shared/showcase'

/**
 * `ViewColumn::make('stock_level')->view('demo-stock-meter')`: a small meter next to the
 * stock figure, coloured by level. PHP sends `stock`, `max` and `low` per record.
 */
const props = defineProps<StockMeterProps>()

const format = useFormatter()
const level = computed(() => stockLevel(props))
const stock = computed(() => Number(props.stock ?? props.state ?? 0))
</script>

<template>
    <div class="flex items-center gap-2" data-slot="stock-meter" :data-tone="level.tone">
        <div
            role="meter"
            :aria-valuemin="0"
            :aria-valuemax="max ?? 120"
            :aria-valuenow="stock"
            :aria-valuetext="format.number(stock)"
            class="bg-muted h-1.5 w-20 overflow-hidden rounded-full"
        >
            <div
                :class="
                    cn('h-full rounded-full transition-[width]', STOCK_TONE_CLASSES[level.tone])
                "
                :style="{ width: `${level.percent}%` }"
            />
        </div>
        <span class="text-muted-foreground text-xs tabular-nums">{{ level.percent }}%</span>
    </div>
</template>
