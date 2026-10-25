---
title: Comments
description: Comments with mentions, reactions and notifications on any record.
---

# Comments

`alfasix/alfakit-comments` adds a comment thread to any Eloquent model: rich-text comments with `@` mentions, emoji reactions, edit and delete for authors, database notifications for mentioned users, and events you can hook into. The API follows Filament's [kirschbaum-development/commentions](https://github.com/kirschbaum-development/commentions).

| Class                 | Use it in                               | Does                                                                  |
| --------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `CommentsEntry`       | Infolists, forms, action modals         | The thread: composer, comments, reactions, edit / delete, "Load more" |
| `CommentsAction`      | Page header actions                     | Opens the thread in a slide-over                                      |
| `CommentsTableAction` | Table record actions                    | The same, as an icon button on each row                               |
| `CommentsWidget`      | Header / footer widgets of record pages | The thread as a paginated table that polls for new comments           |

Everything is built from AlfaKit components (entries, `Actions`, `RichEditor` modals, a table widget), so it renders in React, Vue and Svelte; there is no frontend package. No relation manager is needed.

**Works in** an [admin panel](../getting-started/installation) and a [starter kit](../getting-started/starter-kits) panel (mention notifications reach the kit's header bell). `CommentsEntry` also works in a [standalone](../standalone/overview) form bound to a record (`ProductForm::make(['record' => $product])`) for signed-in users; it is hidden for guests.

## Installation

```bash
composer require alfasix/alfakit-comments
php artisan vendor:publish --tag=alfakit-comments-migrations
php artisan migrate
```

The migration creates `alfakit_comments` (morphs `commentable` and `author`, `body`, timestamps) and `alfakit_comment_reactions` (comment, morph `reactor`, `reaction`, unique per user and emoji). Mention notifications use Laravel's `notifications` table, which `php artisan make:notifications-table` creates; enable the bell with `->databaseNotifications()` on the panel.

Make the models commentable, and let users write comments:

```php
use AlfaSix\AlfakitComments\Concerns\HasComments;
use AlfaSix\AlfakitComments\Concerns\IsCommenter;
use AlfaSix\AlfakitComments\Contracts\Commentable;
use AlfaSix\AlfakitComments\Contracts\Commenter;

class Ticket extends Model implements Commentable
{
    use HasComments;
}

class User extends Authenticatable implements Commenter
{
    use IsCommenter; // getCommenterName() and getCommenterAvatarUrl()
}
```

`HasComments` adds a `comments()` relationship (a `MorphMany` to the plugin's `Comment`). A model that already has its own `comments()` (a `HasMany` to your `Comment` model, as in the quick start's blog) fails with "Declaration of …::comments() must be compatible": rename your relationship first (and its relation manager's `$relationship`).

`Commenter` is optional: without it, names and avatars come from the panel (`userName()`, `HasName`, `HasAvatar`, an `avatar_url` attribute, `defaultAvatarProvider()`), falling back to an initials avatar drawn on the server. Implement the two methods yourself to show something else.

Register the plugin to configure it (optional; the defaults apply without it):

```php
use AlfaSix\AlfakitComments\CommentsPlugin;

$panel->plugin(CommentsPlugin::make());
```

## Showing comments

On a view page, put the entry in the resource's infolist:

```php
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\AlfakitComments\Infolists\Components\CommentsEntry;

public static function infolist(Schema $schema): Schema
{
    return $schema->components([
        // ...
        Section::make('Comments')->schema([
            CommentsEntry::make(),
        ]),
    ]);
}
```

Each comment shows the author's avatar and name, the relative time (the exact time as a tooltip), "(edited)" after a change, the body with mentions as chips, and the reactions with their counts. The author gets **Edit** and **Delete** in the comment's menu; everyone who can see the record can react. "Add comment" opens a modal with a `RichEditor`; type `@` to mention someone.

In an infolist, posting, editing, reacting and "Load more" reload the page. Placed in a form (an edit page) or an action's modal, the entry updates in place without leaving the page:

```php
public static function form(Schema $schema): Schema
{
    return $schema->components([
        TextInput::make('title'),
        CommentsEntry::make()->hiddenOn('create'),
    ]);
}
```

Entry options:

| Method                                    | Does                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `make('comments')`                        | The component key (default `comments`); use different keys for two threads on one page |
| `commentable(Model\|Closure)`             | Comment on another record than the schema's                                            |
| `perPage(int)`                            | Comments shown at first and added by "Load more" (plugin default)                      |
| `newestFirst()` / `oldestFirst()`         | Order (plugin default)                                                                 |
| `readOnly()`                              | No composer, edit, delete or react buttons; reactions stay visible                     |
| `reactions(false)` / `disableReactions()` | Hide reactions                                                                         |
| `avatars(false)` / `disableAvatars()`     | Hide avatars                                                                           |
| `loadMoreLabel(string)`                   | The "Load more comments" button label                                                  |

The entry is hidden for guests, for unsaved records and for users the record's policy doesn't allow to `view`.

## Slide-over and table actions

```php
use AlfaSix\AlfakitComments\Actions\CommentsAction;
use AlfaSix\AlfakitComments\Actions\CommentsTableAction;

protected function getHeaderActions(): array
{
    return [CommentsAction::make()];
}

public static function table(Table $table): Table
{
    return $table->recordActions([CommentsTableAction::make()]);
}
```

The slide-over contains a `CommentsEntry` for the action's record and updates in place. Both actions take `perPage()`, `newestFirst()`, `oldestFirst()`, `readOnly()`, `disableReactions()`, `disableAvatars()` and `modifyCommentsEntryUsing(fn (CommentsEntry $entry) => $entry->loadMoreLabel('Older'))`, besides every `Action` method (`label()`, `icon()`, `slideOver(false)`…).

## Polling widget

```php
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\AlfakitComments\Widgets\CommentsWidget;

class EditTicket extends EditRecord
{
    protected function getFooterWidgets(): array
    {
        return [CommentsWidget::class];
    }
}
```

The widget lists the page record's comments in a paginated table (`perPage()` per page) with an "Add comment" header action, reaction buttons and the author's edit / delete menu, and refreshes every `pollingInterval()`.

## Plugin options

```php
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

CommentsPlugin::make()
    ->mentionables(fn (?Model $tenant): Builder => User::query()->where('is_staff', true))
    ->mentionableSearchColumns(['name', 'email'])
    ->mentionUrl(fn (User $user): string => UserResource::getUrl('view', ['record' => $user]))
    ->reactions(['👍', '❤️', '😄', '🎉'])
    ->newestFirst()
    ->perPage(10)
    ->pollingInterval('10s')
    ->toolbarButtons(['bold', 'italic', 'link', 'bulletList', 'orderedList'])
    ->notifyMentions()
    ->commentUrlUsing(fn (Comment $comment, Model $commentable): string => TicketResource::getUrl('view', ['record' => $commentable]))
    ->authorUsing(fn (): ?Model => auth('staff')->user())
    ->commentModel(App\Models\Comment::class)
    ->reactionModel(App\Models\CommentReaction::class);
```

| Method                               | Default                                        | Does                                                    |
| ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `mentionables(Closure)`              | Panel users; members of the current tenant     | The users that can be mentioned, as a query             |
| `mentionableSearchColumns(array)`    | `['name']`                                     | Columns the mention search looks in (case-insensitive)  |
| `mentionUrl(Closure)`                | none                                           | Renders mentions as links                               |
| `reactions(array\|false)`            | `['👍', '❤️', '😄', '🎉']`                     | The emoji users can toggle; `false` turns reactions off |
| `newestFirst()` / `oldestFirst()`    | newest first                                   | Order of the thread                                     |
| `perPage(int)`                       | `10`                                           | Comments per page / "Load more" step                    |
| `pollingInterval(?string)`           | none                                           | How often `CommentsWidget` refreshes                    |
| `toolbarButtons(array)`              | bold, italic, strike, link, lists, quote, code | The comment editor's toolbar                            |
| `notifyMentions(bool)`               | `true`                                         | Database notification for mentioned users               |
| `commentUrlUsing(Closure)`           | The record's view (or edit) page               | The notification's "View" link                          |
| `authorUsing(Closure)`               | The panel's signed-in user                     | Who writes comments and reacts                          |
| `commentModel()` / `reactionModel()` | `Comment` / `CommentReaction`                  | Your subclasses of the models                           |

On tenancy panels the default mentionables are the users of the tenant's `members()` (or `users()`) relationship; users implementing `HasTenants` must also pass `canAccessTenant()`. Mentions of anyone else are kept as text but never notified.

## Posting from code

```php
$comment = $ticket->comment('<p>Shipped! @Jane</p>', $user); // the signed-in user without $user

$ticket->comments()->latest()->get();
$comment->getMentioned();      // the mentioned users
$comment->getMentionedIds();   // ids in the mention markers
$comment->getRenderedBody();   // the HTML shown in the panel
```

`AlfaSix\AlfakitComments\Support\Comments` has the operations the UI uses: `post()`, `update()`, `delete()`, `toggleReaction()`, `queryFor($record)` and `can($ability, $target)`.

## Mentions and notifications

The editor stores a mention as `<span data-type="mention" data-id="5" data-label="Jane">@Jane</span>`. When a comment is posted, the mentioned ids are checked against the mentionable users; each one (other than the author) gets a database notification, ":name mentioned you in a comment" with an excerpt and a "View" link, and a `UserWasMentioned` event. Editing a comment notifies users it mentions for the first time.

## Events

| Event               | Properties                                | When                                |
| ------------------- | ----------------------------------------- | ----------------------------------- |
| `CommentWasCreated` | `comment`                                 | After a comment was posted          |
| `UserWasMentioned`  | `comment`, `user`                         | For every newly mentioned user      |
| `CommentWasReacted` | `comment`, `reactor`, `reaction`, `added` | When a reaction is added or removed |

Turn the built-in notification off with `notifyMentions(false)` and send your own from a `UserWasMentioned` listener (mail, Slack…).

## Authorisation

`CommentPolicy` decides:

- `create`: users who may `view` the record (the record's policy; allowed without one, denied with `strictAuthorization()`);
- `update` and `delete`: the comment's author;
- `react`: users who may `view` the record.

Replace it with your own (extend it to keep the defaults):

```php
Gate::policy(\AlfaSix\AlfakitComments\Models\Comment::class, App\Policies\CommentPolicy::class);
```

Actions check the policy again when they run, and a comment is always looked up among the comments of the page's record, so a request can't reach comments of another record or another tenant.

## Security

Bodies are sanitised with `Html::sanitize()` (your panel's `htmlSanitizer()` applies) every time a comment is saved, and again when it is shown: scripts, event handlers and `javascript:` links are removed.

## Translations

Strings live in `alfakit-comments::comments` (`resources/lang/en/comments.php`). Publish them with `php artisan vendor:publish --tag=alfakit-comments-translations`.
