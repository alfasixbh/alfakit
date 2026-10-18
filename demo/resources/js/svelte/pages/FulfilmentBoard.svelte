<script lang="ts">
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
    } from '@alfakit/svelte'
    import { Link } from '@inertiajs/svelte'
    import { untrack } from 'svelte'

    /**
     * `Pages/FulfilmentBoard` (App\Alfakit\Pages\Apps\FulfilmentBoard): orders in columns by
     * status. Dropping a card (or picking a column from its menu) moves it at once and calls
     * `moveOrder`; when the server refuses, the card goes back and the toast says why.
     */
    let props: BoardProps = $props()

    const copy = $derived(props.copy)
    const format = useFormatter()
    let columns = $state.raw<BoardColumn[]>(untrack(() => props.columns))
    let dragging = $state<number | null>(null)
    let over = $state<string | null>(null)

    // Fresh columns from the server (polling below, or a full reload) replace the local ones.
    $effect(() => {
        columns = props.columns
    })
    useLiveProps(['columns'], { poll: '30s' })

    const move = usePageMethod<BoardCard, { order: number; status: string }>('moveOrder', {
        optimistic: (args) => {
            const before = columns

            if (args) columns = moveCard(before, args.order, args.status)

            return () => (columns = before)
        },
        onSuccess: (card) => (columns = replaceCard(columns, card)),
    })

    function drop(status: string, cardId: number): void {
        const card = columns.flatMap((column) => column.cards).find((item) => item.id === cardId)

        if (card && card.status !== status) void move.call({ order: cardId, status })
    }

    function onDragOver(event: DragEvent, status: string): void {
        if (!event.dataTransfer?.types.includes(BOARD_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        over = status
    }

    function onDrop(event: DragEvent, status: string): void {
        event.preventDefault()
        over = null
        drop(status, Number(event.dataTransfer?.getData(BOARD_DRAG_TYPE)))
    }

    function onDragStart(event: DragEvent, card: BoardCard): void {
        event.dataTransfer?.setData(BOARD_DRAG_TYPE, String(card.id))
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
        dragging = card.id
    }

    function onDragEnd(): void {
        dragging = null
        over = null
    }
</script>

<AppPage>
    <div class="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        <div class="grid min-w-[56rem] grid-cols-4 gap-4">
            {#each columns as column (column.status)}
                <section
                    aria-labelledby={`board-${column.status}`}
                    data-testid="board-column"
                    data-status={column.status}
                    class={cn(
                        'bg-muted/40 flex min-h-64 flex-col gap-2 rounded-xl border p-2 transition-colors',
                        over === column.status &&
                            dragging !== null &&
                            'border-primary bg-primary/5',
                    )}
                    ondragover={(event) => onDragOver(event, column.status)}
                    ondragleave={() => (over = over === column.status ? null : over)}
                    ondrop={(event) => onDrop(event, column.status)}
                >
                    <header class="flex items-center gap-2 px-1 py-1">
                        <span
                            class={cn(
                                'size-2 rounded-full',
                                BOARD_TONES[column.color] ?? 'bg-muted-foreground',
                            )}
                        ></span>
                        <Icon name={column.icon} class="text-muted-foreground" />
                        <h2 id={`board-${column.status}`} class="text-sm font-semibold">
                            {column.label}
                        </h2>
                        <span class="text-muted-foreground ms-auto text-xs tabular-nums"
                            >{format.current.number(column.count)}</span
                        >
                    </header>

                    {#if column.cards.length === 0}
                        <p
                            class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs"
                        >
                            {dragging !== null ? copy.drop_here : copy.empty}
                        </p>
                    {:else}
                        <ul class="flex flex-col gap-2">
                            {#each column.cards as card (card.id)}
                                <li
                                    draggable="true"
                                    data-testid="board-card"
                                    data-order={card.id}
                                    class={cn(
                                        'bg-card cursor-grab rounded-lg border p-3 shadow-xs active:cursor-grabbing',
                                        dragging === card.id && 'opacity-50',
                                    )}
                                    ondragstart={(event) => onDragStart(event, card)}
                                    ondragend={onDragEnd}
                                >
                                    <div class="flex items-start gap-2">
                                        <div class="min-w-0 flex-1">
                                            <Link
                                                href={card.url}
                                                class="text-sm font-semibold underline-offset-4 hover:underline"
                                                aria-label={fill(copy.open, {
                                                    number: card.number,
                                                })}
                                            >
                                                <span dir="ltr">{card.number}</span>
                                            </Link>
                                            <p class="text-muted-foreground truncate text-xs">
                                                {card.customer}
                                            </p>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger>
                                                {#snippet child({ props: trigger })}
                                                    <Button
                                                        {...trigger}
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        aria-label={fill(copy.move, {
                                                            number: card.number,
                                                        })}
                                                    >
                                                        <Icon name="ellipsis-vertical" />
                                                    </Button>
                                                {/snippet}
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel
                                                    >{fill(copy.move, {
                                                        number: card.number,
                                                    })}</DropdownMenuLabel
                                                >
                                                {#each columns.filter((item) => item.status !== card.status) as target (target.status)}
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            drop(target.status, card.id)}
                                                    >
                                                        <Icon name={target.icon} />
                                                        {fill(copy.move_to, {
                                                            status: target.label,
                                                        })}
                                                    </DropdownMenuItem>
                                                {/each}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div
                                        class="mt-2 flex items-center justify-between gap-2 text-xs"
                                    >
                                        <span class="text-muted-foreground">{card.items}</span>
                                        <span class="font-medium tabular-nums">{card.total}</span>
                                    </div>
                                    {#if card.placedAt}
                                        <p class="text-muted-foreground mt-1 text-xs">
                                            {format.current.relative(card.placedAt)}
                                        </p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}

                    {#if column.count > column.cards.length}
                        <Link
                            href={props.ordersUrl}
                            class="text-primary px-1 text-xs underline-offset-4 hover:underline"
                            >{fill(copy.more, {
                                count: format.current.number(column.count - column.cards.length),
                            })}</Link
                        >
                    {/if}
                </section>
            {/each}
        </div>
    </div>
</AppPage>
