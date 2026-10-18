<?php

declare(strict_types=1);

namespace Tests;

use App\Demo\SupplierApi;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The Suppliers ApiResource calls the demo's own fake API over HTTP; tests answer
        // those calls in-process instead of over the network.
        SupplierApi::fake();
    }
}
