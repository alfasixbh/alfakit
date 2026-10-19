<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Order saved',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'View :title',
        'edit' => 'Edit :title',
        'delete' => 'Delete :title',
    ],

    'validation' => [
        'invalid' => 'The tree could not be read.',
        'unknown_record' => 'A record in the tree no longer exists. Reload the page and try again.',
        'duplicate_record' => 'A record appears more than once in the tree.',
        'unknown_parent' => 'A parent record no longer exists. Reload the page and try again.',
        'cycle' => 'A record cannot be moved inside itself.',
        'max_depth' => 'The tree can be at most :depth levels deep.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Tree',
        'expand_all' => 'Expand all',
        'collapse_all' => 'Collapse all',
        'expand' => 'Expand :title',
        'collapse' => 'Collapse :title',
        'move_up' => 'Move :title up',
        'move_down' => 'Move :title down',
        'indent' => 'Move :title into the item above',
        'outdent' => 'Move :title out of its parent',
        'save' => 'Save order',
        'saving' => 'Saving…',
        'discard' => 'Discard changes',
        'unsaved' => 'You have unsaved changes to the order.',
        'save_failed' => 'The order could not be saved.',
        'empty' => 'No records yet',
        'moved' => ':title moved to position :position of :count, level :level.',
    ],

];
