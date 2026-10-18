<script setup lang="ts">
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
} from '@alfakit/vue'
import { Link } from '@inertiajs/vue3'
import { computed, nextTick, onScopeDispose, ref, shallowRef, watch } from 'vue'

/**
 * `Pages/Pos` (App\Alfakit\Pages\Apps\PointOfSale): product grid with server-side search,
 * SKU entry, cart, the `sale` form (customer and payment method) and the checkout. Totals
 * come from the `quote` method; nothing is priced here.
 */
const props = defineProps<PosProps>()
const copy = computed(() => props.copy)
const format = useFormatter()
const methods = usePageMethods<PosMethods>()
const saleForm = usePageForm('sale')

const search = ref('')
const category = ref<number | null>(null)
const products = shallowRef<PosProduct[]>(props.products)
const cart = shallowRef<CartLine[]>([])
const sku = ref('')
const skuError = ref<string | null>(null)
const discountInput = ref('')
const discountCode = ref<string | null>(null)
const discountError = ref<string | null>(null)
const quote = shallowRef<PosQuote | null>(null)
const cartErrors = ref<string[]>([])
const sale = shallowRef<PosSale | null>(null)
const searchInput = ref<{ $el: HTMLInputElement } | null>(null)

// Today's sales stay fresh while the register is open (and reload after each checkout).
useLiveProps(['recentSales'], { poll: '60s' })

const categories = computed(() => [
    { id: null as number | null, name: copy.value.all_categories },
    ...props.categories,
])
const count = computed(() => cartCount(cart.value))
const charging = computed(() => methods.isLoading('checkout'))

async function runSearch(): Promise<void> {
    const found = await methods.call(
        'searchProducts',
        { search: search.value, category: category.value },
        { toasts: false },
    )

    if (found) {
        products.value = found
        cart.value = refreshCart(cart.value, found)
    }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([search, category], () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => void runSearch(), 250)
})

// The server prices the cart: subtotal, discount and VAT.
let quoteTimer: ReturnType<typeof setTimeout> | undefined
let quoteRun = 0
watch([cart, discountCode], () => {
    clearTimeout(quoteTimer)
    const run = ++quoteRun

    if (cart.value.length === 0) {
        quote.value = null

        return
    }

    quoteTimer = setTimeout(async () => {
        try {
            const next = await methods.callOrThrow(
                'quote',
                { items: cartItems(cart.value), discountCode: discountCode.value },
                { toasts: false },
            )

            if (run !== quoteRun) return
            quote.value = next
            cartErrors.value = []
        } catch (error) {
            if (run !== quoteRun || !(error instanceof PageMethodError)) return

            if (error.errors.discountCode) {
                discountError.value = error.errors.discountCode[0] ?? null
                discountCode.value = null
            }

            cartErrors.value = Object.entries(error.errors)
                .filter(([key]) => key.startsWith('items'))
                .map(([, messages]) => messages[0] ?? '')
        }
    }, 150)
})

onScopeDispose(() => {
    clearTimeout(searchTimer)
    clearTimeout(quoteTimer)
})

function add(product: PosProduct): void {
    cart.value = addToCart(cart.value, product)
}

function changeQuantity(productId: number, quantity: number): void {
    cart.value = setQuantity(cart.value, productId, quantity)
}

async function addSku(): Promise<void> {
    const code = sku.value.trim()

    if (code === '') return

    try {
        add(await methods.callOrThrow('findBySku', { code }, { toasts: false }))
        sku.value = ''
        skuError.value = null
    } catch (error) {
        skuError.value = error instanceof PageMethodError ? (error.errors.code?.[0] ?? null) : null
    }
}

function applyDiscount(): void {
    const code = discountInput.value.trim()
    discountError.value = null
    discountCode.value = code === '' ? null : code.toUpperCase()
}

function removeDiscount(): void {
    discountCode.value = null
    discountInput.value = ''
}

function clear(): void {
    cart.value = []
    discountCode.value = null
    discountInput.value = ''
    discountError.value = null
    cartErrors.value = []
    saleForm.store.value?.setValue('customer_id', null)
}

async function charge(): Promise<void> {
    if (cart.value.length === 0 || charging.value) return

    try {
        sale.value = await methods.callOrThrow(
            'checkout',
            { items: cartItems(cart.value), discountCode: discountCode.value },
            { forms: ['sale'] },
        )
        clear()
        void runSearch()
    } catch (error) {
        if (error instanceof PageMethodError && error.isValidation) {
            cartErrors.value = Object.entries(error.errors)
                .filter(([key]) => !key.startsWith('forms.'))
                .map(([, messages]) => messages[0] ?? '')
        }
    }
}

function newSale(): void {
    sale.value = null
    void nextTick(() => searchInput.value?.$el.focus())
}

useShortcut('/', () => searchInput.value?.$el.focus())
useShortcut('f2', () => void charge(), { allowInInputs: true })
useShortcut('esc', () => (hasOpenDialog() ? undefined : clear()), {
    allowInInputs: true,
    preventDefault: false,
})
</script>

<template>
    <AppPage>
        <div
            class="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_26rem]"
        >
            <section
                :aria-label="copy.search"
                class="flex min-h-0 flex-col gap-3 p-3 md:overflow-y-auto md:p-4 [&>*]:shrink-0"
            >
                <div class="flex flex-col gap-2 lg:flex-row">
                    <div class="relative flex-1">
                        <Icon
                            name="search"
                            class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                        />
                        <Input
                            ref="searchInput"
                            v-model="search"
                            type="search"
                            :placeholder="copy.search"
                            :aria-label="copy.search"
                            class="ps-9 pe-16"
                            dir="auto"
                        />
                        <kbd
                            class="text-muted-foreground bg-muted pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded px-1.5 text-xs sm:block"
                            >/</kbd
                        >
                    </div>
                    <form class="flex flex-col gap-1 lg:w-64" @submit.prevent="addSku">
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <Icon
                                    name="scan-barcode"
                                    class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
                                />
                                <Input
                                    v-model="sku"
                                    :placeholder="copy.sku"
                                    :aria-label="copy.sku"
                                    :aria-invalid="skuError ? true : undefined"
                                    class="ps-9"
                                    dir="ltr"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                :disabled="methods.isLoading('findBySku')"
                                >{{ copy.sku_add }}</Button
                            >
                        </div>
                        <p v-if="skuError" role="alert" class="text-destructive text-xs">
                            {{ skuError }}
                        </p>
                    </form>
                </div>

                <div
                    role="group"
                    :aria-label="copy.categories"
                    class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                >
                    <Button
                        v-for="item in categories"
                        :key="item.id ?? 'all'"
                        size="sm"
                        :variant="category === item.id ? 'default' : 'outline'"
                        :aria-pressed="category === item.id"
                        class="shrink-0 rounded-full"
                        @click="category = item.id"
                        >{{ item.name }}</Button
                    >
                </div>

                <p
                    v-if="products.length === 0"
                    class="text-muted-foreground py-12 text-center text-sm"
                >
                    {{ copy.no_products }}
                </p>
                <ul
                    v-else
                    :class="
                        cn(
                            'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                            methods.isLoading('searchProducts') && 'opacity-60',
                        )
                    "
                >
                    <li v-for="product in products" :key="product.id">
                        <button
                            type="button"
                            data-testid="pos-product"
                            :disabled="remaining(cart, product) === 0"
                            :aria-label="fill(copy.add_to_cart, { name: product.name })"
                            class="bg-card hover:border-primary focus-visible:ring-ring/50 flex h-full w-full flex-col overflow-hidden rounded-xl border text-start shadow-xs transition outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                            @click="add(product)"
                        >
                            <span class="bg-muted block aspect-[4/3] w-full">
                                <img
                                    v-if="product.image"
                                    :src="product.image"
                                    alt=""
                                    loading="lazy"
                                    class="size-full object-cover"
                                />
                            </span>
                            <span class="flex flex-1 flex-col gap-1 p-3">
                                <span class="line-clamp-2 text-sm leading-snug font-medium">{{
                                    product.name
                                }}</span>
                                <span class="text-muted-foreground text-xs" dir="ltr">{{
                                    product.sku
                                }}</span>
                                <span
                                    class="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1"
                                >
                                    <span class="font-semibold tabular-nums">{{
                                        format.money(product.price, props.currency)
                                    }}</span>
                                    <Badge
                                        :variant="product.stock > 0 ? 'secondary' : 'destructive'"
                                    >
                                        {{
                                            product.stock > 0
                                                ? fill(copy.in_stock, {
                                                      count: format.number(product.stock),
                                                  })
                                                : copy.out_of_stock
                                        }}
                                    </Badge>
                                </span>
                            </span>
                        </button>
                    </li>
                </ul>

                <section aria-labelledby="pos-recent" class="mt-2">
                    <h2 id="pos-recent" class="mb-2 text-sm font-semibold">{{ copy.recent }}</h2>
                    <p v-if="props.recentSales.length === 0" class="text-muted-foreground text-sm">
                        {{ copy.recent_empty }}
                    </p>
                    <ul v-else class="divide-y rounded-lg border">
                        <li
                            v-for="recent in props.recentSales"
                            :key="recent.id"
                            class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                            <span class="min-w-0 truncate">
                                <span class="font-medium" dir="ltr">{{ recent.number }}</span>
                                <span class="text-muted-foreground">
                                    · {{ recent.customer ?? copy.walk_in }}</span
                                >
                            </span>
                            <span class="flex shrink-0 items-center gap-2">
                                <span class="tabular-nums">{{
                                    format.money(recent.total, props.currency)
                                }}</span>
                                <a
                                    :href="recent.receiptUrl"
                                    target="_blank"
                                    rel="noopener"
                                    class="text-primary underline-offset-4 hover:underline"
                                    >{{ copy.print_receipt }}</a
                                >
                            </span>
                        </li>
                    </ul>
                    <Link
                        :href="props.ordersUrl"
                        class="text-primary mt-2 inline-block text-sm underline-offset-4 hover:underline"
                        >{{ copy.all_orders }}</Link
                    >
                </section>
            </section>

            <aside
                :aria-label="copy.cart"
                class="bg-muted/30 flex min-h-0 flex-col border-t md:border-s md:border-t-0"
            >
                <div class="border-b p-3 md:p-4">
                    <PageForm name="sale" />
                </div>

                <div class="flex items-center justify-between px-3 pt-3 md:px-4">
                    <h2 class="text-sm font-semibold">
                        {{ copy.cart }}
                        <Badge v-if="count > 0" variant="secondary" class="ms-1">{{
                            format.number(count)
                        }}</Badge>
                    </h2>
                    <Button variant="ghost" size="sm" :disabled="cart.length === 0" @click="clear">
                        {{ copy.clear }}
                        <kbd class="text-muted-foreground text-xs">{{ copy.clear_hint }}</kbd>
                    </Button>
                </div>

                <div class="min-h-32 flex-1 overflow-y-auto px-3 py-2 md:px-4">
                    <p
                        v-if="cart.length === 0"
                        class="text-muted-foreground py-8 text-center text-sm"
                    >
                        {{ copy.cart_empty }}
                    </p>
                    <ul v-else class="flex flex-col gap-2" data-testid="pos-cart">
                        <li
                            v-for="line in cart"
                            :key="line.product.id"
                            class="bg-background flex items-center gap-2 rounded-lg border p-2"
                        >
                            <div class="min-w-0 flex-1">
                                <p class="truncate text-sm font-medium">{{ line.product.name }}</p>
                                <p class="text-muted-foreground text-xs tabular-nums">
                                    {{ format.money(line.product.price, props.currency) }}
                                </p>
                            </div>
                            <div class="flex items-center">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    :aria-label="fill(copy.decrease, { name: line.product.name })"
                                    @click="changeQuantity(line.product.id, line.quantity - 1)"
                                >
                                    <Icon name="minus" />
                                </Button>
                                <Input
                                    type="number"
                                    inputmode="numeric"
                                    :min="1"
                                    :max="line.product.stock"
                                    :model-value="line.quantity"
                                    :aria-label="fill(copy.quantity, { name: line.product.name })"
                                    class="h-8 w-12 [appearance:textfield] px-1 text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                    @update:model-value="
                                        changeQuantity(line.product.id, Number($event))
                                    "
                                />
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    :aria-label="fill(copy.increase, { name: line.product.name })"
                                    :disabled="remaining(cart, line.product) === 0"
                                    @click="add(line.product)"
                                >
                                    <Icon name="plus" />
                                </Button>
                            </div>
                            <span class="w-20 text-end text-sm font-medium tabular-nums">
                                <Spinner
                                    v-if="quotedLineTotal(quote, line) === null"
                                    class="ms-auto size-3"
                                />
                                <template v-else>{{
                                    format.money(quotedLineTotal(quote, line) ?? 0, props.currency)
                                }}</template>
                            </span>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                :aria-label="fill(copy.remove, { name: line.product.name })"
                                @click="changeQuantity(line.product.id, 0)"
                            >
                                <Icon name="trash-2" />
                            </Button>
                        </li>
                    </ul>
                    <ul
                        v-if="cartErrors.length > 0"
                        role="alert"
                        class="text-destructive mt-2 text-xs"
                    >
                        <li v-for="message in cartErrors" :key="message">{{ message }}</li>
                    </ul>
                </div>

                <div class="flex flex-col gap-3 border-t p-3 md:p-4">
                    <form class="flex flex-col gap-1" @submit.prevent="applyDiscount">
                        <div class="flex gap-2">
                            <Input
                                v-model="discountInput"
                                :placeholder="copy.discount_code"
                                :aria-label="copy.discount_code"
                                :aria-invalid="discountError ? true : undefined"
                                class="uppercase"
                                dir="ltr"
                            />
                            <Button
                                v-if="discountCode"
                                type="button"
                                variant="outline"
                                :aria-label="copy.remove_discount"
                                @click="removeDiscount"
                            >
                                <Icon name="x" />
                            </Button>
                            <Button v-else type="submit" variant="outline">{{ copy.apply }}</Button>
                        </div>
                        <p v-if="discountError" role="alert" class="text-destructive text-xs">
                            {{ discountError }}
                        </p>
                    </form>

                    <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                        <dt class="text-muted-foreground">{{ copy.subtotal }}</dt>
                        <dd class="text-end">
                            {{ format.money(quote?.subtotal ?? 0, props.currency) }}
                        </dd>
                        <template v-if="quote && quote.discount > 0">
                            <dt class="text-muted-foreground">
                                {{ copy.discount }}
                                <span dir="ltr">({{ quote.discountCode }})</span>
                            </dt>
                            <dd class="text-end">
                                −{{ format.money(quote.discount, props.currency) }}
                            </dd>
                        </template>
                        <dt class="text-muted-foreground">{{ copy.tax }}</dt>
                        <dd class="text-end">
                            {{ format.money(quote?.tax ?? 0, props.currency) }}
                        </dd>
                        <dt class="text-base font-semibold">{{ copy.total }}</dt>
                        <dd class="text-end text-base font-semibold" data-testid="pos-total">
                            {{ format.money(quote?.total ?? 0, props.currency) }}
                        </dd>
                    </dl>

                    <Button
                        size="lg"
                        class="h-12 text-base"
                        :disabled="cart.length === 0 || charging || quote === null"
                        @click="charge"
                    >
                        <template v-if="charging">
                            <Spinner />
                            {{ copy.charging }}
                        </template>
                        <template v-else>
                            {{
                                fill(copy.charge, {
                                    amount: format.money(quote?.total ?? 0, props.currency),
                                })
                            }}
                            <kbd class="bg-primary-foreground/15 rounded px-1.5 text-xs">{{
                                copy.charge_hint
                            }}</kbd>
                        </template>
                    </Button>
                    <p class="text-muted-foreground hidden text-center text-xs md:block">
                        {{ copy.shortcuts }}
                    </p>
                </div>
            </aside>
        </div>

        <Dialog :open="sale !== null" @update:open="(open: boolean) => !open && (sale = null)">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ copy.success_title }}</DialogTitle>
                    <DialogDescription>
                        {{
                            sale
                                ? fill(copy.success_body, {
                                      number: sale.number,
                                      total: format.money(sale.total, props.currency),
                                  })
                                : ''
                        }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="gap-2 sm:justify-between">
                    <div class="flex gap-2">
                        <Button variant="outline" as-child>
                            <a :href="sale?.receiptUrl" target="_blank" rel="noopener">
                                <Icon name="printer" />
                                {{ copy.print_receipt }}
                            </a>
                        </Button>
                        <Button variant="outline" as-child>
                            <Link :href="sale?.url ?? props.ordersUrl">{{ copy.view_order }}</Link>
                        </Button>
                    </div>
                    <Button @click="newSale">{{ copy.new_sale }}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </AppPage>
</template>
