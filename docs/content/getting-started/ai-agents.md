---
title: AI agents and Laravel Boost
description: Guidelines, skills and machine-readable docs that teach Claude Code, Cursor, Codex, Copilot and other agents to write correct AlfaKit code.
---

# AI agents and Laravel Boost

AlfaKit ships knowledge for AI coding agents, so they write AlfaKit code rather than guessing from FilamentPHP or generic Laravel patterns.

## With Laravel Boost

If your app uses [Laravel Boost](https://laravel.com/docs/boost), you get everything automatically:

```bash
composer require laravel/boost --dev
php artisan boost:install
```

Boost finds AlfaKit in `composer.json` and offers it under **third-party AI guidelines/skills** (`alfasix/alfakit (guidelines, skills)`). It is not ticked by default: press Space to tick it, then Enter (Boost also asks which agents to configure; tick at least one). Boost then installs two kinds of files. With `--no-interaction`, Boost only installs the third-party packages listed in `boost.json`, so add `"packages": ["alfasix/alfakit"]` there first.

**A guideline**, loaded upfront for every agent session. It covers what AlfaKit is, its namespaces and directories, the generators, a complete resource, actions and notifications, panel configuration, and how to test.

**Six skills**, loaded on demand when the task needs them:

| Skill                         | Teaches                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alfakit-development`         | Resources, forms, tables, filters, actions, relation managers, infolists, widgets, pages, notifications, testing                                                                                                                                                                                                  |
| `alfakit-frontend-components` | Custom React, Vue and Svelte fields, columns, widgets, pages and replacement layouts, the hooks, and the rules for translations and RTL                                                                                                                                                                           |
| `alfakit-design`              | Themes, design options, colours, fonts, branding, slots, per-panel stylesheets, replacing the sidebar or layouts                                                                                                                                                                                                  |
| `alfakit-localization`        | Languages, the language menu, RTL, translating labels and model names, adding languages, money, numbers, dates and timezones                                                                                                                                                                                      |
| `alfakit-standalone`          | Forms, tables, infolists, actions and widgets outside the panel, in the application's own Inertia pages                                                                                                                                                                                                           |
| `alfakit-plugins`             | The first-party plugins (Shield, Billing, Media Library, Settings, Tags, Activity log, Backup, Health, Calendar, Tree, Comments, Kanban, Forms, CMS, API, Webhooks, Ops, Feature flags, Translation manager, AI, Teams, Workflows, Invoices, File manager, Helpdesk, Analytics, Mail templates) and `alfakit:add` |

After updating AlfaKit, refresh them:

```bash
php artisan boost:update
```

If you installed Boost before adding AlfaKit, run `php artisan boost:update --discover` so Boost picks up the new guideline and skills. They live in the package under `resources/boost`, so they always match the version you have installed.

## Without Boost

One command writes the same guideline and skills as plain files for the agents your project uses:

```bash
php artisan alfakit:ai
```

| Target    | Files                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| `agents`  | A section in `AGENTS.md` (Codex, Gemini CLI, Zed, Jules, Aider and others)            |
| `claude`  | A section in `CLAUDE.md` and every skill in `.claude/skills/` for Claude Code         |
| `cursor`  | `.cursor/rules/alfakit.mdc` (always on) and one rule per skill (loaded when relevant) |
| `copilot` | A section in `.github/copilot-instructions.md` that points to the skills              |

It detects the agents you already use (an existing `CLAUDE.md`, `.claude` or `.cursor` folder, or Copilot instructions) and asks when it runs interactively. Choose explicitly with `--target`:

```bash
php artisan alfakit:ai --target=claude --target=cursor
```

Shared files only get a section between `<!-- alfakit:start -->` and `<!-- alfakit:end -->`; your own content around it is kept, and running the command again after an update replaces just that section.

## Machine-readable docs

Point your agent at the machine-readable documentation, following the [llms.txt](https://llmstxt.org) convention:

| URL                                | Contents                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| [`/llms.txt`](/llms.txt)           | An index of every page with a one-line summary                                       |
| [`/llms-full.txt`](/llms-full.txt) | The whole documentation in one Markdown file                                         |
| `/docs/{page}.md`                  | Any page as Markdown, for example [`/docs/design/themes.md`](/docs/design/themes.md) |

Every docs page also has **Copy as Markdown** and **Markdown** buttons, for pasting a page into a chat. The [AI agents page](/ai) has the commands and URLs ready to copy.

## Rules agents should follow

The guideline and skills spell these out. They are useful in your own `CLAUDE.md` or `AGENTS.md` too:

- **Build in PHP.** Validation, queries, authorization and formatting run on the server. Frontend code is only for new visual components.
- **Use the right namespace:** `AlfaSix\Alfakit\…`. AlfaKit's API resembles Filament's, but `Filament\…` classes don't exist here.
- **Generate before writing:** `php artisan make:alfakit-resource Post --generate`.
- **Translate everything.** Labels go through `__()` and frontend strings through `t()`, with no hardcoded English.
- **Support RTL** with logical Tailwind classes (`ms-*`, `ps-*`, `start-*`, `text-start`) and `rtl:rotate-180` on arrows.
- **Format with the helpers:** `money()`, `Currency`, `useFormatter()`. Never use `number_format()`, `toFixed()` or `toLocaleString()`.
- **Style with theme tokens** (`bg-card`, `text-muted-foreground`), never fixed colours.

## Kept accurate

The guideline and skills ship inside the package (`resources/boost`), so they always match the version you have installed. AlfaKit's test suite checks that every `AlfaSix\Alfakit\…` class they, and these docs, import exists, so agents don't learn APIs that were renamed or removed.
