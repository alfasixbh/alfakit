<?php

declare(strict_types=1);

use App\Demo\ProductArtwork;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Feature tests never touch the real demo disk: seeders and uploads write to a fake one.
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => Storage::fake(ProductArtwork::DISK))
    ->in('Feature');

// Console tests run migrate:fresh themselves, so they skip the RefreshDatabase transaction.
pest()->extend(TestCase::class)->in('Console');
