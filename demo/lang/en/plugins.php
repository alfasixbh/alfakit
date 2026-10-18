<?php

declare(strict_types=1);

/*
 * Strings of the first-party plugin integration (app/Demo/DemoPlugins.php and friends).
 * Keep lang/{locale}/plugins.php (13 locales) in sync (PluginsTranslationParityTest).
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Open the order board',
        'calendar' => 'Open the store calendar',
        'returns' => 'Review returns',
        'category_tree' => 'Arrange the category tree',
        'new_product' => 'Add a product',
        'storefront' => 'Open the storefront',
    ],

    'board' => [
        'title' => 'Order board',
        'subheading' => 'Drag orders along the fulfilment flow, or move them with the keyboard (Space, arrows, Space). The last 60 days.',
        'open' => 'Board',
        'timeline_note' => 'Moved on the order board by :user',
    ],

    'calendar' => [
        'title' => 'Calendar',
        'subheading' => 'Promotions, shipments, deliveries and scheduled pages of this store.',
        'this_week' => 'This week',
        'new_promotion' => 'Plan a promotion',
        'hint' => 'Drag a promotion to move it, drag its end to change how long it runs, click it to edit, select days to plan a new one.',
        'fields' => [
            'value' => 'Value (% or amount)',
        ],
        'legend' => [
            'label' => 'Legend',
            'percentage' => 'Promotion: percentage off',
            'fixed' => 'Promotion: amount off',
            'free_shipping' => 'Promotion: free shipping',
            'shipped' => 'Shipment left the boutique',
            'delivered' => 'Delivered',
            'publish' => 'Scheduled page',
        ],
        'events' => [
            'shipped' => ':number shipped (:carrier)',
            'delivered' => ':number delivered',
            'publish' => 'Publish: :title',
        ],
    ],

    'returns' => [
        'label' => 'return',
        'plural' => 'Returns',
        'workflow' => 'Return approval',
        'subheading' => 'Support opens a return from an order and submits it; an owner or manager approves it from Approvals; approved returns are refunded.',
        'empty' => 'No returns yet',
        'request' => 'Request a return',
        'request_heading' => 'Return for order :number',
        'created' => 'Return :number opened. Submit it for approval when it is complete.',
        'timeline_note' => 'Refunded through return :number',
        'states' => [
            'requested' => 'Requested',
            'awaiting_approval' => 'Awaiting approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'refunded' => 'Refunded',
            'closed' => 'Closed',
        ],
        'transitions' => [
            'submit' => 'Submit for approval',
            'refund' => 'Refund',
            'reopen' => 'Reopen',
            'close' => 'Close',
        ],
        'steps' => [
            'manager' => 'Manager approval',
        ],
        'reasons' => [
            'damaged' => 'Damaged in transit',
            'wrong_item' => 'Wrong item',
            'not_as_described' => 'Not as described',
            'allergy' => 'Skin reaction',
            'changed_mind' => 'Changed mind',
        ],
        'fields' => [
            'number' => 'Return',
            'state' => 'State',
            'reason' => 'Reason',
            'amount' => 'Refund amount',
            'details' => 'Details',
            'requested_by' => 'Opened by',
            'refund_reference' => 'Refund reference',
        ],
        'sections' => [
            'workflow' => 'Workflow',
            'history' => 'History',
            'details' => 'Return',
        ],
    ],

    'invoices' => [
        'issue' => 'Issue invoice',
        'open' => 'Open invoice',
        'issue_description' => 'Creates an invoice from the order lines, with VAT from the store\'s tax rates.',
        'notes' => 'Invoice for order :number. Thank you for shopping with Maison Alfa.',
        'terms' => 'Payment due within 14 days. Sample document of the AlfaKit demo.',
    ],

    'comments' => [
        'section' => 'Internal comments',
        'section_description' => 'Only staff see these. Type @ to mention a colleague; they are notified in the bell.',
    ],

    'activity' => [
        'section' => 'Audit trail',
    ],

    'helpdesk' => [
        'greeting' => 'Hello! Ask us anything about our fragrances or your order.',
    ],

    'tree' => [
        'title' => 'Category tree',
        'subheading' => 'Drag categories to nest or reorder them (or use the arrow buttons), then save. Categories are shared by every store.',
        'open' => 'Tree view',
    ],

    'tags' => [
        'segments' => 'Segments',
    ],

    'media' => [
        'gallery' => 'Lifestyle gallery',
        'gallery_description' => 'Extra pictures stored in the media library (separate from the product images above).',
    ],

    'views' => [
        'low_stock' => 'Low stock',
        'featured' => 'Featured',
        'drafts' => 'Drafts',
    ],

    'ai' => [
        'summarise_reviews' => 'Summarise reviews',
        'summarise_heading' => 'What customers say about :name',
        'summarise_prompt' => 'Summarise these customer reviews of the perfume ":name" in three short bullet points: what they love, what they criticise, and who it suits.',
    ],

    'settings' => [
        'title' => 'House settings',
        'subheading' => 'Shared by every store of Maison Alfa. The storefront shows the announcement.',
        'sections' => [
            'brand' => 'House and storefront',
            'notifications' => 'Notifications',
        ],
        'fields' => [
            'house_name' => 'House name',
            'announcement' => 'Storefront announcement',
            'announcement_help' => 'Shown at the top of every storefront page. Leave empty to hide it.',
            'support_hours' => 'Support hours',
            'price_display' => 'Prices on the storefront',
            'low_stock_alerts' => 'Low stock alerts',
            'weekly_report' => 'Weekly sales report',
            'report_recipients' => 'Report recipients',
            'report_recipients_help' => 'Email addresses (the demo only writes emails to the log).',
        ],
        'price_display' => [
            'tax_inclusive' => 'Including VAT',
            'tax_exclusive' => 'Excluding VAT',
        ],
    ],

    'backups' => [
        'read_only' => 'Read-only in the public demo: creating, downloading and deleting backups is switched off. The demo database is rebuilt every hour.',
    ],

    'billing' => [
        'compare_plans' => 'Compare plans',
        'compare_plans_body' => 'The plans page of the Billing plugin lists every plan with its features. No payment is ever taken in the demo.',
        'see_plans' => 'See plans',
        'checkout_disabled' => 'Checkout is switched off in the public demo',
        'checkout_disabled_body' => 'You picked the :plan plan. A real shop would now open Stripe Checkout; the demo never contacts a payment provider.',
        'contact' => 'Talk to us',
        'plans' => [
            'boutique' => 'One boutique and its online shop.',
            'maison' => 'Several boutiques with shared catalogue and reports.',
            'enterprise' => 'Franchises, custom integrations and SSO.',
        ],
        'features' => [
            'boutique' => ['1 store', '5 staff accounts', 'Email support'],
            'maison' => ['Unlimited stores', 'Unlimited staff', 'Helpdesk and analytics', 'Priority support'],
            'enterprise' => ['Dedicated success manager', 'Custom integrations', 'Single sign-on'],
        ],
    ],

    'storefront' => [
        'pages' => 'About',
        'wholesale' => 'Wholesale',
        'support' => 'Support',
        'chat' => 'Chat with us',
        'wholesale_title' => 'Wholesale enquiries',
        'wholesale_intro' => 'Hotels, spas, concept stores and corporate gifting: this form is built in the panel with the Forms plugin (two steps, a conditional question, spam protection).',
        'wholesale_unavailable' => 'Wholesale enquiries are paused for now.',
        'support_title' => 'Client care',
        'support_intro' => 'The customer portal of the Helpdesk plugin: open a ticket, follow the conversation, rate the answer.',
        'new_checkout' => 'New checkout (beta)',
        'cms_intro' => 'This page is managed with the CMS plugin: blocks, drafts, live preview and an editing bar for signed-in staff.',
    ],
];
