/**
 * Props, method signatures and small pure helpers of the two app pages (point of sale and
 * fulfilment board), shared by the React, Vue and Svelte components so they behave the same.
 * Prices, totals, stock and allowed moves are decided by PHP; nothing here duplicates them.
 */

// ---------------------------------------------------------------- Point of sale

export interface PosProduct {
    id: number
    name: string
    sku: string
    price: number
    stock: number
    image: string | null
    categoryId: number | null
}

export interface PosCategory {
    id: number
    name: string
}

export interface PosRecentSale {
    id: number
    number: string
    total: number
    customer: string | null
    placedAt: string | null
    receiptUrl: string
}

/** `apps.pos` from lang/{locale}/apps.php. */
export type PosCopy = Record<string, string> & {
    payment: Record<string, string>
    errors: Record<string, string>
}

export interface PosProps {
    products: PosProduct[]
    categories: PosCategory[]
    recentSales: PosRecentSale[]
    currency: string
    ordersUrl: string
    copy: PosCopy
}

export interface CartLine {
    product: PosProduct
    quantity: number
}

export interface PosQuote {
    lines: Array<{ productId: number; quantity: number; total: number }>
    subtotal: number
    discount: number
    discountCode: string | null
    discountLabel: string | null
    tax: number
    total: number
}

export interface PosSale {
    id: number
    number: string
    total: number
    url: string
    receiptUrl: string
}

type CartItems = Array<{ product_id: number; quantity: number }>

/** The `#[Expose]` methods of `PointOfSale`, for typed `usePageMethods()`. */
export type PosMethods = {
    searchProducts: { args: { search: string; category: number | null }; result: PosProduct[] }
    findBySku: { args: { code: string }; result: PosProduct }
    quote: { args: { items: CartItems; discountCode: string | null }; result: PosQuote }
    checkout: { args: { items: CartItems; discountCode: string | null }; result: PosSale }
}

/** The highest quantity of one product a sale may hold (`PointOfSale::MAX_QUANTITY`). */
export const MAX_QUANTITY = 99

/** Add one unit of a product (up to its stock). */
export function addToCart(cart: CartLine[], product: PosProduct): CartLine[] {
    const line = cart.find((item) => item.product.id === product.id)

    if (!line) return product.stock > 0 ? [...cart, { product, quantity: 1 }] : cart

    return setQuantity(cart, product.id, line.quantity + 1)
}

/** Set a line's quantity, kept between 1 and the stock; 0 removes the line. */
export function setQuantity(cart: CartLine[], productId: number, quantity: number): CartLine[] {
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return cart.filter((item) => item.product.id !== productId)
    }

    return cart.map((item) =>
        item.product.id === productId
            ? {
                  ...item,
                  quantity: Math.min(Math.floor(quantity), item.product.stock, MAX_QUANTITY),
              }
            : item,
    )
}

/** Refresh the products in the cart with fresh search results (prices and stock). */
export function refreshCart(cart: CartLine[], products: PosProduct[]): CartLine[] {
    let changed = false

    const next = cart.map((line) => {
        const fresh = products.find((product) => product.id === line.product.id)

        if (!fresh || (fresh.price === line.product.price && fresh.stock === line.product.stock)) {
            return line
        }

        changed = true

        return { product: fresh, quantity: Math.min(line.quantity, fresh.stock) }
    })

    // Unchanged carts keep their identity, so the quote is not fetched again.
    return changed ? next.filter((line) => line.quantity > 0) : cart
}

export function cartItems(cart: CartLine[]): CartItems {
    return cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity }))
}

export function cartCount(cart: CartLine[]): number {
    return cart.reduce((count, line) => count + line.quantity, 0)
}

/** How many more units of a product can be added. */
export function remaining(cart: CartLine[], product: PosProduct): number {
    const line = cart.find((item) => item.product.id === product.id)

    return Math.max(0, Math.min(product.stock, MAX_QUANTITY) - (line?.quantity ?? 0))
}

/**
 * The line total the server will charge for a line (`quote.lines`), or nothing while the
 * quote is loading.
 */
export function quotedLineTotal(quote: PosQuote | null, line: CartLine): number | null {
    const quoted = quote?.lines.find((item) => item.productId === line.product.id)

    return quoted && quoted.quantity === line.quantity ? quoted.total : null
}

/** Fill `:name`-style placeholders of a copy string. */
export function fill(
    line: string | undefined,
    replacements: Record<string, string | number>,
): string {
    return Object.entries(replacements).reduce(
        (text, [key, value]) => text.replaceAll(`:${key}`, String(value)),
        line ?? '',
    )
}

/** Whether a modal is open (Esc then belongs to it, not to "clear sale"). */
export function hasOpenDialog(): boolean {
    return typeof document !== 'undefined' && document.querySelector('[role="dialog"]') !== null
}

// ---------------------------------------------------------------- Fulfilment board

export interface BoardCard {
    id: number
    number: string
    status: string
    customer: string
    total: string
    items: string
    placedAt: string | null
    url: string
}

export interface BoardColumn {
    status: string
    label: string
    color: string
    icon: string
    count: number
    cards: BoardCard[]
}

export interface BoardProps {
    columns: BoardColumn[]
    ordersUrl: string
    copy: Record<string, string>
}

/** The column tones, by status colour (logical utilities only). */
export const BOARD_TONES: Record<string, string> = {
    gray: 'bg-muted-foreground',
    info: 'bg-sky-500',
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-destructive',
}

/** The board with one card moved to the end of another column's top (optimistic update). */
export function moveCard(columns: BoardColumn[], cardId: number, status: string): BoardColumn[] {
    const card = columns.flatMap((column) => column.cards).find((item) => item.id === cardId)

    if (!card || card.status === status) return columns

    return columns.map((column) => {
        if (column.status === card.status) {
            return {
                ...column,
                count: Math.max(0, column.count - 1),
                cards: column.cards.filter((item) => item.id !== cardId),
            }
        }

        if (column.status === status) {
            return {
                ...column,
                count: column.count + 1,
                cards: [{ ...card, status }, ...column.cards],
            }
        }

        return column
    })
}

/** Put the server's version of a card in place (after a successful move). */
export function replaceCard(columns: BoardColumn[], card: BoardCard): BoardColumn[] {
    return columns.map((column) => ({
        ...column,
        cards: column.cards.map((item) => (item.id === card.id ? card : item)),
    }))
}

/** Data type of a dragged card. */
export const BOARD_DRAG_TYPE = 'application/x-alfakit-order'
