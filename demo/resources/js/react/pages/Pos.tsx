import {
    addToCart,
    cartCount,
    cartItems,
    fill,
    hasOpenDialog,
    quotedLineTotal,
    refreshCart,
    remaining,
    setQuantity,
    type CartLine,
    type PosMethods,
    type PosProduct,
    type PosProps,
    type PosQuote,
    type PosSale,
} from '@/shared/apps'
import {
    AppPage,
    Badge,
    Button,
    cn,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Icon,
    Input,
    PageForm,
    PageMethodError,
    Spinner,
    useFormatter,
    useLiveProps,
    usePageForm,
    usePageMethods,
    useShortcut,
} from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `Pages/Pos` (App\Alfakit\Pages\Apps\PointOfSale): product grid with server-side search,
 * SKU entry, cart, the `sale` form (customer and payment method) and the checkout. Totals
 * come from the `quote` method; nothing is priced here.
 */
export default function Pos(props: PosProps) {
    const { copy } = props
    const format = useFormatter()
    const methods = usePageMethods<PosMethods>()
    const saleForm = usePageForm('sale')

    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<number | null>(null)
    const [products, setProducts] = useState<PosProduct[]>(props.products)
    const [cart, setCart] = useState<CartLine[]>([])
    const [sku, setSku] = useState('')
    const [skuError, setSkuError] = useState<string | null>(null)
    const [discountInput, setDiscountInput] = useState('')
    const [discountCode, setDiscountCode] = useState<string | null>(null)
    const [discountError, setDiscountError] = useState<string | null>(null)
    const [quote, setQuote] = useState<PosQuote | null>(null)
    const [cartErrors, setCartErrors] = useState<string[]>([])
    const [sale, setSale] = useState<PosSale | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const firstSearch = useRef(true)

    // Today's sales stay fresh while the register is open (and reload after each checkout).
    useLiveProps(['recentSales'], { poll: '60s' })

    const runSearch = useCallback(
        async (term: string, inCategory: number | null) => {
            const found = await methods.call(
                'searchProducts',
                { search: term, category: inCategory },
                { toasts: false },
            )

            if (found) {
                setProducts(found)
                setCart((current) => refreshCart(current, found))
            }
        },
        [methods.call],
    )

    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false

            return
        }

        const timer = setTimeout(() => void runSearch(search, category), 250)

        return () => clearTimeout(timer)
    }, [search, category, runSearch])

    // The server prices the cart: subtotal, discount and VAT.
    useEffect(() => {
        if (cart.length === 0) {
            setQuote(null)

            return
        }

        let cancelled = false
        const timer = setTimeout(async () => {
            try {
                const next = await methods.callOrThrow(
                    'quote',
                    { items: cartItems(cart), discountCode },
                    { toasts: false },
                )

                if (!cancelled) {
                    setQuote(next)
                    setCartErrors([])
                }
            } catch (error) {
                if (cancelled || !(error instanceof PageMethodError)) return

                if (error.errors.discountCode) {
                    setDiscountError(error.errors.discountCode[0] ?? null)
                    setDiscountCode(null)
                }

                setCartErrors(
                    Object.entries(error.errors)
                        .filter(([key]) => key.startsWith('items'))
                        .map(([, messages]) => messages[0] ?? ''),
                )
            }
        }, 150)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [cart, discountCode, methods.callOrThrow])

    const add = (product: PosProduct) => setCart((current) => addToCart(current, product))

    const addSku = async () => {
        const code = sku.trim()

        if (code === '') return

        try {
            const product = await methods.callOrThrow('findBySku', { code }, { toasts: false })
            add(product)
            setSku('')
            setSkuError(null)
        } catch (error) {
            setSkuError(error instanceof PageMethodError ? (error.errors.code?.[0] ?? null) : null)
        }
    }

    const applyDiscount = () => {
        setDiscountError(null)
        setDiscountCode(discountInput.trim() === '' ? null : discountInput.trim().toUpperCase())
    }

    const clear = () => {
        setCart([])
        setDiscountCode(null)
        setDiscountInput('')
        setDiscountError(null)
        setCartErrors([])
        saleForm.store?.setValue('customer_id', null)
    }

    const charging = methods.isLoading('checkout')

    const charge = async () => {
        if (cart.length === 0 || charging) return

        try {
            const result = await methods.callOrThrow(
                'checkout',
                { items: cartItems(cart), discountCode },
                { forms: ['sale'] },
            )

            setSale(result)
            clear()
            void runSearch(search, category)
        } catch (error) {
            if (error instanceof PageMethodError && error.isValidation) {
                setCartErrors(
                    Object.entries(error.errors)
                        .filter(([key]) => !key.startsWith('forms.'))
                        .map(([, messages]) => messages[0] ?? ''),
                )
            }
        }
    }

    useShortcut('/', () => searchRef.current?.focus())
    useShortcut('f2', () => void charge(), { allowInInputs: true })
    useShortcut('esc', () => (hasOpenDialog() ? undefined : clear()), {
        allowInInputs: true,
        preventDefault: false,
    })

    const count = cartCount(cart)

    return (
        <AppPage>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_26rem]">
                <section
                    aria-label={copy.search}
                    className="flex min-h-0 flex-col gap-3 p-3 md:overflow-y-auto md:p-4 [&>*]:shrink-0"
                >
                    <div className="flex flex-col gap-2 lg:flex-row">
                        <div className="relative flex-1">
                            <Icon
                                name="search"
                                className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                            />
                            <Input
                                ref={searchRef}
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={copy.search}
                                aria-label={copy.search}
                                className="ps-9 pe-16"
                                dir="auto"
                            />
                            <kbd className="text-muted-foreground bg-muted pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded px-1.5 text-xs sm:block">
                                /
                            </kbd>
                        </div>
                        <form
                            className="flex flex-col gap-1 lg:w-64"
                            onSubmit={(event) => {
                                event.preventDefault()
                                void addSku()
                            }}
                        >
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Icon
                                        name="scan-barcode"
                                        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                                    />
                                    <Input
                                        value={sku}
                                        onChange={(event) => setSku(event.target.value)}
                                        placeholder={copy.sku}
                                        aria-label={copy.sku}
                                        aria-invalid={skuError ? true : undefined}
                                        className="ps-9"
                                        dir="ltr"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={methods.isLoading('findBySku')}
                                >
                                    {copy.sku_add}
                                </Button>
                            </div>
                            {skuError && (
                                <p role="alert" className="text-destructive text-xs">
                                    {skuError}
                                </p>
                            )}
                        </form>
                    </div>

                    <div
                        role="group"
                        aria-label={copy.categories}
                        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                    >
                        {[{ id: null, name: copy.all_categories }, ...props.categories].map(
                            (item) => (
                                <Button
                                    key={item.id ?? 'all'}
                                    size="sm"
                                    variant={category === item.id ? 'default' : 'outline'}
                                    aria-pressed={category === item.id}
                                    className="shrink-0 rounded-full"
                                    onClick={() => setCategory(item.id)}
                                >
                                    {item.name}
                                </Button>
                            ),
                        )}
                    </div>

                    {products.length === 0 ? (
                        <p className="text-muted-foreground py-12 text-center text-sm">
                            {copy.no_products}
                        </p>
                    ) : (
                        <ul
                            className={cn(
                                'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                                methods.isLoading('searchProducts') && 'opacity-60',
                            )}
                        >
                            {products.map((product) => {
                                const left = remaining(cart, product)

                                return (
                                    <li key={product.id}>
                                        <button
                                            type="button"
                                            data-testid="pos-product"
                                            onClick={() => add(product)}
                                            disabled={left === 0}
                                            aria-label={fill(copy.add_to_cart, {
                                                name: product.name,
                                            })}
                                            className="bg-card hover:border-primary focus-visible:ring-ring/50 flex h-full w-full flex-col overflow-hidden rounded-xl border text-start shadow-xs transition outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span className="bg-muted block aspect-[4/3] w-full">
                                                {product.image && (
                                                    <img
                                                        src={product.image}
                                                        alt=""
                                                        loading="lazy"
                                                        className="size-full object-cover"
                                                    />
                                                )}
                                            </span>
                                            <span className="flex flex-1 flex-col gap-1 p-3">
                                                <span className="line-clamp-2 text-sm leading-snug font-medium">
                                                    {product.name}
                                                </span>
                                                <span
                                                    className="text-muted-foreground text-xs"
                                                    dir="ltr"
                                                >
                                                    {product.sku}
                                                </span>
                                                <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                                                    <span className="font-semibold tabular-nums">
                                                        {format.money(
                                                            product.price,
                                                            props.currency,
                                                        )}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            product.stock > 0
                                                                ? 'secondary'
                                                                : 'destructive'
                                                        }
                                                    >
                                                        {product.stock > 0
                                                            ? fill(copy.in_stock, {
                                                                  count: format.number(
                                                                      product.stock,
                                                                  ),
                                                              })
                                                            : copy.out_of_stock}
                                                    </Badge>
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    <section aria-labelledby="pos-recent" className="mt-2">
                        <h2 id="pos-recent" className="mb-2 text-sm font-semibold">
                            {copy.recent}
                        </h2>
                        {props.recentSales.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{copy.recent_empty}</p>
                        ) : (
                            <ul className="divide-y rounded-lg border">
                                {props.recentSales.map((recent) => (
                                    <li
                                        key={recent.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            <span className="font-medium" dir="ltr">
                                                {recent.number}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {' · '}
                                                {recent.customer ?? copy.walk_in}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                            <span className="tabular-nums">
                                                {format.money(recent.total, props.currency)}
                                            </span>
                                            <a
                                                href={recent.receiptUrl}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-primary underline-offset-4 hover:underline"
                                            >
                                                {copy.print_receipt}
                                            </a>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link
                            href={props.ordersUrl}
                            className="text-primary mt-2 inline-block text-sm underline-offset-4 hover:underline"
                        >
                            {copy.all_orders}
                        </Link>
                    </section>
                </section>

                <aside
                    aria-label={copy.cart}
                    className="bg-muted/30 flex min-h-0 flex-col border-t md:border-s md:border-t-0"
                >
                    <div className="border-b p-3 md:p-4">
                        <PageForm name="sale" />
                    </div>

                    <div className="flex items-center justify-between px-3 pt-3 md:px-4">
                        <h2 className="text-sm font-semibold">
                            {copy.cart}{' '}
                            {count > 0 && (
                                <Badge variant="secondary" className="ms-1">
                                    {format.number(count)}
                                </Badge>
                            )}
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clear}
                            disabled={cart.length === 0}
                        >
                            {copy.clear}
                            <kbd className="text-muted-foreground text-xs">{copy.clear_hint}</kbd>
                        </Button>
                    </div>

                    <div className="min-h-32 flex-1 overflow-y-auto px-3 py-2 md:px-4">
                        {cart.length === 0 ? (
                            <p className="text-muted-foreground py-8 text-center text-sm">
                                {copy.cart_empty}
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-2" data-testid="pos-cart">
                                {cart.map((line) => {
                                    const quoted = quotedLineTotal(quote, line)

                                    return (
                                        <li
                                            key={line.product.id}
                                            className="bg-background flex items-center gap-2 rounded-lg border p-2"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {line.product.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs tabular-nums">
                                                    {format.money(
                                                        line.product.price,
                                                        props.currency,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <Button
                                                    variant="outline"
                                                    size="icon-sm"
                                                    aria-label={fill(copy.decrease, {
                                                        name: line.product.name,
                                                    })}
                                                    onClick={() =>
                                                        setCart((current) =>
                                                            setQuantity(
                                                                current,
                                                                line.product.id,
                                                                line.quantity - 1,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <Icon name="minus" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={1}
                                                    max={line.product.stock}
                                                    value={line.quantity}
                                                    aria-label={fill(copy.quantity, {
                                                        name: line.product.name,
                                                    })}
                                                    onChange={(event) =>
                                                        setCart((current) =>
                                                            setQuantity(
                                                                current,
                                                                line.product.id,
                                                                Number(event.target.value),
                                                            ),
                                                        )
                                                    }
                                                    className="h-8 w-12 [appearance:textfield] px-1 text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon-sm"
                                                    aria-label={fill(copy.increase, {
                                                        name: line.product.name,
                                                    })}
                                                    disabled={remaining(cart, line.product) === 0}
                                                    onClick={() => add(line.product)}
                                                >
                                                    <Icon name="plus" />
                                                </Button>
                                            </div>
                                            <span className="w-20 text-end text-sm font-medium tabular-nums">
                                                {quoted === null ? (
                                                    <Spinner className="ms-auto size-3" />
                                                ) : (
                                                    format.money(quoted, props.currency)
                                                )}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={fill(copy.remove, {
                                                    name: line.product.name,
                                                })}
                                                onClick={() =>
                                                    setCart((current) =>
                                                        setQuantity(current, line.product.id, 0),
                                                    )
                                                }
                                            >
                                                <Icon name="trash-2" />
                                            </Button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                        {cartErrors.length > 0 && (
                            <ul role="alert" className="text-destructive mt-2 text-xs">
                                {cartErrors.map((message) => (
                                    <li key={message}>{message}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t p-3 md:p-4">
                        <form
                            className="flex flex-col gap-1"
                            onSubmit={(event) => {
                                event.preventDefault()
                                applyDiscount()
                            }}
                        >
                            <div className="flex gap-2">
                                <Input
                                    value={discountInput}
                                    onChange={(event) => setDiscountInput(event.target.value)}
                                    placeholder={copy.discount_code}
                                    aria-label={copy.discount_code}
                                    aria-invalid={discountError ? true : undefined}
                                    className="uppercase"
                                    dir="ltr"
                                />
                                {discountCode ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-label={copy.remove_discount}
                                        onClick={() => {
                                            setDiscountCode(null)
                                            setDiscountInput('')
                                        }}
                                    >
                                        <Icon name="x" />
                                    </Button>
                                ) : (
                                    <Button type="submit" variant="outline">
                                        {copy.apply}
                                    </Button>
                                )}
                            </div>
                            {discountError && (
                                <p role="alert" className="text-destructive text-xs">
                                    {discountError}
                                </p>
                            )}
                        </form>

                        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                            <dt className="text-muted-foreground">{copy.subtotal}</dt>
                            <dd className="text-end">
                                {format.money(quote?.subtotal ?? 0, props.currency)}
                            </dd>
                            {quote && quote.discount > 0 && (
                                <>
                                    <dt className="text-muted-foreground">
                                        {copy.discount}{' '}
                                        <span dir="ltr">({quote.discountCode})</span>
                                    </dt>
                                    <dd className="text-end">
                                        −{format.money(quote.discount, props.currency)}
                                    </dd>
                                </>
                            )}
                            <dt className="text-muted-foreground">{copy.tax}</dt>
                            <dd className="text-end">
                                {format.money(quote?.tax ?? 0, props.currency)}
                            </dd>
                            <dt className="text-base font-semibold">{copy.total}</dt>
                            <dd
                                className="text-end text-base font-semibold"
                                data-testid="pos-total"
                            >
                                {format.money(quote?.total ?? 0, props.currency)}
                            </dd>
                        </dl>

                        <Button
                            size="lg"
                            className="h-12 text-base"
                            disabled={cart.length === 0 || charging || quote === null}
                            onClick={() => void charge()}
                        >
                            {charging ? (
                                <>
                                    <Spinner />
                                    {copy.charging}
                                </>
                            ) : (
                                <>
                                    {fill(copy.charge, {
                                        amount: format.money(quote?.total ?? 0, props.currency),
                                    })}
                                    <kbd className="bg-primary-foreground/15 rounded px-1.5 text-xs">
                                        {copy.charge_hint}
                                    </kbd>
                                </>
                            )}
                        </Button>
                        <p className="text-muted-foreground hidden text-center text-xs md:block">
                            {copy.shortcuts}
                        </p>
                    </div>
                </aside>
            </div>

            <Dialog open={sale !== null} onOpenChange={(open) => !open && setSale(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{copy.success_title}</DialogTitle>
                        <DialogDescription>
                            {sale &&
                                fill(copy.success_body, {
                                    number: sale.number,
                                    total: format.money(sale.total, props.currency),
                                })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <a href={sale?.receiptUrl} target="_blank" rel="noopener">
                                    <Icon name="printer" />
                                    {copy.print_receipt}
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={sale?.url ?? props.ordersUrl}>{copy.view_order}</Link>
                            </Button>
                        </div>
                        <Button
                            onClick={() => {
                                setSale(null)
                                requestAnimationFrame(() => searchRef.current?.focus())
                            }}
                        >
                            {copy.new_sale}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppPage>
    )
}
