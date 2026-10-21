<?php

declare(strict_types=1);

namespace App\Demo;

/**
 * Curated perfume vocabulary for the seeder: houses, notes, names, categories and places.
 * Everything here is fictional; the houses do not exist.
 */
final class Catalog
{
    /** @var array<int, array{name: string, country: string, founded: int, description: string}> */
    public const BRANDS = [
        ['name' => 'Maison Alfa', 'country' => 'BH', 'founded' => 2014, 'description' => 'The house label: oud and amber compositions blended in Manama with a modern, airy hand.'],
        ['name' => 'Atelier Nour', 'country' => 'FR', 'founded' => 1987, 'description' => 'A Grasse atelier known for luminous florals and a famously patient maceration.'],
        ['name' => 'Dune & Cedar', 'country' => 'AE', 'founded' => 2009, 'description' => 'Desert minimalism: dry woods, resins and salt, bottled in heavy amber glass.'],
        ['name' => 'Casa Verdi', 'country' => 'IT', 'founded' => 1962, 'description' => 'Ligurian citrus, fig leaves and sea air from a family house on the Riviera.'],
        ['name' => 'Harbor & Thorn', 'country' => 'GB', 'founded' => 1998, 'description' => 'British green fragrances: cut stems, wet earth and smoked tea.'],
        ['name' => 'Kiyomi', 'country' => 'JP', 'founded' => 2011, 'description' => 'Quiet, translucent scents built around hinoki, yuzu and rice steam.'],
        ['name' => 'Rue Saphir', 'country' => 'FR', 'founded' => 1931, 'description' => 'Classic Parisian chypres and leathers, reissued from the original formulas.'],
        ['name' => 'Söder', 'country' => 'SE', 'founded' => 2016, 'description' => 'Scandinavian home fragrance: birch, lingonberry and cold morning air.'],
        ['name' => 'Oasis Botanica', 'country' => 'MA', 'founded' => 2005, 'description' => 'Moroccan rose, orange blossom and neroli from the Dadès valley cooperatives.'],
        ['name' => 'Velvet & Co.', 'country' => 'US', 'founded' => 2018, 'description' => 'Gourmand and musky skin scents designed for layering.'],
    ];

    /** @var array<string, array<int, string>> */
    public const NOTES = [
        'top' => ['bergamot', 'pink pepper', 'yuzu', 'cardamom', 'saffron', 'grapefruit', 'green mandarin', 'fig leaf', 'blackcurrant', 'sea salt', 'ginger', 'violet leaf', 'lemon zest', 'aldehydes', 'juniper'],
        'heart' => ['Damask rose', 'orris', 'jasmine sambac', 'tuberose', 'geranium', 'cedarwood', 'fig', 'tea leaves', 'orange blossom', 'peony', 'incense', 'lavender', 'heliotrope', 'osmanthus', 'nutmeg'],
        'base' => ['Cambodian oud', 'amber', 'sandalwood', 'vanilla', 'tonka bean', 'white musk', 'patchouli', 'leather', 'benzoin', 'labdanum', 'vetiver', 'ambergris', 'tobacco', 'cashmeran', 'oakmoss'],
    ];

    /** Adjective-noun pairs that read like real fragrance names. */
    public const NAME_PARTS = [
        ['Midnight', 'Amber', 'Velvet', 'Saffron', 'Cedar', 'Linen', 'Salt', 'Smoke', 'Ivory', 'Indigo', 'Golden', 'Quiet', 'Noir', 'Silk', 'Sun', 'Night', 'Pale', 'Garden', 'Sea', 'Winter'],
        ['Oud', 'Rose', 'Fig', 'Iris', 'Tea', 'Musk', 'Bloom', 'Vetiver', 'Tobacco', 'Jasmine', 'Neroli', 'Incense', 'Leather', 'Santal', 'Dune', 'Harbor', 'Orchard', 'Tide', 'Cashmere', 'Vanilla'],
    ];

    /** Home fragrance names (candles and diffusers). */
    public const HOME_NAMES = ['Library Hour', 'First Snow', 'Linen Cupboard', 'Fireside', 'Orchard Window', 'Salt Marsh', 'Cedar Cabin', 'Evening Souk', 'Morning Garden', 'Fig Terrace', 'Paper & Ink', 'Rain on Stone'];

    /** @var array<int, array{name: string, icon: string, children: array<int, string>}> */
    public const CATEGORIES = [
        ['name' => 'Fragrance', 'icon' => 'sparkles', 'children' => ['Eau de parfum', 'Eau de toilette', 'Extrait & parfum', 'Body mist']],
        ['name' => 'Home', 'icon' => 'house', 'children' => ['Candles', 'Reed diffusers']],
        ['name' => 'Gifting', 'icon' => 'gift', 'children' => ['Discovery sets', 'Gift boxes']],
    ];

    /** @var array<string, string> name => colour */
    public const TAGS = [
        'Bestseller' => '#F47A22',
        'New arrival' => '#073B78',
        'Limited edition' => '#7C3AED',
        'Long lasting' => '#0F766E',
        'Summer' => '#F59E0B',
        'Evening' => '#1E293B',
        'Vegan' => '#16A34A',
        'Gift ready' => '#DB2777',
        'Oud' => '#92400E',
        'Fresh' => '#0EA5E9',
    ];

    /** @var array<int, array{name: string, slug: string, city: string, country: string, currency: string, timezone: string, color: string, tagline: string}> */
    public const STORES = [
        ['name' => 'Maison Alfa Manama', 'slug' => 'manama', 'city' => 'Manama', 'country' => 'BH', 'currency' => 'USD', 'timezone' => 'Asia/Bahrain', 'color' => '#073B78', 'tagline' => 'The flagship, Bahrain Bay.'],
        ['name' => 'Maison Alfa Dubai', 'slug' => 'dubai', 'city' => 'Dubai', 'country' => 'AE', 'currency' => 'USD', 'timezone' => 'Asia/Dubai', 'color' => '#F47A22', 'tagline' => 'Alserkal Avenue atelier.'],
        ['name' => 'Maison Alfa London', 'slug' => 'london', 'city' => 'London', 'country' => 'GB', 'currency' => 'USD', 'timezone' => 'Europe/London', 'color' => '#1E293B', 'tagline' => 'Marylebone boutique.'],
    ];

    /** @var array<int, array{carrier: string, service: string, prefix: string}> */
    public const CARRIERS = [
        ['carrier' => 'DHL Express', 'service' => 'Express Worldwide', 'prefix' => 'JD'],
        ['carrier' => 'Aramex', 'service' => 'Priority Parcel', 'prefix' => 'ARX'],
        ['carrier' => 'FedEx', 'service' => 'International Priority', 'prefix' => 'FX'],
        ['carrier' => 'Royal Mail', 'service' => 'Tracked 24', 'prefix' => 'RM'],
    ];

    /** @var array<int, string> weighted customer countries: mostly English-speaking, plus a few other regions */
    public const CUSTOMER_COUNTRIES = ['US', 'US', 'US', 'US', 'GB', 'GB', 'GB', 'GB', 'BH', 'AE', 'SA', 'FR', 'DE'];

    /** @var array<string, array<int, array{city: string, state: string|null}>> */
    public const CITIES = [
        'BH' => [['city' => 'Manama', 'state' => 'Capital'], ['city' => 'Riffa', 'state' => 'Southern'], ['city' => 'Muharraq', 'state' => 'Muharraq'], ['city' => 'Saar', 'state' => 'Northern']],
        'AE' => [['city' => 'Dubai', 'state' => null], ['city' => 'Abu Dhabi', 'state' => null], ['city' => 'Sharjah', 'state' => null]],
        'SA' => [['city' => 'Riyadh', 'state' => null], ['city' => 'Jeddah', 'state' => null], ['city' => 'Dammam', 'state' => null]],
        'GB' => [['city' => 'London', 'state' => null], ['city' => 'Manchester', 'state' => null], ['city' => 'Edinburgh', 'state' => null]],
        'FR' => [['city' => 'Paris', 'state' => null], ['city' => 'Lyon', 'state' => null]],
        'DE' => [['city' => 'Berlin', 'state' => null], ['city' => 'Munich', 'state' => 'Bavaria']],
        'US' => [['city' => 'New York', 'state' => 'NY'], ['city' => 'Los Angeles', 'state' => 'CA'], ['city' => 'Chicago', 'state' => 'IL']],
    ];

    /**
     * Customer names that fit the country of their address (CustomerFactory), so a Riyadh
     * customer isn't called "Hertha Koelpin".
     *
     * @var array<string, array{first: array<int, string>, last: array<int, string>}>
     */
    public const PEOPLE = [
        'gulf' => [
            'first' => ['Layla', 'Noor', 'Fatima', 'Mariam', 'Aisha', 'Hessa', 'Reem', 'Dana', 'Sara', 'Lulwa', 'Amna', 'Shaikha', 'Yousef', 'Omar', 'Khalid', 'Hamad', 'Ali', 'Faisal', 'Salman', 'Rashid', 'Abdulla', 'Nasser', 'Majid', 'Hasan'],
            'last' => ['Haddad', 'Al Mansoori', 'Nasser', 'Saleh', 'Hamdan', 'Darwish', 'Karim', 'Yousif', 'Al Otaibi', 'Al Harbi', 'Al Shamsi', 'Rahman', 'Ibrahim', 'Salem', 'Bukhammas', 'Al Marzooqi'],
        ],
        'GB' => [
            'first' => ['Olivia', 'Amelia', 'Isla', 'Harriet', 'Imogen', 'Charlotte', 'Eleanor', 'Freya', 'Oliver', 'Henry', 'Arthur', 'James', 'Theo', 'Hugo', 'Callum', 'Rory'],
            'last' => ['Whitfield', 'Ashworth', 'Hargreaves', 'Pemberton', 'Fairbairn', 'Lockwood', 'Carrington', 'Bramley', 'Hollis', 'Thornton', 'Kendrick', 'Marlowe'],
        ],
        'FR' => [
            'first' => ['Camille', 'Léa', 'Chloé', 'Manon', 'Inès', 'Juliette', 'Louis', 'Hugo', 'Antoine', 'Mathis', 'Étienne', 'Baptiste'],
            'last' => ['Lefèvre', 'Moreau', 'Laurent', 'Fontaine', 'Rousseau', 'Chevalier', 'Garnier', 'Marchand', 'Delacroix', 'Girard'],
        ],
        'DE' => [
            'first' => ['Lena', 'Mila', 'Clara', 'Johanna', 'Greta', 'Paul', 'Felix', 'Jonas', 'Maximilian', 'Lukas'],
            'last' => ['Hoffmann', 'Schäfer', 'Becker', 'Wagner', 'Richter', 'Krüger', 'Brandt', 'Vogel', 'Lehmann', 'Hartmann'],
        ],
        'US' => [
            'first' => ['Madison', 'Avery', 'Harper', 'Grace', 'Natalie', 'Brooke', 'Ethan', 'Mason', 'Caleb', 'Wyatt', 'Owen', 'Julian'],
            'last' => ['Bennett', 'Sullivan', 'Hayes', 'Brooks', 'Coleman', 'Parker', 'Reyes', 'Morgan', 'Carter', 'Delgado', 'Whitman', 'Foster'],
        ],
    ];

    /** @var array<string, array<int, string>> street names per country, for seeded addresses */
    public const STREETS = [
        'BH' => ['Road 2803, Block 428', 'Road 3801, Block 338', 'Avenue 37, Block 335', 'Road 1702, Block 317', 'Road 4511, Block 945'],
        'AE' => ['Al Wasl Road', 'Jumeirah Beach Road', 'Al Khaleej Street', 'Corniche Road', 'Al Safa Street'],
        'SA' => ['Tahlia Street', 'King Fahd Road', 'Prince Sultan Street', 'Olaya Street', 'Al Corniche Road'],
        'GB' => ['Marylebone High Street', 'Elgin Crescent', 'Deansgate', 'Royal Crescent', 'George Street'],
        'FR' => ['Rue de Grenelle', 'Rue du Bac', 'Quai Saint-Antoine', 'Rue Mercière', 'Avenue Foch'],
        'DE' => ['Kastanienallee', 'Maximilianstraße', 'Bergmannstraße', 'Leopoldstraße', 'Schönhauser Allee'],
        'US' => ['Bleecker Street', 'Abbot Kinney Boulevard', 'North Clark Street', 'Hudson Street', 'Melrose Avenue'],
    ];

    /** @var array<int, string> */
    public const OFFICES = ['Level 3, Reception', 'Suite 410', 'Floor 21, North Tower', 'Studio 6', 'Unit 12, Courtyard', 'Office 207'];

    /** @var array<int, string> */
    public const REVIEW_TITLES = [
        'Exactly as described', 'My new signature', 'Beautiful, but fleeting', 'Compliments all day', 'Great for the office',
        'A little too sweet for me', 'Perfect gift', 'The bottle alone is worth it', 'Warm and cosy', 'Fresh without being sharp',
    ];

    /** @var array<int, string> */
    public const REVIEW_BODIES = [
        'Opens bright and settles into something soft and warm on skin. Lasts well past dinner.',
        'I bought the 50 ml after trying the discovery set. It is quieter than I expected, which I like.',
        'Projection is moderate; two sprays are plenty. Beautiful dry-down of woods and musk.',
        'Shipping was quick and the packaging is lovely. The scent leans sweeter than the notes suggest.',
        'Reminds me of a rainy garden in spring. I keep reaching for it on weekday mornings.',
        'Good value for an extrait. Very long lasting, maybe too heavy for a hot afternoon.',
        'Not what I expected from the description but it grew on me after a week of wearing it.',
        'Burns evenly and fills the living room without being overpowering. Will repurchase.',
    ];

    /** @var array<int, string> */
    public const DISCOUNTS = ['WELCOME10', 'SPRING15', 'FREESHIP', 'VIP20', 'GIFT25'];

    /** @var array<int, array{title: string, excerpt: string}> */
    public const PAGES = [
        ['title' => 'Our story', 'excerpt' => 'How a small atelier in Manama grew into three boutiques.'],
        ['title' => 'Shipping & returns', 'excerpt' => 'Delivery times, duties and our 30-day return promise.'],
        ['title' => 'Care guide', 'excerpt' => 'Keep your fragrance at its best: light, heat and storage.'],
    ];

    public static function postcode(string $country): string
    {
        return match ($country) {
            'BH' => (string) fake()->numberBetween(301, 1216),
            'GB' => fake()->randomElement(['W1U 6AE', 'W11 2JF', 'SW3 4LY', 'M3 2BY', 'EH2 2QE', 'N1 9AL']),
            'SA', 'FR', 'DE', 'US' => (string) fake()->numberBetween(10000, 99999),
            default => '',
        };
    }

    /** A phone number in the country's format (+973 for Bahrain, +44 for the UK, …). */
    public static function phone(string $country): string
    {
        $digits = fn (int $count): string => (string) fake()->numerify(str_repeat('#', $count));

        return match ($country) {
            'BH' => '+973 3'.$digits(3).' '.$digits(4),
            'AE' => '+971 5'.fake()->randomElement(['0', '2', '5', '6']).' '.$digits(3).' '.$digits(4),
            'SA' => '+966 5'.$digits(1).' '.$digits(3).' '.$digits(4),
            'GB' => '+44 7'.$digits(3).' '.$digits(6),
            'FR' => '+33 6 '.implode(' ', str_split($digits(8), 2)),
            'DE' => '+49 15'.$digits(1).' '.$digits(7),
            default => '+1 '.fake()->numberBetween(201, 989).' '.$digits(3).' '.$digits(4),
        };
    }

    public static function street(string $country): string
    {
        $street = fake()->randomElement(self::STREETS[$country] ?? self::STREETS['BH']);

        // Bahrain addresses lead with the building number; elsewhere it's "12 Street".
        return $country === 'BH' ? 'Building '.fake()->numberBetween(100, 2400).', '.$street : fake()->numberBetween(2, 180).' '.$street;
    }

    /** @return array{first: array<int, string>, last: array<int, string>} */
    public static function peopleFor(string $country): array
    {
        return self::PEOPLE[$country] ?? self::PEOPLE['gulf'];
    }
}
