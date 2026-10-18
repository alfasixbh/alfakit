<?php

declare(strict_types=1);

namespace App\Policies;

use AlfaSix\AlfakitWebhooks\Models\WebhookEndpoint;
use App\Demo\Access;
use App\Models\User;

/**
 * Webhooks are read-only in the public demo: owners browse the seeded (disabled) endpoint and
 * its delivery log, but nobody can add endpoints, enable them, send tests or replay, so the
 * demo server never calls a URL a visitor typed. (Deliveries also go to a `null` queue.)
 */
class WebhookEndpointPolicy
{
    public function viewAny(User $user): bool
    {
        return Access::owner($user);
    }

    public function view(User $user, WebhookEndpoint $endpoint): bool
    {
        return Access::owner($user);
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, WebhookEndpoint $endpoint): bool
    {
        return false;
    }

    public function delete(User $user, WebhookEndpoint $endpoint): bool
    {
        return false;
    }

    public function deleteAny(User $user): bool
    {
        return false;
    }
}
