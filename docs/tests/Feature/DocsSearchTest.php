<?php

it('finds pages and puts the ones named after the term first', function () {
    $results = $this->getJson('/docs/search?q=slots')->assertOk()->json('results');

    expect($results)->not->toBeEmpty()
        ->and($results[0]['slug'])->toBe('design/slots');

    // A page with a heading for the term comes before pages that only mention it.
    expect($this->getJson('/docs/search?q=repeater')->json('results.0.slug'))->toBe('forms/fields');
});

it('answers an empty list for nothing or an unknown term', function () {
    $this->getJson('/docs/search?q=')->assertOk()->assertJson(['results' => []]);
    $this->getJson('/docs/search?q=zzzz-no-such-term')->assertOk()->assertJson(['results' => []]);
});
