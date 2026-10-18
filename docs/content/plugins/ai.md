---
title: AI
description: AI actions, a writing assistant, natural-language table filters, a panel copilot and an MCP server, built on laravel/ai and your panel's own permissions.
---

# AI

`alfasix/alfakit-ai` puts AI into your panel without handing your data or your permissions to a model. Everything runs on the server through [laravel/ai](https://github.com/laravel/ai), with the signed-in user's policies, the resource's tenant scope and only the fields the resource shows.

What you get:

| Feature              | Where                                                                             | What it does                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AiAction`           | Table, page and field actions                                                     | One-line AI actions: show the answer with a copy button, or fill fields for review                                                                                   |
| Prebuilt actions     | `SummarizeAction`, `TranslateAction`, `ExtractIntoFieldsAction`, `ClassifyAction` | Summaries, translations, "fill this form from an email or PDF", picking one value from a list                                                                        |
| `->aiAssist()`       | `TextInput`, `Textarea`, `RichEditor`, `MarkdownEditor`                           | A writing assistant: generate, shorter, longer, friendlier, more formal, fix grammar, translate, continue. Suggestions only; the field changes when the user accepts |
| `Table::aiFilters()` | Table header                                                                      | "Ask AI": a sentence becomes the table's own filters, search and sort, which stay visible and editable                                                               |
| Copilot              | Topbar (`mod+j`)                                                                  | A chat that searches, reads, opens pages and proposes actions the user confirms                                                                                      |
| MCP server           | `/{panel}/mcp`                                                                    | Your resources as MCP tools for Claude Desktop, Cursor and other agents, behind a token                                                                              |
| Usage                | `AI usage` resource                                                               | Every AI call with tokens, estimated cost, duration and status, with filters and totals                                                                              |

The safety rules are the same everywhere:

- **Only what the user may see.** Records are found through the resource's query (tenant scope included) and checked with `canView()`. Only the fields the resource shows go into prompts: its infolist entries, else its table columns, else its form fields. `$hidden` attributes never do.
- **Redaction.** Passwords, tokens, secrets, card numbers and similar names are redacted by default; add your own with `redact()` or `redactUsing()`.
- **Nothing changes by itself.** AI actions show their answer for review. Field suggestions are applied only on "Use suggestion". The copilot can only _propose_ actions; they run when the user clicks "Confirm", after authorisation and validation are checked again.
- **Prompt-injection hygiene.** Record data, user text and tool results are sent inside `<data>` blocks as escaped JSON, and the instructions tell the model to treat them as data only.
- **Every call logged.** Feature, user, tenant, provider, model, tokens, estimated cost, duration and status go to `alfakit_ai_usage` (prompts and answers are not stored there). Copilot and MCP tool calls go to an audit log.
- **Opt-in.** Nothing loads unless the plugin is on the panel and the feature is on. The copilot and the MCP server are off until you enable them.

The copilot is the only new frontend component (`ai:copilot`, lazy-loaded in React, Vue and Svelte). Everything else is built from AlfaKit's existing actions, modals and fields.

## Installation

```bash
composer require alfasix/alfakit-ai
php artisan vendor:publish --tag=alfakit-ai-migrations
php artisan migrate
php artisan alfakit:ai-setup
```

`alfakit:ai-setup` (part of AlfaKit) writes your provider keys into `.env`, publishes `config/ai.php` and sets the default provider and model. The plugin uses that default unless you pick a provider per feature. The migration creates `alfakit_ai_usage`, `alfakit_ai_conversations`, `alfakit_ai_messages`, `alfakit_ai_tool_calls` and `alfakit_ai_mcp_tokens`.

For the MCP server, also install `laravel/mcp` (`composer require laravel/mcp`).

## Register

```php
use AlfaSix\AlfakitAi\AiPlugin;
use AlfaSix\AlfakitAi\Enums\AiFeature;

$panel->plugin(
    AiPlugin::make()
        ->provider('openai', 'gpt-4.1-mini')
        ->provider('anthropic', 'claude-sonnet-4-5', feature: AiFeature::Copilot)
        ->copilot()
        ->mcp()
        ->redact(['email', 'phone', Customer::class.'.notes'])
        ->rateLimit(30)
        ->pricing(['gpt-4.1-mini' => ['input' => 0.4, 'output' => 1.6]]),
);
```

| Option                                         | Default                        | Description                                                                                     |
| ---------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `enabled(bool\|Closure)`                       | `true`                         | The panel-wide switch. Closures receive `$user`, `$tenant`, `$panel`.                           |
| `authorize(?Closure)`                          | everyone signed in             | Who may use AI: `fn (User $user): bool => $user->can('use-ai')`. Receives `$feature` too.       |
| `disable(AiFeature ...)`                       | —                              | Switch features off (`Actions`, `Assist`, `Filters`, `Copilot`, `Mcp`).                         |
| `provider($provider, $model = null, feature:)` | `config('ai.default')`         | Provider and model for every feature or one. A list fails over in order.                        |
| `model($model, feature:)`                      | the provider's default         | Only the model.                                                                                 |
| `timeout(int)`                                 | `60`                           | Seconds before a provider request gives up.                                                     |
| `demoResponses(bool\|Closure)`                 | off                            | Without a provider key, answer with labelled sample answers made locally (see below).           |
| `setupHintVisible(bool\|Closure\|null)`        | local environment only         | Who sees "Run `php artisan alfakit:ai-setup`" when no key is set: `fn (User $user) => …`.       |
| `copilot(bool\|Closure)`                       | off                            | The topbar copilot.                                                                             |
| `mcp(bool\|Closure, path: 'mcp')`              | off                            | The MCP server of the panel.                                                                    |
| `resources(array\|Closure\|null)`              | every resource                 | The resources the copilot and MCP server may use.                                               |
| `copilotActions(?Closure)`                     | every authorised record action | `fn (Action $action, string $resource): bool` filters what the copilot may propose.             |
| `copilotInstructions(string\|Closure\|null)`   | —                              | Extra instructions (your domain, tone).                                                         |
| `copilotKeyBindings(array)`                    | `['mod+j']`                    | Shortcuts that open the copilot (an empty list for none).                                       |
| `copilotLimits(maxSteps: 8, history: 20)`      | `8`, `20`                      | Tool calls per question, earlier messages sent along.                                           |
| `redact(array)`                                | —                              | Attributes never sent: `'email'`, `'*_phone'`, `Customer::class.'.notes'`, `'customers.notes'`. |
| `redactUsing(?Closure)`                        | —                              | `fn (string $attribute, mixed $value, Model $record): bool`.                                    |
| `withoutDefaultRedactions()`                   | —                              | Only redact your own list (and `$hidden`).                                                      |
| `rateLimit(?int $perMinute, feature:)`         | 30 overall, 10 copilot         | Requests per minute per user; MCP requests default to 120.                                      |
| `pricing(array, currency: 'USD')`              | —                              | Prices per million tokens by model (or `*`), for cost estimates.                                |
| `usageResource(bool\|class-string)`            | on                             | The usage resource, your subclass, or `false`.                                                  |
| `canViewAllUsage(?Closure)`                    | nobody                         | Who sees everyone's usage (others see their own).                                               |
| `navigationGroup()`, `navigationSort()`        | —                              | Where the usage resource sits.                                                                  |
| `mcpTokenModel(class-string)`                  | `McpToken`                     | Your own token model, when the plugin issues MCP tokens.                                        |

## Without a provider key

The plugin never breaks when AI isn't set up. `AiPlugin::isConfigured(?AiFeature $feature = null)` checks the configuration only (no request): an action's own `provider()`, else the feature's provider, else `config('ai.default')`, must have a key in `config('ai.providers')` (a URL for Ollama and OpenAI-compatible servers, a key and URL for Azure; one usable provider of a failover list is enough). When it isn't configured:

| Who                                   | What they see in AI modals, the writing assistant, "Ask AI", the copilot and the usage page |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Users allowed by `setupHintVisible()` | A warning: "AI isn't set up yet. Run `php artisan alfakit:ai-setup` to add a provider key." |
| Everyone else                         | A neutral "AI is not available right now."                                                  |

Nothing is sent and no call is logged; the modals still open, the copilot answers with that message, and no provider error or 500 ever reaches the user. By default only the `local` environment shows the setup hint; choose who sees it in other environments:

```php
AiPlugin::make()->setupHintVisible(fn (User $user): bool => $user->is_admin)
```

### Sample answers (`demoResponses()`)

For demos, screenshots and local development without a key, let every AI feature work end to end with deterministic sample answers made on the server, without any network call:

```php
AiPlugin::make()
    ->demoResponses()                          // or ->demoResponses(fn () => app()->isLocal())
    ->setupHintVisible(fn (User $user): bool => $user->is_admin)
```

| Feature                             | Sample answer                                                                                                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SummarizeAction`                   | The first sentences of the text, or the record's first visible fields (bullets with `bullets()`)                                                                                                                                             |
| `TranslateAction`, assist Translate | The original text with a "[Sample translation · French]" marker (HTML stays HTML)                                                                                                                                                            |
| `->aiAssist()`                      | Shorter keeps the first half of the sentences, Longer adds a sentence, Friendlier and More formal add a greeting and a closing, Fix grammar tidies spacing, punctuation and capitals                                                         |
| `ExtractIntoFieldsAction`           | "Label: value" lines, emails, phone numbers, dates, amounts, company and person names and option names matched to the fields by their labels; other fields stay empty                                                                        |
| `ClassifyAction`                    | The option whose label words appear most in the text (else the first), with the reason                                                                                                                                                       |
| `AiAction` with `schema()`          | Sample values: the first option of selects, `false`, extracted values, "Sample subject"                                                                                                                                                      |
| `Table::aiFilters()`                | Option names ("paid"), comparisons ("over 100", "at most 50"), dates ("today", "last week", "this month", "last year"), "biggest/newest first" and quoted words become the table's own filters; otherwise a "Try e.g. …" hint                |
| Copilot                             | "search acme" runs the real `search_records` tool and lists the results, "open orders" / "open SO-1" / "new order" show links, "run mark paid on SO-1" proposes the action (it still needs "Confirm"), anything else explains what it can do |

Sample phrases are understood in English. Every sample is labelled "Sample answer — AI isn't configured" (a notice in modals and filter results, a badge on copilot answers), and is logged in AI usage with the provider and model `demo` at zero cost. A configured provider always wins: as soon as a key is set, the same features call it. Sample answers come from `AlfaSix\AlfakitAi\Support\DemoResponder`, which returns laravel/ai response objects through the plugin's usual code path; bind your own subclass to change them.

## AI actions

`AiAction` asks the model when the modal opens and shows the answer. Without `schema()` the answer is text, shown as Markdown with a copy button:

```php
use AlfaSix\AlfakitAi\Actions\AiAction;

AiAction::make('explain')
    ->label('Explain')
    ->prompt(fn (Invoice $record): string => "Explain this invoice to a customer:\n\n{$record->description}")
```

With `schema()`, the fields are the structured output (types and options come from the fields) and the user reviews and edits them before submitting. Values the fields can't hold (an option that doesn't exist, text in a number field) are dropped:

```php
AiAction::make('draftReply')
    ->prompt(fn (Ticket $record): string => "Draft a reply to this ticket: {$record->body}")
    ->schema([
        TextInput::make('subject'),
        Textarea::make('body'),
        Select::make('tone')->options(['warm' => 'Warm', 'formal' => 'Formal']),
    ])
    ->action(fn (array $data, Ticket $record) => $record->replies()->create($data))
```

`inputs()` adds fields above the answer that generate it again when they change:

```php
AiAction::make('rewrite')
    ->inputs([Select::make('tone')->options(['short' => 'Short', 'detailed' => 'Detailed'])->default('short')])
    ->prompt(fn (array $data, Post $record): string => "Rewrite in a {$data['tone']} style: {$record->body}")
```

| Method                               | Description                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `prompt(string\|Closure)`            | The question. Closures receive `$record`, `$data` (the inputs), `$state` / `$get` as a field action.                |
| `instructions(string\|Closure)`      | The system instructions.                                                                                            |
| `schema(array)`                      | Output fields (structured output).                                                                                  |
| `inputs(array\|Closure)`             | Fields that regenerate the answer when changed.                                                                     |
| `provider()`, `model()`, `aiModel()` | Override the plugin's provider and model for this action. `model()` with an Eloquent class keeps its usual meaning. |
| `temperature()`, `maxTokens()`       | Generation options.                                                                                                 |
| `language(?string)`                  | The answer's language (the panel's locale by default).                                                              |
| `attachments(Closure)`               | laravel/ai files: `fn (Invoice $record) => [Document::fromStorage($record->pdf)]`.                                  |
| `generateOnMount(bool)`              | Off: the user changes an input first.                                                                               |
| `editable()`                         | Show the text answer in an editable field.                                                                          |
| `fillField(?string $path)`           | As a field action: "Accept" puts the answer into that field (or `$path`).                                           |
| `fillFields(?array $map)`            | With `schema()`: "Accept" writes the outputs into the form being edited.                                            |

Provider errors are reported, logged as failed and shown as "The AI service did not answer"; the provider's message (and any key in it) is never shown.

### Prebuilt actions

```php
use AlfaSix\AlfakitAi\Actions\ClassifyAction;
use AlfaSix\AlfakitAi\Actions\ExtractIntoFieldsAction;
use AlfaSix\AlfakitAi\Actions\SummarizeAction;
use AlfaSix\AlfakitAi\Actions\TranslateAction;

$table->recordActions([
    SummarizeAction::make()->length('medium')->bullets(),
    ClassifyAction::make()->enum(TicketCategory::class)->source(fn (Ticket $record) => $record->body)->saveTo('category'),
]);

Textarea::make('description')->hintAction(TranslateAction::make()->fillField());

Actions::make([
    ExtractIntoFieldsAction::make()->fields(['name', 'email', 'company', 'country']),
]);
```

- `SummarizeAction`: the record's visible, redacted fields (or `source()`, or the field's text as a field action). `length('short'|'medium'|'long')`, `bullets()`.
- `TranslateAction`: a language picker (the panel's locales, or `locales([...])`, `defaultLocale()`); changing it translates again. HTML stays HTML.
- `ExtractIntoFieldsAction`: paste text or drop a PDF, image or text file; the extracted values are shown as review fields mirroring the form (or your `schema()`), and "Accept" fills the form. The record is only saved when the user saves the form. `fields([...])` limits the fields, `files(false)` hides the upload.
- `ClassifyAction`: one value from `options()` or `enum()` (or the `Select` it is attached to) with a reason. `saveTo('attribute')` saves it after checking the user may edit the record; `fillField()` puts it into the field.

## Writing assistant

```php
TextInput::make('title')->aiAssist(),
Textarea::make('notes')->aiAssist(),
RichEditor::make('body')->aiAssist(['shorter', 'grammar', 'translate']),
```

`->aiAssist()` adds a hint action. Its modal has an instructions box, a target language and buttons: Generate (from the instructions), Shorter, Longer, Friendlier, More formal, Fix grammar, Translate and Continue writing. Each button produces a suggestion, and the next button works on that suggestion, so they chain. The suggestion is editable; the field only changes on "Use suggestion". Rich editors get HTML back, sanitised with the panel's HTML sanitiser.

## Streaming answers

```php
AiPlugin::make()->streaming()
```

With `streaming()`, `AiAction` text answers, `aiAssist()` suggestions and copilot replies appear as they are written instead of all at once, with a **Stop** button. When an action's modal opens (or an assistant task is picked), the server resolves the prompt (record, inputs, redaction) and puts a one-time encrypted token in the modal; the browser posts it to `/{panel}/_ai/stream` (copilot: `/{panel}/_ai/copilot/messages/stream`) and reads server-sent events (`delta` with text, then `done` or `error`). The token only works once, for ten minutes, for the user, panel and tenant it was issued to; the feature switch, `authorize()` and the rate limits are checked again when it streams. The text is shown as plain text while it streams; the finished answer is cleaned up on the server (code fences, HTML sanitising, continuations) and then rendered like a non-streamed one. Screen readers hear it through a polite live region, in batches every two seconds.

Sample answers (`demoResponses()`) stream too, a few words at a time (`streaming(demoDelayMs: 30)`). A provider that fails before sending any text is asked once more without streaming and its answer sent in chunks. Structured answers (`schema()`) and actions with `attachments()` are never streamed; `->stream(false)` turns it off for one action and `->stream()` on for one action when the plugin's switch is off. Proxies must not buffer `text/event-stream` responses (the response sends `X-Accel-Buffering: no` for nginx).

In tests, fake the agents as usual: laravel/ai's fakes stream word by word.

## Natural-language table filters

```php
public static function table(Table $table): Table
{
    return $table
        ->columns([...])
        ->filters([
            SelectFilter::make('status')->options(OrderStatus::class),
            QueryBuilder::make()->constraints([
                NumberConstraint::make('total'),
                DateConstraint::make('created_at'),
            ]),
        ])
        ->headerActions([...])
        ->aiFilters(); // after headerActions()
}
```

"Ask AI" opens a box: "paid orders over 100 from last week, biggest first". The model sees only the table's filters (their fields and options), its query builder constraints and operators, whether it is searchable and its sortable columns, and answers with structured output. Every part is checked against those declarations (filter, field, option, constraint, operator, value, column); if anything is unknown or invalid, nothing is applied and the user sees why. Valid answers open the table with ordinary filters, search and sort in the URL, so they are visible, editable and removable like any other. No SQL is ever generated. `AiFilterAction::make()` is the same action, if you'd rather place it yourself.

## Copilot

`->copilot()` adds a sparkle button to the topbar (and `mod+j`). The chat slide-over's code loads the first time it opens. The model has four tools, all running as the signed-in user:

- `search_records`: searches the resources' globally searchable attributes (or lists the latest records), keeping only records the user may view.
- `read_record`: the fields the resource shows, redacted, and the record actions the user may run with the inputs they take.
- `navigate`: shows a link to a list, create form or record page the user may open.
- `propose_action`: shows a confirmation card. The action has **not** run: it runs when the user clicks "Confirm", after visibility, authorisation and the action's form validation are checked again. Actions that need password confirmation, links and bulk actions are never offered. `copilotActions()` narrows the list.

Conversations are stored per user, panel and tenant; the history list, "new conversation" and delete are in the header. Each answer shows its token use (and the estimated cost with `pricing()`), and the panel shows "AI can make mistakes". Questions are rate limited per user (10 per minute by default). Every tool call, decision and result is written to `alfakit_ai_tool_calls`.

The copilot's endpoints are panel routes (`/{panel}/_ai/copilot/…`, under the tenant on tenancy panels) behind the panel's authentication and CSRF protection; they return 404 when the copilot is off and 403 when `authorize()` refuses.

## MCP server

`->mcp()` (with `laravel/mcp` installed) serves the panel's resources to MCP clients at `https://your-app.test/{panel}/mcp` (`/{panel}/mcp/{tenant}` on tenancy panels).

Tools: `list_resources`, `search_records`, `show_record`, `create_record` and `update_record`, plus an `alfakit://catalogue` resource. Reads return the same visible, redacted fields as the copilot. Writes go through the resource's create and edit forms: the same validation, defaults, `mutateFormDataBefore…()` and `after…()` hooks and policies as the panel. Calling `create_record` or `update_record` without `data` returns the fields. Every call is in the audit log.

Clients authenticate with `Authorization: Bearer {token}`. Every available token store is tried, in this order, and the first that recognises the token wins:

1. **alfasix/alfakit-api** on the same panel: its personal access tokens (the API tokens page), from its token repository (database, or Sanctum with `SanctumTokenRepository`). Abilities apply: `orders:read`, `orders:create`, `orders:update`, `orders:*`, `*`.
2. **laravel/sanctum**, if installed and migrated: `$user->createToken('mcp', ['orders:read'])`, with the same ability names (`createToken()` without abilities grants `*`). `expires_at` and `sanctum.expiration` apply, and tokens the API plugin issued for another panel are refused.
3. The plugin's own tokens: `php artisan alfakit-ai:mcp-token admin@example.com --panel=admin [--tenant=acme] [--days=90]`. They grant what the user may do, and keep working when you install Sanctum or the API plugin.

The token's user must be a user of the panel's guard (a Sanctum token of a team model is refused). `->mcpTokenSources(['api'])` (any of `'api'`, `'sanctum'`, `'plugin'`) narrows the stores, e.g. to API tokens only. Sanctum and plugin tokens carry no tenant: on tenancy panels they work for the tenants the user belongs to.

Tokens bound to a tenant (API and plugin tokens of tenancy panels) must belong to the tenant in the URL, and the user must still belong to it. MCP requests are limited to 120 per minute per user (`rateLimit(…, AiFeature::Mcp)`).

Claude Desktop (`claude_desktop_config.json`):

```json
{
    "mcpServers": {
        "my-panel": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-remote",
                "https://your-app.test/admin/mcp",
                "--header",
                "Authorization: Bearer ${ALFAKIT_TOKEN}"
            ],
            "env": { "ALFAKIT_TOKEN": "1|…" }
        }
    }
}
```

## Usage and cost

The **AI usage** resource lists every AI call of the panel with date, feature, context (the action or tool), user, provider and model, tokens, estimated cost, duration and status, filterable by feature, status, model and date, with totals above the table. Users see their own calls; `canViewAllUsage(fn (User $user) => $user->is_admin)` shows everyone's. Costs are estimates from `pricing()`; set prices for the models you use.

## Testing

Each feature has its own agent class, so you can fake them with laravel/ai's fakes and never call a provider (a faked agent never needs a provider key):

```php
use AlfaSix\AlfakitAi\Agents\AssistAgent;
use AlfaSix\AlfakitAi\Agents\FilterAgent;
use AlfaSix\AlfakitAi\Agents\StructuredAgent;
use AlfaSix\AlfakitAi\Agents\TextAgent;
use AlfaSix\AlfakitAi\Copilot\CopilotAgent;
use Laravel\Ai\Responses\Data\ToolCall;

TextAgent::fake(['A short summary.']);                  // AiAction text answers, Summarize, Translate
StructuredAgent::fake([['subject' => 'Hi', 'body' => '…']]); // schema(), Extract, Classify
AssistAgent::fake(['Shorter text.']);
FilterAgent::fake([['filters' => [...], 'rules' => [], …]]);
CopilotAgent::fake([
    new ToolCall('1', 'search_records', ['query' => 'acme', 'resource' => 'orders']),
    'Found it.',
]);

TextAgent::assertPrompted(fn ($prompt) => str_contains($prompt->prompt, 'Acme'));
```

## Translations

The plugin's strings are in `alfakit-ai::ai` (13 languages). Publish them with `php artisan vendor:publish --tag=alfakit-ai-translations`.
