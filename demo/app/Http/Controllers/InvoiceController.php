<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

/**
 * A printable invoice for one order, reached through a signed link from the order's
 * "Download invoice" action (`EditOrder::invoiceUrl()`). The signature is the authorisation:
 * no session is needed, so the page can be opened in a new tab or sent to a customer.
 */
class InvoiceController extends Controller
{
    public function __invoke(Request $request, Order $order): View
    {
        $order->loadMissing(['store', 'customer', 'items', 'payments']);

        $captured = $order->payments->where('status', PaymentStatus::Captured)->sum(fn ($payment): float => (float) $payment->amount);
        $refunded = $order->payments->where('status', PaymentStatus::Refunded)->sum(fn ($payment): float => (float) $payment->amount);

        return view('sales.invoice', [
            'order' => $order,
            'store' => $order->store,
            'paid' => round($captured - $refunded, 2),
            'balance' => round((float) $order->total - ($captured - $refunded), 2),
            'direction' => in_array(app()->getLocale(), ['ar', 'fa', 'he', 'ur'], true) ? 'rtl' : 'ltr',
        ]);
    }
}
