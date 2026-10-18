<?php

declare(strict_types=1);

use App\Demo\ProductArtwork;
use App\Enums\Concentration;

it('renders valid, escaped SVG for every silhouette', function (): void {
    foreach (Concentration::cases() as $concentration) {
        $svg = ProductArtwork::render('MA-TEST-001', 'Amber <Oud> & "Rose"', $concentration, 'Atelier Nour');

        expect($svg)->toStartWith('<svg')
            ->toContain('Amber &lt;Oud&gt; &amp; &quot;Rose&quot;')
            ->toContain('ATELIER NOUR')
            ->and(simplexml_load_string($svg))->not->toBeFalse();
    }
});
