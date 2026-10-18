<?php

use App\Support\Site\Dogfood;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// The records the website's AlfaKit plugins use (config/docs.php `dogfood`): the contact form
// and the analytics site. Safe to run again.
Artisan::command('docs:dogfood', function () {
    $done = Dogfood::setUp();

    if ($done === []) {
        $this->components->warn('No plugin is turned on: set DOCS_FORMS, DOCS_ANALYTICS or DOCS_HELPDESK_CHAT in .env.');

        return;
    }

    $this->components->bulletList($done);
})->purpose('Set up the AlfaKit plugins the website runs on');
