<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// The demo database is re-seeded every hour so visitors always find a tidy shop.
Schedule::command('demo:reset')->hourly()->withoutOverlapping();
