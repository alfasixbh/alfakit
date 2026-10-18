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
} from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

/**
 * `Pages/FulfilmentBoard` (App\Alfakit\Pages\Apps\FulfilmentBoard): orders in columns by
 * status. Dropping a card (or picking a column from its menu) moves it at once and calls
 * `moveOrder`; when the server refuses, the card goes back and the toast says why.
 */
export default function FulfilmentBoard(props: BoardProps) {
    const { copy } = props
    const format = useFormatter()
    const [columns, setColumns] = useState<BoardColumn[]>(props.columns)
    const [dragging, setDragging] = useState<number | null>(null)
    const [over, setOver] = useState<string | null>(null)
    const columnsRef = useRef(columns)
    columnsRef.current = columns

    // Fresh columns from the server (polling below, or a full reload) replace the local ones.
    useEffect(() => setColumns(props.columns), [props.columns])
    useLiveProps(['columns'], { poll: '30s' })

    const move = usePageMethod<BoardCard, { order: number; status: string }>('moveOrder', {
        optimistic: (args) => {
            const before = columnsRef.current

            if (args) setColumns(moveCard(before, args.order, args.status))

            return () => setColumns(before)
        },
        onSuccess: (card) => setColumns((current) => replaceCard(current, card)),
    })

    const drop = (status: string, cardId: number) => {
        const card = columnsRef.current
            .flatMap((column) => column.cards)
            .find((item) => item.id === cardId)

        if (card && card.status !== status) void move.call({ order: cardId, status })
    }

    return (
        <AppPage>
            <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
                <div className="grid min-w-[56rem] grid-cols-4 gap-4">
                    {columns.map((column) => (
                        <section
                            key={column.status}
                            aria-labelledby={`board-${column.status}`}
                            data-testid="board-column"
                            data-status={column.status}
                            onDragOver={(event) => {
                                if (!event.dataTransfer.types.includes(BOARD_DRAG_TYPE)) return
                                event.preventDefault()
                                event.dataTransfer.dropEffect = 'move'
                                setOver(column.status)
                            }}
                            onDragLeave={() =>
                                setOver((current) => (current === column.status ? null : current))
                            }
                            onDrop={(event) => {
                                event.preventDefault()
                                setOver(null)
                                drop(
                                    column.status,
                                    Number(event.dataTransfer.getData(BOARD_DRAG_TYPE)),
                                )
                            }}
                            className={cn(
                                'bg-muted/40 flex min-h-64 flex-col gap-2 rounded-xl border p-2 transition-colors',
                                over === column.status &&
                                    dragging !== null &&
                                    'border-primary bg-primary/5',
                            )}
                        >
                            <header className="flex items-center gap-2 px-1 py-1">
                                <span
                                    className={cn(
                                        'size-2 rounded-full',
                                        BOARD_TONES[column.color] ?? 'bg-muted-foreground',
                                    )}
                                />
                                <Icon name={column.icon} className="text-muted-foreground" />
                                <h2 id={`board-${column.status}`} className="text-sm font-semibold">
                                    {column.label}
                                </h2>
                                <span className="text-muted-foreground ms-auto text-xs tabular-nums">
                                    {format.number(column.count)}
                                </span>
                            </header>

                            {column.cards.length === 0 ? (
                                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
                                    {dragging !== null ? copy.drop_here : copy.empty}
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {column.cards.map((card) => (
                                        <li
                                            key={card.id}
                                            draggable
                                            data-testid="board-card"
                                            data-order={card.id}
                                            onDragStart={(event) => {
                                                event.dataTransfer.setData(
                                                    BOARD_DRAG_TYPE,
                                                    String(card.id),
                                                )
                                                event.dataTransfer.effectAllowed = 'move'
                                                setDragging(card.id)
                                            }}
                                            onDragEnd={() => {
                                                setDragging(null)
                                                setOver(null)
                                            }}
                                            className={cn(
                                                'bg-card cursor-grab rounded-lg border p-3 shadow-xs active:cursor-grabbing',
                                                dragging === card.id && 'opacity-50',
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        href={card.url}
                                                        className="text-sm font-semibold underline-offset-4 hover:underline"
                                                        aria-label={fill(copy.open, {
                                                            number: card.number,
                                                        })}
                                                    >
                                                        <span dir="ltr">{card.number}</span>
                                                    </Link>
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {card.customer}
                                                    </p>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            aria-label={fill(copy.move, {
                                                                number: card.number,
                                                            })}
                                                        >
                                                            <Icon name="ellipsis-vertical" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            {fill(copy.move, {
                                                                number: card.number,
                                                            })}
                                                        </DropdownMenuLabel>
                                                        {columns
                                                            .filter(
                                                                (target) =>
                                                                    target.status !== card.status,
                                                            )
                                                            .map((target) => (
                                                                <DropdownMenuItem
                                                                    key={target.status}
                                                                    onSelect={() =>
                                                                        drop(target.status, card.id)
                                                                    }
                                                                >
                                                                    <Icon name={target.icon} />
                                                                    {fill(copy.move_to, {
                                                                        status: target.label,
                                                                    })}
                                                                </DropdownMenuItem>
                                                            ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    {card.items}
                                                </span>
                                                <span className="font-medium tabular-nums">
                                                    {card.total}
                                                </span>
                                            </div>
                                            {card.placedAt && (
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {format.relative(card.placedAt)}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {column.count > column.cards.length && (
                                <Link
                                    href={props.ordersUrl}
                                    className="text-primary px-1 text-xs underline-offset-4 hover:underline"
                                >
                                    {fill(copy.more, {
                                        count: format.number(column.count - column.cards.length),
                                    })}
                                </Link>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </AppPage>
    )
}
