@php
    use AlfaSix\Alfakit\Support\Currency;
    use App\Alfakit\Schemas\AddressFields;

    $money = fn (mixed $amount): string => Currency::format((float) $amount, $order->currency);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $direction }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>{{ __('sales.invoice.title', ['number' => $order->number]) }} · {{ $store->name }}</title>
    <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
    <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
        :root { --navy: #073B78; --orange: #F47A22; --cream: #FFF4E4; --ink: #1d2433; --muted: #6b7280; --line: #e5e7eb; }
        * { box-sizing: border-box; }
        html { background: var(--cream); }
        body { margin: 0; color: var(--ink); font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
        .sheet { max-width: 800px; margin: 32px auto; background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(7, 59, 120, .08); padding: 48px; }
        header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 3px solid var(--navy); padding-bottom: 24px; }
        h1, h2, h3 { font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; color: var(--navy); }
        h1 { font-size: 26px; letter-spacing: -.01em; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 6px; }
        .brand { display: flex; flex-direction: column; gap: 4px; }
        .brand .store { font-family: Montserrat, sans-serif; font-weight: 700; font-size: 18px; color: var(--navy); }
        .brand .meta { color: var(--muted); font-size: 13px; }
        .number { text-align: end; }
        .number .status { display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 999px; background: var(--cream); color: var(--orange); font-weight: 600; font-size: 12px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin: 28px 0; }
        .parties p { margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 10px 8px; text-align: start; border-bottom: 1px solid var(--line); vertical-align: top; }
        th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; }
        td.num, th.num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
        td .sku { display: block; color: var(--muted); font-size: 12px; }
        .totals { margin-top: 16px; margin-inline-start: auto; width: 300px; }
        .totals td { border: 0; padding: 4px 8px; }
        .totals tr.grand td { border-top: 2px solid var(--navy); font-weight: 700; font-size: 16px; color: var(--navy); padding-top: 10px; }
        .totals tr.balance td { color: var(--orange); font-weight: 600; }
        footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .print { position: fixed; inset-block-start: 16px; inset-inline-end: 16px; background: var(--navy); color: #fff; border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 600; cursor: pointer; }
        @media print { html { background: #fff; } .sheet { box-shadow: none; margin: 0; max-width: none; border-radius: 0; } .print { display: none; } }
        @media (max-width: 640px) { .sheet { padding: 24px; margin: 0; border-radius: 0; } .parties { grid-template-columns: 1fr; } .totals { width: 100%; } }
    </style>
</head>
<body>
    <button type="button" class="print" onclick="window.print()">{{ __('sales.invoice.print') }}</button>

    <main class="sheet">
        <header>
            <div class="brand">
                <img src="/brand/alfakit-wordmark-color.svg" alt="AlfaKit" height="28" width="130" style="height: 28px; width: auto;">
                <span class="store">{{ $store->name }}</span>
                <span class="meta">{{ implode(' · ', array_filter([$store->city, $store->email, $store->phone])) }}</span>
            </div>
            <div class="number">
                <h1>{{ __('sales.invoice.title', ['number' => $order->number]) }}</h1>
                <div class="meta" style="color: var(--muted);">{{ __('sales.invoice.issued') }}: {{ $order->placed_at?->translatedFormat('j F Y') }}</div>
                <span class="status">{{ $order->status->getLabel() }}</span>
            </div>
        </header>

        <section class="parties">
            <div>
                <h2>{{ __('sales.fields.customer') }}</h2>
                <p><strong>{{ $order->customer?->name ?? __('sales.orders.wizard.review_anonymous') }}</strong></p>
                @if ($order->customer)
                    <p>{{ $order->customer->email }}</p>
                    @if ($order->customer->phone)<p>{{ $order->customer->phone }}</p>@endif
                @endif
            </div>
            <div>
                <h2>{{ __('sales.invoice.bill_to') }}</h2>
                <p>{{ AddressFields::format($order->billing_address) ?? '—' }}</p>
            </div>
            <div>
                <h2>{{ __('sales.invoice.ship_to') }}</h2>
                <p>{{ AddressFields::format($order->shipping_address) ?? '—' }}</p>
            </div>
        </section>

        <table>
            <thead>
                <tr>
                    <th>{{ __('sales.invoice.description') }}</th>
                    <th class="num">{{ __('sales.fields.quantity') }}</th>
                    <th class="num">{{ __('sales.fields.unit_price') }}</th>
                    <th class="num">{{ __('sales.fields.line_total') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($order->items as $item)
                    <tr>
                        <td>{{ $item->name }}@if ($item->sku)<span class="sku">{{ $item->sku }}</span>@endif</td>
                        <td class="num">{{ $item->quantity }}</td>
                        <td class="num">{{ $money($item->unit_price) }}</td>
                        <td class="num">{{ $money($item->total) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals">
            <tr><td>{{ __('sales.fields.subtotal') }}</td><td class="num">{{ $money($order->subtotal) }}</td></tr>
            @if ((float) $order->discount_total > 0)
                <tr><td>{{ __('sales.fields.discount') }}@if ($order->discount_code) ({{ $order->discount_code }})@endif</td><td class="num">−{{ $money($order->discount_total) }}</td></tr>
            @endif
            <tr><td>{{ __('sales.fields.shipping') }}</td><td class="num">{{ $money($order->shipping_total) }}</td></tr>
            <tr><td>{{ __('sales.fields.tax') }}</td><td class="num">{{ $money($order->tax_total) }}</td></tr>
            <tr class="grand"><td>{{ __('sales.fields.total') }}</td><td class="num">{{ $money($order->total) }}</td></tr>
            <tr><td>{{ __('sales.invoice.payments') }}</td><td class="num">{{ $money($paid) }}</td></tr>
            <tr class="balance"><td>{{ __('sales.invoice.balance') }}</td><td class="num">{{ $money(max(0, $balance)) }}</td></tr>
        </table>

        <footer>
            <span>{{ __('sales.invoice.thanks', ['store' => $store->name]) }}</span>
            <span>{{ __('sales.invoice.demo_note') }}</span>
        </footer>
    </main>
</body>
</html>
