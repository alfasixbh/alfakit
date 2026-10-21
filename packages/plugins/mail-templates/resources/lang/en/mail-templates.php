<?php

declare(strict_types=1);

return [
    'label' => 'mail template',
    'plural_label' => 'mail templates',
    'navigation' => 'Mail templates',
    'sections' => [
        'template' => 'Email',
        'template_description' => 'Pick the email and the language this version is for.',
        'content' => 'Content',
        'content_description' => 'Leave the subject or the content empty to keep the email\'s own.',
    ],
    'fields' => [
        'key' => 'Email',
        'locale' => 'Language',
        'subject' => 'Subject',
        'subject_help' => 'Merge tags work here too, for example :example.',
        'subject_help_without_example' => 'Merge tags work here too.',
        'body' => 'Content',
        'body_help' => 'Insert merge tags from the toolbar; they are replaced by the real values when the email is sent.',
        'merge_tags' => 'Merge tags for this email:',
        'status' => 'Status',
        'updated_at' => 'Updated',
    ],
    'statuses' => [
        'customized' => 'Customised',
        'default' => 'Default',
    ],
    'empty' => [
        'heading' => 'No customised emails',
        'description' => 'Customise an email to change its subject and content in one language.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Preview',
            'close' => 'Close',
            'subject' => 'Subject:',
            'light' => 'Light',
            'dark' => 'Dark',
            'frame' => 'Email preview (:variant)',
            'error' => 'This email could not be previewed.',
        ],
        'send_test' => [
            'label' => 'Send test',
            'modal_heading' => 'Send a test email?',
            'modal_description' => 'The saved version is sent with sample data to your own address, :email.',
            'submit' => 'Send test',
            'sent' => 'Test email sent to :email.',
            'no_email' => 'Your account has no email address to send the test to.',
        ],
        'reset' => [
            'label' => 'Reset to default',
            'modal_heading' => 'Reset to the default email?',
            'modal_description' => 'The email goes back to its own subject and content. Earlier versions stay in the history.',
            'submit' => 'Reset',
            'done' => 'The email is back to its default.',
        ],
    ],
    'test' => [
        'subject' => '[Test] :subject',
    ],
    'validation' => [
        'unique' => 'This email already has a template in this language.',
        'unknown_tags' => ':tags is not a merge tag of this email.|:tags are not merge tags of this email.',
    ],
];
