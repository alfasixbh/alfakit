<?php

namespace Database\Seeders;

use AlfaSix\AlfakitComments\Models\Comment as PluginComment;
use AlfaSix\AlfakitComments\Support\Comments;
use App\Models\CalendarEvent;
use App\Models\Category;
use App\Models\Post;
use App\Models\User;
use App\Settings\GeneralSettings;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Demo data for the first-party plugins (packages/plugins). Safe to run more than once:
 * `php artisan db:seed --class=PluginsSeeder`.
 */
class PluginsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Alfa Admin', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );

        $editor = User::query()->firstOrCreate(
            ['email' => 'editor@example.com'],
            ['name' => 'Eda Editor', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );

        $viewer = User::query()->firstOrCreate(
            ['email' => 'viewer@example.com'],
            ['name' => 'Vic Viewer', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );

        // Changes below are logged with the admin as causer.
        Auth::guard('web')->setUser($admin);

        $this->seedRoles($admin, $editor, $viewer);
        $this->seedSettings();
        $this->seedCategoryTree();
        $this->seedTags();
        $this->seedMedia();
        $this->seedActivity();
        $this->seedCalendarEvents();
        $this->seedComments($admin, $editor, $viewer);
    }

    /** alfasix/alfakit-shield: permissions from the panel, super_admin for the admin. */
    protected function seedRoles(User $admin, User $editor, User $viewer): void
    {
        // Permissions only: no policies are generated, so every page stays open for other users.
        Artisan::call('alfakit-shield:generate', ['--panel' => 'admin', '--option' => 'permissions']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $superAdmin = Role::findOrCreate('super_admin', 'web');
        $admin->assignRole($superAdmin);

        $editorPermissions = Permission::query()
            ->where('guard_name', 'web')
            ->where(fn ($query) => $query
                ->where('name', 'like', '%_post')
                ->orWhere('name', 'like', '%_category')
                ->orWhere('name', 'like', '%_tag'))
            ->pluck('name');

        Role::findOrCreate('editor', 'web')->syncPermissions($editorPermissions);
        $editor->assignRole('editor');

        $viewerPermissions = Permission::query()
            ->where('guard_name', 'web')
            ->where(fn ($query) => $query->where('name', 'like', 'view_any_%')->orWhere('name', 'like', 'view_%'))
            ->where('name', 'not like', '%_role')
            ->pluck('name');

        Role::findOrCreate('viewer', 'web')->syncPermissions($viewerPermissions);
        $viewer->assignRole('viewer');
    }

    /** alfasix/alfakit-settings: the settings migration added the values; refresh a few. */
    protected function seedSettings(): void
    {
        $settings = app(GeneralSettings::class);
        $settings->site_name = 'AlfaKit Playground';
        $settings->tagline = 'Admin panels for Laravel, rendered with Inertia';
        $settings->save();
    }

    /** alfasix/alfakit-tree: a three-level category tree. */
    protected function seedCategoryTree(): void
    {
        $tree = [
            'Engineering' => [
                'Backend' => ['Laravel', 'PHP', 'Databases'],
                'Frontend' => ['React', 'Vue', 'Svelte'],
            ],
            'Product' => [
                'Design' => [],
                'Roadmap' => [],
            ],
            'Company' => [
                'News' => [],
                'Hiring' => [],
            ],
        ];

        // Before the flat factory categories (order 0) so the nested tree shows first.
        $order = -10;

        foreach ($tree as $rootName => $children) {
            $root = $this->category($rootName, null, $order++);

            $childOrder = 1;

            foreach ($children as $childName => $grandChildren) {
                $child = $this->category($childName, $root, $childOrder++);

                foreach ($grandChildren as $index => $grandChildName) {
                    $this->category($grandChildName, $child, $index + 1);
                }
            }
        }
    }

    protected function category(string $name, ?Category $parent, int $order): Category
    {
        $category = Category::query()->firstOrNew(['slug' => 'tree-'.Str::slug($name)]);
        $category->fill(['name' => $name, 'parent_id' => $parent?->getKey(), 'order' => $order]);
        $category->color ??= fake()->hexColor();
        $category->save();

        return $category;
    }

    /** alfasix/alfakit-tags: Spatie tags on the posts. */
    protected function seedTags(): void
    {
        $names = ['laravel', 'inertia', 'react', 'vue', 'svelte', 'tutorial', 'release', 'performance'];

        Post::query()->orderBy('id')->limit(40)->get()->each(function (Post $post) use ($names): void {
            if ($post->tags()->exists()) {
                return;
            }

            $post->attachTags(collect($names)->shuffle()->take(random_int(1, 3))->all());
        });
    }

    /** alfasix/alfakit-media-library: a small generated gallery on the first posts. */
    protected function seedMedia(): void
    {
        if (! function_exists('imagecreatetruecolor')) {
            return;
        }

        $colors = [[37, 99, 235], [249, 115, 22], [16, 185, 129], [168, 85, 247]];

        Post::query()->orderBy('id')->limit(3)->get()->each(function (Post $post) use ($colors): void {
            if ($post->getMedia('gallery')->isNotEmpty()) {
                return;
            }

            foreach (array_slice($colors, 0, 3) as $index => [$r, $g, $b]) {
                $path = tempnam(sys_get_temp_dir(), 'alfakit-media').'.png';
                $image = imagecreatetruecolor(640, 400);
                imagefill($image, 0, 0, imagecolorallocate($image, $r, $g, $b) ?: 0);
                imagefilledellipse($image, 320, 200, 260, 260, imagecolorallocate($image, 255, 255, 255) ?: 0);
                imagepng($image, $path);
                imagedestroy($image);

                $post->addMedia($path)
                    ->usingName("{$post->slug} ".($index + 1))
                    ->usingFileName("gallery-{$post->getKey()}-".($index + 1).'.png')
                    ->toMediaCollection('gallery');
            }
        });
    }

    /** alfasix/alfakit-activity-log: a few logged changes on posts (Post uses LogsActivity). */
    protected function seedActivity(): void
    {
        $activityModel = config('activitylog.activity_model');

        if ($activityModel::query()->exists()) {
            return;
        }

        Post::query()->orderBy('id')->limit(6)->get()->each(function (Post $post, int $index): void {
            $post->update(['status' => $index % 2 === 0 ? 'review' : 'published']);

            if ($index < 3) {
                $post->update(['is_featured' => ! $post->is_featured, 'title' => Str::finish($post->title, ' (updated)')]);
            }
        });

        activity()->event('seeded')->log('Plugin demo data seeded');
    }

    /** alfasix/alfakit-calendar: events around today. */
    protected function seedCalendarEvents(): void
    {
        if (CalendarEvent::query()->exists()) {
            return;
        }

        $today = CarbonImmutable::today();

        $events = [
            ['Editorial meeting', 0, '09:30', 60, false, '#2563eb', 0],
            ['Release AlfaKit 0.2', 2, null, null, true, '#16a34a', 1],
            ['Design review', 3, '14:00', 90, false, '#9333ea', 0],
            ['Content planning', -3, '10:00', 120, false, '#2563eb', 0],
            ['Laracon talk', 9, null, null, true, '#dc2626', 1],
            ['Newsletter goes out', 5, '08:00', 30, false, '#f97316', 0],
            ['Team retro', -7, '16:00', 60, false, '#0891b2', 0],
            ['Hackathon', 14, null, null, true, '#ca8a04', 2],
        ];

        foreach ($events as [$title, $offset, $time, $minutes, $allDay, $color, $days]) {
            $start = $allDay ? $today->addDays($offset) : $today->addDays($offset)->setTimeFromTimeString($time);

            CalendarEvent::query()->create([
                'title' => $title,
                'starts_at' => $start,
                'ends_at' => $allDay ? $start->addDays($days) : $start->addMinutes($minutes),
                'all_day' => $allDay,
                'color' => $color,
                'description' => "{$title} (seeded by PluginsSeeder).",
            ]);
        }
    }

    /** alfasix/alfakit-comments: a short discussion with a mention and reactions. */
    protected function seedComments(User $admin, User $editor, User $viewer): void
    {
        $post = Post::query()->where('status', 'published')->orderBy('id')->first() ?? Post::query()->orderBy('id')->first();

        if ($post === null || PluginComment::query()->exists()) {
            return;
        }

        $mention = fn (User $user): string => '<span data-type="mention" data-id="'.$user->getKey().'" data-label="'.e($user->name).'">@'.e($user->name).'</span>';

        $first = Comments::post($post, '<p>Great first draft! '.$mention($editor).' can you check the screenshots before we publish?</p>', $admin);
        $second = Comments::post($post, '<p>On it. I will also add the <strong>Svelte</strong> example.</p>', $editor);
        Comments::post($post, '<p>Looks good to me 👀</p>', $viewer);

        Comments::toggleReaction($first, $editor, '👍');
        Comments::toggleReaction($first, $viewer, '🎉');
        Comments::toggleReaction($second, $admin, '❤️');
    }
}
