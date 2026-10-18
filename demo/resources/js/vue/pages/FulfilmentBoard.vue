<script setup lang="ts">
import {
    BOARD_DRAG_TYPE,
    BOARD_TONES,
    fill,
    moveCard,
    replaceCard,
    type BoardCard,
    type BoardColumn,
    type BoardProps,
} from '@/shared/apps'
import {
    AppPage,
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Icon,
    useFormatter,
    useLiveProps,
    usePageMethod,
} from '@alfakit/vue'
import { Link } from '@inertiajs/vue3'
import { computed, ref, shallowRef, watch } from 'vue'

/**
 * `Pages/FulfilmentBoard` (App\Alfakit\Pages\Apps\FulfilmentBoard): orders in columns by
 * status. Dropping a card (or picking a column from its menu) moves it at once and calls
 * `moveOrder`; when the server refuses, the card goes back and the toast says why.
 */
const props = defineProps<BoardProps>()
const copy = computed(() => props.copy)
const format = useFormatter()
const columns = shallowRef<BoardColumn[]>(props.columns)
const dragging = ref<number | null>(null)
const over = ref<string | null>(null)

// Fresh columns from the server (polling below, or a full reload) replace the local ones.
watch(
    () => props.columns,
    (next) => (columns.value = next),
)
useLiveProps(['columns'], { poll: '30s' })

const move = usePageMethod<BoardCard, { order: number; status: string }>('moveOrder', {
    optimistic: (args) => {
        const before = columns.value

        if (args) columns.value = moveCard(before, args.order, args.status)

        return () => (columns.value = before)
    },
    onSuccess: (card) => (columns.value = replaceCard(columns.value, card)),
})

function drop(status: string, cardId: number): void {
    const card = columns.value.flatMap((column) => column.cards).find((item) => item.id === cardId)

    if (card && card.status !== status) void move.call({ order: cardId, status })
}

function onDragOver(event: DragEvent, status: string): void {
    if (!event.dataTransfer?.types.includes(BOARD_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    over.value = status
}

function onDrop(event: DragEvent, status: string): void {
    event.preventDefault()
    over.value = null
    drop(status, Number(event.dataTransfer?.getData(BOARD_DRAG_TYPE)))
}

function onDragStart(event: DragEvent, card: BoardCard): void {
    event.dataTransfer?.setData(BOARD_DRAG_TYPE, String(card.id))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    dragging.value = card.id
}

function onDragEnd(): void {
    dragging.value = null
    over.value = null
}
</script>

<template>
    <AppPage>
        <div class="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
            <div class="grid min-w-[56rem] grid-cols-4 gap-4">
                <section
                    v-for="column in columns"
                    :key="column.status"
                    :aria-labelledby="`board-${column.status}`"
                    data-testid="board-column"
                    :data-status="column.status"
                    :class="
                        cn(
                            'bg-muted/40 flex min-h-64 flex-col gap-2 rounded-xl border p-2 transition-colors',
                            over === column.status &&
                                dragging !== null &&
                                'border-primary bg-primary/5',
                        )
                    "
                    @dragover="onDragOver($event, column.status)"
                    @dragleave="over = over === column.status ? null : over"
                    @drop="onDrop($event, column.status)"
                >
                    <header class="flex items-center gap-2 px-1 py-1">
                        <span
                            :class="
                                cn(
                                    'size-2 rounded-full',
                                    BOARD_TONES[column.color] ?? 'bg-muted-foreground',
                                )
                            "
                        />
                        <Icon :name="column.icon" class="text-muted-foreground" />
                        <h2 :id="`board-${column.status}`" class="text-sm font-semibold">
                            {{ column.label }}
                        </h2>
                        <span class="text-muted-foreground ms-auto text-xs tabular-nums">{{
                            format.number(column.count)
                        }}</span>
                    </header>

                    <p
                        v-if="column.cards.length === 0"
                        class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs"
                    >
                        {{ dragging !== null ? copy.drop_here : copy.empty }}
                    </p>
                    <ul v-else class="flex flex-col gap-2">
                        <li
                            v-for="card in column.cards"
                            :key="card.id"
                            draggable="true"
                            data-testid="board-card"
                            :data-order="card.id"
                            :class="
                                cn(
                                    'bg-card cursor-grab rounded-lg border p-3 shadow-xs active:cursor-grabbing',
                                    dragging === card.id && 'opacity-50',
                                )
                            "
                            @dragstart="onDragStart($event, card)"
                            @dragend="onDragEnd"
                        >
                            <div class="flex items-start gap-2">
                                <div class="min-w-0 flex-1">
                                    <Link
                                        :href="card.url"
                                        class="text-sm font-semibold underline-offset-4 hover:underline"
                                        :aria-label="fill(copy.open, { number: card.number })"
                                    >
                                        <span dir="ltr">{{ card.number }}</span>
                                    </Link>
                                    <p class="text-muted-foreground truncate text-xs">
                                        {{ card.customer }}
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger as-child>
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            :aria-label="fill(copy.move, { number: card.number })"
                                        >
                                            <Icon name="ellipsis-vertical" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{{
                                            fill(copy.move, { number: card.number })
                                        }}</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            v-for="target in columns.filter(
                                                (item) => item.status !== card.status,
                                            )"
                                            :key="target.status"
                                            @select="drop(target.status, card.id)"
                                        >
                                            <Icon :name="target.icon" />
                                            {{ fill(copy.move_to, { status: target.label }) }}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div class="mt-2 flex items-center justify-between gap-2 text-xs">
                                <span class="text-muted-foreground">{{ card.items }}</span>
                                <span class="font-medium tabular-nums">{{ card.total }}</span>
                            </div>
                            <p v-if="card.placedAt" class="text-muted-foreground mt-1 text-xs">
                                {{ format.relative(card.placedAt) }}
                            </p>
                        </li>
                    </ul>

                    <Link
                        v-if="column.count > column.cards.length"
                        :href="props.ordersUrl"
                        class="text-primary px-1 text-xs underline-offset-4 hover:underline"
                        >{{
                            fill(copy.more, {
                                count: format.number(column.count - column.cards.length),
                            })
                        }}</Link
                    >
                </section>
            </div>
        </div>
    </AppPage>
</template>
