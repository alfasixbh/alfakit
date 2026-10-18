{{-- Printable receipt of a point of sale order (PointOfSale::receipt()). --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $direction }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>{{ __('apps.pos.receipt.title', ['number' => $order->number]) }}</title>
    <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
    <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
        :root { --ink: #14263D; --muted: #536579; --navy: #073B78; --line: #d9dee5; --paper: #ffffff; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #FFF4E4; color: var(--ink); font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
        main { max-width: 380px; margin: 24px auto; padding: 24px; background: var(--paper); border-radius: 12px; box-shadow: 0 1px 3px rgb(20 38 61 / 0.12); }
        h1 { margin: 0; font: 600 18px/1.3 Montserrat, Inter, ui-sans-serif, sans-serif; color: var(--navy); }
        .muted { color: var(--muted); }
        .center { text-align: center; }
        dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 16px 0; }
        dt { color: var(--muted); }
        dd { margin: 0; text-align: end; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { padding: 6px 0; text-align: start; vertical-align: top; }
        th { color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--line); }
        td.num, th.num { text-align: end; font-variant-numeric: tabular-nums; }
        tfoot td { border-top: 1px solid var(--line); }
        tfoot tr.total td { font-weight: 700; font-size: 16px; }
        .actions { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
        .actions a, .actions button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); text-decoration: none; cursor: pointer; }
        .actions button { background: var(--navy); border-color: var(--navy); color: #fff; }
        @media print {
            body { background: #fff; }
            main { margin: 0; box-shadow: none; max-width: none; padding: 0; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
<main>
    <header class="center">
        <h1>{{ $store->name }}</h1>
        <p class="muted">{{ __('apps.pos.receipt.title', ['number' => $order->number]) }}</p>
    </header>

    <dl>
        <dt>{{ __('apps.pos.receipt.date') }}</dt>
        <dd>{{ $order->placed_at?->timezone($store->timezone ?? config('app.timezone'))->translatedFormat('j M Y, H:i') }}</dd>
        @if ($cashier)
            <dt>{{ __('apps.pos.receipt.cashier') }}</dt>
            <dd>{{ $cashier }}</dd>
        @endif
        <dt>{{ __('apps.pos.receipt.customer') }}</dt>
        <dd>{{ $order->customer?->name ?? __('apps.pos.walk_in') }}</dd>
    </dl>

    <table>
        <thead>
            <tr>
                <th>{{ __('apps.pos.receipt.item') }}</th>
                <th class="num">{{ __('apps.pos.receipt.qty') }}</th>
                <th class="num">{{ __('apps.pos.receipt.amount') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->name }}<br><span class="muted">{{ $item->sku }} · {{ $money($item->unit_price) }}</span></td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">{{ $money($item->total) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr><td colspan="2">{{ __('apps.pos.subtotal') }}</td><td class="num">{{ $money($order->subtotal) }}</td></tr>
            @if ((float) $order->discount_total > 0)
                <tr><td colspan="2">{{ __('apps.pos.discount') }} ({{ $order->discount_code }})</td><td class="num">−{{ $money($order->discount_total) }}</td></tr>
            @endif
            <tr><td colspan="2">{{ __('apps.pos.tax') }}</td><td class="num">{{ $money($order->tax_total) }}</td></tr>
            <tr class="total"><td colspan="2">{{ __('apps.pos.total') }}</td><td class="num">{{ $money($order->total) }}</td></tr>
        </tfoot>
    </table>

    @if ($payment)
        <p class="center muted">{{ __('apps.pos.receipt.paid_with', ['method' => $payment]) }}</p>
    @endif
    <p class="center">{{ __('apps.pos.receipt.thanks') }}</p>

    <div class="actions">
        <a href="{{ $backUrl }}">{{ __('apps.pos.receipt.back') }}</a>
        <button type="button" onclick="window.print()">{{ __('apps.pos.receipt.print') }}</button>
    </div>
</main>
</body>
</html>
