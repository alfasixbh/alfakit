---
title: Nested resources
description: Resources whose pages live under a record of another resource.
---

# Nested resources

A nested resource manages records that belong to a record of another resource, at URLs under that record: `/posts/{post}/comments/create`, `/posts/{post}/comments/{record}/edit`. Use it when the child records need full pages of their own (a long form, relation managers) rather than modals in a relation manager.

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;
use App\Alfakit\Resources\CommentResource\Pages;
use App\Models\Comment;

class CommentResource extends Resource
{
    protected static ?string $model = Comment::class;

    protected static ?string $parentResource = PostResource::class;

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListComments::route('/'),
            'create' => Pages\CreateComment::route('/create'),
            'edit' => Pages\EditComment::route('/{record}/edit'),
        ];
    }
}
```

Register the nested resource in the panel like any other resource. Generate one with `php artisan make:alfakit-resource Comment --nested=PostResource` (with `--generate`, the foreign key to the parent is left out of the form and table: the pages create records under the parent record in the URL).

## Relationships

By default the parent model's relationship is the camel-cased plural of the child model (`comments`) and the inverse relationship on the child is the camel-cased parent model (`post`), which is also the route parameter. Name them explicitly with `getParentResourceRegistration()`:

```php
use AlfaSix\Alfakit\Resources\ParentResourceRegistration;

public static function getParentResourceRegistration(): ?ParentResourceRegistration
{
    return PostResource::asParent()
        ->relationship('replies')          // on Post
        ->inverseRelationship('article')   // on Comment
        ->routeParameterName('article');
}
```

### Without an index page

A nested resource often has no index page of its own: its records are listed by a relation manager or a `ManageRelatedRecords` page of the parent. Its index URL (breadcrumbs, redirects after create and delete) then points at the parent's page whose key in `getPages()` is the kebab-cased relationship name (`comments`), or at the page named with `page()`, falling back to the parent record's view, edit or the parent's index page:

```php
// PostResource::getPages(): 'manageComments' => Pages\ManagePostComments::route('/{record}/comments')

return PostResource::asParent()
    ->relationship('comments')
    ->page('manageComments');
```

## What nesting does

- **Routes**: the resource's pages are registered under the parent's record (`posts/{post}/comments`), and route names under the parent's (`resources.posts.comments.edit`). Parents can be nested themselves.
- **Scoping**: on nested pages and their actions, `getEloquentQuery()` only returns records of the parent record in the URL, so another post's comment is a 404. The parent record itself is resolved through the parent resource's (tenant-scoped) query and the user needs `view` or `update` on it, otherwise the page answers 404 or 403. The parent comes from the page's context token for internal requests, never from the internal endpoint's URL.
- **Creating**: `CreateRecord` creates the record through the parent's relationship (sets the foreign key, morph type, or attaches a BelongsToMany record).
- **URLs**: `CommentResource::getUrl('edit', ['record' => $comment])` fills in `{post}` from the record's inverse relationship, or from the parent record of the current page; pass `['post' => $post]` to set it yourself.
- **Breadcrumbs** start with the parent resource and the parent record (`Posts › My post › Comments › Edit`).
- **Navigation**: nested resources have no navigation item; link to them from the parent.

Access the parent record with `CommentResource::getParentRecord()` or `$this->getParentRecord()` on the page.

## Linking from the parent

Point a relation manager (or a `ManageRelatedRecords` page) at the nested resource with `$relatedResource`. Its `CreateAction` and `EditAction` then link to the nested pages under the owner record instead of opening modals:

```php
namespace App\Alfakit\Resources\PostResource\RelationManagers;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CommentResource;

class CommentsRelationManager extends RelationManager
{
    protected static string $relationship = 'comments';

    protected static ?string $relatedResource = CommentResource::class;

    public function table(Table $table): Table
    {
        return $table->columns([TextColumn::make('body')])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make()]);
    }
}
```
