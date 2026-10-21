<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Demo\Catalog;
use App\Models\Customer;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /** @var array<string, true> */
    private static array $emails = [];

    public function definition(): array
    {
        $country = fake()->randomElement(Catalog::CUSTOMER_COUNTRIES);
        $people = Catalog::peopleFor($country);
        $first = fake()->randomElement($people['first']);
        $last = fake()->randomElement($people['last']);

        return [
            'store_id' => Store::factory(),
            'first_name' => $first,
            'last_name' => $last,
            'email' => self::email($first, $last),
            'phone' => fake()->boolean(80) ? Catalog::phone($country) : null,
            'locale' => fake()->randomElement(['en', 'en', 'en', 'ar', 'fr']),
            'country' => $country,
            'birthday' => fake()->boolean(60) ? fake()->dateTimeBetween('-60 years', '-20 years') : null,
            'accepts_marketing' => fake()->boolean(55),
            'is_vip' => fake()->boolean(8),
            'notes' => fake()->boolean(15) ? fake()->randomElement(['Prefers unscented packaging.', 'Collects discovery sets.', 'Allergic to tuberose; suggest alternatives.', 'Corporate gifting contact.']) : null,
        ];
    }

    /** An address that reads like the customer's name; a short number keeps duplicates apart. */
    public static function email(string $first, string $last): string
    {
        $local = Str::slug($first.'.'.$last, '.');
        $domain = fake()->randomElement(['example.com', 'example.com', 'example.net', 'example.org']);
        $email = "{$local}@{$domain}";

        while (isset(self::$emails[$email])) {
            $email = $local.fake()->numberBetween(2, 99)."@{$domain}";
        }

        self::$emails[$email] = true;

        return $email;
    }
}
