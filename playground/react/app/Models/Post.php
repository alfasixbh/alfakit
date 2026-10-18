<?php

namespace App\Models;

use AlfaSix\Alfakit\Versions\HasRecordVersions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Tags\HasTags;

class Post extends Model implements HasMedia
{
    use HasFactory;

    // Record history: a version on every change, History slide-over on the view and edit pages.
    use HasRecordVersions;

    // alfasix/alfakit-tags: tags() is Spatie's morph relation (App\Models\SpatieTag).
    use HasTags;

    // alfasix/alfakit-media-library: the "gallery" collection.
    use InteractsWithMedia;

    // alfasix/alfakit-activity-log: changes show in the Activity log and on the post.
    use LogsActivity;

    /** @var array<int, string> */
    protected array $versionExclude = ['views'];

    use SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
            'meta' => 'array',
            'rating' => 'float',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'slug', 'status', 'is_featured', 'published_at', 'category_id'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('gallery')->useDisk('public');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * The blog's own topics (App\Models\Tag, `post_tag`). Named `topics` because Spatie's
     * HasTags owns `tags()`.
     */
    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'post_tag', 'post_id', 'tag_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
