<?php

declare(strict_types=1);

/*
 * Storefront strings (product, contact, order tracking, newsletter, language toggle).
 * Keep lang/{locale}/shop.php (13 locales) in sync: tests/Feature/ShopTranslationParityTest.php checks it.
 */
return [
    // Names used in validation messages ("The name field is required."), where the
    // conversational labels ("Your name") read badly.
    'attributes' => [
        'name' => 'name',
        'rating' => 'rating',
        'review' => 'review',
    ],

    'locale' => [
        'label' => 'Language',
    ],

    'strip' => [
        'eyebrow' => 'Built with AlfaKit',
        'title' => 'One panel definition, three frontends.',
        'body' => 'Everything you see here is rendered from the same PHP schema. Switch the renderer and the page reloads in React, Vue or Svelte with the same markup, the same styling and the same behaviour.',
        'cta' => 'Switch renderer',
        'hint' => 'You are viewing the :renderer build.',
        'mascot_alt' => 'The AlfaKit fox mascot',
    ],

    'newsletter' => [
        'heading' => 'Letters from the atelier',
        'body' => 'A note when a new scent lands, never more than twice a month.',
        'label' => 'E-mail address',
        'placeholder' => 'you@example.com',
        'submit' => 'Subscribe',
        'duplicate' => 'This address is already on the list.',
        'thanks' => [
            'title' => 'You are on the list',
            'body' => 'The next letter from Maison Alfa will reach you first.',
        ],
    ],

    'product' => [
        'back' => 'All products',
        'by' => 'by :brand',
        'sku' => 'Reference',
        'gallery' => 'Gallery',
        'image_of' => ':name, view :index',
        'sizes' => 'Sizes',
        'choose_size' => 'Choose a size',
        'stock' => [
            'in' => 'In stock',
            'low' => 'Only :count left',
            'out' => 'Sold out',
        ],
        'notes' => [
            'heading' => 'Composition',
            'top' => 'Top notes',
            'heart' => 'Heart notes',
            'base' => 'Base notes',
        ],
        'details' => [
            'heading' => 'Details',
            'concentration' => 'Concentration',
            'audience' => 'For',
            'size' => 'Size',
            'category' => 'Category',
            'tags' => 'Tags',
        ],
        'enquire' => 'Ask about this scent',
        'track' => 'Track an order',
        'reviews' => [
            'heading' => 'Reviews',
            'count' => '{0} No reviews yet|{1} One review|[2,*] :count reviews',
            'average' => ':average out of 5',
            'empty' => 'No reviews yet. Be the first to share how it wears.',
            'verified' => 'Verified purchase',
            'guest' => 'Guest',
            'write' => 'Write a review',
            'write_help' => 'Reviews are read by the team and published from the admin panel, usually within a day.',
        ],
        'related' => 'You may also like',
        'compare' => 'Was :price',
        'currency_note' => 'Prices in US dollars, taxes included.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Your rating',
            'name' => 'Your name',
            'email' => 'E-mail',
            'email_help' => 'Never shown. If you bought this scent from us, your review is marked as a verified purchase.',
            'title' => 'Headline',
            'body' => 'Your review',
        ],
        'submit' => 'Send review',
        'thanks' => [
            'title' => 'Thank you, :name',
            'body' => 'Your review is with the team and will appear once approved in the admin panel.',
        ],
    ],

    'contact' => [
        'heading' => 'Write to the maison',
        'intro' => 'A question about an order, a scent you cannot find, wholesale or press: the team in Manama reads every message and replies within two working days.',
        'form_heading' => 'Send a message',
        'form_help' => 'This is an AlfaKit standalone form: validation runs on the server, the topic reveals an order number field, and the submit button is rate limited.',
        'details' => [
            'heading' => 'The boutique',
            'email' => 'E-mail',
            'phone' => 'Telephone',
            'hours' => 'Opening hours',
            'hours_value' => 'Saturday to Thursday, 10:00 to 22:00',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Your name',
            'email' => 'E-mail',
            'topic' => 'Topic',
            'order_number' => 'Order number',
            'message' => 'Message',
            'message_help' => 'At least 20 characters. Include the scent or order you are writing about.',
        ],
        'topics' => [
            'order' => 'An order',
            'product' => 'A product',
            'wholesale' => 'Wholesale',
            'press' => 'Press',
            'other' => 'Something else',
        ],
        'prefill' => 'I would like to know more about :product.',
        'submit' => 'Send message',
        'mail_subject' => 'Maison Alfa contact: :topic',
        'thanks' => [
            'title' => 'Thank you, :name',
            'body' => 'We will reply to :email within two working days.',
        ],
        'rate_limited' => 'You have sent a few messages already',
    ],

    'track' => [
        'heading' => 'Track an order',
        'intro' => 'Enter the e-mail used at checkout and the order number from your confirmation. You will see every order on that account and the full journey of the one you asked for.',
        'fields' => [
            'email' => 'E-mail used at checkout',
            'number' => 'Order number',
            'submit' => 'Find my order',
        ],
        'sample' => [
            'heading' => 'Try it with a real order',
            'body' => 'This is a demo shop, so here is a seeded order you can look up:',
            'use' => 'Use this order',
        ],
        'not_found' => [
            'heading' => 'We could not find that order',
            'body' => 'Check the e-mail and the order number, or use the sample order below.',
        ],
        'orders' => [
            'heading' => 'Your orders',
            'description' => 'Everything placed by :name. Click an order to see its timeline.',
            'number' => 'Order',
            'placed' => 'Placed',
            'items' => 'Items',
            'status' => 'Status',
            'total' => 'Total',
            'search' => 'Search by order number',
        ],
        'timeline' => [
            'heading' => 'Order :number',
            'description' => 'Every step, from checkout to your door.',
            'steps' => 'Timeline',
            'carrier' => 'Carrier',
            'tracking' => 'Tracking number',
            'ship_to' => 'Shipping to',
            'no_shipment' => 'Not shipped yet',
            'no_tracking' => 'Available once shipped',
        ],
        'components_note' => 'The orders table and the timeline are AlfaKit standalone components: a Table and an Infolist rendered in the shop layout.',
    ],
];
