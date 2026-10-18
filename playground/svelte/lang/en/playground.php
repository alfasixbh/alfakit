<?php

declare(strict_types=1);

/*
 * The playground app's own strings (navigation, pages, forms, tables, widgets, notifications).
 * AlfaKit and its plugins translate their own strings; model names live in models.php.
 *
 * The same files are copied into playground/react, playground/vue and playground/svelte:
 * edit one, then copy lang/ to the other two (tests/Feature/TranslationsTest.php checks
 * every locale has the same keys and placeholders as English).
 */
return [
    'nav' => [
        'groups' => [
            'blog' => 'Blog',
            'system' => 'System',
            'developers' => 'Developers',
            'work' => 'Work',
            'support' => 'Support',
            'marketing' => 'Marketing',
            'content' => 'Content',
            'benchmark' => 'Benchmark',
        ],
        'posts_board' => 'Posts board',
        'category_tree' => 'Category tree',
        'calendar' => 'Calendar',
        'general_settings' => 'General settings',
        'showcase' => 'Showcase',
        'repeater_benchmark' => 'Repeater benchmark',
        'form_benchmark' => 'Form benchmark',
        'dashboard_benchmark' => 'Dashboard benchmark',
    ],

    'commands' => [
        'group' => 'Playground',
        'maintenance' => 'Maintenance',
        'write_post' => 'Write a post',
        'posts_board' => 'Open the posts board',
        'open_site' => 'Open the public site',
        'clear_view_cache' => 'Clear compiled views',
        'clear_view_cache_description' => 'Runs php artisan view:clear',
        'view_cache_cleared' => 'Compiled views cleared',
    ],

    'theme' => [
        'label' => 'Theme',
    ],

    'billing' => [
        'starter_description' => 'For side projects',
        'starter_features' => ['1 panel', '3 users', 'Email support'],
        'pro_description' => 'For growing teams',
        'pro_features' => ['Unlimited panels', 'Unlimited users', 'Priority support'],
        'enterprise_price' => 'Contact us',
        'enterprise_features' => ['SSO', 'Audit exports', 'Dedicated support'],
    ],

    'features' => [
        'new_post_editor' => 'The redesigned post editor, rolled out to a share of the writers.',
        'purchase_button' => 'The colour of the purchase button.',
    ],

    'dashboard' => [
        'users' => 'Users',
        'orders' => 'Orders',
        'revenue' => 'Revenue',
        'this_month' => ':change this month',
        'on_track' => 'On track',
    ],

    // Post statuses (stored values: draft, review, published).
    'status' => [
        'draft' => 'Draft',
        'review' => 'In review',
        'published' => 'Published',
        'scheduled' => 'Scheduled',
    ],

    'sections' => [
        'content' => 'Content',
        'seo' => 'SEO',
        'publishing' => 'Publishing',
        'media' => 'Media',
        'sponsorship' => 'Sponsorship',
        'post' => 'Post',
        'discussion' => 'Discussion',
        'expense' => 'Expense',
        'workflow' => 'Workflow',
        'history' => 'History',
        'site' => 'Site',
        'order' => 'Order',
    ],

    // Field, column, entry and filter labels shared by the resources and pages.
    'fields' => [
        'id' => 'ID',
        'title' => 'Title',
        'slug' => 'Slug',
        'excerpt' => 'Excerpt',
        'content' => 'Content',
        'meta' => 'Meta',
        'meta_property' => 'Property',
        'meta_value' => 'Value',
        'status' => 'Status',
        'featured' => 'Featured',
        'is_featured' => 'Is featured',
        'published_at' => 'Published at',
        'author' => 'Author',
        'category' => 'Category',
        'topics' => 'Topics',
        'tags' => 'Tags',
        'tag' => 'Tag',
        'cover_image' => 'Cover image',
        'gallery' => 'Gallery',
        'rating' => 'Rating',
        'currency' => 'Currency',
        'sponsorship' => 'Sponsorship',
        'sponsorship_fee' => 'Sponsorship fee',
        'views' => 'Views',
        'created_at' => 'Created at',
        'updated_at' => 'Updated at',
        'name' => 'Name',
        'color' => 'Color',
        'icon' => 'Icon',
        'icon_placeholder' => 'Choose an icon',
        'parent' => 'Parent',
        'author_name' => 'Author name',
        'body' => 'Body',
        'approved' => 'Approved',
        'email' => 'Email',
        'amount' => 'Amount',
        'requested_by' => 'Requested by',
        'payment_reference' => 'Payment reference',
        'site_name' => 'Site name',
        'tagline' => 'Tagline',
        'support_email' => 'Support email',
        'posts_per_page' => 'Posts per page',
        'allowed_locales' => 'Allowed locales',
        'maintenance_mode' => 'Maintenance mode',
        'starts_at' => 'Starts at',
        'ends_at' => 'Ends at',
        'all_day' => 'All day',
        'description' => 'Description',
        'summary' => 'Summary',
        'items' => 'Items',
        'quantity' => 'Quantity',
        'price' => 'Price',
        'taxable' => 'Taxable',
    ],

    'posts' => [
        'tabs' => [
            'all' => 'All',
            'published' => 'Published',
            'drafts' => 'Drafts',
        ],
        'views' => [
            'featured' => 'Featured',
            'most_viewed' => 'Most viewed',
        ],
        'comments' => 'Comments',
    ],

    'categories' => [
        'list_view' => 'List view',
        'tree_view' => 'Tree view',
    ],

    'calendar' => [
        'heading' => 'Events and publications',
        'published' => 'Published: :title',
    ],

    'expenses' => [
        'workflow' => 'Expense claim',
        'states' => [
            'draft' => 'Draft',
            'submitted' => 'Submitted',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'paid' => 'Paid',
        ],
        'submit' => 'Submit for approval',
        'needs_amount' => 'Add an amount first.',
        'manager_approval' => 'Manager approval',
        'pay' => 'Mark as paid',
        'reopen' => 'Reopen',
    ],

    'showcase' => [
        'save' => 'Save',
        'validated' => 'Validated',

        'actions' => [
            'title' => 'Actions',
            'intro' => 'Use the header buttons: a three-step wizard, a modal with nested footer actions, an action limited to two runs a minute, and one that asks for your password.',
            'wizard' => 'Wizard',
            'account' => 'Account',
            'profile' => 'Profile',
            'profile_description' => 'Shown on your page',
            'confirm' => 'Confirm',
            'bio' => 'Bio',
            'agree' => 'I agree',
            'wizard_finished' => 'Wizard finished',
            'nested' => 'Nested actions',
            'note' => 'Note',
            'preview' => 'Preview',
            'preview_sent' => 'Preview sent',
            'publish' => 'Publish',
            'published' => 'Published',
            'review_saved' => 'Review saved',
            'rate_limited' => 'Rate limited',
            'pong' => 'Pong',
            'server_error' => 'Server error',
            'reason' => 'Reason',
            'reason_default' => 'Just testing',
            'password_confirmation' => 'Password confirmation',
            'key_rotated' => 'Password confirmed, key rotated',
        ],

        'cards' => [
            'title' => 'Cards',
        ],

        'cursor' => [
            'title' => 'Cursor pagination',
        ],

        'table' => [
            'title' => 'Table',
        ],

        'editors' => [
            'title' => 'Editors',
            'image_editor' => 'Image editor',
            'image_editor_description' => 'Pick an image and the editor opens before it uploads; on an uploaded image, use its pencil button. Crop, rotate to any angle, flip, zoom (wheel, pinch, buttons or + and -), drag the image to pan, or type the exact position and size.',
            'cover' => 'Cover (free crop and fixed ratios, view mode 1)',
            'avatar' => 'Avatar (circle cropper)',
            'banner' => 'Banner (crop may extend past the image)',
            'photo' => 'Photo (view mode 3: the image always fills the editor)',
            'rich_editor' => 'Rich text editor',
            'rich_editor_description' => 'Every toolbar button, grouped headings and alignment, floating toolbars on selection, tables, columns, colours, custom blocks, merge tags ({{) and mentions (@ and #).',
            'headings' => 'Headings',
            'align' => 'Align',
            'marketing' => 'Marketing',
            'layout' => 'Layout',
            'customer_name' => 'Customer name',
            'order_number' => 'Order number',
            'today' => 'Today’s date',
            'markdown_editor' => 'Markdown editor',
            'markdown_editor_description' => 'Formatting, headings, lists, code, links, tables and image attachments, stored as Markdown.',
            'preview' => 'Preview rich content',
            'rendered' => 'Rendered content',
            'saved' => 'Images: :images, rich content: :rich characters, Markdown: :markdown characters.',
            'call_to_action' => 'Call to action',
            'call_to_action_label' => 'Label',
            'call_to_action_url' => 'URL',
            'call_to_action_default' => 'Read the docs',
            'divider' => 'Divider',
        ],

        'fields' => [
            'title' => 'Fields',
            'choice_fields' => 'Choice and input fields',
            'accent' => 'Accent colour',
            'swatches' => [
                'blue' => 'Blue',
                'green' => 'Green',
                'orange' => 'Orange',
                'pink' => 'Pink',
            ],
            'status' => 'Status',
            'channels' => 'Channels',
            'channel_options' => [
                'web' => 'Web',
                'email' => 'Email',
                'sms' => 'SMS',
            ],
            'volume' => 'Volume',
            'price' => 'Price',
            'snippet' => 'Snippet',
            'field_actions' => 'Field actions and pickers',
            'clear' => 'Clear',
            'generate' => 'Generate',
            'fail' => 'Fail',
            'repeater' => 'Repeater with a table layout',
            'lines' => 'Lines',
            'unit' => 'Unit',
            'units' => [
                'pcs' => 'Pieces',
                'box' => 'Boxes',
            ],
            'builder' => 'Builder',
            'heading' => 'Heading',
            'paragraph' => 'Paragraph',
            'level' => 'Level',
            'nothing_saved' => 'Nothing here is saved',
            'nothing_saved_description' => 'The Save button validates the form and shows a notification; the playground data is untouched.',
            'no_drafts' => 'No drafts yet',
            'no_drafts_description' => 'An EmptyState component with an action.',
            'say_hello' => 'Say hello',
            'hello' => 'Hello from an EmptyState action',
            'saved' => ':lines line(s), :blocks block(s).',
        ],
    ],

    'contact' => [
        'name' => 'Name',
        'email' => 'Email',
        'topic' => 'Topic',
        'topics' => [
            'sales' => 'Sales',
            'support' => 'Support',
            'other' => 'Something else',
        ],
        'order_number' => 'Order number',
        'message' => 'Message',
        'thanks' => 'Thanks :name!',
        'reply' => 'We will reply to :email soon.',
    ],

    'my_posts' => [
        'publish' => 'Publish',
        'published' => 'Published',
        'feature' => 'Feature',
    ],

    // Strings for the custom components in resources/js/alfakit, shared with the
    // frontend through Panel::frontendTranslations() and read with t('playground.…').
    'frontend' => [
        'swatch_picker' => [
            'selected' => 'Selected colour: :label',
            'none' => 'No colour selected',
        ],
    ],
];
