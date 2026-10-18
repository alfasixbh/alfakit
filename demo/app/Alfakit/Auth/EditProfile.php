<?php

declare(strict_types=1);

namespace App\Alfakit\Auth;

use AlfaSix\Alfakit\Auth\Pages\EditProfile as BaseEditProfile;
use AlfaSix\Alfakit\Forms\Components\Field;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * The profile page of the public demo. Everyone signs in with the same account, so its e-mail
 * address, password and second factors are locked (one visitor could otherwise lock out the
 * next). Other accounts, for example a colleague you impersonate, keep the full page.
 */
class EditProfile extends BaseEditProfile
{
    public function form(Schema $schema): Schema
    {
        $schema = parent::form($schema);

        if (! $this->isDemoAccount()) {
            return $schema;
        }

        $components = [
            Callout::make(__('demo.profile.locked_heading'))
                ->description(__('demo.profile.locked_body'))
                ->info()
                ->icon('lock'),
        ];

        foreach ($schema->getComponents(withHidden: true) as $component) {
            $name = $component instanceof Field ? $component->getName() : null;

            if ($name === 'email') {
                $components[] = $component->disabled()->dehydrated(false);
            } elseif ($name === 'name') {
                $components[] = $component;
            }
        }

        return $schema->components($components);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function save(array $data): mixed
    {
        // Never trust the browser: only the display name of the shared account can change.
        if ($this->isDemoAccount()) {
            $data = array_intersect_key($data, ['name' => true]);
        }

        return parent::save($data);
    }

    /**
     * @return array<Component>
     */
    protected function getMultiFactorAuthenticationComponents(Authenticatable $user): array
    {
        if ($user instanceof User && $user->isDemoAccount()) {
            return [
                Callout::make(__('demo.profile.mfa_heading'))
                    ->description(__('demo.profile.mfa_body'))
                    ->info()
                    ->icon('shield-check'),
            ];
        }

        return parent::getMultiFactorAuthenticationComponents($user);
    }

    private function isDemoAccount(): bool
    {
        $user = $this->getRecord();

        return $user instanceof User && $user->isDemoAccount();
    }
}
