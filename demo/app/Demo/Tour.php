<?php

declare(strict_types=1);

namespace App\Demo;

use AlfaSix\Alfakit\Pages\Dashboard;
use App\Alfakit\Pages\Showcase\ShowcaseFields;
use App\Alfakit\Pages\Showcase\ShowcaseTheming;
use Illuminate\Contracts\View\View;

/**
 * The dismissible "feature tour" banner on the dashboard (Slot::PAGE_HEADER_BEFORE, scoped
 * to the Dashboard page). Dismissal is a session flag set by /demo/tour/dismiss.
 */
final class Tour
{
    public const SESSION_DISMISSED = 'demo.tour_dismissed';

    public static function banner(): ?View
    {
        if (session(self::SESSION_DISMISSED, false)) {
            return null;
        }

        return view('demo.slots.tour-banner', [
            'showcaseUrl' => ShowcaseFields::getUrl(),
            'themingUrl' => ShowcaseTheming::getUrl(),
            'dismissUrl' => '/demo/tour/dismiss?back='.urlencode(request()->getRequestUri()),
            'docsUrl' => DemoPanel::docsUrl(),
        ]);
    }

    /** @return array<int, class-string> */
    public static function scopes(): array
    {
        return [Dashboard::class];
    }
}
