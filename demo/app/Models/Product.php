<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Versions\HasRecordVersions;
use App\Demo\ProductArtwork;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Enums\ReviewStatus;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property int $store_id
 * @property int|null $brand_id
 * @property int|null $category_id
 * @property string $sku
 * @property string $name
 * @property string $slug
 * @property Concentration $concentration
 * @property string $audience
 * @property int|null $size_ml
 * @property string|null $description
 * @property string $price
 * @property string|null $compare_at_price
 * @property string|null $cost
 * @property int $stock
 * @property ProductStatus $status
 * @property bool $featured
 * @property array<string, array<int, string>>|null $scent_notes
 * @property array<int, string>|null $images
 * @property int $sort_order
 * @property Carbon|null $published_at
 * @property array<string, string>|null $name_translations
 * @property array<string, string>|null $description_translations
 * @property array<int, array{type: string, data: array<string, mixed>}>|null $sections
 * @property array<string, string>|null $specifications
 * @property int $min_review_rating
 * @property string|null $meta_title
 * @property string|null $meta_description
 */
#[Fillable([
    'store_id', 'brand_id', 'category_id', 'sku', 'name', 'slug', 'concentration', 'audience', 'size_ml',
    'description', 'price', 'compare_at_price', 'cost', 'stock', 'status', 'featured', 'scent_notes', 'images',
    'sort_order', 'published_at',
    'name_translations', 'description_translations', 'sections', 'specifications', 'min_review_rating', 'meta_title', 'meta_description',
])]
class Product extends Model implements HasMedia
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, SoftDeletes;

    // Core record history (History slide-over) and the lifestyle gallery
    // (alfakit-media-library over spatie/laravel-medialibrary, on the `demo` disk).
    use HasRecordVersions, InteractsWithMedia;

    public const DEFAULT_LOCALE = 'en';

    /** @var array<int, string> */
    protected array $versionInclude = ['name', 'sku', 'description', 'price', 'compare_at_price', 'cost', 'stock', 'status', 'featured', 'category_id', 'brand_id'];

    protected int $maxVersions = 30;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('gallery')
            ->useDisk('demo')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
    }

    /**
     * `name` and `description` stay the canonical (English) copy that orders, the storefront
     * and search read; the translatable form fields edit the `*_translations` JSON columns
     * and the English value is mirrored back here on save.
     */
    protected static function booted(): void
    {
        // A product created without pictures (form, import) gets the same generated bottle
        // artwork as the seeded catalogue, so no list or storefront card shows an empty frame.
        static::creating(function (self $product): void {
            if (blank($product->images) && filled($product->sku) && filled($product->name)) {
                $product->images = [ProductArtwork::store($product->sku, $product->name, $product->concentration ?? Concentration::EauDeParfum, $product->brand?->name)];
            }
        });

        static::saving(function (self $product): void {
            $name = $product->name_translations[self::DEFAULT_LOCALE] ?? null;
            $description = $product->description_translations[self::DEFAULT_LOCALE] ?? null;

            if (is_string($name) && trim($name) !== '') {
                $product->name = $name;
            } elseif (filled($product->name) && ($product->name_translations === null || $product->name_translations === [])) {
                $product->name_translations = [self::DEFAULT_LOCALE => $product->name];
            }

            if (is_string($description) && trim($description) !== '') {
                $product->description = $description;
            } elseif ($product->description !== null && ($product->description_translations === null || $product->description_translations === [])) {
                $product->description_translations = [self::DEFAULT_LOCALE => $product->description];
            }
        });
    }

    /** The name in the given (or current) language, falling back to the canonical name. */
    public function localizedName(?string $locale = null): string
    {
        $locale ??= app()->getLocale();
        $name = $this->name_translations[$locale] ?? null;

        return is_string($name) && trim($name) !== '' ? $name : $this->name;
    }

    /** Products shown as "you may also like": a self-referencing many-to-many. */
    /** @return BelongsToMany<Product, $this> */
    public function relatedProducts(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'product_relations', 'product_id', 'related_product_id');
    }

    /** Reviews that passed moderation. */
    /** @return HasMany<Review, $this> */
    public function approvedReviews(): HasMany
    {
        return $this->reviews()->where('status', ReviewStatus::Approved);
    }

    /** Gross margin on the list price, as a percentage, when the cost is known. */
    public function marginPercent(): ?float
    {
        if ($this->cost === null || (float) $this->price <= 0) {
            return null;
        }

        return round(((float) $this->price - (float) $this->cost) / (float) $this->price * 100, 1);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Brand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order');
    }

    /** @return HasMany<Review, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** @return HasMany<OrderItem, $this> */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Public URL of the first image (local SVG artwork generated by the seeder). */
    public function imageUrl(): ?string
    {
        $path = $this->images[0] ?? null;

        return $path === null ? null : Storage::disk('demo')->url($path);
    }

    protected function casts(): array
    {
        return [
            'concentration' => Concentration::class,
            'status' => ProductStatus::class,
            'featured' => 'boolean',
            'scent_notes' => 'array',
            'images' => 'array',
            'price' => 'decimal:2',
            'compare_at_price' => 'decimal:2',
            'cost' => 'decimal:2',
            'stock' => 'integer',
            'size_ml' => 'integer',
            'sort_order' => 'integer',
            'published_at' => 'datetime',
            'name_translations' => 'array',
            'description_translations' => 'array',
            'sections' => 'array',
            'specifications' => 'array',
            'min_review_rating' => 'integer',
        ];
    }
}
