<?php

declare(strict_types=1);

namespace App\Demo;

use App\Enums\Concentration;

/**
 * Arabic copy for the translatable product fields. Fragrance names are translated word by
 * word from `Catalog::NAME_PARTS` so "Midnight Oud" becomes "عود منتصف الليل" (Arabic puts
 * the noun first), home fragrances have hand-written names, and the description follows
 * the same note structure as the English one.
 */
final class CatalogArabic
{
    /** @var array<string, string> adjective => Arabic */
    public const ADJECTIVES = [
        'Midnight' => 'منتصف الليل', 'Amber' => 'الكهرمان', 'Velvet' => 'المخمل', 'Saffron' => 'الزعفران', 'Cedar' => 'الأرز',
        'Linen' => 'الكتّان', 'Salt' => 'الملح', 'Smoke' => 'الدخان', 'Ivory' => 'العاج', 'Indigo' => 'النيلي',
        'Golden' => 'الذهبي', 'Quiet' => 'الهادئ', 'Noir' => 'الأسود', 'Silk' => 'الحرير', 'Sun' => 'الشمس',
        'Night' => 'الليل', 'Pale' => 'الشاحب', 'Garden' => 'الحديقة', 'Sea' => 'البحر', 'Winter' => 'الشتاء',
    ];

    /** @var array<string, string> noun => Arabic */
    public const NOUNS = [
        'Oud' => 'عود', 'Rose' => 'ورد', 'Fig' => 'تين', 'Iris' => 'سوسن', 'Tea' => 'شاي', 'Musk' => 'مسك',
        'Bloom' => 'إزهار', 'Vetiver' => 'نجيل', 'Tobacco' => 'تبغ', 'Jasmine' => 'ياسمين', 'Neroli' => 'نيرولي',
        'Incense' => 'بخور', 'Leather' => 'جلد', 'Santal' => 'صندل', 'Dune' => 'كثيب', 'Harbor' => 'مرفأ',
        'Orchard' => 'بستان', 'Tide' => 'مدّ', 'Cashmere' => 'كشمير', 'Vanilla' => 'فانيليا',
    ];

    /** @var array<string, string> home fragrance name => Arabic */
    public const HOME_NAMES = [
        'Library Hour' => 'ساعة المكتبة', 'First Snow' => 'أول الثلج', 'Linen Cupboard' => 'خزانة الكتّان', 'Fireside' => 'قرب المدفأة',
        'Orchard Window' => 'نافذة البستان', 'Salt Marsh' => 'سبخة الملح', 'Cedar Cabin' => 'كوخ الأرز', 'Evening Souk' => 'سوق المساء',
        'Morning Garden' => 'حديقة الصباح', 'Fig Terrace' => 'شرفة التين', 'Paper & Ink' => 'ورق وحبر', 'Rain on Stone' => 'مطر على الحجر',
    ];

    /** @var array<string, string> scent note => Arabic */
    public const NOTES = [
        'bergamot' => 'البرغموت', 'pink pepper' => 'الفلفل الوردي', 'yuzu' => 'اليوزو', 'cardamom' => 'الهيل', 'saffron' => 'الزعفران',
        'grapefruit' => 'الجريب فروت', 'green mandarin' => 'المندرين الأخضر', 'fig leaf' => 'ورق التين', 'blackcurrant' => 'الكشمش الأسود',
        'sea salt' => 'ملح البحر', 'ginger' => 'الزنجبيل', 'violet leaf' => 'ورق البنفسج', 'lemon zest' => 'قشر الليمون', 'aldehydes' => 'الألدهيدات',
        'juniper' => 'العرعر', 'Damask rose' => 'الورد الدمشقي', 'orris' => 'جذر السوسن', 'jasmine sambac' => 'الفل', 'tuberose' => 'مسك الروم',
        'geranium' => 'إبرة الراعي', 'cedarwood' => 'خشب الأرز', 'fig' => 'التين', 'tea leaves' => 'أوراق الشاي', 'orange blossom' => 'زهر البرتقال',
        'peony' => 'الفاوانيا', 'incense' => 'البخور', 'lavender' => 'الخزامى', 'heliotrope' => 'الهيليوتروب', 'osmanthus' => 'الأوسمانثوس',
        'nutmeg' => 'جوزة الطيب', 'Cambodian oud' => 'العود الكمبودي', 'amber' => 'الكهرمان', 'sandalwood' => 'خشب الصندل', 'vanilla' => 'الفانيليا',
        'tonka bean' => 'حبوب التونكا', 'white musk' => 'المسك الأبيض', 'patchouli' => 'الباتشولي', 'leather' => 'الجلد', 'benzoin' => 'الجاوي',
        'labdanum' => 'اللاذن', 'vetiver' => 'النجيل', 'ambergris' => 'العنبر', 'tobacco' => 'التبغ', 'cashmeran' => 'الكشميران', 'oakmoss' => 'طحلب السنديان',
    ];

    public static function name(string $english): string
    {
        if (isset(self::HOME_NAMES[$english])) {
            return self::HOME_NAMES[$english];
        }

        $words = explode(' ', $english, 2);

        if (count($words) === 2 && isset(self::ADJECTIVES[$words[0]], self::NOUNS[$words[1]])) {
            return self::NOUNS[$words[1]].' '.self::ADJECTIVES[$words[0]];
        }

        return $english;
    }

    /** @param array<string, array<int, string>> $notes */
    public static function description(string $arabicName, array $notes, Concentration $concentration): string
    {
        $list = static fn (array $items): string => implode('، ', array_map(static fn (string $note): string => self::NOTES[$note] ?? $note, $items));
        $kind = match ($concentration) {
            Concentration::Candle => 'شمعة مصبوبة يدويًا بفتيل قطني تحترق نحو 45 ساعة.',
            Concentration::Diffuser => 'ناشر عطر بالأعواد يعطّر الغرفة قرابة ثلاثة أشهر.',
            Concentration::BodyMist => 'رذاذ خفيف للجسم يُستخدم وحده أو فوق العطر في الأيام الدافئة.',
            Concentration::Extrait, Concentration::Parfum => 'تركيبة كثيفة بطيئة الاحتراق صُنعت للمساء والطقس البارد.',
            default => 'ماء عطر متوازن بحضور يومي سهل.',
        };

        return '<p><strong>'.e($arabicName).'</strong> يفتتح بـ'.$list($notes['top'] ?? []).'، ويستقر في قلب من '.$list($notes['heart'] ?? []).'، ثم يهدأ على قاعدة من '.$list($notes['base'] ?? []).'.</p><p>'.$kind.' يُمزَج ويُعبَّأ في دفعات صغيرة.</p>';
    }

    /** Specification pairs that fit a bottle, candle or diffuser. */
    /** @return array<string, string> */
    public static function specifications(Concentration $concentration, ?int $size, string $brandCountry): array
    {
        $origin = match ($brandCountry) {
            'FR' => 'Grasse, France', 'IT' => 'Liguria, Italy', 'GB' => 'London, United Kingdom', 'JP' => 'Kyoto, Japan',
            'SE' => 'Stockholm, Sweden', 'MA' => 'Dadès Valley, Morocco', 'US' => 'Brooklyn, United States', 'AE' => 'Dubai, United Arab Emirates',
            default => 'Manama, Bahrain',
        };

        return match ($concentration) {
            Concentration::Candle => ['Wax' => 'Soy and coconut blend', 'Wick' => 'Cotton, lead-free', 'Burn time' => 'About 45 hours', 'Vessel' => ($size ?? 220).' g amber glass', 'Made in' => $origin],
            Concentration::Diffuser => ['Volume' => ($size ?? 180).' ml', 'Reeds' => '8 rattan reeds', 'Lasts' => 'About 3 months', 'Base' => 'Alcohol-free', 'Made in' => $origin],
            default => ['Bottle' => ($size ?? 50).' ml glass flacon', 'Cap' => 'Magnetic, brushed metal', 'Vegan' => 'Yes', 'Cruelty-free' => 'Yes', 'Made in' => $origin],
        };
    }
}
