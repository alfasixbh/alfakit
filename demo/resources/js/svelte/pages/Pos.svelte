<script lang="ts">
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
    } from '@alfakit/svelte'
    import { Link } from '@inertiajs/svelte'
    import { onDestroy, tick, untrack } from 'svelte'

    /**
     * `Pages/Pos` (App\Alfakit\Pages\Apps\PointOfSale): product grid with server-side search,
     * SKU entry, cart, the `sale` form (customer and payment method) and the checkout. Totals
     * come from the `quote` method; nothing is priced here.
     */
    let props: PosProps = $props()

    const copy = $derived(props.copy)
    const format = useFormatter()
    const methods = usePageMethods<PosMethods>()
    const saleForm = usePageForm('sale')

    let search = $state('')
    let category = $state<number | null>(null)
    let products = $state.raw<PosProduct[]>(untrack(() => props.products))
    let cart = $state.raw<CartLine[]>([])
    let sku = $state('')
    let skuError = $state<string | null>(null)
    let discountInput = $state('')
    let discountCode = $state<string | null>(null)
    let discountError = $state<string | null>(null)
    let quote = $state.raw<PosQuote | null>(null)
    let cartErrors = $state<string[]>([])
    let sale = $state.raw<PosSale | null>(null)
    let searchInput = $state<HTMLInputElement | null>(null)

    // Today's sales stay fresh while the register is open (and reload after each checkout).
    useLiveProps(['recentSales'], { poll: '60s' })

    const categories = $derived([
        { id: null as number | null, name: copy.all_categories },
        ...props.categories,
    ])
    const count = $derived(cartCount(cart))
    const charging = $derived(methods.isLoading('checkout'))

    async function runSearch(): Promise<void> {
        const found = await methods.call('searchProducts', { search, category }, { toasts: false })

        if (found) {
            products = found
            cart = refreshCart(cart, found)
        }
    }

    let searchTimer: ReturnType<typeof setTimeout> | undefined
    let firstSearch = true
    $effect(() => {
        void search
        void category

        if (firstSearch) {
            firstSearch = false

            return
        }

        clearTimeout(searchTimer)
        searchTimer = setTimeout(() => void runSearch(), 250)
    })

    // The server prices the cart: subtotal, discount and VAT.
    let quoteTimer: ReturnType<typeof setTimeout> | undefined
    let quoteRun = 0
    $effect(() => {
        const items = cartItems(cart)
        const code = discountCode
        const run = ++quoteRun

        clearTimeout(quoteTimer)

        if (items.length === 0) {
            quote = null

            return
        }

        quoteTimer = setTimeout(async () => {
            try {
                const next = await methods.callOrThrow(
                    'quote',
                    { items, discountCode: code },
                    { toasts: false },
                )

                if (run !== quoteRun) return
                quote = next
                cartErrors = []
            } catch (error) {
                if (run !== quoteRun || !(error instanceof PageMethodError)) return

                if (error.errors.discountCode) {
                    discountError = error.errors.discountCode[0] ?? null
                    discountCode = null
                }

                cartErrors = Object.entries(error.errors)
                    .filter(([key]) => key.startsWith('items'))
                    .map(([, messages]) => messages[0] ?? '')
            }
        }, 150)
    })

    onDestroy(() => {
        clearTimeout(searchTimer)
        clearTimeout(quoteTimer)
    })

    function add(product: PosProduct): void {
        cart = addToCart(cart, product)
    }

    function changeQuantity(productId: number, quantity: number): void {
        cart = setQuantity(cart, productId, quantity)
    }

    async function addSku(event: SubmitEvent): Promise<void> {
        event.preventDefault()
        const code = sku.trim()

        if (code === '') return

        try {
            add(await methods.callOrThrow('findBySku', { code }, { toasts: false }))
            sku = ''
            skuError = null
        } catch (error) {
            skuError = error instanceof PageMethodError ? (error.errors.code?.[0] ?? null) : null
        }
    }

    function applyDiscount(event: SubmitEvent): void {
        event.preventDefault()
        const code = discountInput.trim()
        discountError = null
        discountCode = code === '' ? null : code.toUpperCase()
    }

    function removeDiscount(): void {
        discountCode = null
        discountInput = ''
    }

    function clear(): void {
        cart = []
        discountCode = null
        discountInput = ''
        discountError = null
        cartErrors = []
        saleForm.store?.setValue('customer_id', null)
    }

    async function charge(): Promise<void> {
        if (cart.length === 0 || charging) return

        try {
            sale = await methods.callOrThrow(
                'checkout',
                { items: cartItems(cart), discountCode },
                { forms: ['sale'] },
            )
            clear()
            void runSearch()
        } catch (error) {
            if (error instanceof PageMethodError && error.isValidation) {
                cartErrors = Object.entries(error.errors)
                    .filter(([key]) => !key.startsWith('forms.'))
                    .map(([, messages]) => messages[0] ?? '')
            }
        }
    }

    async function newSale(): Promise<void> {
        sale = null
        await tick()
        searchInput?.focus()
    }

    useShortcut('/', () => searchInput?.focus())
    useShortcut('f2', () => void charge(), { allowInInputs: true })
    useShortcut('esc', () => (hasOpenDialog() ? undefined : clear()), {
        allowInInputs: true,
        preventDefault: false,
    })
</script>

<AppPage>
    <div
        class="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_26rem]"
    >
        <section
            aria-label={copy.search}
            class="flex min-h-0 flex-col gap-3 p-3 md:overflow-y-auto md:p-4 [&>*]:shrink-0"
        >
            <div class="flex flex-col gap-2 lg:flex-row">
                <div class="relative flex-1">
                    <Icon
                        name="search"
                        class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                    />
                    <Input
                        bind:ref={searchInput}
                        bind:value={search}
                        type="search"
                        placeholder={copy.search}
                        aria-label={copy.search}
                        class="ps-9 pe-16"
                        dir="auto"
                    />
                    <kbd
                        class="text-muted-foreground bg-muted pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded px-1.5 text-xs sm:block"
                        >/</kbd
                    >
                </div>
                <form class="flex flex-col gap-1 lg:w-64" onsubmit={addSku}>
                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <Icon
                                name="scan-barcode"
                                class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                            />
                            <Input
                                bind:value={sku}
                                placeholder={copy.sku}
                                aria-label={copy.sku}
                                aria-invalid={skuError ? true : undefined}
                                class="ps-9"
                                dir="ltr"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={methods.isLoading('findBySku')}>{copy.sku_add}</Button
                        >
                    </div>
                    {#if skuError}
                        <p role="alert" class="text-destructive text-xs">{skuError}</p>
                    {/if}
                </form>
            </div>

            <div
                role="group"
                aria-label={copy.categories}
                class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
                {#each categories as item (item.id ?? 'all')}
                    <Button
                        size="sm"
                        variant={category === item.id ? 'default' : 'outline'}
                        aria-pressed={category === item.id}
                        class="shrink-0 rounded-full"
                        onclick={() => (category = item.id)}>{item.name}</Button
                    >
                {/each}
            </div>

            {#if products.length === 0}
                <p class="text-muted-foreground py-12 text-center text-sm">{copy.no_products}</p>
            {:else}
                <ul
                    class={cn(
                        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                        methods.isLoading('searchProducts') && 'opacity-60',
                    )}
                >
                    {#each products as product (product.id)}
                        <li>
                            <button
                                type="button"
                                data-testid="pos-product"
                                disabled={remaining(cart, product) === 0}
                                aria-label={fill(copy.add_to_cart, { name: product.name })}
                                class="bg-card hover:border-primary focus-visible:ring-ring/50 flex h-full w-full flex-col overflow-hidden rounded-xl border text-start shadow-xs transition outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                onclick={() => add(product)}
                            >
                                <span class="bg-muted block aspect-[4/3] w-full">
                                    {#if product.image}
                                        <img
                                            src={product.image}
                                            alt=""
                                            loading="lazy"
                                            class="size-full object-cover"
                                        />
                                    {/if}
                                </span>
                                <span class="flex flex-1 flex-col gap-1 p-3">
                                    <span class="line-clamp-2 text-sm leading-snug font-medium"
                                        >{product.name}</span
                                    >
                                    <span class="text-muted-foreground text-xs" dir="ltr"
                                        >{product.sku}</span
                                    >
                                    <span
                                        class="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1"
                                    >
                                        <span class="font-semibold tabular-nums"
                                            >{format.current.money(
                                                product.price,
                                                props.currency,
                                            )}</span
                                        >
                                        <Badge
                                            variant={product.stock > 0
                                                ? 'secondary'
                                                : 'destructive'}
                                        >
                                            {product.stock > 0
                                                ? fill(copy.in_stock, {
                                                      count: format.current.number(product.stock),
                                                  })
                                                : copy.out_of_stock}
                                        </Badge>
                                    </span>
                                </span>
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}

            <section aria-labelledby="pos-recent" class="mt-2">
                <h2 id="pos-recent" class="mb-2 text-sm font-semibold">{copy.recent}</h2>
                {#if props.recentSales.length === 0}
                    <p class="text-muted-foreground text-sm">{copy.recent_empty}</p>
                {:else}
                    <ul class="divide-y rounded-lg border">
                        {#each props.recentSales as recent (recent.id)}
                            <li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span class="min-w-0 truncate">
                                    <span class="font-medium" dir="ltr">{recent.number}</span>
                                    <span class="text-muted-foreground">
                                        · {recent.customer ?? copy.walk_in}</span
                                    >
                                </span>
                                <span class="flex shrink-0 items-center gap-2">
                                    <span class="tabular-nums"
                                        >{format.current.money(recent.total, props.currency)}</span
                                    >
                                    <a
                                        href={recent.receiptUrl}
                                        target="_blank"
                                        rel="noopener"
                                        class="text-primary underline-offset-4 hover:underline"
                                        >{copy.print_receipt}</a
                                    >
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
                <Link
                    href={props.ordersUrl}
                    class="text-primary mt-2 inline-block text-sm underline-offset-4 hover:underline"
                    >{copy.all_orders}</Link
                >
            </section>
        </section>

        <aside
            aria-label={copy.cart}
            class="bg-muted/30 flex min-h-0 flex-col border-t md:border-s md:border-t-0"
        >
            <div class="border-b p-3 md:p-4">
                <PageForm name="sale" />
            </div>

            <div class="flex items-center justify-between px-3 pt-3 md:px-4">
                <h2 class="text-sm font-semibold">
                    {copy.cart}
                    {#if count > 0}
                        <Badge variant="secondary" class="ms-1"
                            >{format.current.number(count)}</Badge
                        >
                    {/if}
                </h2>
                <Button variant="ghost" size="sm" disabled={cart.length === 0} onclick={clear}>
                    {copy.clear}
                    <kbd class="text-muted-foreground text-xs">{copy.clear_hint}</kbd>
                </Button>
            </div>

            <div class="min-h-32 flex-1 overflow-y-auto px-3 py-2 md:px-4">
                {#if cart.length === 0}
                    <p class="text-muted-foreground py-8 text-center text-sm">{copy.cart_empty}</p>
                {:else}
                    <ul class="flex flex-col gap-2" data-testid="pos-cart">
                        {#each cart as line (line.product.id)}
                            {@const quoted = quotedLineTotal(quote, line)}
                            <li class="bg-background flex items-center gap-2 rounded-lg border p-2">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium">{line.product.name}</p>
                                    <p class="text-muted-foreground text-xs tabular-nums">
                                        {format.current.money(line.product.price, props.currency)}
                                    </p>
                                </div>
                                <div class="flex items-center">
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        aria-label={fill(copy.decrease, {
                                            name: line.product.name,
                                        })}
                                        onclick={() =>
                                            changeQuantity(line.product.id, line.quantity - 1)}
                                    >
                                        <Icon name="minus" />
                                    </Button>
                                    <Input
                                        type="number"
                                        inputmode="numeric"
                                        min={1}
                                        max={line.product.stock}
                                        value={line.quantity}
                                        aria-label={fill(copy.quantity, {
                                            name: line.product.name,
                                        })}
                                        class="h-8 w-12 [appearance:textfield] px-1 text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                        oninput={(event: Event) =>
                                            changeQuantity(
                                                line.product.id,
                                                Number(
                                                    (event.currentTarget as HTMLInputElement).value,
                                                ),
                                            )}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        aria-label={fill(copy.increase, {
                                            name: line.product.name,
                                        })}
                                        disabled={remaining(cart, line.product) === 0}
                                        onclick={() => add(line.product)}
                                    >
                                        <Icon name="plus" />
                                    </Button>
                                </div>
                                <span class="w-20 text-end text-sm font-medium tabular-nums">
                                    {#if quoted === null}
                                        <Spinner class="ms-auto size-3" />
                                    {:else}
                                        {format.current.money(quoted, props.currency)}
                                    {/if}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={fill(copy.remove, { name: line.product.name })}
                                    onclick={() => changeQuantity(line.product.id, 0)}
                                >
                                    <Icon name="trash-2" />
                                </Button>
                            </li>
                        {/each}
                    </ul>
                {/if}
                {#if cartErrors.length > 0}
                    <ul role="alert" class="text-destructive mt-2 text-xs">
                        {#each cartErrors as message (message)}
                            <li>{message}</li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <div class="flex flex-col gap-3 border-t p-3 md:p-4">
                <form class="flex flex-col gap-1" onsubmit={applyDiscount}>
                    <div class="flex gap-2">
                        <Input
                            bind:value={discountInput}
                            placeholder={copy.discount_code}
                            aria-label={copy.discount_code}
                            aria-invalid={discountError ? true : undefined}
                            class="uppercase"
                            dir="ltr"
                        />
                        {#if discountCode}
                            <Button
                                type="button"
                                variant="outline"
                                aria-label={copy.remove_discount}
                                onclick={removeDiscount}
                            >
                                <Icon name="x" />
                            </Button>
                        {:else}
                            <Button type="submit" variant="outline">{copy.apply}</Button>
                        {/if}
                    </div>
                    {#if discountError}
                        <p role="alert" class="text-destructive text-xs">{discountError}</p>
                    {/if}
                </form>

                <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                    <dt class="text-muted-foreground">{copy.subtotal}</dt>
                    <dd class="text-end">
                        {format.current.money(quote?.subtotal ?? 0, props.currency)}
                    </dd>
                    {#if quote && quote.discount > 0}
                        <dt class="text-muted-foreground">
                            {copy.discount} <span dir="ltr">({quote.discountCode})</span>
                        </dt>
                        <dd class="text-end">
                            −{format.current.money(quote.discount, props.currency)}
                        </dd>
                    {/if}
                    <dt class="text-muted-foreground">{copy.tax}</dt>
                    <dd class="text-end">
                        {format.current.money(quote?.tax ?? 0, props.currency)}
                    </dd>
                    <dt class="text-base font-semibold">{copy.total}</dt>
                    <dd class="text-end text-base font-semibold" data-testid="pos-total">
                        {format.current.money(quote?.total ?? 0, props.currency)}
                    </dd>
                </dl>

                <Button
                    size="lg"
                    class="h-12 text-base"
                    disabled={cart.length === 0 || charging || quote === null}
                    onclick={charge}
                >
                    {#if charging}
                        <Spinner />
                        {copy.charging}
                    {:else}
                        {fill(copy.charge, {
                            amount: format.current.money(quote?.total ?? 0, props.currency),
                        })}
                        <kbd class="bg-primary-foreground/15 rounded px-1.5 text-xs"
                            >{copy.charge_hint}</kbd
                        >
                    {/if}
                </Button>
                <p class="text-muted-foreground hidden text-center text-xs md:block">
                    {copy.shortcuts}
                </p>
            </div>
        </aside>
    </div>

    <Dialog open={sale !== null} onOpenChange={(open) => !open && (sale = null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{copy.success_title}</DialogTitle>
                <DialogDescription>
                    {sale
                        ? fill(copy.success_body, {
                              number: sale.number,
                              total: format.current.money(sale.total, props.currency),
                          })
                        : ''}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="gap-2 sm:justify-between">
                <div class="flex gap-2">
                    <Button
                        variant="outline"
                        href={sale?.receiptUrl}
                        external
                        target="_blank"
                        rel="noopener"
                    >
                        <Icon name="printer" />
                        {copy.print_receipt}
                    </Button>
                    <Button variant="outline" href={sale?.url ?? props.ordersUrl}
                        >{copy.view_order}</Button
                    >
                </div>
                <Button onclick={newSale}>{copy.new_sale}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</AppPage>
