---
title: Invoices
description: Invoices, quotes, credit notes and receipts with exact money, taxes, numbering, payments, PDFs and a customer link.
---

# Invoices

`alfasix/alfakit-invoices` adds billing documents to a panel: invoices, quotes, credit notes and receipts.

- **Exact money.** Amounts are integers of the currency's minor unit (cents, fils, yen). There are no floats anywhere in the calculation, and every ISO 4217 currency works: JPY has no decimals, BHD has three.
- **Taxes.** Named rates can be inclusive (extracted from the price) or exclusive (added on top), simple or compound. Taxes are rounded per line or once on the total.
- **Numbering.** Each type has its own sequence per tenant, with a format such as `INV-{YYYY}-{SEQ:5}`. Numbers are generated atomically.
- **Live totals.** The editor recomputes line amounts and totals **on the server** as you type, using the normal `live()` refresh. Totals that are saved are always computed again on the server. They are never read from the form.
- **Lifecycle.** You can send a document (a queued email with the document attached and a secure link), record payments (partial or full), mark it paid, duplicate it, convert a quote into an invoice, issue a credit note and void it. A scheduled command marks invoices overdue.
- **Widgets.** Outstanding, overdue and paid this month, plus a receivables aging chart. Figures are per currency.
- **Documents.** The document is rendered server-side from a Blade view with your panel's logo, colour and font. It works right to left and formats numbers for the document's locale. A pluggable `PdfRenderer` turns it into a file.
- **Customer page.** A signed link outside the panel lets the customer view and download the document and see its payment status. Opening the link marks the document as viewed, and the page has an optional "Pay now" hook.

Everything in the panel is built from AlfaKit components (a resource with a table repeater, actions, infolists and widgets), so it renders in React, Vue and Svelte. There is no frontend package.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-invoices
php artisan vendor:publish --tag=alfakit-invoices-migrations
php artisan migrate
php artisan vendor:publish --tag=alfakit-invoices-config   # optional
```

The migration creates five tables:

- `alfakit_invoices`
- `alfakit_invoice_items`
- `alfakit_invoice_taxes`
- `alfakit_invoice_payments`
- `alfakit_invoice_sequences`

Documents and tax rates have a nullable polymorphic `tenant`, so any tenant model works.

### PDF files

The plugin doesn't install a PDF library. It uses the first one it finds:

| Installed package                            | Renderer            | Notes                                                                                     |
| -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `spatie/laravel-pdf`                         | `SpatiePdfRenderer` | Headless Chrome. Full CSS and correct Arabic/Persian shaping.                             |
| `barryvdh/laravel-dompdf` or `dompdf/dompdf` | `DompdfRenderer`    | Pure PHP. Remote files are off. No shaping for Arabic scripts.                            |
| neither                                      | `HtmlRenderer`      | A print-ready HTML file (`.html`). Customers print it or save it as PDF from the browser. |

To get real PDF files, install one of them:

```bash
composer require spatie/laravel-pdf     # recommended, needs Chrome/Chromium (Browsershot)
# or
composer require barryvdh/laravel-dompdf
```

## Register

```php
use AlfaSix\AlfakitInvoices\Enums\InvoiceType;
use AlfaSix\AlfakitInvoices\Enums\Rounding;
use AlfaSix\AlfakitInvoices\InvoicesPlugin;
use App\Models\User;

$panel
    ->currency('BHD')
    ->plugin(
        InvoicesPlugin::make()
            ->authorize(fn (User $user): bool => $user->can_bill)
            ->customers(fn (?Team $tenant) => Customer::query()->whereBelongsTo($tenant), titleAttribute: 'company')
            ->numbering(InvoiceType::Invoice, prefix: 'INV-', format: '{YYYY}-{SEQ:5}')
            ->rounding(Rounding::PerLine)
            ->seller(fn (?Team $tenant): array => [
                'name' => $tenant?->name,
                'address' => $tenant?->address,
                'tax_id' => $tenant?->vat_number,
            ])
            ->branding(logo: asset('images/logo.svg'), color: '#0f766e')
            ->dashboardWidgets(),
    );
```

`$user->can_bill` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->can_bill`.

`Customer` and `Team` stand for your own models (import them): `customers()` lists who you bill, and `Team` is your panel's tenant model. Without tenancy, drop the `?Team $tenant` parameter; with neither model yet, leave `customers()` and `seller()` out: the form then has the customer's details typed in.

This registers two resources:

- **Invoices** (`/invoices`), with tabs per type and a stats header.
- **Tax rates** (`/invoice-taxes`).

Both are in the "Billing" navigation group.

## Options

| Method                                                                                  | Default                                             | Does                                                                                                                                             |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `authorize(bool\|Closure)`                                                              | every signed-in user                                | Who may work with invoices: `fn (User $user): bool`. The default policies check it.                                                              |
| `customers(Closure $query, string $titleAttribute = 'name', array $searchColumns = [])` | none (details are typed in)                         | Adds a searchable customer picker that copies the customer's details. The closure receives `$tenant`. Only customers in the query can be picked. |
| `numbering(InvoiceType\|string $type, prefix:, format:)`                                | `INV-`, `QUO-`, `CN-`, `RCT-` with `{YYYY}-{SEQ:5}` | The number of a type. Either argument may be a closure receiving `$tenant`.                                                                      |
| `assignNumbersOnIssue()`                                                                | numbers on create                                   | Drafts show "Draft" and get their number when they are sent, paid or converted, so deleted drafts leave no gaps.                                 |
| `rounding(Rounding\|string)`                                                            | `Rounding::PerLine`                                 | When taxes are rounded. Each document stores its own rounding.                                                                                   |
| `currency(string\|Closure)`                                                             | the panel's currency                                | The currency of new documents.                                                                                                                   |
| `currencies(array\|Closure)`                                                            | all currencies in circulation                       | Limits the currency picker.                                                                                                                      |
| `dueDays(int)` / `quoteValidDays(int)`                                                  | 30 / 30                                             | The default due date of invoices and the validity of quotes.                                                                                     |
| `seller(array\|Closure)`                                                                | `config('alfakit-invoices.seller')`                 | The seller printed on documents: `name`, `address`, `email`, `phone`, `tax_id`, `website`.                                                       |
| `branding(name:, logo:, color:, font:)`                                                 | the panel's branding                                | Overrides the panel's brand name, logo, primary colour and font on documents.                                                                    |
| `defaultNotes(string\|Closure)` / `defaultTerms(...)`                                   | none                                                | Prefills the notes and terms of new documents. The closures receive `$type`.                                                                     |
| `payNowUsing(Closure)`                                                                  | none                                                | `fn (Invoice $invoice): ?string`. The "Pay now" URL on the customer page.                                                                        |
| `invoiceResource(class)` / `taxResource(class)`                                         | built-in                                            | Use your own subclasses.                                                                                                                         |
| `taxes(false)`                                                                          | registered                                          | Hides the tax rates resource.                                                                                                                    |
| `dashboardWidgets()`                                                                    | off                                                 | Adds `InvoiceStatsWidget` and `InvoiceAgingWidget` to the dashboard.                                                                             |
| `navigationGroup()` / `navigationSort()`                                                | "Billing"                                           | Navigation.                                                                                                                                      |

`config/alfakit-invoices.php` holds the options that apply outside a panel request:

- the number formats per type, and `numbering.assign`
- `rounding`, `quantity_decimals`, `due_days`, `payment_methods`
- the seller
- `pdf.renderer` (a class implementing `PdfRenderer`), `pdf.paper` (`a4`, `letter`…) and `pdf.view`
- the public route (`route.prefix`, `middleware`, `domain`), `link_expires_days` and `preview_minutes`
- the mail queue and connection, and `mail.attach_document`
- the overdue schedule
- the model classes

## Documents in code

```php
use AlfaSix\AlfakitInvoices\Models\Invoice;

$invoice = Invoice::createWithItems(
    ['billable' => $customer, 'currency' => 'BHD', 'reference' => 'PO-1042'],
    [
        ['description' => 'Design', 'quantity' => '10', 'unit_price' => 25000, 'tax_ids' => [$vat->id]],
        ['description' => 'Hosting', 'quantity' => '1', 'unit_price' => 5000, 'discount_type' => 'percent', 'discount_value' => '20'],
    ],
    tenant: $team,
);

$invoice->total;                       // 279000 (279.000 BHD)
$invoice->formatMoney($invoice->total); // "BHD 279.000" in the document's locale

$invoice->markAsSent();
$invoice->recordPayment(100000, method: 'bank_transfer', reference: 'TT-88');
$invoice->markAsPaid();
$invoice->removePayment($payment);

$copy = $invoice->duplicate();
$invoice = $quote->convertToInvoice();               // once per quote
$creditNote = $invoice->createCreditNote();          // settles the balance it covers
$creditNote = $invoice->createCreditNote(apply: false);
$invoice->applyCreditNote($creditNote);
$invoice->void();                                    // not with payments

$invoice->getCustomerUrl();  // signed link for the customer
$invoice->getPreviewUrl();   // short-lived link for panel users (doesn't count as a view)
```

Line `unit_price` is in minor units. `quantity` and `discount_value` are decimal strings: a percentage, or an amount in major units for `fixed` discounts. `recalculate()` computes and stores the line and document totals. While the document is still editable, it also takes a fresh snapshot of the tax rates; after that, editing a tax rate never changes the document.

To bill a customer model, implement `InvoiceRecipient` on it. Models without the contract work too: their `name`, `email`, `phone`, `address` and `tax_id` attributes are copied.

```php
use AlfaSix\AlfakitInvoices\Contracts\InvoiceRecipient;

class Customer extends Model implements InvoiceRecipient
{
    public function getInvoiceRecipientDetails(): array
    {
        return ['name' => $this->company, 'email' => $this->billing_email, 'address' => $this->address, 'tax_id' => $this->vat];
    }
}
```

### Totals

`Calculator::calculate(array $lines, string $currency, Rounding $rounding)` is pure and can be used on its own. Each line is calculated like this:

1. `amount = quantity × unit price`, rounded half away from zero.
2. The discount is a percentage of the amount, or a fixed amount. It is rounded and capped at the amount.
3. Inclusive taxes are extracted from `amount − discount`: `net = gross / ((1 + Σ simple rates) × Π (1 + compound rate))`.
4. Simple taxes are charged on the net. Compound taxes are charged on the net plus every tax before them. Inclusive taxes come first, then exclusive ones, simple before compound.

With `PerLine`, each line's taxes are rounded and then added up. With `PerTotal`, each rate's exact sum is rounded once. The document stores:

- `subtotal`: the line amounts as priced
- `discount_total`
- `tax_total`: including inclusive taxes
- `total`: `subtotal − discount + exclusive taxes`
- `amount_paid` and `amount_due`
- `tax_breakdown` per rate

### Statuses

`draft → sent → viewed → partially_paid / paid`. `overdue` comes from the command. `void` is final.

Every change goes through `InvoiceStatus::canTransitionTo()`. A change that isn't allowed throws `InvalidStatusTransition`, with a translated message. The type also limits the statuses: quotes never take payments or fall overdue, and credit notes don't fall overdue.

Payments derive the status. Recording a payment can give partially paid, paid or overdue. Removing a payment moves the document back to sent, viewed or overdue.

Payments are recorded under a row lock, so two concurrent payments can't overpay. `InvalidPayment` covers amounts above the balance, non-positive amounts and documents that don't take payments.

The model fires these events:

- `InvoiceSent`
- `InvoiceViewed` (once)
- `PaymentRecorded`
- `PaymentRemoved`
- `InvoicePaid`
- `InvoiceMarkedOverdue`
- `InvoiceVoided`

### Numbering

`Numbering::next($type, $tenant, $date)` increments the sequence of the type, tenant and period with a single `UPDATE … SET value = value + 1` inside a transaction. The database serialises concurrent requests (a row lock on MySQL and PostgreSQL, the write lock on SQLite), so no two documents get the same number.

The period follows the format's date tokens:

- `{DD}` restarts the sequence daily.
- `{MM}` restarts it monthly.
- `{YYYY}` or `{YY}` restarts it yearly.
- A format without date tokens never restarts.

Every tenant has its own sequences.

## The panel

- **List.** Tabs for all documents and for each type. Filters for status, currency, overdue and unpaid. The stats widget sits above the table. "New invoice" has a menu for a new quote or receipt (`/invoices/create?type=quote`).
- **Editor.** Customer details or a customer picker, then the line items in a table repeater: description, quantity, unit price, discount (% or amount), taxes and the line amount. Next to them are the document details and a **Totals** panel. Line amounts and totals are recalculated on the server whenever a line changes. Only the current tenant's active tax rates are offered and accepted.
- **Document page.** Totals, lines, payments and history.
    - Header actions: **Send**, **Record payment** and **Edit**.
    - Under **More**: preview, download, customer link, mark as sent, mark as paid, duplicate, convert to invoice, issue credit note, void and delete.

Each action is authorised by a policy ability and only shows when the document's state allows it:

| Action                            | Ability         |
| --------------------------------- | --------------- |
| Send, mark as sent, customer link | `send`          |
| Record payment, mark as paid      | `recordPayment` |
| Void                              | `void`          |
| Duplicate                         | `duplicate`     |
| Convert to invoice                | `convert`       |
| Issue credit note                 | `creditNote`    |
| Preview, download                 | `view`          |

The default `InvoicePolicy` combines `authorize()` with the document's state:

- Only drafts can be deleted.
- Paid, partially paid, converted and void documents are locked.

The resource applies these state rules itself as well, so they also hold for users a `Gate::before()` lets through, such as [Shield](shield)'s super admin.

Register your own policy with `Gate::policy(Invoice::class, MyPolicy::class)`. As everywhere in AlfaKit, an ability your policy doesn't define is allowed unless the panel uses `strictAuthorization()`.

Receipts record a sale that was paid on the spot. Creating a receipt in the panel records a payment for its total.

### Sending

**Send** asks for the recipient, Cc, subject and message, and whether to attach the document. It then queues `InvoiceMail`:

- The email is sent in the document's locale.
- It shows the amount and due date, and has a button to the signed customer page.
- With the attachment on, it carries the file from the `PdfRenderer`.

The document is marked as sent; a draft gets its number at this point. Set `mail.queue` and `mail.connection` in the config.

### Overdue invoices

`php artisan alfakit-invoices:mark-overdue` marks sent, viewed and partially paid invoices whose due date has passed as overdue. It covers every tenant. Pass `--date=Y-m-d` to treat another day as today.

The command is scheduled daily at `overdue.time` (`00:30`). Set `overdue.schedule` to `false` to schedule it yourself.

### Widgets

`InvoiceStatsWidget` shows outstanding, overdue and paid this month. `InvoiceAgingWidget` shows unpaid balances by days past due (current, 1–30, 31–60, 61–90 and 90+), with an accessible table as alternative. Both are scoped to the current tenant. Amounts are shown per currency and never added across currencies. Use them on any page:

```php
protected function getHeaderWidgets(): array
{
    return [InvoiceStatsWidget::class, InvoiceAgingWidget::class];
}
```

## Documents and the customer page

The document is the Blade view `alfakit-invoices::document`. It contains:

- the seller (name, address, tax ID) and the panel logo
- the document title, number, status, dates and reference
- the bill-to details
- the lines, with discount and tax columns when they are used
- the totals with the tax breakdown, the paid and due amounts, and the payments received
- the notes and terms

The view is laid out with tables so Dompdf can render it. It has `@page` rules for A4 or Letter, and it's readable on a phone. It is rendered in the document's `locale`:

- labels are translated
- money, dates and percentages are formatted with ICU (`١٠٠٫٠٠٠ د.ب.‏` for `ar_BH`)
- `dir="rtl"` mirrors the layout

The logo, accent colour and font come from the panel: `brandLogo()`, the `primary` colour and `font()`. A logo stored under `public/` is embedded in the document, so renderers never fetch URLs. To customise the layout, publish the views with `php artisan vendor:publish --tag=alfakit-invoices-views` and edit `document.blade.php` and `partials/body.blade.php`.

The customer page is at `GET /invoices/{uuid}` and the download at `GET /invoices/{uuid}/download`. Both are behind Laravel's `signed` middleware. The page shows:

- the amount due and the status
- **Pay now**, when there is a payment link
- **Download** and **Print**
- the document itself

Opening the page marks a sent invoice as viewed.

### Pay now

The button appears only while a payable document has a balance. Its URL comes from `payNowUsing()`, otherwise from the bound `PaymentLinkProvider`.

The default provider, `BillingPaymentLink`, uses AlfaKit Billing when it's installed (checked with `class_exists`) and the panel's billing provider has an `invoicePaymentUrl(Invoice $invoice)` method. The plugin never takes payments itself. When your gateway confirms a payment, record it in your webhook:

```php
$invoice->recordPayment($amountInMinorUnits, method: 'online', reference: $chargeId);
```

### A custom PDF renderer

```php
use AlfaSix\AlfakitInvoices\Contracts\PdfRenderer;

class GotenbergRenderer implements PdfRenderer
{
    public function render(string $html, array $options = []): string { /* return PDF bytes */ }
    public function mimeType(): string { return 'application/pdf'; }
    public function extension(): string { return 'pdf'; }
}
```

Set `'pdf' => ['renderer' => GotenbergRenderer::class]` in the config, or bind `PdfRenderer` in a service provider. In tests, bind a fake: `app()->instance(PdfRenderer::class, new FakeRenderer)`.

## Tenancy

On panels with `tenant()`, everything is scoped to the current tenant:

- documents, tax rates and the customer query
- number sequences (`scope` is the tenant's morph class and key)
- the widgets

Records of another tenant return 404. New documents and taxes belong to the current tenant. Tax ids of another tenant are rejected by the form and ignored when calculating.

## Security notes

- **Totals.** Totals, balances and statuses are only ever computed on the server. Posted totals are ignored, and the form's live totals are only a preview.
- **Customer links.** Links are signed URLs carrying an unguessable UUID. Changing any parameter breaks the signature. Drafts aren't shown to customers.
    - Links never expire unless `link_expires_days` is set.
    - Panel previews are temporary signed links that don't count as views.
- **Response headers.** The customer page and downloads send `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`. The route is throttled (`throttle:60,1` by default).
- **Escaping and URLs.** Customer details, descriptions, notes and terms are escaped in the document and the email. "Pay now" URLs go through `Url::sanitize()`, so `javascript:` URLs are dropped.
- **PDF rendering.** `DompdfRenderer` disables remote files, PHP and JavaScript.

## Renderers

The plugin uses only standard AlfaKit components, so React, Vue and Svelte panels render it identically. The customer page and the document are plain server-rendered HTML.

## "Powered by" credit

The pages and emails your customers see carry no AlfaKit or Alfa Six branding by default. To credit AlfaKit, turn on the small "Powered by AlfaKit · Alfa Six" line for the customer invoice page, the invoice document and PDF, and the invoice email:

```php
InvoicesPlugin::make()->poweredBy();
```

Without `poweredBy()`, the plugin follows `config('alfakit.credit.public_pages')` and `config('alfakit.credit.emails')`, both `false` by default. See [Credits](../panels/configuration#credits).
